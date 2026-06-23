"""
Faculty Advisor Agent — Tools
These tools provide form knowledge and student profile management. Student context comes from the conversation.
"""

from .forms import REQUIRED_FORMS, FORM_DETAILS
from .internship_form import build_internship_form_draft, get_internship_form_schema
from .student_profile import (
    get_student_profile,
    save_student_profile,
    update_student_info,
    get_student_by_name,
    get_students_by_major,
    get_students_by_advisor,
    get_seniors_by_graduation_date,
)


def get_required_forms(year: str) -> dict:
    """
    Get the list of required forms for a given student year.

    Args:
        year: Student year — one of: freshman, sophomore, junior, senior

    Returns:
        Dict with year and list of required forms with full details.
    """
    year = year.lower().strip()
    form_ids = REQUIRED_FORMS.get(year)
    if not form_ids:
        return {
            "error": f"Unknown year '{year}'.",
            "valid_years": list(REQUIRED_FORMS.keys()),
        }

    forms = [{**FORM_DETAILS[fid], "form_id": fid} for fid in form_ids]
    return {
        "year": year,
        "required_count": len(forms),
        "forms": forms,
    }


def check_compliance(year: str, submitted_forms: list[str]) -> dict:
    """
    Given a student's year and the forms they've already submitted,
    determine which required forms are still missing.

    Args:
        year: Student year — freshman, sophomore, junior, or senior
        submitted_forms: List of form IDs the student has already submitted
                         (e.g. ["advising_hold_release", "degree_plan_acknowledgment"])

    Returns:
        Compliance report with missing forms and whether the student is fully compliant.
    """
    year = year.lower().strip()
    required_ids = REQUIRED_FORMS.get(year)
    if not required_ids:
        return {
            "error": f"Unknown year '{year}'.",
            "valid_years": list(REQUIRED_FORMS.keys()),
        }

    submitted = {f.lower().strip() for f in submitted_forms}
    missing = [
        {**FORM_DETAILS[fid], "form_id": fid}
        for fid in required_ids
        if fid not in submitted
    ]

    return {
        "year": year,
        "required_count": len(required_ids),
        "submitted_count": len(submitted & set(required_ids)),
        "missing_count": len(missing),
        "compliant": len(missing) == 0,
        "missing_forms": missing,
    }


def get_form_info(form_id: str) -> dict:
    """
    Get details about a specific form — description, deadline, and URL.

    Args:
        form_id: Form identifier, e.g. graduation_application, advising_hold_release

    Returns:
        Form detail dict or error with available form IDs.
    """
    form = FORM_DETAILS.get(form_id.lower().strip())
    if not form:
        return {
            "error": f"Form '{form_id}' not found.",
            "available_forms": list(FORM_DETAILS.keys()),
        }
    return {**form, "form_id": form_id}


def list_all_forms() -> list[dict]:
    """
    List every form in the system with its name and description.

    Returns:
        List of all forms.
    """
    return [
        {"form_id": fid, "name": f["name"], "description": f["description"], "due": f["due"]}
        for fid, f in FORM_DETAILS.items()
    ]


# ============================================================================
# Student Profile Tools
# ============================================================================


def lookup_student_profile(student_id: str) -> dict:
    """
    Look up a student's profile by 8-digit student ID.

    Args:
        student_id: 8-digit student ID (e.g., "00123456")

    Returns:
        Dictionary with all student profile information.
    """
    profile = get_student_profile(student_id)
    return {
        "student_id": profile.get("student_id"),
        "name": f"{profile.get('first_name', '')} {profile.get('last_name', '')}".strip(),
        "major": profile.get("major"),
        "minor": profile.get("minor"),
        "credits": profile.get("credits"),
        "advisor_name": profile.get("advisor_name"),
        "cumulative_gpa": profile.get("cumulative_gpa"),
        "graduation_date": profile.get("graduation_date"),
        "plans_to_work_next_semester": profile.get("plans_to_work_next_semester"),
        "career_goals": profile.get("career_goals"),
    }


def create_student_profile(
    student_id: str,
    first_name: str,
    last_name: str,
    major: str,
    advisor_name: str,
    minor: str = None,
    credits: int = 0,
    cumulative_gpa: float = 0.0,
    graduation_date: str = None,
    plans_to_work_next_semester: bool = None,
    career_goals: str = "",
) -> dict:
    """
    Create a new student profile in Firestore.

    Args:
        student_id: 8-digit student ID (e.g., "00123456")
        first_name: Student's first name
        last_name: Student's last name
        major: Student's major
        advisor_name: Name of assigned advisor
        minor: Student's minor (optional)
        credits: Number of credits completed (default 0)
        cumulative_gpa: Current cumulative GPA (default 0.0)
        graduation_date: Expected graduation date (optional, e.g., "2026-05")
        plans_to_work_next_semester: True if student plans to work next semester
        career_goals: Student's career goals or aspirations

    Returns:
        Confirmation dict with the created student's profile.
    """
    profile = {
        "student_id": student_id,
        "first_name": first_name,
        "last_name": last_name,
        "major": major,
        "minor": minor,
        "credits": credits,
        "advisor_name": advisor_name,
        "cumulative_gpa": cumulative_gpa,
        "graduation_date": graduation_date,
        "plans_to_work_next_semester": plans_to_work_next_semester,
        "career_goals": career_goals,
    }
    save_student_profile(student_id, profile)
    return {
        "status": "created",
        "student_id": student_id,
        "name": f"{first_name} {last_name}",
        "major": major,
        "advisor": advisor_name,
    }


def update_student_profile(
    student_id: str,
    first_name: str = None,
    last_name: str = None,
    major: str = None,
    minor: str = None,
    credits: int = None,
    advisor_name: str = None,
    cumulative_gpa: float = None,
    graduation_date: str = None,
    plans_to_work_next_semester: bool = None,
    career_goals: str = None,
) -> dict:
    """
    Update one or more fields in a student's profile.

    Args:
        student_id: 8-digit student ID
        **kwargs: Any of the student profile fields to update

    Returns:
        Confirmation dict with updated fields.
    """
    update_student_info(
        student_id,
        first_name=first_name,
        last_name=last_name,
        major=major,
        minor=minor,
        credits=credits,
        advisor_name=advisor_name,
        cumulative_gpa=cumulative_gpa,
        graduation_date=graduation_date,
        plans_to_work_next_semester=plans_to_work_next_semester,
        career_goals=career_goals,
    )
    return {
        "status": "updated",
        "student_id": student_id,
        "updated_fields": [k for k, v in {
            "first_name": first_name,
            "last_name": last_name,
            "major": major,
            "minor": minor,
            "credits": credits,
            "advisor_name": advisor_name,
            "cumulative_gpa": cumulative_gpa,
            "graduation_date": graduation_date,
            "plans_to_work_next_semester": plans_to_work_next_semester,
            "career_goals": career_goals,
        }.items() if v is not None],
    }


def find_student_by_name(first_name: str, last_name: str) -> dict:
    """
    Search for a student by first and last name.

    Args:
        first_name: Student's first name
        last_name: Student's last name

    Returns:
        Student profile if found, or a "not found" message.
    """
    profile = get_student_by_name(first_name, last_name)
    if profile:
        return {
            "found": True,
            "student_id": profile.get("student_id"),
            "name": f"{first_name} {last_name}",
            "major": profile.get("major"),
            "advisor": profile.get("advisor_name"),
            "cumulative_gpa": profile.get("cumulative_gpa"),
            "graduation_date": profile.get("graduation_date"),
        }
    return {
        "found": False,
        "message": f"No student found with name {first_name} {last_name}",
    }


def list_students_by_major(major: str) -> dict:
    """
    List all students in a specific major.

    Args:
        major: The major (e.g., "Computer Science")

    Returns:
        Dict with count and list of students in that major.
    """
    students = get_students_by_major(major)
    return {
        "major": major,
        "count": len(students),
        "students": [
            {
                "student_id": s.get("student_id"),
                "name": f"{s.get('first_name', '')} {s.get('last_name', '')}".strip(),
                "advisor": s.get("advisor_name"),
                "cumulative_gpa": s.get("cumulative_gpa"),
            }
            for s in students
        ],
    }


def list_students_by_advisor(advisor_name: str) -> dict:
    """
    List all students assigned to a specific advisor.

    Args:
        advisor_name: The advisor's name

    Returns:
        Dict with count and list of students under that advisor.
    """
    students = get_students_by_advisor(advisor_name)
    return {
        "advisor": advisor_name,
        "count": len(students),
        "students": [
            {
                "student_id": s.get("student_id"),
                "name": f"{s.get('first_name', '')} {s.get('last_name', '')}".strip(),
                "major": s.get("major"),
                "cumulative_gpa": s.get("cumulative_gpa"),
                "graduation_date": s.get("graduation_date"),
            }
            for s in students
        ],
    }


def list_graduating_students() -> dict:
    """
    List all graduating students ordered by graduation date.

    Returns:
        Dict with count and list of graduating students.
    """
    students = get_seniors_by_graduation_date()
    return {
        "count": len(students),
        "graduating_students": [
            {
                "student_id": s.get("student_id"),
                "name": f"{s.get('first_name', '')} {s.get('last_name', '')}".strip(),
                "graduation_date": s.get("graduation_date"),
                "major": s.get("major"),
                "advisor": s.get("advisor_name"),
            }
            for s in students
        ],
    }



__all__ = [
    # Form tools
    "build_internship_form_draft",
    "check_compliance",
    "get_form_info",
    "get_internship_form_schema",
    "get_required_forms",
    "list_all_forms",
    # Student profile tools
    "lookup_student_profile",
    "create_student_profile",
    "update_student_profile",
    "find_student_by_name",
    "list_students_by_major",
    "list_students_by_advisor",
    "list_graduating_students",
]
