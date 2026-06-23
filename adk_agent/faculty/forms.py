"""
CS Department form definitions and requirements.
No mock student data — the student provides their own context in conversation.
"""

REQUIRED_FORMS = {
    "freshman": [
        "internship_form",
        "advising_form",
    ],
    "sophomore": [
        "internship_form",
        "advising_form",
    ],
    "junior": [
        "internship_form",
        "advising_form",
    ],
    "senior": [
        "internship_form",
        "advising_form",
    ],
}

FORM_DETAILS = {
    "internship_form": {
        "name": "Internship Form",
        "description": "Form for documenting and approving internship experiences.",
        "due": "Before starting the internship",
        "url": "https://www.morgan.edu/school-of-computer-mathematical-and-natural-sciences/students/scmns-advising/internship-form",
    },
    "advising_form": {
        "name": "Advising Form",
        "description": "Form for scheduling and documenting academic advising sessions.",
        "due": "As needed",
        "url": "https://www.morgan.edu/school-of-computer-mathematical-and-natural-sciences/students/scmns-advising/advising-form",
    }
    
}
