import os
from dotenv import load_dotenv
from fastapi import APIRouter, Request, Response, HTTPException
from fastapi.responses import RedirectResponse
from google_auth_oauthlib.flow import Flow
from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request as GoogleRequest
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
import re
from datetime import datetime
from typing import List, Dict, Any

# Load environment variables
load_dotenv()

router = APIRouter(prefix="/gmail", tags=["gmail"])

FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")
BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:8000")

GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET")

if not GOOGLE_CLIENT_ID or not GOOGLE_CLIENT_SECRET:
    # Don't fail on import, but will fail when routes are called
    pass

SCOPES = ["https://www.googleapis.com/auth/gmail.readonly"]


def make_flow(redirect_uri: str = None) -> Flow:
    if not GOOGLE_CLIENT_ID or not GOOGLE_CLIENT_SECRET:
        raise RuntimeError(
            "GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must be set in .env"
        )
    
    if redirect_uri is None:
        redirect_uri = f"{BACKEND_URL}/gmail/callback"
    
    return Flow.from_client_config(
        {
            "web": {
                "client_id": GOOGLE_CLIENT_ID,
                "client_secret": GOOGLE_CLIENT_SECRET,
                "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                "token_uri": "https://oauth2.googleapis.com/token",
                "redirect_uris": [redirect_uri],
            }
        },
        scopes=SCOPES,
        redirect_uri=redirect_uri,
    )


def get_gmail_credentials(session: dict) -> Credentials | None:
    """Get Gmail credentials from session, refreshing if needed"""
    if not session.get("gmail_access_token"):
        return None
    
    try:
        creds = Credentials(
            token=session.get("gmail_access_token"),
            refresh_token=session.get("gmail_refresh_token"),
            token_uri=session.get("gmail_token_uri", "https://oauth2.googleapis.com/token"),
            client_id=session.get("gmail_client_id", GOOGLE_CLIENT_ID),
            client_secret=session.get("gmail_client_secret", GOOGLE_CLIENT_SECRET),
            scopes=session.get("gmail_scopes", SCOPES),
        )
        
        # Refresh token if expired
        if creds.expired and creds.refresh_token:
            creds.refresh(GoogleRequest())
            # Update session with new token
            session["gmail_access_token"] = creds.token
            if creds.expiry:
                session["gmail_token_expiry"] = creds.expiry.isoformat()
        
        return creds
    except Exception as e:
        print(f"Error getting Gmail credentials: {e}")
        return None


@router.get("/health")
def gmail_health():
    return {"ok": True}


@router.get("/status")
def gmail_status(request: Request):
    """Check if Gmail is connected for the current user"""
    from ..main import read_session_cookie, SESSION_COOKIE
    
    cookie = request.cookies.get(SESSION_COOKIE)
    if not cookie:
        raise HTTPException(status_code=401, detail="Not logged in")
    
    try:
        session = read_session_cookie(cookie)
    except HTTPException:
        raise HTTPException(status_code=401, detail="Invalid session")
    
    has_tokens = bool(session.get("gmail_access_token"))
    
    return {
        "connected": has_tokens,
        "email": session.get("email"),
    }


@router.get("/connect")
def gmail_connect(request: Request):
    from ..main import (
        read_session_cookie,
        create_session_cookie,
        SESSION_COOKIE,
        SESSION_MAX_AGE_SECONDS,
    )

    cookie = request.cookies.get(SESSION_COOKIE)
    if not cookie:
        raise HTTPException(status_code=401, detail="Not logged in")

    session = read_session_cookie(cookie)

    flow = make_flow()
    authorization_url, state = flow.authorization_url(
        access_type="offline",
        prompt="consent",
        include_granted_scopes="true",
    )

    session["gmail_oauth_state"] = state
    session_cookie = create_session_cookie(session)

    redirect = RedirectResponse(authorization_url)  # <-- the response you return
    redirect.set_cookie(                           # <-- set cookie HERE
        key=SESSION_COOKIE,
        value=session_cookie,
        httponly=True,
        samesite="lax",
        secure=False,
        max_age=SESSION_MAX_AGE_SECONDS,
        path="/",
    )
    return redirect


@router.get("/callback")
def gmail_callback(request: Request):
    from ..main import (
        read_session_cookie,
        create_session_cookie,
        SESSION_COOKIE,
        SESSION_MAX_AGE_SECONDS,
    )

    cookie = request.cookies.get(SESSION_COOKIE)
    if not cookie:
        raise HTTPException(status_code=401, detail="Not logged in")

    session = read_session_cookie(cookie)

    state = request.query_params.get("state")
    code = request.query_params.get("code")
    error = request.query_params.get("error")

    if error:
        raise HTTPException(status_code=400, detail=f"OAuth error: {error}")
    if not code or not state:
        raise HTTPException(status_code=400, detail="Missing code or state parameter")

    if session.get("gmail_oauth_state") != state:
        raise HTTPException(status_code=400, detail="Invalid state parameter")

    flow = make_flow()
    flow.fetch_token(code=code)
    credentials = flow.credentials

    session["gmail_access_token"] = credentials.token
    if credentials.refresh_token:
        session["gmail_refresh_token"] = credentials.refresh_token

    session.pop("gmail_oauth_state", None)

    session_cookie = create_session_cookie(session)

    redirect = RedirectResponse(f"{FRONTEND_URL}/dashboard?gmail_connected=true")
    redirect.set_cookie(
        key=SESSION_COOKIE,
        value=session_cookie,
        httponly=True,
        samesite="lax",
        secure=False,
        max_age=SESSION_MAX_AGE_SECONDS,
        path="/",
    )
    return redirect


def extract_domain_from_email(email: str) -> str:
    """Extract domain from email address"""
    if "@" in email:
        return email.split("@")[1].lower()
    return email.lower()


def extract_domain_from_url(url: str) -> str:
    """Extract domain from URL"""
    # Remove protocol
    url = re.sub(r'^https?://', '', url)
    # Remove www.
    url = re.sub(r'^www\.', '', url)
    # Extract domain (everything before first /)
    domain = url.split('/')[0]
    # Remove port if present
    domain = domain.split(':')[0]
    return domain.lower()


def detect_account_from_email(message: Dict[str, Any]) -> Dict[str, Any] | None:
    """Detect account information from an email message"""
    headers = message.get("payload", {}).get("headers", [])
    
    # Get sender
    sender = None
    subject = None
    for header in headers:
        if header.get("name", "").lower() == "from":
            sender = header.get("value", "")
        if header.get("name", "").lower() == "subject":
            subject = header.get("value", "").lower()
    
    if not sender:
        return None
    
    # Extract domain from sender
    domain = extract_domain_from_email(sender)
    
    # Skip common email providers
    common_providers = ["gmail.com", "yahoo.com", "outlook.com", "hotmail.com", "icloud.com", "protonmail.com"]
    if domain in common_providers:
        return None
    
    # Detect evidence types
    evidence = []
    subject_lower = subject or ""
    body_snippet = message.get("snippet", "").lower()
    
    # Check for welcome emails
    welcome_keywords = ["welcome", "thanks for signing up", "account created", "get started", "verify your email"]
    if any(keyword in subject_lower or keyword in body_snippet for keyword in welcome_keywords):
        evidence.append("welcome")
    
    # Check for receipts
    receipt_keywords = ["receipt", "order confirmation", "payment", "invoice", "purchase"]
    if any(keyword in subject_lower or keyword in body_snippet for keyword in receipt_keywords):
        evidence.append("receipt")
    
    # Check for password resets
    reset_keywords = ["reset your password", "password reset", "change password", "reset password"]
    if any(keyword in subject_lower or keyword in body_snippet for keyword in reset_keywords):
        evidence.append("reset")
    
    # Check for login alerts
    login_keywords = ["new login", "login from", "sign in", "security alert", "unusual activity"]
    if any(keyword in subject_lower or keyword in body_snippet for keyword in login_keywords):
        evidence.append("login_alert")
    
    # Only return if we found evidence
    if not evidence:
        return None
    
    # Get date from message
    date_str = None
    for header in headers:
        if header.get("name", "").lower() == "date":
            try:
                date_str = header.get("value", "")
                # Parse date and format as YYYY-MM-DD
                from email.utils import parsedate_to_datetime
                dt = parsedate_to_datetime(date_str)
                date_str = dt.strftime("%Y-%m-%d")
            except:
                pass
            break
    
    # Determine confidence
    confidence = "low"
    if len(evidence) >= 2 or "welcome" in evidence:
        confidence = "high"
    elif len(evidence) == 1:
        confidence = "medium"
    
    return {
        "domain": domain,
        "evidence": evidence,
        "lastSeen": date_str,
        "confidence": confidence,
    }


@router.get("/scan")
def gmail_scan(request: Request):
    """Scan Gmail inbox for account signups"""
    from ..main import read_session_cookie, SESSION_COOKIE
    
    # Check authentication
    cookie = request.cookies.get(SESSION_COOKIE)
    if not cookie:
        raise HTTPException(status_code=401, detail="Not logged in")
    
    try:
        session = read_session_cookie(cookie)
    except HTTPException:
        raise HTTPException(status_code=401, detail="Invalid session")
    
    # Get Gmail credentials
    creds = get_gmail_credentials(session)
    if not creds:
        raise HTTPException(status_code=403, detail="Gmail not connected. Please connect your Gmail account first.")
    
    try:
        # Build Gmail service
        service = build("gmail", "v1", credentials=creds)
        
        # Search for signup-related emails
        # Look for emails with common signup keywords
        query = "from:(noreply OR no-reply OR welcome OR support) (welcome OR \"sign up\" OR \"account created\" OR \"verify\" OR receipt OR \"order confirmation\")"
        
        # Get messages
        results = service.users().messages().list(userId="me", q=query, maxResults=500).execute()
        messages = results.get("messages", [])
        
        # Process messages to extract account information
        accounts: Dict[str, Dict[str, Any]] = {}
        
        for msg in messages[:200]:  # Limit to 200 messages for performance
            try:
                message = service.users().messages().get(userId="me", id=msg["id"]).execute()
                account_info = detect_account_from_email(message)
                
                if account_info:
                    domain = account_info["domain"]
                    if domain not in accounts:
                        accounts[domain] = {
                            "domain": domain,
                            "displayName": domain.split(".")[0].title(),
                            "confidence": account_info["confidence"],
                            "evidence": account_info["evidence"],
                            "lastSeen": account_info["lastSeen"],
                            "count": 1,
                        }
                    else:
                        # Update with most recent date and merge evidence
                        existing = accounts[domain]
                        if account_info["lastSeen"] and (not existing["lastSeen"] or account_info["lastSeen"] > existing["lastSeen"]):
                            existing["lastSeen"] = account_info["lastSeen"]
                        existing["evidence"] = list(set(existing["evidence"] + account_info["evidence"]))
                        existing["count"] = existing.get("count", 1) + 1
                        # Upgrade confidence if we have more evidence
                        if len(existing["evidence"]) >= 2:
                            existing["confidence"] = "high"
            except Exception as e:
                print(f"Error processing message {msg.get('id')}: {e}")
                continue
        
        # Convert to list and sort by count (most frequent first)
        result_list = list(accounts.values())
        result_list.sort(key=lambda x: x.get("count", 0), reverse=True)
        
        # Update session with refreshed token if it was refreshed
        if creds.token != session.get("gmail_access_token"):
            session["gmail_access_token"] = creds.token
            if creds.expiry:
                session["gmail_token_expiry"] = creds.expiry.isoformat()
            from ..main import create_session_cookie, SESSION_MAX_AGE_SECONDS
            session_cookie = create_session_cookie(session)
            # Note: We can't update the cookie in a GET request response easily
            # The token refresh will be saved on next request
        
        return result_list
        
    except HttpError as error:
        raise HTTPException(
            status_code=500, detail=f"Gmail API error: {str(error)}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to scan emails: {str(e)}"
        )
