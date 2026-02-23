"""
Session routes -- start a problem-solving session and submit step answers.

POST /api/sessions/start                    -- create session
POST /api/sessions/<session_id>/submit      -- submit answer for one step (immediate feedback)
POST /api/sessions/<session_id>/complete-mission -- batch-submit all answers, get full report
GET  /api/sessions/<session_id>             -- get session state
"""

from datetime import datetime, timezone

from flask import Blueprint, request

from app.models import db, Problem, Step, StepOption, Resource
from app.utils.response import success_response, error_response
from app.utils.session_manager import (
    create_session,
    get_session,
    log_attempt,
    get_attempts_for_checkpoint,
    update_session,
    complete_session,
)

sessions_bp = Blueprint("sessions", __name__)


def _update_student_progress(student_id: int, concept_id: int | None) -> None:
    """Upsert a StudentProgress row after a session ends."""
    if not concept_id:
        return
    from app.models import StudentProgress
    from datetime import datetime, timezone as tz
    now = datetime.now(tz.utc)
    progress = StudentProgress.query.filter_by(student_id=student_id, concept_id=concept_id).first()
    if progress is None:
        progress = StudentProgress(
            student_id=student_id,
            concept_id=concept_id,
            status="in_progress",
            attempts=1,
            last_attempted_at=now,
        )
        db.session.add(progress)
    else:
        progress.attempts = (progress.attempts or 0) + 1
        progress.last_attempted_at = now
        if progress.status == "not_started":
            progress.status = "in_progress"
    db.session.commit()


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
    """Submit a single step answer and get immediate feedback (used for step-by-step mode)."""
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

    selected_option = StepOption.query.get(selected_option_id)
    if selected_option is None or selected_option.step_id != step.id:
        return error_response("VALIDATION_ERROR", "Invalid option for this step.", {}, 400)

    was_correct = selected_option.is_correct
    correct_option = next((o for o in step.options if o.is_correct), None)

    attempt_number = get_attempts_for_checkpoint(session_id, step_id) + 1
    log_attempt(session_id, {
        "step_id": step_id,
        "selected_option_id": selected_option_id,
        "attempt_number": attempt_number,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "time_spent_seconds": time_spent,
    })

    result = {
        "correct": was_correct,
        "explanation": step.explanation if was_correct else None,
        "correct_option_text": correct_option.option_text if correct_option else "",
        "next_action": "continue" if was_correct else "retry",
    }

    if was_correct:
        all_steps = (
            Step.query
            .filter_by(problem_id=session["problem_id"])
            .order_by(Step.step_number)
            .all()
        )
        step_ids = [s.id for s in all_steps]
        current_idx = step_ids.index(step_id) if step_id in step_ids else 0
        next_idx = current_idx + 1

        if next_idx >= len(all_steps):
            complete_session(session_id)
            result["next_action"] = "complete"
            result["next_step"] = None
            _update_student_progress(session["student_id"], session.get("concept_id"))
        else:
            update_session(session_id, {"current_checkpoint_index": next_idx})
            next_step = all_steps[next_idx]
            result["next_step"] = _step_payload(next_step)

    return success_response(result)


@sessions_bp.post("/<session_id>/complete-mission")
def complete_mission(session_id):
    """
    Batch-evaluate all step answers at once and return a full end-of-mission diagnostic.

    Body: { answers: [{step_id, selected_option_id}, ...] }
    Returns: { score, total_steps, passed, step_results, resources, misconceptions }
    """
    session = get_session(session_id)
    if session is None:
        return error_response("NOT_FOUND", "Session not found.", {"session_id": session_id}, 404)

    data = request.get_json(silent=True) or {}
    answers = data.get("answers", [])
    if not answers:
        return error_response("VALIDATION_ERROR", "answers array is required.", {}, 400)

    problem = Problem.query.get(session["problem_id"])
    all_steps = (
        Step.query
        .filter_by(problem_id=session["problem_id"])
        .order_by(Step.step_number)
        .all()
    )
    steps_by_id = {s.id: s for s in all_steps}

    step_results = []
    correct_count = 0

    for answer in answers:
        step_id = answer.get("step_id")
        selected_option_id = answer.get("selected_option_id")
        step = steps_by_id.get(step_id)
        if not step:
            continue

        selected_option = StepOption.query.get(selected_option_id)
        correct_option = next((o for o in step.options if o.is_correct), None)
        was_correct = selected_option is not None and selected_option.is_correct

        if was_correct:
            correct_count += 1

        step_results.append({
            "step_id": step.id,
            "step_number": step.step_number,
            "step_title": step.step_title,
            "step_description": step.step_description,
            "was_correct": was_correct,
            "selected_option_text": selected_option.option_text if selected_option else "No answer",
            "correct_option_text": correct_option.option_text if correct_option else "",
            "explanation": step.explanation or "",
        })

        # Log the attempt
        log_attempt(session_id, {
            "step_id": step_id,
            "selected_option_id": selected_option_id,
            "attempt_number": 1,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        })

    total = len(step_results)
    passed = correct_count == total and total > 0

    # Mark session complete
    complete_session(session_id)

    # Update student progress
    _update_student_progress(session["student_id"], session.get("concept_id"))

    # Fetch resources for this concept
    resources = []
    if session.get("concept_id"):
        rs = (
            Resource.query
            .filter_by(concept_id=session["concept_id"])
            .order_by(Resource.priority.desc())
            .limit(3)
            .all()
        )
        resources = [r.to_dict() for r in rs]

    return success_response({
        "score": correct_count,
        "total_steps": total,
        "passed": passed,
        "percentage": round((correct_count / total) * 100) if total else 0,
        "step_results": step_results,
        "resources": resources,
        "misconceptions": problem.common_misconceptions or [] if problem else [],
        "key_objectives": problem.key_learning_objectives or [] if problem else [],
    })


@sessions_bp.get("/<session_id>")
def get_session_state(session_id):
    session = get_session(session_id)
    if session is None:
        return error_response("NOT_FOUND", "Session not found.", {"session_id": session_id}, 404)
    return success_response(session)
