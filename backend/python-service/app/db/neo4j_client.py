"""
Synchronous Neo4j driver singleton for use in Celery tasks.
Must be synchronous — Celery workers cannot use async.
"""
from __future__ import annotations
import logging
from typing import Optional

logger = logging.getLogger(__name__)
_driver = None


def get_neo4j_driver():
    """Return the Neo4j driver, initializing it lazily. Returns None if neo4j is not configured."""
    global _driver
    if _driver is not None:
        return _driver
    try:
        from app.config import settings
        if not settings.neo4j_uri:
            return None
        from neo4j import GraphDatabase
        _driver = GraphDatabase.driver(
            settings.neo4j_uri,
            auth=(settings.neo4j_user, settings.neo4j_password),
        )
        logger.info(f"[neo4j_client] Connected to Neo4j at {settings.neo4j_uri}")
        return _driver
    except ImportError:
        logger.warning("[neo4j_client] neo4j package not installed — graph features disabled")
        return None
    except Exception as e:
        logger.warning(f"[neo4j_client] Failed to connect to Neo4j: {e}")
        return None


def close_neo4j_driver():
    """Close the driver on shutdown."""
    global _driver
    if _driver is not None:
        _driver.close()
        _driver = None
        logger.info("[neo4j_client] Neo4j driver closed")
