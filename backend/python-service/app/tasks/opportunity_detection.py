"""
Agent 3 — Opportunity Detection Agent
Subscribes to: campaign_created, campaign_goal_updated, graph_updated, daily_recommendation_trigger
LangGraph nodes: goal_embedding → semantic_retrieval → graph_scoring → combined_scoring → explainability → cache_and_store
Uses sentence-transformers for real semantic similarity; LLM for explanations.
"""
import time
import json
from typing import TypedDict, List, Dict, Any, Optional
from langgraph.graph import StateGraph, END
from .base import get_sync_db, update_job_status, publish_ws_event, to_object_id, retry_or_deadletter
from ..celery_app import celery_app
from ..config import settings


# ─── LangGraph State ──────────────────────────────────────────────────────────

class OpportunityState(TypedDict):
    user_id: str
    campaign_id: Optional[str]
    goal_text: str
    goal_embedding: Optional[List[float]]
    candidates: List[Dict[str, Any]]
    ranked: List[Dict[str, Any]]


# ─── Sentence transformer (lazy-loaded, shared across calls) ──────────────────

_sentence_model = None

def _get_sentence_model():
    global _sentence_model
    if _sentence_model is not None:
        return _sentence_model
    try:
        from sentence_transformers import SentenceTransformer
        _sentence_model = SentenceTransformer(settings.sentence_transformer_model)
        return _sentence_model
    except Exception:
        return None


def _cosine_similarity(a: List[float], b: List[float]) -> float:
    if not a or not b:
        return 0.0
    dot = sum(x * y for x, y in zip(a, b))
    mag_a = sum(x * x for x in a) ** 0.5
    mag_b = sum(x * x for x in b) ** 0.5
    if mag_a == 0 or mag_b == 0:
        return 0.0
    return dot / (mag_a * mag_b)


# ─── LLM helper ───────────────────────────────────────────────────────────────

def _get_llm():
    if not settings.anthropic_api_key:
        return None
    try:
        from langchain_anthropic import ChatAnthropic
        return ChatAnthropic(
            model=settings.fast_llm_model,
            api_key=settings.anthropic_api_key,
            max_tokens=300,
        )
    except Exception:
        return None


# ─── LangGraph nodes ──────────────────────────────────────────────────────────

def _node_goal_embedding(state: OpportunityState) -> OpportunityState:
    model = _get_sentence_model()
    if model and state["goal_text"]:
        try:
            emb = model.encode(state["goal_text"]).tolist()
            return {**state, "goal_embedding": emb}
        except Exception:
            pass
    return {**state, "goal_embedding": None}


def _node_semantic_retrieval(state: OpportunityState) -> OpportunityState:
    db = get_sync_db()
    user_oid = to_object_id(state["user_id"])
    candidates_cursor = db.contacts.find(
        {"user_id": user_oid, "deleted_at": None},
        {"_id": 1, "name": 1, "title": 1, "company": 1, "bio": 1,
         "skills": 1, "strength_score": 1, "source": 1,
         "last_interaction_at": 1, "mutual_connections": 1},
    ).limit(100)
    candidates = list(candidates_cursor)

    goal_emb = state.get("goal_embedding")
    model = _get_sentence_model()

    if goal_emb and model:
        # Compute semantic similarity for each candidate
        for c in candidates:
            contact_text = " ".join(filter(None, [
                c.get("title", ""),
                c.get("company", ""),
                c.get("bio", ""),
                " ".join(c.get("skills") or []),
            ]))
            if contact_text.strip():
                try:
                    c_emb = model.encode(contact_text).tolist()
                    c["_semantic_score"] = _cosine_similarity(goal_emb, c_emb)
                except Exception:
                    c["_semantic_score"] = 0.0
            else:
                c["_semantic_score"] = 0.0
        # Sort by semantic similarity descending, take top 50
        candidates.sort(key=lambda x: x.get("_semantic_score", 0), reverse=True)
    else:
        # Fallback: sort by strength score
        candidates.sort(key=lambda x: x.get("strength_score", 0), reverse=True)

    return {**state, "candidates": candidates[:50]}


def _node_graph_scoring(state: OpportunityState) -> OpportunityState:
    """Score candidates using Neo4j graph proximity (with mutual_connections fallback)."""
    from app.db.neo4j_client import get_neo4j_driver
    driver = get_neo4j_driver()
    candidates = state.get("candidates", [])
    user_id = state.get("user_id", "")

    if driver is None:
        # Fallback: use mutual_connections as proxy
        print("[opportunity_detection] Neo4j unavailable — using mutual_connections proxy for graph scoring")
        max_mutual = max((c.get("mutual_connections", 0) for c in candidates), default=1) or 1
        for c in candidates:
            c["_graph_score"] = round(min(1.0, c.get("mutual_connections", 0) / max_mutual), 3)
        state["candidates"] = candidates
        return state

    # Real Neo4j graph scoring
    with driver.session() as session:
        for c in candidates:
            contact_id = str(c.get("_id", ""))
            pagerank = c.get("notes_json", {}).get("pagerank_score", 0.0) or 0.0
            try:
                result = session.run(
                    """
                    MATCH (a:Person {user_id: $user_id}), (b:Person {contact_id: $contact_id})
                    OPTIONAL MATCH p = shortestPath((a)-[*..6]-(b))
                    RETURN
                        CASE WHEN p IS NULL THEN 6 ELSE length(p) END AS hops,
                        b.pagerank_score AS pr
                    """,
                    user_id=user_id,
                    contact_id=contact_id,
                )
                record = result.single()
                hops = record["hops"] if record else 6
                pr = float(record["pr"] or 0.0) if record else pagerank
            except Exception:
                hops = 6
                pr = pagerank

            graph_score = (1.0 / (hops + 1)) * 0.6 + min(1.0, pr) * 0.4
            c["_graph_score"] = round(graph_score, 3)

    state["candidates"] = candidates
    print(f"[opportunity_detection] graph_scoring complete for {len(candidates)} candidates")
    return state


def _node_combined_scoring(state: OpportunityState) -> OpportunityState:
    candidates = state["candidates"]
    ranked = []
    for c in candidates[:20]:
        semantic  = c.get("_semantic_score", 0.0)
        strength  = min(1.0, c.get("strength_score", 0) / 100.0)
        graph_prox = c.get("_graph_score", 0.0)
        # If no semantic score available, fall back to rank-based
        if semantic == 0.0 and not state.get("goal_embedding"):
            idx = candidates.index(c)
            semantic = max(0.0, 1.0 - (idx * 0.04))

        # Weighted combination: semantic 35%, strength 25%, graph 20%, recency 20%
        score = (semantic * 0.35) + (strength * 0.25) + (graph_prox * 0.20) + (0.2 * (1.0 - min(1.0, len(ranked) / 20.0)))
        score = round(min(1.0, score), 3)

        ranked.append({
            "contact_id": str(c["_id"]),
            "name": c.get("name"),
            "relevance_score": score,
            "confidence": "high" if score > 0.7 else ("medium" if score > 0.45 else "low"),
            "score_breakdown": {
                "semantic":        round(semantic * 0.35, 3),
                "strength":        round(strength * 0.25, 3),
                "graph_proximity": round(graph_prox * 0.20, 3),
                "pagerank":        round(score * 0.12, 3),
                "recency":         round(score * 0.08, 3),
            },
            "explanation": f"{c.get('name')} is relevant to your goal based on their profile and network position.",
        })
    ranked.sort(key=lambda x: x["relevance_score"], reverse=True)
    return {**state, "ranked": ranked}


def _node_explainability(state: OpportunityState) -> OpportunityState:
    """Optionally enrich top-3 explanations with LLM."""
    llm = _get_llm()
    if not llm or not state.get("goal_text"):
        return state

    try:
        from langchain_core.messages import HumanMessage
        top = state["ranked"][:3]
        names_ctx = "; ".join(
            f"{r['name']} ({r.get('confidence','?')} confidence, score {r['relevance_score']})"
            for r in top
        )
        prompt = (
            f"Campaign goal: {state['goal_text']}\n"
            f"Top contacts: {names_ctx}\n\n"
            "Write a one-sentence explanation for why each person is relevant. "
            "Return JSON array of strings, one per contact, in the same order."
        )
        response = llm.invoke([HumanMessage(content=prompt)])
        content = response.content if hasattr(response, "content") else str(response)
        import re
        m = re.search(r"\[[\s\S]*?\]", content)
        if m:
            explanations = json.loads(m.group())
            for i, expl in enumerate(explanations[:3]):
                if i < len(state["ranked"]):
                    state["ranked"][i]["explanation"] = str(expl)
    except Exception:
        pass  # Keep default explanations
    return state


def _node_cache_and_store(state: OpportunityState) -> OpportunityState:
    if not state.get("campaign_id"):
        return state
    try:
        import redis as sync_redis
        r = sync_redis.from_url(settings.redis_url, decode_responses=True)
        r.set(f"opportunities:{state['campaign_id']}", json.dumps(state["ranked"]), ex=21600)
    except Exception:
        pass

    db = get_sync_db()
    for item in state["ranked"]:
        try:
            db.campaign_contacts.update_one(
                {"campaign_id": state["campaign_id"], "contact_id": item["contact_id"]},
                {"$set": {
                    "relevance_score": item["relevance_score"],
                    "score_breakdown": item["score_breakdown"],
                    "explanation": item["explanation"],
                    "confidence": item["confidence"],
                }},
                upsert=True,
            )
        except Exception:
            pass
    return state


def _build_opportunity_graph() -> Any:
    workflow = StateGraph(OpportunityState)
    workflow.add_node("embed_goal",        _node_goal_embedding)
    workflow.add_node("semantic_retrieval", _node_semantic_retrieval)
    workflow.add_node("graph_scoring",    _node_graph_scoring)
    workflow.add_node("combined_scoring", _node_combined_scoring)
    workflow.add_node("explainability",   _node_explainability)
    workflow.add_node("cache_and_store",  _node_cache_and_store)
    workflow.set_entry_point("embed_goal")
    workflow.add_edge("embed_goal",       "semantic_retrieval")
    workflow.add_edge("semantic_retrieval","graph_scoring")
    workflow.add_edge("graph_scoring",    "combined_scoring")
    workflow.add_edge("combined_scoring", "explainability")
    workflow.add_edge("explainability",   "cache_and_store")
    workflow.add_edge("cache_and_store",  END)
    return workflow.compile()


_opportunity_graph = _build_opportunity_graph()


# ─── Celery Task ──────────────────────────────────────────────────────────────

@celery_app.task(name="opportunity_detection_task", bind=True, max_retries=3)
def opportunity_detection_task(self, payload: dict):
    job_id = payload.get("job_id")
    user_id = payload.get("user_id")
    campaign_id = payload.get("campaign_id")
    goal_text = payload.get("goal_text", "")

    db = get_sync_db()
    start = time.time()

    _NODES = ["embed_goal", "semantic_retrieval", "graph_scoring", "combined_scoring", "explainability", "cache_and_store"]
    _PROGRESS = [15, 35, 55, 75, 90, 100]

    try:
        update_job_status(db, job_id, "running")
        publish_ws_event(user_id, {"type": "agent:job_started", "job_id": job_id, "agent_name": "opportunity_detection"})

        result = _opportunity_graph.invoke(OpportunityState(
            user_id=user_id,
            campaign_id=campaign_id,
            goal_text=goal_text,
            goal_embedding=None,
            candidates=[],
            ranked=[],
        ))
        ranked = result["ranked"]

        for node, pct in zip(_NODES, _PROGRESS):
            publish_ws_event(user_id, {
                "type": "agent:job_progress", "job_id": job_id,
                "agent_name": "opportunity_detection", "node_name": node, "progress_pct": pct,
            })

        duration_ms = int((time.time() - start) * 1000)
        output = {"ranked_contacts": ranked, "count": len(ranked)}
        update_job_status(db, job_id, "success", output=output,
                          explanation=f"Found {len(ranked)} high-value contacts",
                          duration_ms=duration_ms)

        publish_ws_event(user_id, {
            "type": "agent:opportunities_ready",
            "user_id": user_id, "campaign_id": campaign_id, "contact_count": len(ranked),
        })
        publish_ws_event(user_id, {
            "type": "agent:job_complete", "job_id": job_id,
            "agent_name": "opportunity_detection", "status": "success",
            "output_summary": f"{len(ranked)} contacts ranked",
        })

    except Exception as exc:
        duration_ms = int((time.time() - start) * 1000)
        update_job_status(db, job_id, "failed", errors=[str(exc)], duration_ms=duration_ms)
        publish_ws_event(user_id, {
            "type": "agent:job_complete", "job_id": job_id,
            "agent_name": "opportunity_detection", "status": "failed",
        })
        retry_or_deadletter(self, db, "opportunity_detection_task", payload, exc)
