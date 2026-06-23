"""Internship form schema and draft helpers for the faculty advisor agent.

The form was scraped from a Smartsheet HTML export. The agent uses this
schema to ask the student one question at a time and to assemble a
structured draft from the answers the student provides in chat.
"""

from __future__ import annotations

from copy import deepcopy
from typing import Any


INTERNSHIP_FORM_SCHEMA: dict[str, Any] = {
    "form_id": "academic_year_2025_2026_internship_research_job_experience",
    "name": "Academic Year 2025/2026 Internship, Research, Job Experience Form",
    "source": "scraped Smartsheet HTML",
    "purpose": (
        "Collect internship, research, and job experience details for the "
        "Morgan State SCMNS advising period."
    ),
    "sections": [
        {
            "section_id": "student_profile",
            "title": "Student profile",
            "fields": [
                {"field_id": "first_name", "label": "First Name", "type": "text", "required": True},
                {"field_id": "last_name", "label": "Last Name", "type": "text", "required": True},
                {
                    "field_id": "gender",
                    "label": "Gender",
                    "type": "choice",
                    "required": True,
                    "options": ["Male", "Female", "Non Binary"],
                },
                {
                    "field_id": "major",
                    "label": "Major",
                    "type": "choice",
                    "required": True,
                    "options": [
                        "Actuarial Science",
                        "Biology",
                        "Coastal Science and Policy",
                        "Chemistry",
                        "Cloud Computing",
                        "Computer Science",
                        "Engineering Physics",
                        "Mathematics",
                        "Medical Laboratory Science",
                        "Physics",
                    ],
                },
                {
                    "field_id": "transfer_student",
                    "label": "Are you a transfer student?",
                    "type": "yes_no",
                    "required": True,
                },
                {
                    "field_id": "clubs_and_organization_interests",
                    "label": "SCMNS Clubs or Organization Interests",
                    "type": "multi_choice",
                    "required": True,
                    "options": [
                        "Not Interested in any SCMNS Clubs",
                        "Astronomy Club",
                        "Biology Club",
                        "Chemistry Club",
                        "Math Club",
                        "Medical Laboratory Science Club",
                        "POWER - SCMNS Black Male Initiative",
                        "PreDental Society",
                        "PreMed Program",
                        "Society of Physics Students",
                        "Rocket Club",
                        "Society for the Advancement of Computer Science",
                        "Women in Computer Science",
                    ],
                },
                {
                    "field_id": "career_interest",
                    "label": "Career Interest",
                    "type": "choice",
                    "required": True,
                    "options": [
                        "Analyst",
                        "Cosmetic Chemist",
                        "Dentist",
                        "Developer",
                        "Environmental Scientist",
                        "Marine Scientist",
                        "Medical Doctor",
                        "Pharmacist",
                        "Researcher",
                        "Scientist",
                        "Teacher",
                        "Unsure of Career Interest",
                        "Vet",
                        "Other",
                    ],
                },
                {
                    "field_id": "knows_graduate_programs",
                    "label": "Did you know that SCMNS has graduate programs?",
                    "type": "yes_no",
                    "required": True,
                },
                {
                    "field_id": "want_on_campus_research",
                    "label": "Would you like to conduct research on campus?",
                    "type": "yes_no_maybe",
                    "required": True,
                },
            ],
        },
        {
            "section_id": "experience_summary",
            "title": "Internship, research, and job experience",
            "fields": [
                {
                    "field_id": "did_present_research_this_year",
                    "label": "Did you present research this academic year?",
                    "type": "yes_no",
                    "required": True,
                },
                {
                    "field_id": "number_of_presentations_completed",
                    "label": "Number of research presentations completed",
                    "type": "number",
                    "required": False,
                    "required_when": {"field_id": "did_present_research_this_year", "value": "Yes"},
                },
                {
                    "field_id": "presentation_details",
                    "label": "Presentation details",
                    "type": "text",
                    "required": False,
                    "help_text": "List each presentation with type, title, conference, location, and date.",
                    "required_when": {"field_id": "did_present_research_this_year", "value": "Yes"},
                },
                {
                    "field_id": "had_publication_this_year",
                    "label": "Did you have a publication this academic year?",
                    "type": "yes_no",
                    "required": True,
                },
                {
                    "field_id": "publication_title",
                    "label": "Title of Publication",
                    "type": "text",
                    "required": False,
                    "required_when": {"field_id": "had_publication_this_year", "value": "Yes"},
                },
                {
                    "field_id": "publication_date",
                    "label": "Publication Date",
                    "type": "text",
                    "required": False,
                    "required_when": {"field_id": "had_publication_this_year", "value": "Yes"},
                },
                {
                    "field_id": "publication_location",
                    "label": "Location",
                    "type": "text",
                    "required": False,
                    "required_when": {"field_id": "had_publication_this_year", "value": "Yes"},
                },
                {
                    "field_id": "participated_in_experience",
                    "label": "Participated in Internship/Rsch/Job in 2025/2026?",
                    "type": "choice",
                    "required": True,
                    "options": ["Yes", "I did not apply", "I applied but was not selected"],
                },
                {
                    "field_id": "experience_type",
                    "label": "Type of Experience",
                    "type": "choice",
                    "required": False,
                    "options": [
                        "STEM Internship",
                        "STEM Related Job",
                        "STEM Research",
                        "Non STEM Internship",
                        "Non STEM Job",
                        "Non STEM Research",
                    ],
                    "required_when": {"field_id": "participated_in_experience", "value": "Yes"},
                },
                {
                    "field_id": "experience_sector",
                    "label": "Sector of Internship/Job Experience",
                    "type": "choice",
                    "required": False,
                    "options": ["College/University", "Government Agency", "Private Industry"],
                    "required_when": {"field_id": "participated_in_experience", "value": "Yes"},
                },
                {
                    "field_id": "organization_name",
                    "label": "Name of company, government agency, or institution",
                    "type": "text",
                    "required": False,
                    "required_when": {"field_id": "participated_in_experience", "value": "Yes"},
                },
                {
                    "field_id": "job_title",
                    "label": "Your Intern/Job Title",
                    "type": "text",
                    "required": False,
                    "required_when": {"field_id": "participated_in_experience", "value": "Yes"},
                },
                {
                    "field_id": "program_name",
                    "label": "Name of Program (e.g. Emory SURP program)",
                    "type": "text",
                    "required": False,
                    "required_when": {
                        "field_id": "experience_type",
                        "values": ["STEM Research", "Non STEM Research"],
                    },
                },
                {
                    "field_id": "mentor_name",
                    "label": "Research Mentor's First and Last Name",
                    "type": "text",
                    "required": False,
                    "required_when": {
                        "field_id": "experience_type",
                        "values": ["STEM Research", "Non STEM Research"],
                    },
                },
                {
                    "field_id": "address",
                    "label": "Address",
                    "type": "text",
                    "required": False,
                    "help_text": "City and State",
                    "required_when": {"field_id": "participated_in_experience", "value": "Yes"},
                },
                {
                    "field_id": "relevance_to_education",
                    "label": "Relevance of Experience to Your Education",
                    "type": "text",
                    "required": False,
                    "required_when": {"field_id": "participated_in_experience", "value": "Yes"},
                },
                {
                    "field_id": "science_math_enhancement",
                    "label": "Enhanced Science or Math Education",
                    "type": "yes_no",
                    "required": False,
                    "required_when": {"field_id": "participated_in_experience", "value": "Yes"},
                },
                {
                    "field_id": "permanent_job_future_career_prep",
                    "label": "Permanent Job or Future Career Preparation",
                    "type": "yes_no",
                    "required": False,
                    "required_when": {"field_id": "participated_in_experience", "value": "Yes"},
                },
                {
                    "field_id": "had_second_experience",
                    "label": "Did you have a second internship/research/job?",
                    "type": "yes_no",
                    "required": True,
                },
                {
                    "field_id": "second_experience_type",
                    "label": "Type of Experience (2)",
                    "type": "choice",
                    "required": False,
                    "options": [
                        "STEM Internship",
                        "STEM Related Job",
                        "STEM Research",
                        "Non STEM Internship",
                        "Non STEM Job",
                        "Non STEM Research",
                    ],
                    "required_when": {"field_id": "had_second_experience", "value": "Yes"},
                },
                {
                    "field_id": "second_experience_sector",
                    "label": "Sector of Internship/Job Experience (2)",
                    "type": "choice",
                    "required": False,
                    "options": ["College/University", "Government Agency", "Private Industry"],
                    "required_when": {"field_id": "had_second_experience", "value": "Yes"},
                },
                {
                    "field_id": "second_organization_name",
                    "label": "Name of company, government agency, or institution (2)",
                    "type": "text",
                    "required": False,
                    "required_when": {"field_id": "had_second_experience", "value": "Yes"},
                },
                {
                    "field_id": "second_job_title",
                    "label": "Your Intern/Job Title (2)",
                    "type": "text",
                    "required": False,
                    "required_when": {"field_id": "had_second_experience", "value": "Yes"},
                },
                {
                    "field_id": "second_program_name",
                    "label": "Name of Program (2)",
                    "type": "text",
                    "required": False,
                    "required_when": {
                        "field_id": "second_experience_type",
                        "values": ["STEM Research", "Non STEM Research"],
                    },
                },
                {
                    "field_id": "second_mentor_name",
                    "label": "Research Mentor's First and Last Name (2)",
                    "type": "text",
                    "required": False,
                    "required_when": {
                        "field_id": "second_experience_type",
                        "values": ["STEM Research", "Non STEM Research"],
                    },
                },
                {
                    "field_id": "second_address",
                    "label": "Address (2)",
                    "type": "text",
                    "required": False,
                    "required_when": {"field_id": "had_second_experience", "value": "Yes"},
                },
                {
                    "field_id": "second_relevance_to_education",
                    "label": "Relevance of Experience to Your Education (2)",
                    "type": "text",
                    "required": False,
                    "required_when": {"field_id": "had_second_experience", "value": "Yes"},
                },
                {
                    "field_id": "second_science_math_enhancement",
                    "label": "Enhanced Science or Math Education (2)",
                    "type": "yes_no",
                    "required": False,
                    "required_when": {"field_id": "had_second_experience", "value": "Yes"},
                },
                {
                    "field_id": "second_permanent_job_future_career_prep",
                    "label": "Permanent Job or Future Career Preparation (2)",
                    "type": "yes_no",
                    "required": False,
                    "required_when": {"field_id": "had_second_experience", "value": "Yes"},
                },
            ],
        },
    ],
}


def get_internship_form_schema() -> dict[str, Any]:
    """Return the internship form schema in a machine-readable format."""

    return deepcopy(INTERNSHIP_FORM_SCHEMA)


def build_internship_form_draft(responses: dict[str, Any]) -> dict[str, Any]:
    """Normalize student responses and identify the missing follow-up fields."""

    normalized = {_normalize_key(key): value for key, value in responses.items()}
    field_map = _field_map()

    draft: dict[str, Any] = {}
    for field_id, field in field_map.items():
        value = _lookup_value(field, normalized)
        if value is not None:
            draft[field_id] = value

    missing_fields = []
    for field in field_map.values():
        if _is_required(field, draft):
            value = draft.get(field["field_id"])
            if _is_empty(value):
                missing_fields.append(
                    {
                        "field_id": field["field_id"],
                        "label": field["label"],
                        "type": field["type"],
                    }
                )

    completed_fields = [field_id for field_id, value in draft.items() if not _is_empty(value)]

    return {
        "form_id": INTERNSHIP_FORM_SCHEMA["form_id"],
        "form_name": INTERNSHIP_FORM_SCHEMA["name"],
        "completed": len(missing_fields) == 0,
        "completed_fields": completed_fields,
        "missing_fields": missing_fields,
        "draft": draft,
    }


def _field_map() -> dict[str, dict[str, Any]]:
    fields: dict[str, dict[str, Any]] = {}
    for section in INTERNSHIP_FORM_SCHEMA["sections"]:
        for field in section["fields"]:
            fields[field["field_id"]] = field
    return fields


def _normalize_key(value: Any) -> str:
    return str(value).strip().lower().replace(" ", "_")


def _normalize_value(value: Any) -> Any:
    if isinstance(value, str):
        return value.strip()
    if isinstance(value, list):
        return [item.strip() if isinstance(item, str) else item for item in value]
    return value


def _lookup_value(field: dict[str, Any], normalized: dict[str, Any]) -> Any:
    field_id = field["field_id"]
    label_key = _normalize_key(field["label"])

    for key in (field_id, label_key):
        if key in normalized:
            return _normalize_value(normalized[key])
    return None


def _is_required(field: dict[str, Any], draft: dict[str, Any]) -> bool:
    if field.get("required"):
        return True

    required_when = field.get("required_when")
    if not required_when:
        return False

    source_value = draft.get(required_when["field_id"])
    if source_value is None or _is_empty(source_value):
        return False

    if "value" in required_when:
        return str(source_value).strip().lower() == str(required_when["value"]).strip().lower()

    values = {str(item).strip().lower() for item in required_when.get("values", [])}
    return str(source_value).strip().lower() in values


def _is_empty(value: Any) -> bool:
    if value is None:
        return True
    if isinstance(value, str):
        return not value.strip()
    if isinstance(value, list):
        return len(value) == 0 or all(_is_empty(item) for item in value)
    return False