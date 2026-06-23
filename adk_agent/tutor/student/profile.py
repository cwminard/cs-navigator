"""Student profile model and Firestore CRUD operations."""

import os
from datetime import datetime, timezone
from typing import Any

PROJECT_ID = os.getenv("GOOGLE_CLOUD_PROJECT", "")
COLLECTION = "students"

try:
    from google.cloud import firestore
except Exception:  # pragma: no cover - fallback for environments without the client library
    firestore = None

_MEMORY_STORE: dict[str, dict[str, Any]] = {}


def _get_db():
    if firestore is None:
        return None
    return firestore.Client(project=PROJECT_ID)


def get_student_profile(canvas_user_id: str) -> dict:
    """Load a student's profile from Firestore.

    Returns the profile dict, or a default empty profile if none exists.
    """
    db = _get_db()
    if db is None:
        profile = _MEMORY_STORE.get(canvas_user_id, {})
        return {
            "canvas_user_id": canvas_user_id,
            "enrolled_courses": profile.get("enrolled_courses", []),
            "quiz_history": profile.get("quiz_history", []),
            "weak_topics": profile.get("weak_topics", []),
            "strong_topics": profile.get("strong_topics", []),
            "sessions": profile.get("sessions", []),
            "last_active": profile.get("last_active"),
            "created_at": profile.get("created_at", datetime.now(timezone.utc).isoformat()),
        }

    doc = db.collection(COLLECTION).document(canvas_user_id).get()
    if doc.exists:
        return doc.to_dict()
    return {
        "canvas_user_id": canvas_user_id,
        "enrolled_courses": [],
        "quiz_history": [],
        "weak_topics": [],
        "strong_topics": [],
        "sessions": [],
        "last_active": None,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }


def save_student_profile(canvas_user_id: str, profile: dict) -> None:
    """Save or update a student's profile in Firestore."""
    db = _get_db()
    profile["last_active"] = datetime.now(timezone.utc).isoformat()
    if db is None:
        _MEMORY_STORE[canvas_user_id] = {**_MEMORY_STORE.get(canvas_user_id, {}), **profile}
        return

    db.collection(COLLECTION).document(canvas_user_id).set(profile, merge=True)


def update_enrolled_courses(canvas_user_id: str, courses: list[dict]) -> None:
    """Update the student's enrolled courses list."""
    db = _get_db()
    if db is None:
        _MEMORY_STORE[canvas_user_id] = {**_MEMORY_STORE.get(canvas_user_id, {}), "enrolled_courses": courses, "last_active": datetime.now(timezone.utc).isoformat()}
        return

    db.collection(COLLECTION).document(canvas_user_id).set(
        {
            "enrolled_courses": courses,
            "last_active": datetime.now(timezone.utc).isoformat(),
        },
        merge=True,
    )


def add_quiz_result(canvas_user_id: str, result: dict) -> None:
    """Append a quiz result to the student's history.

    result should contain: topic, score, total, missed_concepts, timestamp
    """
    db = _get_db()
    result["timestamp"] = datetime.now(timezone.utc).isoformat()
    if db is None:
        profile = _MEMORY_STORE.get(canvas_user_id, {})
        profile.setdefault("quiz_history", []).append(result)
        profile["last_active"] = datetime.now(timezone.utc).isoformat()
        _MEMORY_STORE[canvas_user_id] = profile
        return

    db.collection(COLLECTION).document(canvas_user_id).update(
        {"quiz_history": firestore.ArrayUnion([result])}
    )


def update_topic_mastery(canvas_user_id: str, weak: list[str], strong: list[str]) -> None:
    """Set the student's current weak and strong topic lists."""
    db = _get_db()
    if db is None:
        _MEMORY_STORE[canvas_user_id] = {
            **_MEMORY_STORE.get(canvas_user_id, {}),
            "weak_topics": weak,
            "strong_topics": strong,
            "last_active": datetime.now(timezone.utc).isoformat(),
        }
        return

    db.collection(COLLECTION).document(canvas_user_id).set(
        {
            "weak_topics": weak,
            "strong_topics": strong,
            "last_active": datetime.now(timezone.utc).isoformat(),
        },
        merge=True,
    )


def log_session(canvas_user_id: str, session_data: dict) -> None:
    """Log a tutoring session."""
    db = _get_db()
    session_data["timestamp"] = datetime.now(timezone.utc).isoformat()
    if db is None:
        profile = _MEMORY_STORE.get(canvas_user_id, {})
        profile.setdefault("sessions", []).append(session_data)
        profile["last_active"] = datetime.now(timezone.utc).isoformat()
        _MEMORY_STORE[canvas_user_id] = profile
        return

    db.collection(COLLECTION).document(canvas_user_id).update(
        {"sessions": firestore.ArrayUnion([session_data])}
    )
