"""
Diagnostic engine -- evaluation logic for step-based problems.

Step-based flow:
  - Student selects a StepOption by ID at each Step.
  - If is_correct -> advance to next step, reveal explanation.
  - If wrong -> return feedback, allow retry (with hint on 2nd attempt).
"""

from app.models import db, Step, StepOption, StudentProgress, Concept


# ---------------------------------------------------------------------------
# Primary evaluation entry point
# ---------------------------------------------------------------------------

def evaluate_step_answer(
    step,
    selected_option_id: int,
    attempt_number: int,
    student_id: int,
) -> dict:
    """
    Evaluate a student's option selection at a Step.

    Returns a standardised response dict:
      correct       : bool
      feedback      : str
      explanation   : str | None  (only when correct)
      next_action   : "continue" | "complete" | "retry"
      hint          : str | None
    """
    option = StepOption.query.get(selected_option_id)

    # Guard: option must belong to this step
    if option is None or option.step_id != step.id:
        return {
            "correct": False,
            "feedback": "Invalid option selected. Please choose one of the options provided.",
            "explanation": None,
            "hint": None,
            "next_action": "retry",
        }

    if option.is_correct:
        return {
            "correct": True,
            "feedback": "Correct! Great work.",
            "explanation": step.explanation,
            "hint": None,
            "next_action": "continue",
        }

    # Wrong answer
    if attempt_number == 1:
        feedback = "Not quite right. Review the step description and try again."
        hint = step.step_description
    else:
        # Hint: reveal the correct answer text on 2nd+ attempt
        feedback = f"Still incorrect. Hint: look for the option that matches -- {step.correct_answer[:80]}..."
        hint = step.correct_answer

    return {
        "correct": False,
        "feedback": feedback,
        "explanation": None,
        "hint": hint,
        "next_action": "retry",
    }


# ---------------------------------------------------------------------------
# Progress helpers (shared with sessions route)
# ---------------------------------------------------------------------------

def update_student_progress(student_id: int, concept_id) -> None:
    """Increment attempts and update last_attempted_at when a problem is solved."""
    from datetime import datetime, timezone

    if concept_id is None:
        return

    progress = StudentProgress.query.filter_by(
        student_id=student_id,
        concept_id=concept_id,
    ).first()

    now = datetime.now(timezone.utc)

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

    db.session.commit()
