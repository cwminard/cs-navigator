# backend/routers/auth.py
# Auth endpoints extracted from main.py: register, verify-email, resend-verification, login.

import os
import re
import time as time_module

from fastapi import APIRouter, HTTPException, Depends, Request, status
from sqlalchemy.orm import Session

from deps import get_db, RegisterRequest, LoginRequest
from dummy_students import authenticate_dummy_student, list_dummy_students
from models import User
from security import hash_password, create_access_token

router = APIRouter(tags=["auth"])

# ---------------------------------------------------------------------------
# Auth-specific constants & rate-limit state
# ---------------------------------------------------------------------------
ALLOWED_EMAIL_DOMAINS = ["morgan.edu"]
_register_timestamps: dict[str, list] = {}


# ---------------------------------------------------------------------------
# POST /api/register
# ---------------------------------------------------------------------------
@router.post("/api/register", status_code=status.HTTP_201_CREATED)
def register(req: RegisterRequest, db: Session = Depends(get_db)):
    from email_service import generate_token, send_verification_email

    email = req.email.strip().lower()

    if not re.match(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$', email):
        raise HTTPException(status_code=400, detail="Invalid email format")

    # Rate limit per EMAIL (not per IP). On campus WiFi all students share one IP,
    # so IP-based limiting blocks innocent users. 3 attempts per email per hour.
    now_ts = time_module.time()
    reg_ts = _register_timestamps.get(email, [])
    reg_ts = [t for t in reg_ts if now_ts - t < 3600]
    if len(reg_ts) >= 3:
        raise HTTPException(status_code=429, detail="Too many attempts for this email. Try again in an hour.")
    reg_ts.append(now_ts)
    _register_timestamps[email] = reg_ts

    # Only allow Morgan State email for new registrations
    email_domain = email.split("@")[-1].lower()
    allow_test = os.getenv("ALLOW_TEST_EMAILS", "false").lower() == "true"
    if email_domain not in ALLOWED_EMAIL_DOMAINS and not (allow_test and email.endswith("@test.com")):
        raise HTTPException(status_code=400, detail="Only @morgan.edu email addresses are allowed.")

    if len(req.password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters")
    if db.query(User).filter(User.email == req.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")

    hashed = hash_password(req.password)
    token = generate_token()
    student = User(
        email=req.email,
        password_hash=hashed,
        role="student",
        email_verified=False,
        verification_token=token,
        name=req.name.strip() if req.name else None,
        student_id=req.student_id.strip() if req.student_id else None,
    )
    db.add(student)
    db.commit()
    db.refresh(student)

    send_verification_email(req.email, token)
    return {"message": "Account created! Check your Morgan State email to verify.", "user_id": student.id}


# ---------------------------------------------------------------------------
# GET /api/verify-email
# ---------------------------------------------------------------------------
@router.get("/api/verify-email")
def verify_email(token: str, db: Session = Depends(get_db)):
    from starlette.responses import RedirectResponse

    user = db.query(User).filter(User.verification_token == token).first()
    if not user:
        raise HTTPException(status_code=400, detail="Invalid or expired verification link")
    user.email_verified = True
    user.verification_token = None
    db.commit()
    # Redirect to login with success flag
    app_url = os.getenv("APP_URL", "https://cs.inavigator.ai")
    return RedirectResponse(url=f"{app_url}/login?verified=true")


# ---------------------------------------------------------------------------
# POST /api/resend-verification
# ---------------------------------------------------------------------------
@router.post("/api/resend-verification")
async def resend_verification(request: Request, db: Session = Depends(get_db)):
    from email_service import generate_token, send_verification_email

    body = await request.json()
    email = body.get("email", "")
    user = db.query(User).filter(User.email == email).first()
    if not user:
        return {"message": "If an account exists, a verification email has been sent."}
    if user.email_verified:
        return {"message": "Email already verified."}
    token = generate_token()
    user.verification_token = token
    db.commit()
    send_verification_email(email, token)
    return {"message": "Verification email sent. Check your inbox."}


# ---------------------------------------------------------------------------
# POST /api/login
# ---------------------------------------------------------------------------
@router.post("/api/login")
def login(req: LoginRequest):
    dummy_user = authenticate_dummy_student(req.email, req.password)
    if not dummy_user:
        raise HTTPException(status_code=401, detail="Invalid dummy student credentials")

    return {
        "access_token": create_access_token(
            {
                "user_id": dummy_user["user_id"],
                "role": dummy_user["role"],
                "email": dummy_user["email"],
                "dummy": True,
            }
        ),
        "token_type": "bearer",
        "student": dummy_user,
    }


@router.get("/api/dummy-students")
def get_dummy_students():
    return {"students": list_dummy_students()}
