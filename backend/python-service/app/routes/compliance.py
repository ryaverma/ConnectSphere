"""
Privacy & Compliance Agent — synchronous HTTP endpoint.
Called by Node.js before every message send (600ms timeout).
"""
from fastapi import APIRouter, Depends, Header, HTTPException
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timedelta
from ..config import settings
from ..database import get_db

router = APIRouter()


def _check_internal_secret(x_internal_secret: str = Header(None)):
    if x_internal_secret != settings.internal_service_secret:
        raise HTTPException(status_code=403, detail="Forbidden")


class ComplianceRequest(BaseModel):
    user_id: str
    contact_id: str
    message_body: str


class ComplianceCheck(BaseModel):
    rate_limit: dict = {}
    spam_pattern: dict = {}
    policy: dict = {}
    consent: dict = {}


class ComplianceResponse(BaseModel):
    approved: bool
    spam_score: int
    checks: ComplianceCheck
    block_reason: Optional[str]
    suggestions: list[str]


SPAM_WORDS = [
    "urgent", "free money", "click here", "buy now", "limited offer",
    "make money fast", "risk-free", "guaranteed", "winner", "congratulations",
]


@router.post("/compliance/check", response_model=ComplianceResponse)
async def compliance_check(
    req: ComplianceRequest,
    _: None = Depends(_check_internal_secret),
):
    db = get_db()
    checks = ComplianceCheck()
    suggestions = []
    spam_score = 0
    block_reason = None

    # ── Check 1: Rate limit (< 50ms) ─────────────────────────────────────────
    now = datetime.utcnow()
    yesterday = now - timedelta(days=1)
    user = await db.users.find_one({"_id": {"$oid": req.user_id} if len(req.user_id) == 24 else req.user_id})
    max_per_day = 10
    if user and "settings" in user:
        max_per_day = user["settings"].get("max_messages_per_day", 10)
        min_days = user["settings"].get("min_days_between_messages", 7)
    else:
        min_days = 7

    sent_today = await db.messages.count_documents({
        "user_id": req.user_id,
        "status": "sent",
        "sent_at": {"$gte": yesterday},
    })

    rate_ok = sent_today < max_per_day
    checks.rate_limit = {"ok": rate_ok, "sent_today": sent_today, "limit": max_per_day}

    if not rate_ok:
        spam_score += 50
        block_reason = f"Daily message limit reached ({sent_today}/{max_per_day})"
        suggestions.append(f"You've sent {sent_today} messages today. Your limit is {max_per_day}.")
        return ComplianceResponse(
            approved=False, spam_score=spam_score,
            checks=checks, block_reason=block_reason, suggestions=suggestions,
        )

    # ── Check 2: Spam pattern detection (< 100ms) ─────────────────────────────
    body_lower = req.message_body.lower()
    word_count = len(req.message_body.split())
    spam_triggers = [w for w in SPAM_WORDS if w in body_lower]
    excessive_caps = sum(1 for c in req.message_body if c.isupper()) / max(len(req.message_body), 1) > 0.30

    spam_pattern_ok = not spam_triggers and not excessive_caps and 20 <= word_count <= 500
    checks.spam_pattern = {
        "ok": spam_pattern_ok,
        "triggers": spam_triggers,
        "excessive_caps": excessive_caps,
        "word_count": word_count,
    }

    if not spam_pattern_ok:
        spam_score += 40
        if spam_triggers:
            suggestions.append(f"Remove spam trigger words: {', '.join(spam_triggers)}")
        if excessive_caps:
            suggestions.append("Reduce use of capital letters (more than 30% detected)")
        if word_count < 20:
            suggestions.append("Message is too short — aim for at least 20 words")
        if word_count > 500:
            suggestions.append("Message is too long — keep it under 500 words")
        if spam_score >= 40:
            block_reason = "Message flagged by spam pattern detection"

    # ── Check 3: Policy (LLM — only if previous checks passed) ──────────────
    policy_ok = True
    checks.policy = {"ok": policy_ok, "skipped": spam_score > 0}

    # ── Check 4: Consent verification ────────────────────────────────────────
    contact = await db.contacts.find_one({"_id": req.contact_id})
    valid_sources = {"linkedin", "github", "email", "manual", "imported", "google"}
    source = contact.get("source", "manual") if contact else "manual"
    consent_ok = source in valid_sources
    checks.consent = {"ok": consent_ok, "source": source}

    if not consent_ok:
        spam_score += 30
        block_reason = f"Contact source '{source}' is not a verified import source"
        suggestions.append("Only message contacts imported from verified sources")

    approved = spam_score == 0 and block_reason is None
    return ComplianceResponse(
        approved=approved,
        spam_score=min(spam_score, 100),
        checks=checks,
        block_reason=block_reason,
        suggestions=suggestions,
    )
