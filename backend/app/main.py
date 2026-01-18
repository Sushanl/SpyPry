import os
from datetime import timedelta
from dotenv import load_dotenv

from fastapi import FastAPI, HTTPException, Response, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from google.oauth2 import id_token
from google.auth.transport import requests as grequests

from itsdangerous import URLSafeTimedSerializer, BadSignature, SignatureExpired
from .routes.gmail import router as gmail_router
load_dotenv()

FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")
SESSION_SECRET = os.getenv("SESSION_SECRET", "dev-secret")

if not GOOGLE_CLIENT_ID:
    raise RuntimeError("Missing GOOGLE_CLIENT_ID in .env")

app = FastAPI(title="Hackathon API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_URL],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

serializer = URLSafeTimedSerializer(SESSION_SECRET)
SESSION_COOKIE = "session"
SESSION_MAX_AGE_SECONDS = int(timedelta(days=7).total_seconds())


class GoogleLoginPayload(BaseModel):
    id_token: str


def create_session_cookie(payload: dict) -> str:
    # If payload already looks like a session dict (has "email" but not Google token fields like "iss", "aud")
    # then preserve all data (this is an existing session being updated)
    # Otherwise, extract only user info from Google token payload
    is_session_dict = "email" in payload and "iss" not in payload and "aud" not in payload
    
    if is_session_dict:
        # This is an existing session being updated - preserve all fields (including Gmail tokens)
        session_data = payload
    else:
        # This is a new session from Google token - extract only user info
        # Keep session small; don't dump the entire token
        session_data = {
            "sub": payload.get("sub"),
            "email": payload.get("email"),
            "name": payload.get("name"),
            "picture": payload.get("picture"),
        }
    return serializer.dumps(session_data)


def read_session_cookie(cookie_value: str) -> dict:
    try:
        return serializer.loads(cookie_value, max_age=SESSION_MAX_AGE_SECONDS)
    except SignatureExpired:
        raise HTTPException(status_code=401, detail="Session expired")
    except BadSignature:
        raise HTTPException(status_code=401, detail="Invalid session")


@app.get("/health")
def health():
    return {"ok": True}


@app.post("/auth/google")
def auth_google(body: GoogleLoginPayload, response: Response):
    try:
        payload = id_token.verify_oauth2_token(
            body.id_token,
            grequests.Request(),
            GOOGLE_CLIENT_ID,
        )
    except Exception:
        # Don't leak details; just fail
        raise HTTPException(status_code=401, detail="Invalid Google token")

    # Basic checks (google-auth already checks signature/exp/aud)
    if payload.get("email") is None:
        raise HTTPException(status_code=401, detail="No email on token")

    session_value = create_session_cookie(payload)

    # For localhost dev, Secure=False is needed. In production, set Secure=True.
    response.set_cookie(
        key=SESSION_COOKIE,
        value=session_value,
        httponly=True,
        samesite="lax",
        secure=False,
        max_age=SESSION_MAX_AGE_SECONDS,
        path="/",
    )

    return {"ok": True, "user": {"email": payload["email"], "name": payload.get("name")}}


@app.post("/auth/logout")
def logout(response: Response):
    response.delete_cookie(SESSION_COOKIE, path="/")
    return {"ok": True}


@app.get("/me")
def me(request: Request):
    cookie = request.cookies.get(SESSION_COOKIE)
    if not cookie:
        raise HTTPException(status_code=401, detail="Not logged in")
    session = read_session_cookie(cookie)
    return {"user": session}


app.include_router(gmail_router)
