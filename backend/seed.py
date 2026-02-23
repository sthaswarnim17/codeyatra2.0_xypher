"""
Database seed script — populates the database from JSON data files.

Reads:
  concepts.json                    → Concept + ConceptPrerequisite
  resources.json                   → Resource
  problem system/
    sikshya_problems_dataset.json  → Problem + Step + StepOption (30 problems)

Usage:
  python seed.py           (from backend/ directory)
"""

import json
import os
import re
import sys

# Ensure the backend package is importable
sys.path.insert(0, os.path.dirname(__file__))

from app import create_app
from app.models import (
    db,
    Concept,
    ConceptPrerequisite,
    Problem,
    Step,
    StepOption,
    Resource,
    DiagnosticQuestion,
)
from app.models.simulation import Simulation

# --------------------------------------------------------------------
# Paths — JSON files live in backend/data/
# --------------------------------------------------------------------
DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "Xtra")
NEW_PROBLEMS_FILE = os.path.join(DATA_DIR, "problem system", "sikshya_problems_dataset.json")

CONCEPT_FILE = os.path.join(DATA_DIR, "concepts.json")
RESOURCE_FILE = os.path.join(DATA_DIR, "resources.json")

# Map from slug to DB id (populated during concept seeding)
concept_id_map: dict[str, int] = {}

# Map difficulty strings to integers
DIFFICULTY_MAP = {"easy": 1, "medium": 2, "hard": 3}


def _load_json(path: str) -> dict:
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def _parse_numeric_value(raw: str | float | int) -> float | None:
    """Extract a numeric value from a choice label like '38.3 N' or '2.868 s'."""
    if isinstance(raw, (int, float)):
        return float(raw)
    raw = str(raw).strip()
    # Try to extract the leading number
    m = re.match(r'^[-+]?\d*\.?\d+', raw)
    if m:
        return float(m.group())
    return None


# ===================================================================
# 1. Seed Concepts
# ===================================================================
def seed_concepts():
    print("── Seeding concepts …")
    data = _load_json(CONCEPT_FILE)

    # Subject / topic mapping
    subject_map = {
        "basic_algebra": ("math", "Mathematics Foundation"),
        "right_triangles": ("math", "Geometry"),
        "trigonometry": ("math", "Trigonometry"),
        "vector_decomposition": ("physics", "Mechanics"),
        "kinematic_equations": ("physics", "Mechanics"),
        "projectile_motion": ("physics", "Mechanics"),

        "rotational_dynamics": ("physics", "Rotational Mechanics"),
        "organic_chemistry_basics": ("chemistry", "Organic Chemistry"),
        "electrophilic_addition": ("chemistry", "Organic Chemistry"),
        "calculus_basics": ("math", "Calculus"),
        "area_under_curves": ("math", "Calculus"),

    }

    # Concepts that are NOT directly in the NEB syllabus chapters
    # (they are foundational / dependency-only)
    non_syllabus_slugs = {"basic_algebra", "right_triangles", "organic_chemistry_basics", "calculus_basics"}

    for c in data["concepts"]:
        slug = c["id"]
        subj, topic = subject_map.get(slug, ("physics", "General"))
        is_syllabus = c.get("is_syllabus", slug not in non_syllabus_slugs)
        concept = Concept(
            name=c["name"],
            subject=subj,
            topic=topic,
            difficulty=c.get("difficulty", 1),
            description=c.get("description", ""),
            is_syllabus=is_syllabus,
            neb_class=c.get("neb_class"),
        )
        db.session.add(concept)
        db.session.flush()  # assigns concept.id immediately
        concept_id_map[slug] = concept.id
        print(f"   + Concept [{concept.id}] {concept.name}")

    db.session.commit()

    # --- Prerequisites ---
    for c in data["concepts"]:
        slug = c["id"]
        for prereq_slug in c.get("prerequisites", []):
            if prereq_slug in concept_id_map:
                cp = ConceptPrerequisite(
                    concept_id=concept_id_map[slug],
                    prerequisite_id=concept_id_map[prereq_slug],
                    weight=3,
                )
                db.session.add(cp)
                print(f"   → {slug} depends on {prereq_slug}")

    db.session.commit()
    print(f"   ✓ {len(concept_id_map)} concepts seeded.\n")


# ===================================================================
# 2. Seed Resources
# ===================================================================
def seed_resources():
    print("── Seeding resources …")
    data = _load_json(RESOURCE_FILE)
    count = 0

    for r in data["resources"]:
        slug = r["concept_id"]
        cid = concept_id_map.get(slug)
        if cid is None:
            print(f"   ⚠ Unknown concept: {slug} — skipping resource {r['title']}")
            continue

        video_id = r.get("youtube_video_id", "")
        url = f"https://www.youtube.com/watch?v={video_id}" if video_id else ""

        resource = Resource(
            concept_id=cid,
            resource_type="youtube",
            title=r["title"],
            url=url,
            description=r.get("why_recommended", ""),
            start_seconds=r.get("start_seconds"),
            end_seconds=r.get("end_seconds"),
            priority=r.get("quality_rating", 0),
        )
        db.session.add(resource)
        count += 1

    db.session.commit()
    print(f"   ✓ {count} resources seeded.\n")


# ===================================================================
# 3. Seed Problems from sikshya_problems_dataset.json (Step-based)
# ===================================================================

# Map dataset topic names → concept slugs already in concepts.json
TOPIC_TO_SLUG: dict[str, str] = {
    "Vectors and Scalars": "vector_decomposition",
    "Vector Addition and Components": "vector_decomposition",
    "Kinematics": "kinematic_equations",
    "Projectile Motion": "projectile_motion",
    "Rotational Dynamics": "rotational_dynamics",
    "Organic Chemistry": "organic_chemistry_basics",
    "Organic Chemistry Basics": "organic_chemistry_basics",
    "Electrophilic Addition": "electrophilic_addition",
    "Trigonometry": "trigonometry",
    "Basic Algebra": "basic_algebra",
    "Calculus": "calculus_basics",
    "Area Under Curves": "area_under_curves",
}

NEW_DIFFICULTY_MAP = {"easy": 1, "Easy": 1, "medium": 2, "Medium": 2, "hard": 3, "Hard": 3}


def _find_or_create_concept(topic: str, subject: str) -> int | None:
    """Return concept id for given topic, creating one if needed."""
    # Try existing slug mapping first
    slug = TOPIC_TO_SLUG.get(topic)
    if slug and slug in concept_id_map:
        return concept_id_map[slug]

    # Try partial name match in concept_id_map keys
    topic_lower = topic.lower().replace(" ", "_")
    for s, cid in concept_id_map.items():
        if s in topic_lower or topic_lower in s:
            return cid

    # Create a new concept for this topic
    subj_map = {"Physics": "physics", "Chemistry": "chemistry", "Mathematics": "math"}
    subj = subj_map.get(subject, "physics")

    new_concept = Concept(
        name=topic,
        subject=subj,
        topic=topic,
        difficulty=2,
        description=f"{topic} — NEB syllabus topic.",
        is_syllabus=True,
        neb_class=11,
    )
    db.session.add(new_concept)
    db.session.flush()
    slug_key = topic.lower().replace(" ", "_")
    concept_id_map[slug_key] = new_concept.id
    print(f"   + New concept [{new_concept.id}] {new_concept.name}")
    return new_concept.id


def seed_new_problems():
    """Seed problems from sikshya_problems_dataset.json using the Step/StepOption model."""
    print("── Seeding problems from sikshya_problems_dataset.json …")

    if not os.path.exists(NEW_PROBLEMS_FILE):
        print(f"   ⚠ Dataset not found: {NEW_PROBLEMS_FILE} — skipping")
        return

    data = _load_json(NEW_PROBLEMS_FILE)
    total_p = 0
    total_s = 0
    total_o = 0

    for prob_data in data.get("problems", []):
        ext_id = prob_data.get("id", "")
        subject = prob_data.get("subject", "")
        topic = prob_data.get("topic", "")
        subtopic = prob_data.get("subtopic", "")
        difficulty_raw = prob_data.get("difficulty", "Easy")
        difficulty = NEW_DIFFICULTY_MAP.get(difficulty_raw, 1)
        problem_type = prob_data.get("problemType", "")
        neb_alignment = prob_data.get("neb_alignment", "")
        problem_statement = prob_data.get("problemStatement", "")
        grade_levels = prob_data.get("gradeLevels", [])

        # Try to link to an existing concept
        concept_id = _find_or_create_concept(topic, subject)

        title = f"{ext_id}: {topic} — {subtopic}" if subtopic else f"{ext_id}: {topic}"
        if len(title) > 255:
            title = title[:252] + "..."

        problem = Problem(
            ext_id=ext_id,
            concept_id=concept_id,
            title=title,
            description=problem_statement,
            difficulty=difficulty,
            subject=subject,
            topic=topic,
            subtopic=subtopic,
            problem_type=problem_type,
            neb_alignment=neb_alignment,
            problem_statement=problem_statement,
        )
        db.session.add(problem)
        db.session.flush()
        total_p += 1
        print(f"   + Problem [{problem.id}] {ext_id}: {topic}")

        for step_data in prob_data.get("steps", []):
            step_number = step_data.get("stepNumber", 1)
            step_title = step_data.get("stepTitle", "")
            step_description = step_data.get("stepDescription", "")
            correct_answer = step_data.get("correctAnswer", "")
            explanation = step_data.get("explanation", "")
            options_raw = step_data.get("options", [])

            step = Step(
                problem_id=problem.id,
                step_number=step_number,
                step_title=step_title,
                step_description=step_description,
                correct_answer=correct_answer,
                explanation=explanation,
            )
            db.session.add(step)
            db.session.flush()
            total_s += 1

            for opt_text in options_raw:
                is_correct = (str(opt_text).strip() == str(correct_answer).strip())
                option = StepOption(
                    step_id=step.id,
                    option_text=opt_text,
                    is_correct=is_correct,
                )
                db.session.add(option)
                total_o += 1

    db.session.commit()
    print(f"\n   ✓ {total_p} problems, {total_s} steps, {total_o} options seeded.\n")



# ===================================================================
# 4. Seed Diagnostic Questions (auto-generated from concept descriptions)
# ===================================================================
def seed_diagnostic_questions():
    """Seed basic diagnostic questions for each concept so /api/diagnose works."""
    print("── Seeding diagnostic questions …")
    count = 0

    diagnostic_bank = {
        "basic_algebra": [
            ("Rearrange v = u + at to solve for t.", "t = (v - u) / a"),
            ("If F = ma, what is a when F=20N and m=4kg?", "5"),
            ("Solve for x: 3x + 5 = 20", "5"),
            ("Rearrange s = ut + ½at² for a (when u=0).", "a = 2s / t²"),
            ("If KE = ½mv², what is v when KE=100J and m=2kg?", "10"),
        ],
        "right_triangles": [
            ("In a right triangle with legs 3 and 4, what is the hypotenuse?", "5"),
            ("If hypotenuse = 13 and one leg = 5, what is the other leg?", "12"),
            ("Which side of a right triangle is always the longest?", "hypotenuse"),
            ("A right triangle has legs 6 and 8. What is the hypotenuse?", "10"),
            ("True or False: The hypotenuse is always opposite the right angle.", "true"),
        ],
        "trigonometry": [
            ("sin(30°) = ?", "0.5"),
            ("cos(60°) = ?", "0.5"),
            ("If hypotenuse = 10 and angle = 30°, what is the opposite side?", "5"),
            ("Which trig ratio uses Adjacent / Hypotenuse?", "cos"),
            ("tan(45°) = ?", "1"),
        ],
        "vector_decomposition": [
            ("A 50N force at 40°. Horizontal component = 50 × ___(40°). Fill the trig function.", "cos"),
            ("Vertical component of a vector uses which trig function?", "sin"),
            ("If Fx=30N and Fy=40N, what is the magnitude of the resultant?", "50"),
            ("A vector at 0° from horizontal has vertical component = ?", "0"),
            ("True or False: √(Fx² + Fy²) should equal the original magnitude.", "true"),
        ],
        "kinematic_equations": [
            ("Using v = u + at, find v when u=10, a=2, t=3.", "16"),
            ("Using s = ut + ½at², find s when u=0, a=10, t=2.", "20"),
            ("What is the time to reach peak height if Vy=20 m/s and g=10 m/s²?", "2"),
            ("Total flight time for a vertical throw: T = 2 × Vy / g. If Vy=15 and g=10, T=?", "3"),
            ("Using v² = u² + 2as, find v when u=0, a=10, s=5.", "10"),
        ],
        "projectile_motion": [
            ("In projectile motion, which velocity component stays constant?", "horizontal"),
            ("Range = Vx × T. If Vx=20 m/s and T=3s, range = ?", "60"),
            ("Maximum height depends on which component: Vx or Vy?", "Vy"),
            ("At maximum height, the vertical velocity equals?", "0"),
            ("True or False: Horizontal and vertical motions are independent.", "true"),
        ],

        "rotational_dynamics": [
            ("Torque = r × F × sin(θ). If r=0.5m, F=10N, θ=90°, what is τ?", "5"),
            ("For a uniform disk, the moment of inertia formula is I = ?MR². What is the fraction?", "0.5"),
            ("If τ = 10 N·m and I = 2 kg·m², what is α (angular acceleration)?", "5"),
            ("What is the rotational equivalent of Newton's second law F=ma?", "τ = Iα"),
            ("True or False: Moment of inertia depends on mass distribution.", "true"),
        ],
        "organic_chemistry_basics": [
            ("How many bonds does carbon typically form?", "4"),
            ("What is the general formula for alkenes?", "CnH2n"),
            ("An -OH functional group defines what class of organic compound?", "alcohol"),
            ("Is a double bond (C=C) more or less reactive than a single bond?", "more"),
            ("What type of bond is formed by sharing electrons?", "covalent"),
        ],
        "electrophilic_addition": [
            ("In electrophilic addition, what part of the alkene acts as nucleophile?", "π bond"),
            ("Markovnikov's rule: H adds to the carbon with ___ hydrogens.", "more"),
            ("Which is more stable: a primary or secondary carbocation?", "secondary"),
            ("What is the major product of HBr + propene?", "2-bromopropane"),
            ("In HBr, which atom is the electrophile?", "H"),
        ],
        "calculus_basics": [
            ("What is the derivative of x³?", "3x²"),
            ("What is ∫x² dx?", "x³/3 + C"),
            ("What is d/dx of 5x?", "5"),
            ("The power rule for integration: ∫xⁿ dx = ?", "x^(n+1)/(n+1) + C"),
            ("What is the derivative of a constant?", "0"),
        ],
        "area_under_curves": [
            ("The area under a curve from a to b is found using?", "definite integral"),
            ("If f(x) is below the x-axis, the integral is ___ (positive/negative)?", "negative"),
            ("To find total area, we take the ___ value of below-axis integrals.", "absolute"),
            ("∫₀¹ x² dx = ?", "1/3"),
            ("If f(x) = x² − 1, where does f(x) = 0 for x > 0?", "1"),

        ],
    }

    for slug, questions in diagnostic_bank.items():
        cid = concept_id_map.get(slug)
        if cid is None:
            continue
        for i, (q_text, expected) in enumerate(questions):
            dq = DiagnosticQuestion(
                concept_id=cid,
                question_text=q_text,
                expected_answer=expected,
                source="manual",
                difficulty=min(i + 1, 5),
            )
            db.session.add(dq)
            count += 1

    db.session.commit()
    print(f"   ✓ {count} diagnostic questions seeded.\n")


# ===================================================================
# 5. Seed Simulations
# ===================================================================
def seed_simulations():
    """Seed one simulation row per supported simulation type."""
    print("── Seeding simulations …")

    SIMULATIONS = [
        {
            "concept_slug": "vector_decomposition",
            "simulation_type": "vector_decomposition",
            "title": "Vector Decomposition Simulator",
            "description": (
                "Drag the horizontal (Vx) and vertical (Vy) component arrows "
                "to match the given velocity vector. Builds intuition for SOH-CAH-TOA "
                "applied to 2D motion."
            ),
            "configuration": {
                "default_velocity": 25,
                "default_angle": 35,
                "tolerance_percent": 10,
            },
        },
        {
            "concept_slug": "trigonometry",
            "simulation_type": "function_graphing",
            "title": "Trigonometric Function Grapher",
            "description": (
                "Plot sin, cos, and tan functions and explore how amplitude, "
                "period, and phase shift affect the graph. Visualise SOH-CAH-TOA "
                "on the unit circle."
            ),
            "configuration": {
                "functions": ["sin", "cos", "tan"],
                "x_range": [-360, 360],
                "default_function": "sin",
            },
        },
        {
            "concept_slug": "area_under_curves",
            "simulation_type": "function_graphing",
            "title": "Area Under Curves Explorer",
            "description": (
                "Visualise definite integrals by shading the region between "
                "a curve and the x-axis. Adjust bounds and observe how the "
                "signed area changes."
            ),
            "configuration": {
                "functions": ["x^2", "x^3", "sin(x)", "cos(x)"],
                "default_fn": "x^2",
                "a": 0,
                "b": 1,
            },
        },
        {
            "concept_slug": "electrophilic_addition",
            "simulation_type": "molecular_structure",
            "title": "Electrophilic Addition Visualiser",
            "description": (
                "Build HBr addition to propene step-by-step. Identify the "
                "nucleophilic π bond, the electrophile, and apply Markovnikov's "
                "rule to predict the major product."
            ),
            "configuration": {
                "molecule": "propene",
                "reagent": "HBr",
                "expected_product": "2-bromopropane",
            },
        },
    ]

    count = 0
    for entry in SIMULATIONS:
        slug = entry["concept_slug"]
        cid = concept_id_map.get(slug)
        if cid is None:
            print(f"   ⚠ Concept slug '{slug}' not in concept_id_map — skipping simulation.")
            continue

        sim = Simulation(
            concept_id=cid,
            simulation_type=entry["simulation_type"],
            title=entry["title"],
            description=entry["description"],
            configuration=entry["configuration"],
        )
        db.session.add(sim)
        count += 1
        print(f"   + Simulation [{entry['simulation_type']}] → {entry['title']}")

    db.session.commit()
    print(f"   ✓ {count} simulations seeded.\n")


# ===================================================================
# Main
# ===================================================================
def main():
    app = create_app("development")

    with app.app_context():
        # Drop and recreate all tables for a clean seed
        print("🗑  Dropping existing tables …")
        db.drop_all()
        print("🔨 Creating tables …")
        db.create_all()
        print()

        seed_concepts()
        seed_resources()
        seed_new_problems()
        seed_diagnostic_questions()
        seed_simulations()

        print("═" * 50)
        print("✅ Database seeded successfully!")
        print(f"   DB path: {app.config['SQLALCHEMY_DATABASE_URI']}")
        print("═" * 50)


if __name__ == "__main__":
    main()
