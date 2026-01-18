from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from urllib.parse import urlparse

from ..ai.privacy_finder import find_privacy_policy_and_email
from ..ai.letter_generator import generate_letter_xml, parse_result_xml

router = APIRouter(prefix="/letter", tags=["letter"])


class GenerateLetterRequest(BaseModel):
    company_name: str = Field(..., min_length=2)
    company_website_url: str = Field(..., min_length=4)
    product_or_service_used: str = ""
    user_full_name: str = ""
    user_email: str = ""


@router.post("/generate")
def generate_letter_route(body: GenerateLetterRequest):
    # Step A: deterministic lookup (no guessing)
    found = find_privacy_policy_and_email(body.company_website_url)

    policy_url = found.get("privacy_policy_url")
    contact_email = found.get("privacy_contact_email")

    # If we can't find privacy policy URL, return error
    if not policy_url:
        return {
            "ok": False,
            "missing": {
                "privacy_policy_url": True,
                "privacy_contact_email": contact_email is None,
            },
            "found": found,
        }

    # If we have policy URL but no email, try common email patterns
    if not contact_email:
        parsed = urlparse(found["base_url"])
        domain = parsed.netloc.replace("www.", "")
        common_emails = [
            f"privacy@{domain}",
            f"dpo@{domain}",
            f"dataprotection@{domain}",
            f"legal@{domain}",
        ]
        contact_email = common_emails[0]
        found["privacy_contact_email_estimated"] = True

    # Step B: LLM writes letter using provided facts
    raw_xml = generate_letter_xml(
        company_name=body.company_name,
        company_website_url=found["base_url"],
        privacy_policy_url=policy_url,
        privacy_contact_email=contact_email,
        product_or_service_used=body.product_or_service_used,
        user_full_name=body.user_full_name,
        user_email=body.user_email,
    )

    try:
        parsed_result = parse_result_xml(raw_xml)
        letter, email_address_parsed, company_name_out, subject = parsed_result
    except ValueError as e:
        raise HTTPException(status_code=500, detail=str(e))

    # Fallback: Use the found email if LLM didn't use it correctly
    final_email = contact_email
    if email_address_parsed:
        email_lower = email_address_parsed.lower()
        contact_lower = contact_email.lower()
        if email_lower != contact_lower:
            # Check if parsed email is similar or if it's clearly wrong
            if contact_lower in email_lower or "@" not in email_address_parsed:
                final_email = contact_email
            else:
                # LLM might have found a different valid email, use it
                final_email = email_address_parsed

    return {
        "ok": True,
        "email_address": final_email,
        "company_name": company_name_out or body.company_name,
        "email_subject": subject,
        "letter": letter,
        "debug": {"privacy_policy_url": policy_url},
    }
