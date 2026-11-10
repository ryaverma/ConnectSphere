"""
Agent 1 — Profile Parsing Agent
Subscribes to: contact_imported
LangGraph nodes: normalize → deduplicate → skill_extraction → strength_score → enrichment → embed_and_store
Uses Claude (langchain-anthropic) for skill extraction with keyword fallback.
"""
import time
import json
import re
from datetime import datetime
from typing import TypedDict, List, Dict, Any, Optional
from langgraph.graph import StateGraph, END
from .base import get_sync_db, update_job_status, publish_ws_event, log_ai_usage, retry_or_deadletter
from ..celery_app import celery_app
from ..config import settings


# ─── LangGraph State ──────────────────────────────────────────────────────────

class ProfileState(TypedDict):
    user_id: str
    contact: Dict[str, Any]
    source: str
    normalized: Dict[str, Any]
    extracted_skills: List[str]
    strength_score: int
    enriched: Dict[str, Any]


# ─── LLM helper ───────────────────────────────────────────────────────────────

def _get_llm():
    if not settings.anthropic_api_key:
        return None
    try:
        from langchain_anthropic import ChatAnthropic
        return ChatAnthropic(
            model=settings.fast_llm_model,
            api_key=settings.anthropic_api_key,
            max_tokens=512,
        )
    except Exception:
        return None


# ─── Keyword-based skill extraction fallback ─────────────────────────────────

_SKILL_KEYWORDS = [
    "python", "javascript", "typescript", "react", "node.js", "go", "rust", "java", "c++",
    "machine learning", "deep learning", "nlp", "llm", "ai", "data science", "computer vision",
    "kubernetes", "docker", "aws", "gcp", "azure", "devops", "ci/cd",
    "sql", "postgresql", "mongodb", "redis", "kafka",
    "product management", "user research", "a/b testing", "growth",
    "venture capital", "fundraising", "startups",
    "graphql", "rest api", "microservices", "system design",
]

def _keyword_skill_extraction(contact: Dict) -> List[str]:
    text = " ".join(filter(None, [
        contact.get("name", ""),
        contact.get("title", ""),
        contact.get("company", ""),
        contact.get("bio", ""),
        " ".join(contact.get("skills", [])),
    ])).lower()
    found = [s for s in _SKILL_KEYWORDS if s in text]
    # Also keep any already-stored skills
    existing = [s.lower() for s in contact.get("skills", [])]
    merged = list({s: None for s in existing + found}.keys())
    return [s.title() if len(s) <= 3 else s.capitalize() for s in merged[:12]]


# ─── LangGraph nodes ──────────────────────────────────────────────────────────

def _node_normalize(state: ProfileState) -> ProfileState:
    c = state["contact"]
    normalized = {
        "name": (c.get("name") or "").strip().title(),
        "email": (c.get("email") or "").strip().lower(),
        "title": (c.get("title") or "").strip(),
        "company": (c.get("company") or "").strip(),
        "bio": (c.get("bio") or "").strip(),
        "skills": [s.strip() for s in (c.get("skills") or []) if s],
    }
    return {**state, "normalized": normalized}


def _node_deduplicate(state: ProfileState) -> ProfileState:
    # Deduplication across contacts happens at import time in the route.
    # Here we just deduplicate skills within this contact.
    norm = state["normalized"]
    norm["skills"] = list(dict.fromkeys(norm["skills"]))
    return {**state, "normalized": norm}


def _node_skill_extraction(state: ProfileState) -> ProfileState:
    contact = {**state["contact"], **state["normalized"]}
    llm = _get_llm()

    if llm and (contact.get("bio") or contact.get("title")):
        try:
            from langchain_core.messages import HumanMessage
            profile_text = " | ".join(filter(None, [
                contact.get("name"),
                contact.get("title"),
                contact.get("company"),
                contact.get("bio"),
            ]))
            prompt = (
                f"Extract professional skills and technologies from this profile.\n"
                f"Profile: {profile_text}\n\n"
                "Return ONLY a JSON array of skill strings (max 10), e.g. [\"Python\", \"Machine Learning\"]. "
                "No explanation, no markdown."
            )
            _start = time.time()
            response = llm.invoke([HumanMessage(content=prompt)])
            content = response.content if hasattr(response, "content") else str(response)

            try:
                log_ai_usage(get_sync_db(), state.get("user_id"), feature="contact_scoring",
                             model=settings.fast_llm_model, response=response, start_time=_start,
                             success=True, request_data={"prompt": prompt})
            except Exception:
                pass

            m = re.search(r"\[[\s\S]*?\]", content)
            if m:
                skills = json.loads(m.group())
                if isinstance(skills, list) and skills:
                    # Merge with existing
                    existing = set(s.lower() for s in (contact.get("skills") or []))
                    merged = list(contact.get("skills") or [])
                    for s in skills:
                        if str(s).lower() not in existing:
                            merged.append(str(s))
                            existing.add(str(s).lower())
                    return {**state, "extracted_skills": merged[:12]}
        except Exception as e:
            try:
                log_ai_usage(get_sync_db(), state.get("user_id"), feature="contact_scoring",
                             model=settings.fast_llm_model, response=None, start_time=time.time(),
                             success=False, error_message=str(e))
            except Exception:
                pass

    # Keyword fallback
    return {**state, "extracted_skills": _keyword_skill_extraction(contact)}


def _node_strength_score(state: ProfileState) -> ProfileState:
    """
    Canonical contact strength-score formula — SHARED SPEC.

    This must stay in sync with recalculateStrengthScore() in contacts.js —
    see the comment there for why it's duplicated instead of shared over HTTP.
    Cap is 100 (not 85); weights match the Node implementation exactly so a
    contact's score no longer depends on which pipeline touched it last.
    """
    contact = state["contact"]
    source = state["source"]

    # Base score by source quality
    source_base = {"linkedin": 25, "github": 20, "email": 18, "manual": 15, "imported": 15}
    score = source_base.get(source, 15)

    if contact.get("email"):        score += 20
    if contact.get("title"):        score += 7
    if contact.get("company"):      score += 7
    if contact.get("bio"):          score += 10
    if contact.get("linkedin_url") or contact.get("github_url"): score += 10
    score += min(len(state.get("extracted_skills") or []) * 5, 20)
    score += min(len(contact.get("interests") or []) * 2, 6)

    # Recency bonus — last interaction within 30 days
    last_interaction_at = contact.get("last_interaction_at")
    if last_interaction_at:
        days_since = (datetime.utcnow() - last_interaction_at).total_seconds() / 86_400
        if days_since <= 7:
            score += 15
        elif days_since <= 30:
            score += 8

    # Reply bonus
    try:
        db = get_sync_db()
        reply_count = db.messages.count_documents({
            "contact_id": contact.get("_id"), "status": "replied", "deleted_at": None,
        })
        if reply_count > 0:
            score += min(reply_count * 10, 20)
    except Exception:
        pass  # non-fatal — score still computes without the reply signal

    # Mutual connections proxy
    score += min(contact.get("mutual_connections", 0) or 0, 10)

    return {**state, "strength_score": min(round(score), 100)}


def _node_enrichment(state: ProfileState) -> ProfileState:
    contact = state["contact"]
    enriched = {
        "skills": state.get("extracted_skills") or contact.get("skills", []),
        "strength_score": state["strength_score"],
        "notes_json.last_enriched": time.time(),
        "notes_json.score_factors": {
            "source_quality": {"linkedin": 1.0, "github": 0.8, "email": 0.7, "manual": 0.6}.get(state["source"], 0.6),
            "data_completeness": round(state["strength_score"] / 100, 2),
        },
    }
    return {**state, "enriched": enriched}


_sentence_model = None

def _get_sentence_model():
    """Lazy-load the sentence transformer model."""
    global _sentence_model
    if _sentence_model is not None:
        return _sentence_model
    try:
        from sentence_transformers import SentenceTransformer
        from app.config import settings
        _sentence_model = SentenceTransformer(settings.sentence_transformer_model)
        return _sentence_model
    except Exception as e:
        print(f"[profile_parsing] Failed to load sentence transformer: {e}")
        return None


def _node_embed_and_store(state: ProfileState) -> ProfileState:
    """Upsert contact embedding into Pinecone vector store."""
    from app.config import settings
    if not settings.pinecone_api_key:
        print("[profile_parsing] Pinecone API key not configured — skipping embed_and_store")
        return state

    try:
        from pinecone import Pinecone
        pc = Pinecone(api_key=settings.pinecone_api_key)
        index = pc.Index(settings.pinecone_index)
    except ImportError:
        print("[profile_parsing] pinecone package not installed — skipping embed_and_store")
        return state
    except Exception as e:
        print(f"[profile_parsing] Pinecone init failed: {e}")
        return state

    try:
        # Lazy-load sentence transformer model
        model = _get_sentence_model()
        if model is None:
            return state

        contact = state.get("enriched") or state.get("normalized") or state.get("contact", {})
        contact_id = str(contact.get("_id", ""))
        user_id = str(contact.get("user_id", ""))
        if not contact_id or not user_id:
            return state

        skills = state.get("extracted_skills", []) or []
        text_parts = filter(None, [
            contact.get("name", ""),
            contact.get("title", ""),
            contact.get("company", ""),
            contact.get("bio", ""),
            " | ".join(skills[:15]),
        ])
        text = " | ".join(text_parts)

        if not text.strip():
            return state

        embedding = model.encode(text).tolist()
        metadata = {
            "user_id": user_id,
            "name": contact.get("name", ""),
            "title": contact.get("title", ""),
            "company": contact.get("company", ""),
            "skills": skills[:10],
        }

        index.upsert(
            vectors=[{"id": contact_id, "values": embedding, "metadata": metadata}],
            namespace=user_id,
        )
        print(f"[profile_parsing] Upserted embedding for contact {contact_id} to Pinecone")

    except Exception as e:
        print(f"[profile_parsing] embed_and_store failed (non-fatal): {e}")

    return state


def _build_profile_graph() -> Any:
    workflow = StateGraph(ProfileState)
    workflow.add_node("normalize",        _node_normalize)
    workflow.add_node("deduplicate",      _node_deduplicate)
    workflow.add_node("skill_extraction", _node_skill_extraction)
    workflow.add_node("compute_strength",  _node_strength_score)
    workflow.add_node("enrichment",       _node_enrichment)
    workflow.add_node("embed_and_store",  _node_embed_and_store)
    workflow.set_entry_point("normalize")
    workflow.add_edge("normalize",        "deduplicate")
    workflow.add_edge("deduplicate",      "skill_extraction")
    workflow.add_edge("skill_extraction", "compute_strength")
    workflow.add_edge("compute_strength", "enrichment")
    workflow.add_edge("enrichment",       "embed_and_store")
    workflow.add_edge("embed_and_store",  END)
    return workflow.compile()


_profile_graph = _build_profile_graph()


# ─── Celery Task ──────────────────────────────────────────────────────────────

@celery_app.task(name="profile_parsing_task", bind=True, max_retries=3)
def profile_parsing_task(self, payload: dict):
    job_id = payload.get("job_id")
    user_id = payload.get("user_id")
    contact_ids = payload.get("contact_ids", [])
    source = payload.get("source", "manual")

    db = get_sync_db()
    start = time.time()

    _NODES = ["normalize", "deduplicate", "skill_extraction", "compute_strength", "enrichment", "embed_and_store"]
    _PROGRESS = [15, 30, 50, 70, 85, 100]

    try:
        update_job_status(db, job_id, "running")
        publish_ws_event(user_id, {"type": "agent:job_started", "job_id": job_id, "agent_name": "profile_parsing"})

        enriched_ids = []

        for contact_id in contact_ids:
            contact = db.contacts.find_one({"_id": contact_id})
            if not contact:
                continue

            # Run full LangGraph pipeline
            result = _profile_graph.invoke(ProfileState(
                user_id=user_id,
                contact=contact,
                source=source,
                normalized={},
                extracted_skills=[],
                strength_score=0,
                enriched={},
            ))

            # Publish progress events
            for node, pct in zip(_NODES, _PROGRESS):
                publish_ws_event(user_id, {
                    "type": "agent:job_progress", "job_id": job_id,
                    "agent_name": "profile_parsing", "node_name": node, "progress_pct": pct,
                })

            # Write enriched data back to MongoDB
            enriched = result.get("enriched", {})
            if enriched:
                update_fields = {}
                if "skills" in enriched:
                    update_fields["skills"] = enriched["skills"]
                if "strength_score" in enriched:
                    update_fields["strength_score"] = enriched["strength_score"]
                if "notes_json.last_enriched" in enriched:
                    update_fields["notes_json.last_enriched"] = enriched["notes_json.last_enriched"]
                if "notes_json.score_factors" in enriched:
                    update_fields["notes_json.score_factors"] = enriched["notes_json.score_factors"]
                if update_fields:
                    db.contacts.update_one({"_id": contact_id}, {"$set": update_fields})

            enriched_ids.append(str(contact_id))

        duration_ms = int((time.time() - start) * 1000)
        output = {"enriched_count": len(enriched_ids), "contact_ids": enriched_ids}
        update_job_status(db, job_id, "success", output=output,
                          explanation=f"Enriched {len(enriched_ids)} contacts",
                          duration_ms=duration_ms)

        # Fire profiles_enriched → ConnectGraph Builder
        import redis as sync_redis
        r = sync_redis.from_url(settings.redis_url, decode_responses=True)
        r.publish("profiles_enriched", json.dumps({
            "user_id": user_id, "job_id": job_id,
            "contact_ids": enriched_ids, "enriched_count": len(enriched_ids),
        }))

        publish_ws_event(user_id, {
            "type": "agent:contacts_enriched",
            "user_id": user_id, "contact_ids": enriched_ids, "enriched_count": len(enriched_ids),
        })
        publish_ws_event(user_id, {
            "type": "agent:job_complete", "job_id": job_id,
            "agent_name": "profile_parsing", "status": "success",
            "output_summary": f"{len(enriched_ids)} contacts enriched",
        })

    except Exception as exc:
        duration_ms = int((time.time() - start) * 1000)
        update_job_status(db, job_id, "failed", errors=[str(exc)], duration_ms=duration_ms)
        publish_ws_event(user_id, {
            "type": "agent:job_complete", "job_id": job_id,
            "agent_name": "profile_parsing", "status": "failed",
        })
        retry_or_deadletter(self, db, "profile_parsing_task", payload, exc)
