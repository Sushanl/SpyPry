import os
import secrets
from fastapi import APIRouter, Request, HTTPException
from fastapi.responses import RedirectResponse
from google_auth_oauthlib.flow import Flow
from typing import Dict
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
import json
from pathlib import Path


router = APIRouter(prefix="/gmail", tags=["gmail"])

GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET")
BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:8000")
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173") + "/dashboard"

SCOPES = [
    "openid",
    "https://www.googleapis.com/auth/userinfo.email",
    "https://www.googleapis.com/auth/userinfo.profile",
    "https://www.googleapis.com/auth/gmail.readonly",
]


TOK_DIR = Path(".gmail_tokens")
TOK_DIR.mkdir(exist_ok=True)


def save_creds(session_id: str, creds: Credentials) -> None:
    (TOK_DIR / f"{session_id}.json").write_text(creds.to_json())


def load_creds(session_id: str) -> Credentials | None:
    p = TOK_DIR / f"{session_id}.json"
    if not p.exists():
        return None
    data = json.loads(p.read_text())
    return Credentials(**data)


def make_flow(redirect_uri: str) -> Flow:
    if not GOOGLE_CLIENT_ID or not GOOGLE_CLIENT_SECRET:
        raise RuntimeError("Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET")

    client_config = {
        "web": {
            "client_id": GOOGLE_CLIENT_ID,
            "client_secret": GOOGLE_CLIENT_SECRET,
            "auth_uri": "https://accounts.google.com/o/oauth2/auth",
            "token_uri": "https://oauth2.googleapis.com/token",
        }
    }

    return Flow.from_client_config(
        client_config=client_config,
        scopes=SCOPES,
        redirect_uri=redirect_uri,
    )


@router.get("/connect")
def gmail_connect(request: Request):
    # MUST match Google Console "Authorized redirect URIs" exactly:
    redirect_uri = f"{BACKEND_URL}/gmail/callback"

    flow = make_flow(redirect_uri)

    # CSRF protection (store state server-side; cookie is fine for hackathon)
    state = secrets.token_urlsafe(24)

    auth_url, _ = flow.authorization_url(
        access_type="offline",         # optional for hackathon, useful for refresh token
        include_granted_scopes="true",
        prompt="consent",              # helps ensure refresh token sometimes
        state=state,
    )

    resp = RedirectResponse(url=auth_url, status_code=302)
    resp.set_cookie(
        key="gmail_oauth_state",
        value=state,
        httponly=True,
        secure=False,  # set True if using https
        samesite="lax",
        max_age=10 * 60,
    )
    return resp


@router.get("/callback")
def gmail_callback(request: Request):
    # 1) Validate required query params
    code = request.query_params.get("code")
    state = request.query_params.get("state")
    error = request.query_params.get("error")

    if error:
        # User denied consent or Google error
        return RedirectResponse(f"{FRONTEND_URL}/?gmail=denied", status_code=302)

    if not code or not state:
        raise HTTPException(status_code=400, detail="Missing code/state in callback")

    # 2) CSRF check: compare returned state with cookie set in /connect
    cookie_state = request.cookies.get("gmail_oauth_state")
    if not cookie_state or cookie_state != state:
        raise HTTPException(status_code=400, detail="Invalid OAuth state")

    # 3) Exchange code for tokens
    redirect_uri = f"{BACKEND_URL}/gmail/callback"
    flow = make_flow(redirect_uri)

    try:
        flow.fetch_token(code=code)
    except Exception as e:
        # If you get 500s, it’s usually here: redirect mismatch, bad secret, etc.
        raise HTTPException(status_code=500, detail=f"Token exchange failed: {e}")

    creds: Credentials = flow.credentials

    # 4) Create a session id + store tokens in memory
    session_id = request.cookies.get("gmail_session_id") or secrets.token_urlsafe(24)
    save_creds(session_id, creds)


    # 5) Redirect to frontend, set session cookie
    resp = RedirectResponse(f"{FRONTEND_URL}/?gmail=connected", status_code=302)
    resp.set_cookie(
        key="gmail_session_id",
        value=session_id,
        httponly=True,
        secure=False,   # True if https
        samesite="lax",
        max_age=7 * 24 * 60 * 60,
    )
    # Clear the temporary oauth state cookie
    resp.delete_cookie("gmail_oauth_state")
    return resp


@router.get("/messages")
def list_messages(request: Request):
    session_id = request.cookies.get("gmail_session_id")
    if not session_id:
        raise HTTPException(401, "Missing session cookie")

    creds = load_creds(session_id)
    if not creds:
        raise HTTPException(401, "Not connected to Gmail")

    service = build("gmail", "v1", credentials=creds)
    return service.users().messages().list(userId="me", maxResults=5).execute()


@router.get("/status")
def gmail_status(request: Request):
    session_id = request.cookies.get("gmail_session_id")
    if not session_id:
        return {"connected": False}

    creds = load_creds(session_id)
    if not creds:
        return {"connected": False}

    return {"connected": True}


@router.post("/disconnect")
def gmail_disconnect(request: Request):
    from fastapi import Response
    
    session_id = request.cookies.get("gmail_session_id")
    if session_id:
        p = TOK_DIR / f"{session_id}.json"
        if p.exists():
            p.unlink()
    
    resp = Response(content='{"ok": true}', media_type="application/json")
    resp.delete_cookie("gmail_session_id", path="/")
    return resp
