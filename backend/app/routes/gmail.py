from fastapi import APIRouter

router = APIRouter(prefix="/gmail", tags=["gmail"])


@router.get("/health")
def gmail_health():
    return {"ok": True}

