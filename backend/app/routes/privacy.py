import os, json, re
from urllib.parse import urlparse

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from openai import OpenAI

client = OpenAI(api_key=os.environ["OPENAI_API_KEY"])
router = APIRouter(prefix="/privacy", tags=["privacy"])


class FindBody(BaseModel):
    domain: str


def normalize_domain(d: str) -> str:
    d = d.strip().lower()
    d = d.replace("https://", "").replace("http://", "")
    return d.strip("/")


def host_ok(url: str, domain: str) -> bool:
    try:
        host = urlparse(url).netloc.lower()
        return host == domain or host.endswith("." + domain)
    except Exception:
        return False


def extract_json(s: str) -> str:
    # Remove ```json ... ``` or ``` ... ```
    s = re.sub(r"^```(?:json)?\s*", "", s.strip(), flags=re.IGNORECASE)
    s = re.sub(r"\s*```$", "", s.strip())

    # If there's extra text, extract the first {...} block
    m = re.search(r"\{.*\}", s, flags=re.DOTALL)
    if m:
        return m.group(0)
    return s


@router.post("/find_delete_link")
def find_delete_link(body: FindBody):
    domain = normalize_domain(body.domain)

    queries = [
        f"site:{domain} delete account",
        f"site:{domain} close account",
        f"site:{domain} deactivate account",
        f"site:{domain} remove account",
        f"site:{domain} account deletion",
    ]

    schema = """Return STRICT JSON only (no markdown, no code fences, no extra text):
{
  "domain": string,
  "best_url": string|null,
  "purpose": "account_delete"|"privacy_rights"|"contact_support"|"unknown",
  "confidence": number,
  "steps": string[],
  "evidence": [{"title": string, "url": string, "snippet": string}],
  "notes": string
}
Rules:
- Only output URLs that are on the domain (same domain or subdomain).
- If you can’t find an on-domain delete link, choose the best on-domain support/contact page and set purpose="contact_support".
"""

    resp = client.responses.create(
        model="gpt-4.1-mini",
        tools=[{"type": "web_search"}],
        input=[
            {
                "role": "system",
                "content": "Return STRICT JSON only. No markdown, no code fences, no commentary. Do not invent links."
            },
            {
                "role": "user",
                "content": f"{schema}\nDomain: {domain}\nQueries: {json.dumps(queries)}"
            }
        ],
        temperature=0.2,
    )

    text = resp.output_text.strip()

    try:
        data = json.loads(extract_json(text))
    except Exception:
        raise HTTPException(
            status_code=500,
            detail=f"LLM did not return valid JSON. Got: {text[:400]}"
        )

    # Guardrail: ensure best_url is on-domain
    best = data.get("best_url")
    if best and not host_ok(best, domain):
        data["notes"] = (data.get("notes") or "") + " Best URL was not on the provided domain; clearing."
        data["best_url"] = None
        data["purpose"] = "unknown"
        data["confidence"] = 0.2

    return data
