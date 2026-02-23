"""
Diagnostic engine -- supporting utilities for step-based problems.

Primary use: match error patterns for diagnostic analysis.
All step evaluation (is_correct, explanation) is handled directly
via StepOption.is_correct in the session routes.
"""

import re
from app.models import db, ErrorPattern, StudentProgress, Concept


def _parse_numeric(val):
    """Try to extract a float from a string value. Returns None if not numeric."""
    if isinstance(val, (int, float)):
        return float(val)
    if isinstance(val, str):
        val = val.strip()
        m = re.match(r'^[-+]?\d*\.?\d+', val)
        if m:
            return float(m.group())
    return None


def _answers_match(student_answer: str, correct_answer: str, tolerance: float = 0.01) -> bool:
    """Compare two answers: tries numeric first, falls back to case-insensitive string."""
    s_num = _parse_numeric(student_answer)
    c_num = _parse_numeric(correct_answer)
    if s_num is not None and c_num is not None:
        return abs(s_num - c_num) <= tolerance
    # String comparison (case-insensitive, stripped)
    return str(student_answer).strip().lower() == str(correct_answer).strip().lower()


# ---------------------------------------------------------------------------
# Primary evaluation entry point
# ---------------------------------------------------------------------------

def match_error_pattern(checkpoint_id: int, student_answer: str) -> ErrorPattern | None:
    """
    Find the highest-confidence ErrorPattern whose trigger_value matches
    the student's answer (string or numeric comparison).
    """
    patterns = ErrorPattern.query.filter_by(checkpoint_id=checkpoint_id).all()

    matches = []
    for p in patterns:
        s_num = _parse_numeric(student_answer)
        t_num = _parse_numeric(p.trigger_value)
        if s_num is not None and t_num is not None:
            if abs(s_num - t_num) <= p.trigger_tolerance:
                matches.append(p)
        else:
            # String comparison
            if str(student_answer).strip().lower() == str(p.trigger_value).strip().lower():
                matches.append(p)

    if not matches:
        return None

    matches.sort(key=lambda p: p.confidence, reverse=True)
    return matches[0]


# ---------------------------------------------------------------------------
# Progress helpers
# ---------------------------------------------------------------------------

def update_student_progress(student_id: int, concept_id: int) -> None:
    """
    Upsert a StudentProgress row after a problem session ends.
    Called by session routes after complete-mission or submit-answer (all correct).
    """
    from datetime import datetime, timezone
    now = datetime.now(timezone.utc)
    progress = StudentProgress.query.filter_by(
        student_id=student_id,
        concept_id=concept_id,
    ).first()
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
