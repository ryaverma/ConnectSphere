"""
Agent 5 - Event Recommender Agent
Subscribes to: daily_events_trigger, events_imported
LangGraph nodes: user_profile_embedding -> event_embedding -> semantic_matching -> roi_scoring -> pre_event_contacts
"""
import json
import re
import time
from datetime import datetime
from typing import Any, Dict, List, Optional, TypedDict

import httpx
from langgraph.graph import END, StateGraph

from .base import cosine_similarity, get_sync_db, publish_ws_event, to_object_id, update_job_status, retry_or_deadletter
from ..celery_app import celery_app
from ..config import settings


class EventRecommenderState(TypedDict):
    user_id: str
    job_id: str
    goal_text: str
    goal_embedding: Optional[List[float]]
    events: List[Dict[str, Any]]
    event_embeddings: Dict[str, List[float]]
    scored_events: List[Dict[str, Any]]
    contacts: List[Dict[str, Any]]
    pre_event_contacts: Dict[str, List[Dict[str, Any]]]


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


def _parse_iso_datetime(value: Optional[str]) -> Optional[datetime]:
    if not value:
        return None
    text = value.strip()
    if not text:
        return None
    if text.endswith("Z"):
        text = text[:-1] + "+00:00"
    try:
        return datetime.fromisoformat(text)
    except Exception:
        return None


def _normalize_tag(value: Any) -> Optional[str]:
    if value is None:
        return None
    text = str(value).strip().lower()
    if not text:
        return None
    cleaned = re.sub(r"[^a-z0-9+#/& -]+", "", text).strip()
    return cleaned or None


def _extract_search_query(goal_text: str) -> str:
    stop_words = {
        "about", "after", "also", "among", "and", "are", "because", "been",
        "being", "build", "for", "from", "goal", "have", "into", "more",
        "network", "networking", "people", "profile", "that", "their",
        "them", "this", "through", "with", "your",
    }
    keywords: List[str] = []
    for token in re.findall(r"[A-Za-z0-9+#./-]+", goal_text.lower()):
        if len(token) < 3 or token in stop_words or token in keywords:
            continue
        keywords.append(token)
        if len(keywords) >= 5:
            break
    if keywords:
        return " ".join(keywords)
    return settings.ticketmaster_default_query.strip()


def _ticketmaster_query_specs(goal_text: str, limit: int) -> List[Dict[str, Any]]:
    page_size = max(1, min(limit, 50))
    goal_query = _extract_search_query(goal_text)

    specs: List[Dict[str, Any]] = []
    seen_queries: set[str] = set()

    def add_spec(keyword: str, hint: Optional[str] = None, size: Optional[int] = None):
        normalized = keyword.strip().lower()
        if not normalized or normalized in seen_queries:
            return
        seen_queries.add(normalized)
        specs.append({
            "keyword": keyword.strip(),
            "type_hint": hint,
            "size": size or page_size,
        })

    if goal_query:
        add_spec(goal_query, None, page_size)

    # Pull a balanced mix so the UI filters have real categories to operate on.
    per_bucket = max(3, min(8, max(1, limit // 5)))
    for keyword, hint in [
        ("professional networking", "networking"),
        ("business networking", "networking"),
        ("startup networking", "networking"),
        ("career fair", "networking"),
        ("tech conference", "conference"),
        ("business conference", "conference"),
        ("leadership summit", "conference"),
        ("workshop", "workshop"),
        ("bootcamp", "workshop"),
        ("masterclass", "workshop"),
        ("webinar", "webinar"),
        ("virtual webinar", "webinar"),
        ("online workshop", "webinar"),
        ("virtual summit", "webinar"),
        ("social", "social"),
    ]:
        add_spec(keyword, hint, per_bucket)

    if not specs:
        add_spec("networking", "networking", per_bucket)
        add_spec("conference", "conference", per_bucket)
        add_spec("social", "social", per_bucket)

    return specs


def _extract_tags(raw_event: Dict[str, Any], summary: str, description: str) -> List[str]:
    tags: List[str] = []
    for classification in raw_event.get("classifications") or []:
        for level in ["segment", "genre", "subGenre", "type", "subType"]:
            candidate = (classification.get(level) or {}).get("name")
            tag = _normalize_tag(candidate)
            if tag and tag not in tags:
                tags.append(tag)

    text = f"{summary} {description}".lower()
    for keyword in [
        "ai", "artificial intelligence", "machine learning", "startup", "founder",
        "venture capital", "sales", "marketing", "product", "engineering",
        "design", "data", "developer", "leadership", "community", "saas",
        "fintech", "healthtech", "climate", "security",
    ]:
        if keyword in text:
            tag = _normalize_tag(keyword)
            if tag and tag not in tags:
                tags.append(tag)

    return tags[:8]


def _classification_names(raw_event: Dict[str, Any]) -> List[str]:
    names: List[str] = []
    for classification in raw_event.get("classifications") or []:
        for level in ["segment", "genre", "subGenre", "type", "subType", "family"]:
            candidate = (classification.get(level) or {}).get("name")
            tag = _normalize_tag(candidate)
            if tag and tag not in names:
                names.append(tag)
    return names


def _infer_event_type(name: str, description: str, tags: List[str], online_event: bool, category: str = "") -> str:
    haystack = " ".join([name, description, category, " ".join(tags)]).lower()

    webinar_terms = (
        "webinar", "web cast", "livestream", "live stream", "online seminar",
        "virtual session", "digital summit",
    )
    workshop_terms = (
        "workshop", "bootcamp", "training", "class", "course", "tutorial",
        "hands-on", "masterclass", "lab",
    )
    conference_terms = (
        "conference", "summit", "expo", "convention", "symposium", "congress",
        "forum", "trade show", "trade-show", "showcase",
    )
    networking_terms = (
        "network", "networking", "mixer", "meetup", "roundtable", "coffee chat",
        "professional", "career", "founder", "startup", "entrepreneur", "venture",
        "investment", "business", "tech", "technology",
    )
    social_terms = (
        "social", "happy hour", "party", "festival", "celebration", "reception",
        "gala", "nightlife", "concert", "music", "arts", "community", "dinner",
        "brunch", "afterparty", "after party",
    )

    if any(term in haystack for term in webinar_terms) or (online_event and any(term in haystack for term in ("virtual", "online", "remote"))):
        return "webinar"
    if any(term in haystack for term in workshop_terms):
        return "workshop"
    if any(term in haystack for term in conference_terms):
        return "conference"
    if any(term in haystack for term in networking_terms):
        return "networking"
    if any(term in haystack for term in social_terms):
        return "social"
    if online_event:
        return "webinar"
    return "meetup"


def _infer_ticketmaster_event_type(
    raw_event: Dict[str, Any],
    name: str,
    description: str,
    tags: List[str],
    online_event: bool,
    category: str = "",
) -> str:
    classification_names = _classification_names(raw_event)
    haystack = " ".join([
        name,
        description,
        category,
        " ".join(tags),
        " ".join(classification_names),
    ]).lower()

    social_segments = (
        "music", "arts", "arts & theatre", "theatre", "film", "miscellaneous",
        "community", "festival", "nightlife",
    )
    networking_segments = (
        "business", "technology", "tech", "career", "professional", "entrepreneur",
        "startup", "venture", "founder",
    )

    if any(segment in haystack for segment in social_segments):
        if any(term in haystack for term in ("conference", "summit", "forum", "expo", "convention")):
            return "conference"
        return "social"

    if any(segment in haystack for segment in networking_segments):
        if any(term in haystack for term in ("conference", "summit", "forum", "expo", "convention")):
            return "conference"
        if any(term in haystack for term in ("workshop", "training", "bootcamp", "masterclass", "tutorial")):
            return "workshop"
        if any(term in haystack for term in ("webinar", "virtual", "online")) and online_event:
            return "webinar"
        return "networking"

    return _infer_event_type(name, description, tags + classification_names, online_event, category)


def _apply_type_hint(
    event_type: str,
    type_hint: Optional[str],
    name: str,
    description: str,
    tags: List[str],
    category: str,
) -> str:
    if not type_hint:
        return event_type

    haystack = " ".join([name, description, category, " ".join(tags)]).lower()
    strong_social_terms = (
        "concert", "music", "festival", "theatre", "theater", "comedy", "sports",
        "game", "tour", "artist", "band", "orchestra", "nightlife",
    )
    strong_networking_terms = (
        "networking", "career fair", "professional networking", "founder meetup",
        "startup mixer", "business networking", "industry mixer", "roundtable",
    )
    strong_webinar_terms = (
        "webinar", "virtual summit", "online workshop", "online seminar",
        "virtual event", "livestream", "live stream",
    )
    if any(term in haystack for term in strong_social_terms):
        return event_type

    if type_hint == "networking" and any(term in haystack for term in strong_networking_terms):
        return "networking"
    if type_hint == "webinar" and any(term in haystack for term in strong_webinar_terms):
        return "webinar"

    if event_type in {"meetup", "social"} and type_hint in {"conference", "workshop", "webinar", "networking"}:
        return type_hint
    if event_type == "meetup" and type_hint == "social":
        return type_hint
    return event_type


def _format_price_range(raw_event: Dict[str, Any]) -> str:
    price_ranges = raw_event.get("priceRanges") or []
    if not price_ranges:
        return "Free"
    price = price_ranges[0]
    min_price = price.get("min")
    max_price = price.get("max")
    currency = price.get("currency", "USD")
    symbol = "$" if currency == "USD" else f"{currency} "
    if min_price is not None and max_price is not None:
        if min_price == 0 and max_price == 0:
            return "Free"
        if min_price == max_price:
            return f"{symbol}{min_price:.0f}"
        return f"{symbol}{min_price:.0f} - {symbol}{max_price:.0f}"
    if min_price is not None:
        return f"{symbol}{min_price:.0f}+"
    return "Paid"


def _map_ticketmaster_event(raw_event: Dict[str, Any], user_oid, type_hint: Optional[str] = None) -> Optional[Dict[str, Any]]:
    external_id = str(raw_event.get("id") or "").strip()
    if not external_id:
        return None

    name = str(raw_event.get("name") or "").strip()
    description = str(raw_event.get("info") or raw_event.get("description") or raw_event.get("pleaseNote") or "").strip()

    dates = raw_event.get("dates") or {}
    start = dates.get("start") or {}
    end = dates.get("end") or {}
    timezone = dates.get("timezone") or "America/Los_Angeles"

    event_date = _parse_iso_datetime(start.get("dateTime") or start.get("localDate"))
    if event_date is None:
        return None
    end_date = _parse_iso_datetime(end.get("dateTime") or end.get("localDate"))
    event_time = start.get("localTime", "")[:5] if start.get("localTime") else ""
    end_time = end.get("localTime", "")[:5] if end.get("localTime") else ""

    embedded = raw_event.get("_embedded") or {}
    venues = embedded.get("venues") or []
    venue = venues[0] if venues else {}
    venue_name = venue.get("name") or ""
    city = (venue.get("city") or {}).get("name") or ""
    state = (venue.get("state") or {}).get("stateCode") or ""
    address_line = (venue.get("address") or {}).get("line1") or ""
    location_parts = [p for p in [address_line, city, state] if p]
    location = ", ".join(location_parts) or venue_name or ""

    attractions = embedded.get("attractions") or []
    host = (attractions[0].get("name") if attractions else None) or (raw_event.get("promoter") or {}).get("name") or "Ticketmaster"

    classifications = raw_event.get("classifications") or []
    primary_cls = next((c for c in classifications if c.get("primary")), classifications[0] if classifications else {})
    category = (primary_cls.get("segment") or {}).get("name") or ""

    images = raw_event.get("images") or []
    image_url = ""
    for ratio in ["16_9", "3_2", "4_3"]:
        for img in images:
            if img.get("ratio") == ratio and img.get("width", 0) >= 640:
                image_url = img.get("url", "")
                break
        if image_url:
            break
    if not image_url and images:
        image_url = images[0].get("url", "")

    tags = _extract_tags(raw_event, name, description)
    online_event = not bool(venue_name)

    inferred_type = _infer_ticketmaster_event_type(raw_event, name, description, tags, online_event, category)

    return {
        "user_id": user_oid,
        "name": name or "Untitled Event",
        "description": description,
        "host": host,
        "event_date": event_date,
        "end_date": end_date,
        "event_time": event_time,
        "end_time": end_time,
        "timezone": timezone,
        "location": location,
        "location_type": "virtual" if online_event else "in-person",
        "virtual_url": "",
        "venue_name": venue_name,
        "type": _apply_type_hint(inferred_type, type_hint, name, description, tags, category),
        "category": category,
        "tags": tags,
        "image_url": image_url,
        "external_url": raw_event.get("url") or "",
        "ticket_url": raw_event.get("url") or "",
        "price_range": _format_price_range(raw_event),
        "attendee_count": 0,
        "capacity": None,
        "source": "ticketmaster",
        "external_id": external_id,
        "deleted_at": None,
    }


def _sync_ticketmaster_events(db, user_oid, goal_text: str = "", limit: int = 24) -> int:
    if not settings.ticketmaster_api_key:
        raise RuntimeError("TICKETMASTER_API_KEY is not configured")

    base_url = f"{settings.ticketmaster_api_base.rstrip('/')}/events.json"
    synced = 0
    seen_ids: set[str] = set()
    now = datetime.utcnow().replace(microsecond=0).isoformat() + "Z"

    for spec in _ticketmaster_query_specs(goal_text, limit):
        params: Dict[str, Any] = {
            "apikey": settings.ticketmaster_api_key,
            "size": spec["size"],
            "sort": "date,asc",
            "startDateTime": now,
            "countryCode": settings.ticketmaster_country_code,
            "includeTest": "no",
            "keyword": spec["keyword"],
        }

        response = httpx.get(base_url, params=params, timeout=20.0)
        response.raise_for_status()
        payload = response.json() or {}
        raw_events = ((payload.get("_embedded") or {}).get("events")) or []

        for raw_event in raw_events:
            external_id = str(raw_event.get("id") or "").strip()
            if not external_id or external_id in seen_ids:
                continue
            seen_ids.add(external_id)

            doc = _map_ticketmaster_event(raw_event, user_oid, spec.get("type_hint"))
            if not doc:
                continue
            db.events.update_one(
                {
                    "user_id": user_oid,
                    "source": "ticketmaster",
                    "external_id": doc["external_id"],
                },
                {"$set": doc},
                upsert=True,
            )
            synced += 1

    return synced


def _node_user_profile_embedding(state: EventRecommenderState) -> EventRecommenderState:
    model = _get_sentence_model()
    if model and state.get("goal_text"):
        try:
            embedding = model.encode(state["goal_text"]).tolist()
            return {**state, "goal_embedding": embedding}
        except Exception as exc:
            print(f"[event_recommender] user_profile_embedding failed: {exc}")
    return {**state, "goal_embedding": None}


def _node_event_embedding(state: EventRecommenderState) -> EventRecommenderState:
    model = _get_sentence_model()
    events = state.get("events", [])
    event_embeddings: Dict[str, List[float]] = {}

    if model:
        for event in events:
            event_id = str(event["_id"])
            try:
                event_text = " ".join(
                    filter(
                        None,
                        [
                            event.get("name", ""),
                            event.get("description", ""),
                            " ".join(event.get("tags", []) or []),
                        ],
                    )
                )
                if event_text.strip():
                    event_embeddings[event_id] = model.encode(event_text).tolist()
            except Exception as exc:
                print(f"[event_recommender] event_embedding failed for {event_id}: {exc}")

    return {**state, "event_embeddings": event_embeddings}


def _node_semantic_matching(state: EventRecommenderState) -> EventRecommenderState:
    goal_emb = state.get("goal_embedding")
    event_embeddings = state.get("event_embeddings", {})
    events = state.get("events", [])

    for event in events:
        event_id = str(event["_id"])
        event_emb = event_embeddings.get(event_id)
        if goal_emb and event_emb:
            event["_semantic_score"] = cosine_similarity(goal_emb, event_emb)
        else:
            event["_semantic_score"] = 0.0

    return {**state, "events": events}


def _node_roi_scoring(state: EventRecommenderState) -> EventRecommenderState:
    db = get_sync_db()
    events = state.get("events", [])
    scored_events: List[Dict[str, Any]] = []

    for index, event in enumerate(events):
        recency_decay = max(0.1, 1.0 - (index * 0.05))
        semantic_sim = event.get("_semantic_score", 0.0)

        if state.get("goal_embedding") and semantic_sim > 0.0:
            roi_score = round(semantic_sim * 0.6 + recency_decay * 0.4, 3)
        else:
            roi_score = round(1.0 - (index * 0.08), 3) if index < 10 else 0.2

        scored_events.append({
            "event_id": str(event["_id"]),
            "relevance_score": roi_score,
        })

        try:
            db.events.update_one(
                {"_id": event["_id"]},
                {"$set": {"relevance_score": roi_score}},
            )
        except Exception as exc:
            print(f"[event_recommender] roi_scoring DB write failed for {event['_id']}: {exc}")

    scored_events.sort(key=lambda item: item["relevance_score"], reverse=True)
    return {**state, "scored_events": scored_events}


def _node_pre_event_contacts(state: EventRecommenderState) -> EventRecommenderState:
    user_id = state["user_id"]
    scored_events = state.get("scored_events", [])
    contacts = state.get("contacts", [])
    event_embeddings = state.get("event_embeddings", {})
    events_by_id: Dict[str, Dict[str, Any]] = {
        str(event["_id"]): event for event in state.get("events", [])
    }

    model = _get_sentence_model()
    pre_event_contacts: Dict[str, List[Dict[str, Any]]] = {}

    for scored in scored_events[:3]:
        event_id = scored["event_id"]
        event_doc = events_by_id.get(event_id, {})
        event_tags = set(tag.lower() for tag in (event_doc.get("tags", []) or []))
        event_name_words = set(event_doc.get("name", "").lower().split())
        event_emb = event_embeddings.get(event_id)
        contact_scores: List[Dict[str, Any]] = []

        for contact in contacts:
            contact_id = str(contact["_id"])
            contact_skills = [skill.lower() for skill in (contact.get("skills", []) or [])]

            if event_emb and model:
                try:
                    contact_text = " ".join(
                        filter(
                            None,
                            [
                                contact.get("title", ""),
                                contact.get("company", ""),
                                contact.get("bio", ""),
                                " ".join(contact.get("skills", []) or []),
                            ],
                        )
                    )
                    if contact_text.strip():
                        contact_embedding = model.encode(contact_text).tolist()
                        similarity = cosine_similarity(event_emb, contact_embedding)
                        matched_skills = [
                            skill for skill in contact_skills
                            if skill in event_tags or skill in event_name_words
                        ]
                        reason = f"High semantic relevance to '{event_doc.get('name', event_id)}'"
                        if matched_skills:
                            reason += f"; shared interests: {', '.join(matched_skills[:3])}"
                        contact_scores.append({
                            "contact_id": contact_id,
                            "score": similarity,
                            "reason": reason,
                        })
                        continue
                except Exception as exc:
                    print(f"[event_recommender] pre_event_contacts embedding failed for {contact_id}: {exc}")

            matched = [skill for skill in contact_skills if skill in event_tags or skill in event_name_words]
            if not matched:
                title_words = set(contact.get("title", "").lower().split())
                bio_words = set(contact.get("bio", "").lower().split())
                matched = list((title_words | bio_words) & (event_tags | event_name_words))

            keyword_score = min(1.0, len(matched) / max(1, len(event_tags | event_name_words)))
            reason = (
                f"Keyword match on '{event_doc.get('name', event_id)}': {', '.join(matched[:3])}"
                if matched
                else f"May have relevant background for '{event_doc.get('name', event_id)}'"
            )
            contact_scores.append({
                "contact_id": contact_id,
                "score": keyword_score,
                "reason": reason,
            })

        contact_scores.sort(key=lambda item: item["score"], reverse=True)
        pre_event_contacts[event_id] = [
            {"contact_id": item["contact_id"], "reason": item["reason"]}
            for item in contact_scores[:5]
        ]

    try:
        import redis as sync_redis

        redis_client = sync_redis.from_url(settings.redis_url, decode_responses=True)
        redis_client.set(
            f"events:pre_contacts:{user_id}",
            json.dumps(pre_event_contacts),
            ex=86400,
        )
    except Exception as exc:
        print(f"[event_recommender] pre_event_contacts Redis cache failed: {exc}")

    publish_ws_event(user_id, {
        "type": "pre_event_contacts_ready",
        "user_id": user_id,
        "event_count": len(pre_event_contacts),
    })

    return {**state, "pre_event_contacts": pre_event_contacts}


def _build_event_recommender_graph():
    workflow = StateGraph(EventRecommenderState)
    workflow.add_node("user_profile_embedding", _node_user_profile_embedding)
    workflow.add_node("event_embedding", _node_event_embedding)
    workflow.add_node("semantic_matching", _node_semantic_matching)
    workflow.add_node("roi_scoring", _node_roi_scoring)
    workflow.add_node("find_pre_event_contacts", _node_pre_event_contacts)
    workflow.set_entry_point("user_profile_embedding")
    workflow.add_edge("user_profile_embedding", "event_embedding")
    workflow.add_edge("event_embedding", "semantic_matching")
    workflow.add_edge("semantic_matching", "roi_scoring")
    workflow.add_edge("roi_scoring", "find_pre_event_contacts")
    workflow.add_edge("find_pre_event_contacts", END)
    return workflow.compile()


_event_recommender_graph = _build_event_recommender_graph()


@celery_app.task(name="event_recommender_task", bind=True, max_retries=3)
def event_recommender_task(self, payload: dict):
    job_id = payload.get("job_id")
    user_id = payload.get("user_id")
    user_oid = to_object_id(user_id)

    db = get_sync_db()
    start = time.time()
    progress_nodes = [
        "user_profile_embedding",
        "event_embedding",
        "semantic_matching",
        "roi_scoring",
        "pre_event_contacts",
    ]
    progress_values = [15, 30, 50, 75, 100]

    try:
        update_job_status(db, job_id, "running")
        publish_ws_event(user_id, {
            "type": "agent:job_started",
            "job_id": job_id,
            "agent_name": "event_recommender",
        })

        goal_text = ""
        try:
            campaigns = list(
                db.campaigns.find(
                    {"user_id": user_oid, "status": "active", "deleted_at": None},
                    {"goal": 1},
                ).limit(3)
            )
            goal_text = " ".join(campaign.get("goal", "") for campaign in campaigns if campaign.get("goal"))
            if not goal_text:
                user = db.users.find_one({"_id": user_oid}, {"bio": 1, "skills": 1})
                if user:
                    goal_text = " ".join(
                        filter(
                            None,
                            [
                                user.get("bio", ""),
                                " ".join(user.get("skills", []) or []),
                            ],
                        )
                    )
        except Exception as exc:
            print(f"[event_recommender] Failed to fetch goal text: {exc}")

        synced_ticketmaster = 0
        sync_requested = payload.get("sync_ticketmaster", payload.get("sync_eventbrite", True))
        try:
            if sync_requested:
                synced_ticketmaster = _sync_ticketmaster_events(
                    db,
                    user_oid,
                    goal_text=goal_text,
                    limit=settings.ticketmaster_page_size,
                )
        except Exception as exc:
            print(f"[event_recommender] Ticketmaster sync failed: {exc}")
            if sync_requested:
                raise

        now = datetime.utcnow()
        events = list(
            db.events.find(
                {
                    "user_id": user_oid,
                    "event_date": {"$gte": now},
                    "deleted_at": None,
                },
                {
                    "_id": 1,
                    "name": 1,
                    "description": 1,
                    "event_date": 1,
                    "type": 1,
                    "location_type": 1,
                    "tags": 1,
                },
            ).sort("event_date", 1).limit(30)
        )

        contacts: List[Dict[str, Any]] = []
        try:
            contacts = list(
                db.contacts.find(
                    {"user_id": user_oid, "deleted_at": None},
                    {
                        "_id": 1,
                        "name": 1,
                        "title": 1,
                        "company": 1,
                        "bio": 1,
                        "skills": 1,
                    },
                ).limit(100)
            )
        except Exception as exc:
            print(f"[event_recommender] Failed to fetch contacts: {exc}")

        result = _event_recommender_graph.invoke(EventRecommenderState(
            user_id=user_id,
            job_id=job_id,
            goal_text=goal_text,
            goal_embedding=None,
            events=events,
            event_embeddings={},
            scored_events=[],
            contacts=contacts,
            pre_event_contacts={},
        ))

        scored_events = result["scored_events"]
        pre_event_contacts = result["pre_event_contacts"]

        for node_name, progress_pct in zip(progress_nodes, progress_values):
            publish_ws_event(user_id, {
                "type": "agent:job_progress",
                "job_id": job_id,
                "agent_name": "event_recommender",
                "node_name": node_name,
                "progress_pct": progress_pct,
            })

        import redis as sync_redis

        redis_client = sync_redis.from_url(settings.redis_url, decode_responses=True)
        redis_client.set(
            f"events:recommendations:{user_id}",
            json.dumps(scored_events),
            ex=86400,
        )

        duration_ms = int((time.time() - start) * 1000)
        output = {
            "recommendations": scored_events,
            "count": len(scored_events),
            "pre_event_contacts": pre_event_contacts,
            "synced_ticketmaster": synced_ticketmaster,
        }
        explanation = (
            f"Recommended {len(scored_events)} events; synced {synced_ticketmaster} "
            f"Ticketmaster events; pre-event contacts identified for {len(pre_event_contacts)} events"
        )
        if synced_ticketmaster == 0 and sync_requested:
            explanation += ". Ticketmaster sync returned 0 events — check API key or search query."
        update_job_status(
            db,
            job_id,
            "success",
            output=output,
            explanation=explanation,
            duration_ms=duration_ms,
        )

        publish_ws_event(user_id, {
            "type": "agent:job_complete",
            "job_id": job_id,
            "agent_name": "event_recommender",
            "status": "success",
            "output_summary": f"{len(scored_events)} events recommended",
        })

    except Exception as exc:
        duration_ms = int((time.time() - start) * 1000)
        update_job_status(db, job_id, "failed", errors=[str(exc)], duration_ms=duration_ms)
        retry_or_deadletter(self, db, "event_recommender_task", payload, exc)
