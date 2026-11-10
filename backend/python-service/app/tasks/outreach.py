"""
Agent 4 — Outreach Agent
Subscribes to: outreach_requested, outreach_batch_requested, regenerate_draft
LangGraph nodes: context_retrieval → personalization_evidence → message_generation → quality_check → cadence_scheduling → store_drafts
Uses Claude (langchain-anthropic) for real message generation with template fallback.
"""
import time
import json
import re
from datetime import datetime, timedelta
from typing import TypedDict, List, Dict, Any, Optional
from langgraph.graph import StateGraph, END
from pymongo import ReturnDocument
from .base import get_sync_db, update_job_status, publish_ws_event, to_object_id, log_ai_usage, retry_or_deadletter
from ..celery_app import celery_app
from ..config import settings


# ─── LangGraph State ──────────────────────────────────────────────────────────

class OutreachState(TypedDict):
    user_id: str
    contact: Dict[str, Any]
    goal_text: str
    tone: str
    evidence: List[str]
    variants: Dict[str, Dict[str, str]]
    quality_scores: Dict[str, Any]


# ─── LLM helper ───────────────────────────────────────────────────────────────

def _get_llm():
    """Return a ChatAnthropic instance or None if no API key configured."""
    if not settings.anthropic_api_key:
        import logging
        logging.getLogger(__name__).warning("[Outreach] No ANTHROPIC_API_KEY — using template fallback")
        return None
    try:
        from langchain_anthropic import ChatAnthropic
        return ChatAnthropic(
            model=settings.fast_llm_model,
            api_key=settings.anthropic_api_key,
            max_tokens=1024,
            timeout=30,
        )
    except Exception as e:
        import logging
        logging.getLogger(__name__).error(f"[Outreach] LLM init failed: {e} — using template fallback")
        return None


# ─── Template fallback ────────────────────────────────────────────────────────

def _template_variants(contact: Dict, goal_text: str, tone: str) -> Dict[str, Dict[str, str]]:
    name = contact.get("name", "there").split()[0]
    ctx = f"{contact.get('title', '')} at {contact.get('company', '')}".strip(" at").strip()
    goal_short = goal_text[:60] if goal_text else "expanding my network"
    formality = "I hope this message finds you well. " if tone == "professional" else ""
    return {
        "short": {
            "subject": f"Quick introduction — {goal_text[:30]}..." if goal_text else "Quick introduction",
            "body": (
                f"Hi {name},\n\n"
                f"{formality}I came across your profile and was impressed by your work"
                f"{f' as {ctx}' if ctx else ''}. "
                f"I'm working on {goal_short} and think connecting could be valuable.\n\n"
                "Would you be open to a 15-minute call?\n\nBest regards"
            ),
        },
        "long": {
            "subject": f"Reaching out — {goal_text[:40]}..." if goal_text else "Reaching out",
            "body": (
                f"Hi {name},\n\n"
                f"{formality}I came across your background{f' as {ctx}' if ctx else ''} and was truly impressed.\n\n"
                f"I'm currently focused on {goal_text if goal_text else 'building meaningful professional connections'} "
                "and believe your experience and perspective would be incredibly valuable.\n\n"
                "Would you be available for a 20-minute call at your convenience?\n\nLooking forward to connecting,"
            ),
        },
        "followup_1": {
            "subject": "Following up",
            "body": (
                f"Hi {name},\n\nI wanted to follow up on my previous message. "
                "I understand you're busy, but I'd love the opportunity to connect briefly.\n\nBest,"
            ),
        },
        "followup_2": {
            "subject": "Last follow-up",
            "body": (
                f"Hi {name},\n\nI'll leave this here in case the timing wasn't right. "
                "I'd genuinely value connecting whenever it suits you.\n\nAll the best,"
            ),
        },
    }


# ─── LangGraph nodes ──────────────────────────────────────────────────────────

def _node_message_generation(state: OutreachState) -> OutreachState:
    contact = state["contact"]
    goal_text = state["goal_text"]
    tone = state["tone"]
    llm = _get_llm()

    if not llm:
        return {**state, "variants": _template_variants(contact, goal_text, tone)}

    try:
        from langchain_core.messages import HumanMessage

        name = contact.get("name", "the contact")
        title = contact.get("title", "")
        company = contact.get("company", "")
        skills = ", ".join((contact.get("skills") or [])[:5])

        prompt = f"""You are an expert at writing personalized professional networking outreach messages.

Generate 4 distinct outreach messages for the following context:

Contact: {name}
Title: {title}
Company: {company}
Skills: {skills}
Campaign Goal: {goal_text}
Tone: {tone}

Return ONLY a valid JSON object (no markdown, no explanation) with exactly these keys:
{{
  "short": {{"subject": "...", "body": "..."}},
  "long": {{"subject": "...", "body": "..."}},
  "followup_1": {{"subject": "...", "body": "..."}},
  "followup_2": {{"subject": "...", "body": "..."}}
}}

Rules:
- short: 3-4 sentences, asks for 15-min call
- long: 5-7 sentences, more context, asks for 20-min call
- followup_1: polite 7-day follow-up (2-3 sentences)
- followup_2: final graceful follow-up (2 sentences)
- Address contact by first name only
- Be warm but professional
- No generic phrases like "I hope this email finds you well"
- Reference their specific role or company where natural"""

        _start = time.time()
        response = llm.invoke([HumanMessage(content=prompt)])
        content = response.content if hasattr(response, "content") else str(response)

        try:
            log_ai_usage(get_sync_db(), state.get("user_id"), feature="message_generation",
                         model=settings.fast_llm_model, response=response, start_time=_start,
                         success=True, request_data={"prompt": prompt, "tone": tone})
        except Exception:
            pass  # usage logging must never break generation

        # Extract JSON from response
        m = re.search(r"\{[\s\S]*\}", content)
        if m:
            variants = json.loads(m.group())
            # Validate structure
            if all(k in variants for k in ("short", "long", "followup_1", "followup_2")):
                return {**state, "variants": variants}
    except Exception as e:
        try:
            log_ai_usage(get_sync_db(), state.get("user_id"), feature="message_generation",
                         model=settings.fast_llm_model, response=None, start_time=time.time(),
                         success=False, error_message=str(e))
        except Exception:
            pass

    # Fallback to templates if LLM fails
    return {**state, "variants": _template_variants(contact, goal_text, tone)}


def _node_quality_check(state: OutreachState) -> OutreachState:
    variants = state.get("variants", {})
    short_body = variants.get("short", {}).get("body", "")
    # Basic quality heuristics
    specificity = min(1.0, len(short_body) / 300)
    has_ask = any(word in short_body.lower() for word in ["call", "chat", "meet", "connect", "minute"])
    confidence = 0.82 if state.get("variants") else 0.55
    return {**state, "quality_scores": {
        "specificity": round(specificity, 2),
        "clear_ask": has_ask,
        "confidence": confidence,
    }}


def _build_outreach_graph() -> Any:
    workflow = StateGraph(OutreachState)
    workflow.add_node("message_generation", _node_message_generation)
    workflow.add_node("quality_check", _node_quality_check)
    workflow.set_entry_point("message_generation")
    workflow.add_edge("message_generation", "quality_check")
    workflow.add_edge("quality_check", END)
    return workflow.compile()


# Build graph once at module load
_outreach_graph = _build_outreach_graph()


# ─── Celery Task ──────────────────────────────────────────────────────────────

@celery_app.task(name="outreach_task", bind=True, max_retries=3)
def outreach_task(self, payload: dict):
    job_id = payload.get("job_id")
    user_id = payload.get("user_id")
    user_oid = to_object_id(user_id)
    contact_id = payload.get("contact_id")
    campaign_id = payload.get("campaign_id")
    tone = payload.get("tone", "professional")
    is_regenerate = payload.get("trigger_event") == "regenerate_draft"
    is_batch_generation = payload.get("trigger_event") == "outreach_batch_requested"
    message_id = payload.get("message_id")
    target_variant = payload.get("variant")

    db = get_sync_db()
    start = time.time()

    try:
        update_job_status(db, job_id, "running")
        publish_ws_event(user_id, {"type": "agent:job_started", "job_id": job_id, "agent_name": "outreach"})

        # ── Node 1: context_retrieval ─────────────────────────────────────────
        contact = db.contacts.find_one({"_id": to_object_id(contact_id)}) or {}
        # Fetch campaign goal_text (not included in regenerate payload)
        goal_text = payload.get("goal_text", "")
        if not goal_text and campaign_id:
            campaign = db.campaigns.find_one({"_id": to_object_id(campaign_id)}) or {}
            goal_text = campaign.get("goal", "")
        publish_ws_event(user_id, {
            "type": "agent:job_progress", "job_id": job_id,
            "agent_name": "outreach", "node_name": "context_retrieval", "progress_pct": 15,
        })

        # ── Node 2: personalization_evidence ──────────────────────────────────
        name = contact.get("name", "the contact")
        company = contact.get("company", "")
        evidence = [
            f"Connected via mutual professional network",
            f"Works as {contact.get('title', 'professional')}" + (f" at {company}" if company else ""),
        ]
        if goal_text:
            evidence.append(f"Aligns with goal: {goal_text[:60]}")
        publish_ws_event(user_id, {
            "type": "agent:job_progress", "job_id": job_id,
            "agent_name": "outreach", "node_name": "personalization_evidence", "progress_pct": 30,
        })

        # ── Node 3 & 4: message_generation + quality_check via LangGraph ──────
        graph_result = _outreach_graph.invoke(OutreachState(
            user_id=user_id,
            contact=contact,
            goal_text=goal_text,
            tone=tone,
            evidence=evidence,
            variants={},
            quality_scores={},
        ))
        variants = graph_result["variants"]
        quality_scores = graph_result["quality_scores"]

        publish_ws_event(user_id, {
            "type": "agent:job_progress", "job_id": job_id,
            "agent_name": "outreach", "node_name": "message_generation", "progress_pct": 60,
        })
        publish_ws_event(user_id, {
            "type": "agent:job_progress", "job_id": job_id,
            "agent_name": "outreach", "node_name": "quality_check", "progress_pct": 75,
        })

        # ── Node 5: cadence_scheduling ────────────────────────────────────────
        now = datetime.utcnow()
        schedule = {
            "short":      now + timedelta(hours=1),
            "followup_1": now + timedelta(days=7),
            "followup_2": now + timedelta(days=21),
        }
        publish_ws_event(user_id, {
            "type": "agent:job_progress", "job_id": job_id,
            "agent_name": "outreach", "node_name": "cadence_scheduling", "progress_pct": 88,
        })

        # ── Node 6: store_drafts ──────────────────────────────────────────────
        draft_ids = []

        if is_regenerate and message_id:
            # Update the specific message variant in-place
            variant_key = target_variant or "short"
            content = variants.get(variant_key) or next(iter(variants.values()))
            db.messages.update_one(
                {"_id": to_object_id(message_id), "user_id": user_oid},
                {"$set": {
                    "subject": content.get("subject", ""),
                    "body": content.get("body", ""),
                    "preview": content.get("body", "")[:150],
                    "status": "pending_approval",
                    "tone": tone,
                    "ai_generated": True,
                    "ai_confidence": quality_scores.get("confidence", 0.7) * 100,
                    "evidence": evidence,
                    "quality_scores": quality_scores,
                }},
            )
            draft_ids.append(str(message_id))
        else:
            variants_to_store = variants
            if is_batch_generation:
                primary = variants.get("short") or next(iter(variants.values()), None)
                variants_to_store = {"short": primary} if primary else {}

            # New generation — insert campaign draft(s)
            for variant_name, content in variants_to_store.items():
                msg = {
                    "user_id": user_oid,
                    "contact_id": to_object_id(contact_id),
                    "campaign_id": to_object_id(campaign_id) if campaign_id else None,
                    "subject": content.get("subject", ""),
                    "body": content.get("body", ""),
                    "preview": content.get("body", "")[:150],
                    "status": "pending_approval",
                    "tone": tone,
                    "variant": variant_name,
                    "ai_generated": True,
                    "ai_confidence": quality_scores.get("confidence", 0.7) * 100,
                    "evidence": evidence,
                    "quality_scores": quality_scores,
                    "scheduled_for": schedule.get(variant_name),
                    "deleted_at": None,
                }
                # Idempotent write: (contact_id, campaign_id, variant) is the
                # natural key for an AI-generated draft. task_acks_late +
                # task_reject_on_worker_lost mean this task can be redelivered
                # and re-run from the top after a worker crash — insert_one()
                # here used to create a second Message document with identical
                # content on every redelivery. find_one_and_update(upsert=True)
                # makes redelivery a no-op-ish overwrite of the same document
                # instead, backed by the unique index on Message (see Message.js).
                doc = db.messages.find_one_and_update(
                    {
                        "contact_id": to_object_id(contact_id),
                        "campaign_id": to_object_id(campaign_id) if campaign_id else None,
                        "variant": variant_name,
                    },
                    {
                        "$set": {
                            "user_id": user_oid,
                            "subject": content.get("subject", ""),
                            "body": content.get("body", ""),
                            "preview": content.get("body", "")[:150],
                            "status": "pending_approval",
                            "tone": tone,
                            "ai_generated": True,
                            "ai_confidence": quality_scores.get("confidence", 0.7) * 100,
                            "evidence": evidence,
                            "quality_scores": quality_scores,
                            "scheduled_for": schedule.get(variant_name),
                            "deleted_at": None,
                        },
                    },
                    upsert=True,
                    return_document=ReturnDocument.AFTER,
                )
                draft_ids.append(str(doc["_id"]))

        publish_ws_event(user_id, {
            "type": "agent:job_progress", "job_id": job_id,
            "agent_name": "outreach", "node_name": "store_drafts", "progress_pct": 100,
        })

        duration_ms = int((time.time() - start) * 1000)
        output = {"draft_ids": draft_ids, "contact_id": contact_id, "evidence": evidence}
        update_job_status(db, job_id, "success", output=output,
                          evidence=evidence, confidence=quality_scores.get("confidence"),
                          explanation=f"{'Regenerated' if is_regenerate else 'Generated'} {len(draft_ids)} draft(s) for {name}",
                          duration_ms=duration_ms)

        publish_ws_event(user_id, {
            "type": "agent:drafts_ready",
            "user_id": user_id, "contact_id": contact_id, "draft_ids": draft_ids,
        })
        publish_ws_event(user_id, {
            "type": "agent:job_complete", "job_id": job_id,
            "agent_name": "outreach", "status": "success",
            "output_summary": f"{'Regenerated' if is_regenerate else str(len(draft_ids)) + ' drafts ready for'} {name}",
        })

    except Exception as exc:
        duration_ms = int((time.time() - start) * 1000)
        update_job_status(db, job_id, "failed", errors=[str(exc)], duration_ms=duration_ms)
        publish_ws_event(user_id, {
            "type": "agent:job_complete", "job_id": job_id,
            "agent_name": "outreach", "status": "failed",
        })
        retry_or_deadletter(self, db, "outreach_task", payload, exc)
