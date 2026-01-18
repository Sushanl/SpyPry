from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

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

    # If we can't find required fields, return a structured “missing”
    if not policy_url or not contact_email:
        return {
            "ok": False,
            "missing": {
                "privacy_policy_url": policy_url is None,
                "privacy_contact_email": contact_email is None,
            },
            "found": found,  # useful for debugging in UI
        }

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
        letter, email_address_parsed, company_name_out, subject = parse_result_xml(raw_xml)
    except ValueError as e:
        # If model returned MISSING_FIELDS or malformed output
        raise HTTPException(status_code=500, detail=str(e))

    # Fallback: Use the found email if LLM didn't use it correctly
    # This ensures accuracy even if the LLM makes a mistake
    final_email = contact_email
    if email_address_parsed and email_address_parsed.lower() != contact_email.lower():
        # Check if parsed email is similar or if it's clearly wrong
        if contact_email.lower() in email_address_parsed.lower() or "@" not in email_address_parsed:
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
