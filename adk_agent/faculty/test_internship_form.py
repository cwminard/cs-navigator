from faculty.internship_form import build_internship_form_draft, get_internship_form_schema


def test_get_internship_form_schema_includes_core_fields():
    schema = get_internship_form_schema()

    assert schema["name"].startswith("Academic Year 2025/2026")
    field_ids = {
        field["field_id"]
        for section in schema["sections"]
        for field in section["fields"]
    }
    assert "first_name" in field_ids
    assert "participated_in_experience" in field_ids
    assert "had_second_experience" in field_ids


def test_build_internship_form_draft_flags_missing_conditional_fields():
    result = build_internship_form_draft(
        {
            "first_name": "Ava",
            "last_name": "Brown",
            "gender": "Female",
            "major": "Computer Science",
            "transfer_student": "No",
            "clubs_and_organization_interests": ["Women in Computer Science"],
            "career_interest": "Developer",
            "knows_graduate_programs": "Yes",
            "want_on_campus_research": "Maybe",
            "participated_in_experience": "Yes",
            "experience_type": "STEM Research",
            "experience_sector": "College/University",
            "organization_name": "Morgan State University",
            "job_title": "Research Assistant",
            "address": "Baltimore, MD",
            "relevance_to_education": "Very relevant",
            "science_math_enhancement": "Yes",
            "permanent_job_future_career_prep": "Yes",
            "had_second_experience": "No",
        }
    )

    assert result["completed"] is False
    missing_labels = {item["label"] for item in result["missing_fields"]}
    assert "Research Mentor's First and Last Name" in missing_labels
    assert "Name of Program (e.g. Emory SURP program)" in missing_labels


def test_build_internship_form_draft_completes_with_minimal_answers():
    result = build_internship_form_draft(
        {
            "first_name": "Ava",
            "last_name": "Brown",
            "gender": "Female",
            "major": "Computer Science",
            "transfer_student": "No",
            "clubs_and_organization_interests": ["Women in Computer Science"],
            "career_interest": "Developer",
            "knows_graduate_programs": "Yes",
            "want_on_campus_research": "Maybe",
            "did_present_research_this_year": "No",
            "had_publication_this_year": "No",
            "participated_in_experience": "I did not apply",
            "had_second_experience": "No",
        }
    )

    assert result["completed"] is True