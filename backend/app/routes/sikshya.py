"""
Route: POST /api/sikshya/diagnose
Runs the SikshyaMap deterministic diagnostics engine and returns a structured
JSON diagnosis of the student's prerequisite gaps.
"""

from flask import Blueprint, request

from app.utils.sikshya_engine import run_diagnosis
from app.utils.response import success_response, error_response

sikshya_bp = Blueprint("sikshya", __name__)


@sikshya_bp.post("/diagnose")
def sikshya_diagnose():
    payload = request.get_json(silent=True)
    if not payload:
        return error_response("INVALID_BODY", "Request body must be valid JSON.", status_code=400)

    required = ("sessionId", "studentId", "problemTemplate", "studentAnswers")
    missing = [k for k in required if k not in payload]
    if missing:
        return error_response(
            "MISSING_FIELDS",
            f"Missing required fields: {', '.join(missing)}",
            status_code=400,
        )

    result = run_diagnosis(payload)
    return success_response(result)
