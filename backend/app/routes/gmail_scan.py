import re
from datetime import timezone, datetime
from email.utils import parsedate_to_datetime
from typing import Optional

from fastapi import APIRouter, Request, HTTPException
from googleapiclient.discovery import build

# import your existing token loader from gmail.py
from .gmail import load_creds

router = APIRouter(prefix="/gmail", tags=["gmail"])

SIGNUP_QUERY = (
    'newer_than:{years}y '
    '(subject:(welcome OR verify OR verification OR confirm OR activate OR "account created" OR "confirm your email") '
    'OR "verify your email" OR "confirm your email" OR "activation link") '
    '-category:promotions'
)


def hdr(headers: list[dict], name: str) -> str:
    for h in headers or []:
        if h.get("name", "").lower() == name.lower():
            return h.get("value", "") or ""
    return ""


def parse_email_date(date_str: str) -> Optional[datetime]:
    if not date_str:
        return None
    try:
        dt = parsedate_to_datetime(date_str)
        if dt is None:
            return None
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt.astimezone(timezone.utc)
    except Exception:
        return None


def extract_domain_from_from_header(from_value: str) -> Optional[str]:
    m = re.search(r"<([^>]+)>", from_value or "")
    email = (m.group(1) if m else (from_value or "")).strip()
    if "@" not in email:
        return None
    return email.split("@")[-1].lower()


def normalize_domain(domain: str) -> str:
    domain = domain.lower().strip()
    for prefix in ["mail.", "email.", "emails.", "notify.", "notifications.", "noreply.", "no-reply."]:
        if domain.startswith(prefix):
            return domain[len(prefix):]
    return domain


@router.get("/scan")
def scan_accounts(request: Request, years: int = 5, limit: int = 300):
    session_id = request.cookies.get("gmail_session_id")
    if not session_id:
        raise HTTPException(401, "Missing session cookie")

    creds = load_creds(session_id)
    if not creds:
        raise HTTPException(401, "Not connected to Gmail")

    service = build("gmail", "v1", credentials=creds)
    q = SIGNUP_QUERY.format(years=years)

    listing = service.users().messages().list(
        userId="me",
        q=q,
        maxResults=min(limit, 500),
    ).execute()

    msgs = listing.get("messages", [])

    # domain -> best record (oldest date)
    best_by_domain: dict[str, dict] = {}

    for m in msgs:
        msg = service.users().messages().get(
            userId="me",
            id=m["id"],
            format="metadata",
            metadataHeaders=["From", "Subject", "Date"],
        ).execute()

        headers = msg.get("payload", {}).get("headers", [])
        frm = hdr(headers, "From")
        date_raw = hdr(headers, "Date")

        domain = extract_domain_from_from_header(frm)
        if not domain:
            continue
        domain = normalize_domain(domain)

        dt = parse_email_date(date_raw)
        if not dt:
            continue

        existing = best_by_domain.get(domain)
        if (existing is None) or (dt < existing["_dt"]):
            best_by_domain[domain] = {
                "domain": domain,
                "displayName": domain.split(".")[0].capitalize(),
                "confidence": "high",
                "evidence": ["welcome"],
                "lastSeen": dt.date().isoformat(),  # yyyy-mm-dd
                "_dt": dt,
            }

    results = []
    for v in best_by_domain.values():
        v.pop("_dt", None)
        results.append(v)

    results.sort(key=lambda x: x.get("lastSeen") or "9999-12-31")
    return results
