"""Student profile model and Firestore CRUD operations for faculty advising."""

import os
from datetime import datetime, timezone
from typing import Any, Optional

PROJECT_ID = os.getenv("GOOGLE_CLOUD_PROJECT", "")
COLLECTION = "faculty_students"

try:
    from google.cloud import firestore
except Exception:  # pragma: no cover - fallback for environments without the client library
    firestore = None

_MEMORY_STORE: dict[str, dict[str, Any]] = {}


def _normalize_profile(student_id: str, profile: dict[str, Any]) -> dict[str, Any]:
    base = {
        "student_id": student_id,
        "first_name": "",
        "last_name": "",
        "major": "",
        "minor": None,
        "credits": 0,
        "advisor_name": "",
        "cumulative_gpa": 0.0,
        "graduation_date": None,
        "plans_to_work_next_semester": None,
        "career_goals": "",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "last_updated": datetime.now(timezone.utc).isoformat(),
    }
    base.update(profile)
    base.setdefault("student_id", student_id)
    return base


def _get_db():
    """Get Firestore database client, or `None` when unavailable."""
    if firestore is None:
        return None
    return firestore.Client(project=PROJECT_ID)


def get_student_profile(student_id: str) -> dict:
    """Load a student's profile from Firestore.
    
    Args:
        student_id: 8-digit student ID (e.g., "00123456")
    
    Returns:
        The profile dict, or a default empty profile if none exists.
    """
    db = _get_db()
    if db is None:
        return _normalize_profile(student_id, _MEMORY_STORE.get(student_id, {}))

    doc = db.collection(COLLECTION).document(student_id).get()
    if doc.exists:
        return doc.to_dict()
    return _normalize_profile(student_id, {})


def save_student_profile(student_id: str, profile: dict) -> None:
    """Save or update a student's profile in Firestore.
    
    Args:
        student_id: 8-digit student ID
        profile: Dictionary containing student profile data
    """
    db = _get_db()
    profile["last_updated"] = datetime.now(timezone.utc).isoformat()
    if db is None:
        _MEMORY_STORE[student_id] = _normalize_profile(student_id, {**_MEMORY_STORE.get(student_id, {}), **profile})
        return

    db.collection(COLLECTION).document(student_id).set(profile, merge=True)


def update_student_info(
    student_id: str,
    first_name: Optional[str] = None,
    last_name: Optional[str] = None,
    major: Optional[str] = None,
    minor: Optional[str] = None,
    credits: Optional[int] = None,
    advisor_name: Optional[str] = None,
    cumulative_gpa: Optional[float] = None,
    graduation_date: Optional[str] = None,
    plans_to_work_next_semester: Optional[bool] = None,
    career_goals: Optional[str] = None,
) -> None:
    """Update specific fields in a student's profile.
    
    Args:
        student_id: 8-digit student ID
        **kwargs: Any of the student profile fields to update
    """
    db = _get_db()
    update_data = {}
    
    if first_name is not None:
        update_data["first_name"] = first_name
    if last_name is not None:
        update_data["last_name"] = last_name
    if major is not None:
        update_data["major"] = major
    if minor is not None:
        update_data["minor"] = minor
    if credits is not None:
        update_data["credits"] = credits
    if advisor_name is not None:
        update_data["advisor_name"] = advisor_name
    if cumulative_gpa is not None:
        update_data["cumulative_gpa"] = cumulative_gpa
    if graduation_date is not None:
        update_data["graduation_date"] = graduation_date
    if plans_to_work_next_semester is not None:
        update_data["plans_to_work_next_semester"] = plans_to_work_next_semester
    if career_goals is not None:
        update_data["career_goals"] = career_goals
    
    update_data["last_updated"] = datetime.now(timezone.utc).isoformat()
    
    if update_data:
        if db is None:
            _MEMORY_STORE[student_id] = _normalize_profile(student_id, {**_MEMORY_STORE.get(student_id, {}), **update_data})
            return

        db.collection(COLLECTION).document(student_id).set(update_data, merge=True)


def get_student_by_name(first_name: str, last_name: str) -> Optional[dict]:
    """Search for a student by first and last name.
    
    Args:
        first_name: Student's first name
        last_name: Student's last name
    
    Returns:
        The student profile dict if found, None otherwise.
    """
    db = _get_db()
    if db is None:
        for profile in _MEMORY_STORE.values():
            if profile.get("first_name") == first_name and profile.get("last_name") == last_name:
                return profile
        return None

    docs = (
        db.collection(COLLECTION)
        .where("first_name", "==", first_name)
        .where("last_name", "==", last_name)
        .stream()
    )

    for doc in docs:
        return doc.to_dict()
    return None


def get_students_by_major(major: str) -> list[dict]:
    """Get all students with a specific major.
    
    Args:
        major: The major to filter by
    
    Returns:
        List of student profile dicts.
    """
    db = _get_db()
    if db is None:
        return [profile for profile in _MEMORY_STORE.values() if profile.get("major") == major]

    docs = db.collection(COLLECTION).where("major", "==", major).stream()
    return [doc.to_dict() for doc in docs]


def get_students_by_advisor(advisor_name: str) -> list[dict]:
    """Get all students assigned to a specific advisor.
    
    Args:
        advisor_name: The advisor's name
    
    Returns:
        List of student profile dicts.
    """
    db = _get_db()
    if db is None:
        return [profile for profile in _MEMORY_STORE.values() if profile.get("advisor_name") == advisor_name]

    docs = db.collection(COLLECTION).where("advisor_name", "==", advisor_name).stream()
    return [doc.to_dict() for doc in docs]


def get_seniors_by_graduation_date() -> list[dict]:
    """Get all students graduating soon (ordered by graduation date).
    
    Returns:
        List of senior student profile dicts, ordered by graduation date.
    """
    db = _get_db()
    if db is None:
        return sorted(
            [profile for profile in _MEMORY_STORE.values() if profile.get("graduation_date")],
            key=lambda p: p.get("graduation_date") or "",
        )

    docs = (
        db.collection(COLLECTION)
        .where("graduation_date", ">", "")
        .order_by("graduation_date")
        .stream()
    )
    return [doc.to_dict() for doc in docs]


def delete_student_profile(student_id: str) -> None:
    """Delete a student's profile from Firestore.
    
    Args:
        student_id: 8-digit student ID
    """
    db = _get_db()
    if db is None:
        _MEMORY_STORE.pop(student_id, None)
        return

    db.collection(COLLECTION).document(student_id).delete()
