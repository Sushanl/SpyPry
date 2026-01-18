import re
from urllib.parse import urljoin, urlparse

import requests

EMAIL_RE = re.compile(r"[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}")

# quick scoring for best privacy contact
EMAIL_KEYWORDS = [
    ("privacy", 50),
    ("dpo", 40),
    ("dataprotection", 35),
    ("data.protection", 35),
    ("legal", 20),
    ("compliance", 20),
    ("security", 10),
    ("support", 5),
]

# pages we try even if we can't discover links
COMMON_PATHS = [
    "/privacy",
    "/privacy-policy",
    "/privacy_policy",
    "/legal/privacy",
    "/legal",
    "/terms",
    "/contact",
    "/contact-us",
    "/help",
]


def _normalize_base(url: str) -> str:
    u = url.strip()
    if not u.startswith("http"):
        u = "https://" + u
    parsed = urlparse(u)
    base = f"{parsed.scheme}://{parsed.netloc}"
    return base


def _fetch(url: str, timeout: int = 10) -> str | None:
    try:
        r = requests.get(
            url,
            timeout=timeout,
            headers={"User-Agent": "Mozilla/5.0 (hackathon; privacy-finder)"},
            allow_redirects=True,
        )
        if r.status_code >= 400:
            return None
        return r.text or ""
    except Exception:
        return None


def _extract_links(html: str) -> list[str]:
    # naive href extractor, avoids extra deps
    # captures href="..." or href='...'
    pattern = r'href\s*=\s*["\']([^"\']+)["\']'
    hrefs = re.findall(pattern, html, flags=re.IGNORECASE)
    return hrefs


def _is_same_domain(base: str, candidate: str) -> bool:
    b = urlparse(base).netloc
    c = urlparse(candidate).netloc
    return (not c) or (c == b)


def _score_email(email: str) -> int:
    e = email.lower()
    score = 0
    local = e.split("@", 1)[0]
    for kw, pts in EMAIL_KEYWORDS:
        if kw in local:
            score += pts
    return score


def find_privacy_policy_and_email(company_website_url: str) -> dict:
    """
    Returns dict:
      {
        "base_url": ...,
        "privacy_policy_url": str|None,
        "privacy_contact_email": str|None,
        "candidates": { "emails": [...], "pages_checked": [...] }
      }
    """
    base = _normalize_base(company_website_url)

    pages_checked: list[str] = []
    email_candidates: set[str] = set()
    policy_url: str | None = None

    # 1) fetch homepage and discover relevant links
    homepage = _fetch(base)
    if homepage:
        pages_checked.append(base)
        for e in EMAIL_RE.findall(homepage):
            email_candidates.add(e)

        hrefs = _extract_links(homepage)
        # look for likely privacy/contact/legal links
        likely = []
        for h in hrefs:
            if not h or h.startswith("mailto:") or h.startswith("javascript:"):
                continue
            keywords = ["privacy", "legal", "terms", "contact"]
            if any(k in h.lower() for k in keywords):
                abs_url = urljoin(base, h)
                if _is_same_domain(base, abs_url):
                    likely.append(abs_url)

        # de-dupe, keep small
        seen = set()
        likely_pages = []
        for u in likely:
            if u in seen:
                continue
            seen.add(u)
            likely_pages.append(u)
            if len(likely_pages) >= 8:
                break

        # 2) crawl likely pages for emails and pick a privacy policy URL
        for u in likely_pages:
            html = _fetch(u)
            if not html:
                continue
            pages_checked.append(u)

            if policy_url is None and "privacy" in u.lower():
                policy_url = u

            for e in EMAIL_RE.findall(html):
                email_candidates.add(e)

    # 3) if still missing, try common paths directly
    for path in COMMON_PATHS:
        if len(pages_checked) >= 12:
            break
        u = urljoin(base, path)
        if u in pages_checked:
            continue
        html = _fetch(u)
        if not html:
            continue
        pages_checked.append(u)

        if policy_url is None and "privacy" in path:
            policy_url = u

        for e in EMAIL_RE.findall(html):
            email_candidates.add(e)

    # 4) pick best privacy email
    best_email = None
    if email_candidates:
        scored = sorted(
            [(e, _score_email(e)) for e in email_candidates],
            key=lambda x: x[1],
            reverse=True,
        )
        # prefer any email with nonzero score, else just first
        best_email = scored[0][0] if scored else None

    # 5) Fallback: if we have a privacy policy URL but no email,
    # try to extract from privacy policy page
    if not best_email and policy_url:
        privacy_html = _fetch(policy_url)
        if privacy_html:
            privacy_emails = EMAIL_RE.findall(privacy_html)
            if privacy_emails:
                scored = sorted(
                    [(e, _score_email(e)) for e in privacy_emails],
                    key=lambda x: x[1],
                    reverse=True,
                )
                best_email = scored[0][0] if scored else None

    return {
        "base_url": base,
        "privacy_policy_url": policy_url,
        "privacy_contact_email": best_email,
        "candidates": {
            "emails": sorted(email_candidates),
            "pages_checked": pages_checked,
        },
    }
