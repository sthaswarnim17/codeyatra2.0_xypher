"""
Session routes -- start a problem-solving session and submit step answers.

POST /api/sessions/start                -- create session
POST /api/sessions/<session_id>/submit  -- submit answer for current step
GET  /api/sessions/<session_id>         -- get session state
"""

from datetime import datetime, timezone

from flask import Blueprint, request

from app.models import db, Problem, Step, StepOption, StudentProgress
from app.utils.response import success_response, error_response
from app.utils.session_manager import (
    create_session,
    get_session,
    log_attempt,
    get_attempts_for_checkpoint,
    update_session,
    complete_session,
)
from app.utils.diagnostic_engine import evaluate_step_answer, update_student_progress

sessions_bp = Blueprint("sessions", __name__)


def _step_payload(step: Step) -> dict:
    """Build a safe step dict (no correct_answer, no explanation)."""
    return {
        "id": step.id,
        "step_number": step.step_number,
        "step_title": step.step_title,
        "step_description": step.step_description,
        "options": [{"id": o.id, "option_text": o.option_text} for o in step.options],
    }


@sessions_bp.post("/start")
def start_session():
    data = request.get_json(silent=True) or {}

    problem_id = data.get("problem_id")
    student_id = data.get("student_id")

    if not problem_id:
        return error_response("VALIDATION_ERROR", "problem_id is required.", {}, 400)
    if not student_id:
        return error_response("VALIDATION_ERROR", "student_id is required.", {}, 400)

    problem = Problem.query.get(problem_id)
    if problem is None:
        return error_response("NOT_FOUND", "Problem not found.", {"problem_id": problem_id}, 404)

    session = create_session(
        student_id=int(student_id),
        problem_id=problem.id,
        concept_id=problem.concept_id,
    )

    first_step = (
        Step.query
        .filter_by(problem_id=problem.id)
        .order_by(Step.step_number)
        .first()
    )

    return success_response(
        {
            "session_id": session["session_id"],
            "problem": problem.to_dict(),
            "current_step": _step_payload(first_step) if first_step else None,
            "started_at": session["started_at"],
        },
        status_code=201,
    )


@sessions_bp.post("/<session_id>/submit")
def submit_answer(session_id):
    session = get_session(session_id)
    if session is None:
        return error_response("NOT_FOUND", "Session not found.", {"session_id": session_id}, 404)

    if session["status"] == "completed":
        return error_response("CONFLICT", "Session already completed.", {}, 409)

    data = request.get_json(silent=True) or {}
    step_id = data.get("step_id")
    selected_option_id = data.get("selected_option_id")
    time_spent = data.get("time_spent_seconds", 0)

    errors = {}
    if step_id is None:
        errors["step_id"] = "Required field."
    if selected_option_id is None:
        errors["selected_option_id"] = "Required field."
    if errors:
        return error_response("VALIDATION_ERROR", "Missing required fields.", errors, 400)

    step = Step.query.get(step_id)
    if step is None:
        return error_response("NOT_FOUND", "Step not found.", {"step_id": step_id}, 404)

    # Count previous attempts on this step
    attempt_number = get_attempts_for_checkpoint(session_id, step_id) + 1

    # Log the attempt
    log_attempt(session_id, {
        "step_id": step_id,
        "selected_option_id": selected_option_id,
        "attempt_number": attempt_number,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "time_spent_seconds": time_spent,
    })

    # Evaluate
    result = evaluate_step_answer(
        step=step,
        selected_option_id=int(selected_option_id),
        attempt_number=attempt_number,
        student_id=session["student_id"],
    )

    # If correct, advance to next step
    if result["correct"]:
        all_steps = (
            Step.query
            .filter_by(problem_id=session["problem_id"])
            .order_by(Step.step_number)
            .all()
        )
        current_idx = session["current_checkpoint_index"]
        next_idx = current_idx + 1

        if next_idx >= len(all_steps):
            # Problem complete
            complete_session(session_id)
            result["next_action"] = "complete"
            result["next_step"] = None
            result["feedback"] = "Problem completed! All steps passed."

            # Update student progress
            update_student_progress(session["student_id"], session["concept_id"])
        else:
            update_session(session_id, {"current_checkpoint_index": next_idx})
            next_step = all_steps[next_idx]
            result["next_step"] = _step_payload(next_step)

    return success_response(result)


@sessions_bp.get("/<session_id>")
def get_session_state(session_id):
    session = get_session(session_id)
    if session is None:
        return error_response("NOT_FOUND", "Session not found.", {"session_id": session_id}, 404)
    return success_response(session)
