"""
Internal agent trigger endpoints — called by Node.js for synchronous queries.
Most agent work is async via Celery, but this router handles direct API needs.
"""
from fastapi import APIRouter, Depends, Header, HTTPException
from pydantic import BaseModel
from ..config import settings
from ..database import get_db

router = APIRouter()


def _check_internal_secret(x_internal_secret: str = Header(None)):
    if x_internal_secret != settings.internal_service_secret:
        raise HTTPException(status_code=403, detail="Forbidden")


class AIQueryRequest(BaseModel):
    query: str
    user_id: str
    filters: dict = {}


@router.post("/ai-search")
async def ai_search(request: AIQueryRequest, _: None = Depends(_check_internal_secret)):
    """Convert natural language query to MongoDB contact filters using LangChain function-calling."""
    from app.config import settings as _settings

    if not _settings.anthropic_api_key:
        return {
            "results": [],
            "interpretation": "AI search requires ANTHROPIC_API_KEY to be configured.",
            "filters_applied": {},
        }

    from pydantic import BaseModel as PydanticBase
    from typing import Optional, List

    class ContactFilter(PydanticBase):
        name_contains: Optional[str] = None
        company_contains: Optional[str] = None
        title_contains: Optional[str] = None
        skills_include: Optional[List[str]] = None
        min_strength_score: Optional[int] = None
        source: Optional[str] = None

    try:
        from langchain_anthropic import ChatAnthropic
        from langchain_core.messages import HumanMessage, SystemMessage

        llm = ChatAnthropic(
            model=_settings.fast_llm_model,
            api_key=_settings.anthropic_api_key,
        ).bind_tools([ContactFilter])

        messages = [
            SystemMessage(content="Convert the user's natural language query into structured contact search filters. Use the ContactFilter tool."),
            HumanMessage(content=request.query),
        ]
        response = llm.invoke(messages)

        # Extract tool call
        filter_dict = {}
        interpretation = request.query
        if hasattr(response, "tool_calls") and response.tool_calls:
            tool_args = response.tool_calls[0].get("args", {})
            # Build MongoDB filter from tool args
            if tool_args.get("name_contains"):
                filter_dict["name"] = {"$regex": tool_args["name_contains"], "$options": "i"}
            if tool_args.get("company_contains"):
                filter_dict["company"] = {"$regex": tool_args["company_contains"], "$options": "i"}
            if tool_args.get("title_contains"):
                filter_dict["title"] = {"$regex": tool_args["title_contains"], "$options": "i"}
            if tool_args.get("skills_include"):
                filter_dict["skills"] = {"$in": tool_args["skills_include"]}
            if tool_args.get("min_strength_score") is not None:
                filter_dict["strength_score"] = {"$gte": tool_args["min_strength_score"]}
            if tool_args.get("source"):
                filter_dict["source"] = tool_args["source"]
            interpretation = f"Searching for contacts matching: {tool_args}"
        else:
            # Fallback: simple text search
            filter_dict = {"name": {"$regex": request.query, "$options": "i"}}

        # Add user_id filter and exclude deleted
        filter_dict["user_id"] = request.user_id
        filter_dict["deleted_at"] = None

        db = get_db()
        import asyncio
        contacts_raw = await asyncio.get_event_loop().run_in_executor(
            None,
            lambda: list(db.contacts.find(filter_dict, {"_id": 1, "name": 1, "title": 1, "company": 1, "strength_score": 1}).limit(20))
        )
        results = [
            {
                "id": str(c["_id"]),
                "name": c.get("name", ""),
                "title": c.get("title", ""),
                "company": c.get("company", ""),
                "strength_score": c.get("strength_score", 0),
            }
            for c in contacts_raw
        ]

        return {
            "results": results,
            "interpretation": interpretation,
            "filters_applied": {k: str(v) for k, v in filter_dict.items() if k not in ("user_id", "deleted_at")},
        }

    except Exception as e:
        print(f"[ai_search] Error: {e}")
        return {
            "results": [],
            "interpretation": f"Search failed: {str(e)}",
            "filters_applied": {},
        }
