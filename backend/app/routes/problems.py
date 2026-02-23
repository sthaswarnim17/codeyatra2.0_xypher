"""
Problem routes.

GET /api/problems           -- list problems (filterable by concept_id, difficulty, subject, topic)
GET /api/problems/<id>      -- full problem with steps + options (no is_correct field)
"""

from flask import Blueprint, request

from app.models import Problem, Step, StepOption
from app.utils.response import success_response, error_response

problems_bp = Blueprint("problems", __name__)

@problems_bp.get("/")
def list_problems():
    query = Problem.query

    concept_id = request.args.get("concept_id", type=int)
    if concept_id is not None:
        query = query.filter(Problem.concept_id == concept_id)

    subject = request.args.get("subject")
    if subject:
        query = query.filter(Problem.subject.ilike(f"%{subject}%"))

    topic = request.args.get("topic")
    if topic:
        query = query.filter(Problem.topic.ilike(f"%{topic}%"))

    difficulty = request.args.get("difficulty", type=int)
    if difficulty is not None:
        query = query.filter(Problem.difficulty == difficulty)

    problems = query.all()

    data = []
    for p in problems:
        d = p.to_dict()
        d["step_count"] = Step.query.filter_by(problem_id=p.id).count()
        data.append(d)

    return success_response({"problems": data})


@problems_bp.route("/<int:problem_id>")
def get_problem(problem_id):
    problem = Problem.query.get(problem_id)
    if problem is None:
        return error_response("NOT_FOUND", "Problem not found.", {"id": problem_id}, 404)

    steps = (
        Step.query
        .filter_by(problem_id=problem.id)
        .order_by(Step.step_number)
        .all()
    )

    steps_list = []
    for s in steps:
        steps_list.append({
            "id": s.id,
            "step_number": s.step_number,
            "step_title": s.step_title,
            "step_description": s.step_description,
            "options": [{"id": o.id, "option_text": o.option_text} for o in s.options],
        })

    data = problem.to_dict()
    data["steps"] = steps_list
    data["step_count"] = len(steps_list)
    return success_response(data)
