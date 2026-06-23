"""Dummy student login/profile library.

This module intentionally avoids the database. It provides a small mutable
in-memory store for demo authentication and profile saves.
"""

from copy import deepcopy
from typing import Any


_DEFAULT_PASSWORD = "password123"

_STUDENTS: dict[int, dict[str, Any]] = {
    1001: {
        "user_id": 1001,
        "email": "majoh93@morgan.edu",
        "password": _DEFAULT_PASSWORD,
        "role": "student",
        "name": "Maya Johnson",
        "studentId": "00123401",
        "major": "Computer Science",
        "profilePicture": "/user_icon.webp",
        "morganConnected": False,
    },
    1002: {
        "user_id": 1002,
        "email": "josmi28@morgan.edu",
        "password": _DEFAULT_PASSWORD,
        "role": "student",
        "name": "Jordan Smith",
        "studentId": "00123402",
        "major": "Computer Science",
        "profilePicture": "/user_icon.webp",
        "morganConnected": False,
    },
    1003: {
        "user_id": 1003,
        "email": "aabro8@morgan.edu",
        "password": _DEFAULT_PASSWORD,
        "role": "student",
        "name": "Aaliyah Brown",
        "studentId": "00123403",
        "major": "Computer Science",
        "profilePicture": "/user_icon.webp",
        "morganConnected": False,
    },
    1004: {
        "user_id": 1004,
        "email": "eldav49@morgan.edu",
        "password": _DEFAULT_PASSWORD,
        "role": "student",
        "name": "Elijah Davis",
        "studentId": "00123404",
        "major": "Computer Science",
        "profilePicture": "/user_icon.webp",
        "morganConnected": False,
    },
    1005: {
        "user_id": 1005,
        "email": "niwil2@morgan.edu",
        "password": _DEFAULT_PASSWORD,
        "role": "student",
        "name": "Nia Wilson",
        "studentId": "00123405",
        "major": "Information Systems",
        "profilePicture": "/user_icon.webp",
        "morganConnected": False,
    },
    1006: {
        "user_id": 1006,
        "email": "matho54@morgan.edu",
        "password": _DEFAULT_PASSWORD,
        "role": "student",
        "name": "Malik Thomas",
        "studentId": "00123406",
        "major": "Computer Science",
        "profilePicture": "/user_icon.webp",
        "morganConnected": False,
    },
    1007: {
        "user_id": 1007,
        "email": "zoand21@morgan.edu",
        "password": _DEFAULT_PASSWORD,
        "role": "student",
        "name": "Zoe Anderson",
        "studentId": "00123407",
        "major": "Computer Science",
        "profilePicture": "/user_icon.webp",
        "morganConnected": False,
    },
    1008: {
        "user_id": 1008,
        "email": "caleb.martin@morgan.edu",
        "password": _DEFAULT_PASSWORD,
        "role": "student",
        "name": "Caleb Martin",
        "studentId": "00123408",
        "major": "Computer Science",
        "profilePicture": "/user_icon.webp",
        "morganConnected": False,
    },
    1009: {
        "user_id": 1009,
        "email": "iman.jackson@morgan.edu",
        "password": _DEFAULT_PASSWORD,
        "role": "student",
        "name": "Iman Jackson",
        "studentId": "00123409",
        "major": "Computer Science",
        "profilePicture": "/user_icon.webp",
        "morganConnected": False,
    },
    1010: {
        "user_id": 1010,
        "email": "devin.white@morgan.edu",
        "password": _DEFAULT_PASSWORD,
        "role": "student",
        "name": "Devin White",
        "studentId": "00123410",
        "major": "Computer Science",
        "profilePicture": "/user_icon.webp",
        "morganConnected": False,
    },
}


def _public_profile(student: dict[str, Any]) -> dict[str, Any]:
    profile = deepcopy(student)
    profile.pop("password", None)
    return profile


def list_dummy_students() -> list[dict[str, Any]]:
    return [
        {
            "email": student["email"],
            "password": student["password"],
            "name": student["name"],
            "studentId": student["studentId"],
            "major": student["major"],
        }
        for student in _STUDENTS.values()
    ]


def authenticate_dummy_student(email: str, password: str) -> dict[str, Any] | None:
    normalized_email = (email or "").strip().lower()
    for student in _STUDENTS.values():
        if student["email"].lower() == normalized_email and student["password"] == password:
            return _public_profile(student)
    return None


def get_dummy_student(user_id: int | str | None = None, email: str | None = None) -> dict[str, Any] | None:
    try:
        numeric_user_id = int(user_id) if user_id is not None else None
    except (TypeError, ValueError):
        numeric_user_id = None

    if numeric_user_id in _STUDENTS:
        return _public_profile(_STUDENTS[numeric_user_id])

    normalized_email = (email or "").strip().lower()
    if normalized_email:
        for student in _STUDENTS.values():
            if student["email"].lower() == normalized_email:
                return _public_profile(student)
    return None


def update_dummy_student(user_id: int | str, updates: dict[str, Any]) -> dict[str, Any] | None:
    try:
        numeric_user_id = int(user_id)
    except (TypeError, ValueError):
        return None

    student = _STUDENTS.get(numeric_user_id)
    if not student:
        return None

    for field in ("email", "name", "studentId", "major", "profilePicture", "morganConnected"):
        if field in updates and updates[field] is not None:
            student[field] = updates[field]
    return _public_profile(student)


def dummy_email_exists(email: str, exclude_user_id: int | str | None = None) -> bool:
    normalized_email = (email or "").strip().lower()
    try:
        numeric_exclude_user_id = int(exclude_user_id) if exclude_user_id is not None else None
    except (TypeError, ValueError):
        numeric_exclude_user_id = None

    return any(
        student["email"].lower() == normalized_email and student["user_id"] != numeric_exclude_user_id
        for student in _STUDENTS.values()
    )
