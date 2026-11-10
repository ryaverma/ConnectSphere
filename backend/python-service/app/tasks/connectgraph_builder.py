"""
Agent 2 — ConnectGraph Builder Agent
Subscribes to: profiles_enriched
Tasks:
  1. node_upsert      — MERGE Person/Company/Topic nodes into Neo4j
  2. user_knows_edges — Create (User)-[:KNOWS]->(Person) edges
  3. cross_user_overlap — Detect contacts shared across users (email match)
  4. graph_algorithms — PageRank, Louvain, Betweenness via GDS
  5. path_analysis    — Shortest-path distances between top contacts
"""
import time
import json
from celery import shared_task
from .base import get_sync_db, update_job_status, publish_ws_event, retry_or_deadletter
from ..celery_app import celery_app


# ── Helpers ───────────────────────────────────────────────────────────────────

def _get_driver():
    from app.db.neo4j_client import get_neo4j_driver
    return get_neo4j_driver()


def _str(val):
    return str(val) if val is not None else None


# ── Task 1: node_upsert ───────────────────────────────────────────────────────

def _node_upsert(user_id, contact_ids, db):
    """MERGE Person, Company, and Topic nodes into Neo4j."""
    driver = _get_driver()
    if driver is None:
        print("[connectgraph_builder] Neo4j unavailable — skipping node_upsert")
        return 0, 0

    nodes_added = 0
    edges_added = 0

    with driver.session() as session:
        for contact_id in contact_ids:
            try:
                contact = db.contacts.find_one({"_id": contact_id})
                if not contact:
                    continue

                name     = contact.get("name", "Unknown")
                title    = contact.get("title", "")
                company  = contact.get("company", "")
                email    = (contact.get("email") or "").strip().lower()
                skills   = contact.get("skills", []) or []
                cid_str  = _str(contact_id)

                # MERGE Person node
                result = session.run(
                    """
                    MERGE (p:Person {contact_id: $cid})
                    ON CREATE SET
                        p.user_id    = $user_id,
                        p.name       = $name,
                        p.title      = $title,
                        p.email      = $email,
                        p.created_at = timestamp()
                    ON MATCH SET
                        p.name  = $name,
                        p.title = $title,
                        p.email = $email
                    RETURN p
                    """,
                    cid=cid_str, user_id=user_id, name=name, title=title, email=email
                )
                if result.single():
                    nodes_added += 1

                # MERGE Company node + WORKS_AT
                if company:
                    session.run(
                        """
                        MERGE (c:Company {name: $company})
                        WITH c
                        MATCH (p:Person {contact_id: $cid})
                        MERGE (p)-[:WORKS_AT]->(c)
                        """,
                        company=company, cid=cid_str
                    )
                    edges_added += 1

                # MERGE Topic nodes + HAS_SKILL
                for skill in (skills or [])[:5]:
                    if skill:
                        session.run(
                            """
                            MERGE (t:Topic {name: $skill})
                            WITH t
                            MATCH (p:Person {contact_id: $cid})
                            MERGE (p)-[:HAS_SKILL]->(t)
                            """,
                            skill=skill, cid=cid_str
                        )
                        edges_added += 1

            except Exception as e:
                print(f"[connectgraph_builder] node_upsert error for {contact_id}: {e}")
                continue

    print(f"[connectgraph_builder] node_upsert: {nodes_added} nodes, {edges_added} edges")
    return nodes_added, edges_added


# ── Task 2: user_knows_edges ─────────────────────────────────────────────────

def _user_knows_edges(user_id, contact_ids, db):
    """
    Create (User)-[:KNOWS]->(Person) edges.
    The User node represents the account owner — not a Contact.
    This is the foundational edge: "I uploaded this person from my network."
    """
    driver = _get_driver()
    if driver is None:
        return

    # Get user's email from MongoDB for the User node
    user = db.users.find_one({"_id": db.users.find_one({"$or": [{"_id": user_id}]}, {"email": 1}) and user_id})
    # Simpler: just use user_id string as identifier
    user_id_str = _str(user_id)

    with driver.session() as session:
        # MERGE User node
        try:
            session.run(
                """
                MERGE (u:User {user_id: $uid})
                ON CREATE SET u.created_at = timestamp()
                RETURN u
                """,
                uid=user_id_str
            )
        except Exception as e:
            print(f"[connectgraph_builder] User node upsert failed: {e}")
            return

        # Create KNOWS edges from User to each contact Person node
        edges_created = 0
        for contact_id in contact_ids:
            cid_str = _str(contact_id)
            try:
                session.run(
                    """
                    MATCH (u:User {user_id: $uid})
                    MATCH (p:Person {contact_id: $cid})
                    MERGE (u)-[r:KNOWS]->(p)
                    ON CREATE SET r.confidence = 'confirmed', r.created_at = timestamp()
                    """,
                    uid=user_id_str, cid=cid_str
                )
                edges_created += 1
            except Exception as e:
                print(f"[connectgraph_builder] KNOWS edge failed {user_id}->{contact_id}: {e}")

    print(f"[connectgraph_builder] user_knows_edges: {edges_created} edges created")


# ── Task 3: cross_user_overlap ────────────────────────────────────────────────

def _cross_user_overlap(user_id, contact_ids, db):
    """
    Detect contacts shared across multiple users via email matching.
    When User A and User B both have a contact with the same email,
    we know they share a connection — without revealing either user's identity.

    Writes `shared_user_count` to each contact in MongoDB and creates
    a `SHARED_CONTACT` property on the Person node in Neo4j.
    """
    driver = _get_driver()
    user_id_str = _str(user_id)

    for contact_id in contact_ids:
        try:
            contact = db.contacts.find_one({"_id": contact_id}, {"email": 1, "company": 1, "name": 1})
            if not contact:
                continue

            email   = (contact.get("email") or "").strip().lower()
            company = (contact.get("company") or "").strip().lower()
            name    = (contact.get("name") or "").strip().lower()

            # Find other users who have a contact with the same email
            # (email is the strongest signal of identity)
            overlap_query = {"user_id": {"$ne": user_id}, "deleted_at": None}
            if email:
                overlap_query["email"] = email
            elif name and company:
                # Weaker: same name + company (no email available)
                overlap_query["$expr"] = {
                    "$and": [
                        {"$eq": [{"$toLower": "$name"}, name]},
                        {"$eq": [{"$toLower": "$company"}, company]},
                    ]
                }
            else:
                continue

            overlapping = list(db.contacts.find(overlap_query, {"user_id": 1, "_id": 1}))
            shared_user_count = len(set(str(c["user_id"]) for c in overlapping))

            if shared_user_count > 0:
                # Update MongoDB: how many other users know this contact
                db.contacts.update_one(
                    {"_id": contact_id},
                    {"$set": {"notes_json.shared_user_count": shared_user_count}}
                )

                # Update Neo4j: mark Person as shared
                if driver:
                    cid_str = _str(contact_id)
                    with driver.session() as session:
                        session.run(
                            """
                            MATCH (p:Person {contact_id: $cid})
                            SET p.shared_user_count = $count
                            """,
                            cid=cid_str, count=shared_user_count
                        )

                        # Create SHARED_WITH edges between Users (anonymized — no contact data)
                        for other_contact in overlapping:
                            other_uid = _str(other_contact["user_id"])
                            other_cid = _str(other_contact["_id"])
                            try:
                                session.run(
                                    """
                                    MATCH (u1:User {user_id: $uid1})
                                    MATCH (u2:User {user_id: $uid2})
                                    MERGE (u1)-[r:SHARES_CONTACT]->(u2)
                                    ON CREATE SET r.count = 1, r.created_at = timestamp()
                                    ON MATCH SET r.count = r.count + 1
                                    """,
                                    uid1=user_id_str, uid2=other_uid
                                )
                            except Exception:
                                pass

                print(f"[connectgraph_builder] Contact {contact_id} shared by {shared_user_count} other users")

        except Exception as e:
            print(f"[connectgraph_builder] cross_user_overlap error for {contact_id}: {e}")
            continue


# ── Task 4: graph_algorithms ──────────────────────────────────────────────────

def _graph_algorithms(user_id, db):
    """Run Neo4j GDS: PageRank, Louvain community detection, Betweenness centrality."""
    driver = _get_driver()
    if driver is None:
        print("[connectgraph_builder] Neo4j unavailable — skipping graph_algorithms")
        return

    graph_name = f"user_graph_{user_id}"

    with driver.session() as session:
        # Drop existing projection
        try:
            session.run("CALL gds.graph.drop($g, false)", g=graph_name)
        except Exception:
            pass

        # Project this user's subgraph
        try:
            session.run(
                """
                CALL gds.graph.project.cypher(
                    $g,
                    'MATCH (p:Person {user_id: $uid}) RETURN id(p) AS id',
                    'MATCH (a:Person {user_id: $uid})-[:KNOWS|WORKS_AT*..2]-(b:Person {user_id: $uid})
                     WHERE a <> b RETURN id(a) AS source, id(b) AS target',
                    { parameters: { uid: $uid } }
                )
                """,
                g=graph_name, uid=user_id
            )
        except Exception as e:
            print(f"[connectgraph_builder] GDS projection failed: {e}")
            return

        # PageRank
        try:
            for rec in session.run(
                "CALL gds.pageRank.stream($g) YIELD nodeId, score "
                "RETURN gds.util.asNode(nodeId).contact_id AS cid, score",
                g=graph_name
            ):
                cid = rec["cid"]
                if cid:
                    db.contacts.update_one({"_id": cid}, {"$set": {"notes_json.pagerank_score": round(rec["score"], 4)}})
        except Exception as e:
            print(f"[connectgraph_builder] PageRank failed: {e}")

        # Louvain community detection
        try:
            for rec in session.run(
                "CALL gds.louvain.stream($g) YIELD nodeId, communityId "
                "RETURN gds.util.asNode(nodeId).contact_id AS cid, communityId",
                g=graph_name
            ):
                cid = rec["cid"]
                if cid:
                    db.contacts.update_one({"_id": cid}, {"$set": {"notes_json.community_id": rec["communityId"]}})
        except Exception as e:
            print(f"[connectgraph_builder] Louvain failed: {e}")

        # Betweenness centrality
        try:
            for rec in session.run(
                "CALL gds.betweenness.stream($g) YIELD nodeId, score "
                "RETURN gds.util.asNode(nodeId).contact_id AS cid, score",
                g=graph_name
            ):
                cid = rec["cid"]
                if cid:
                    db.contacts.update_one({"_id": cid}, {"$set": {"notes_json.degree_centrality": round(rec["score"], 4)}})
        except Exception as e:
            print(f"[connectgraph_builder] Betweenness failed: {e}")

        try:
            session.run("CALL gds.graph.drop($g)", g=graph_name)
        except Exception:
            pass

    print(f"[connectgraph_builder] graph_algorithms complete for user {user_id}")


# ── Task 5: path_analysis ─────────────────────────────────────────────────────

def _path_analysis(user_id, db):
    """Compute shortest-path distances between top contacts."""
    driver = _get_driver()
    if driver is None:
        return

    try:
        top_contacts = list(db.contacts.find(
            {"user_id": user_id, "deleted_at": None, "notes_json.pagerank_score": {"$exists": True}},
            {"_id": 1}
        ).sort("notes_json.pagerank_score", -1).limit(10))

        top_ids = [_str(c["_id"]) for c in top_contacts]

        all_contacts = list(db.contacts.find(
            {"user_id": user_id, "deleted_at": None}, {"_id": 1}
        ).limit(100))
        all_ids = [_str(c["_id"]) for c in all_contacts]

        with driver.session() as session:
            for src in top_ids:
                for tgt in all_ids:
                    if src == tgt:
                        continue
                    try:
                        rec = session.run(
                            """
                            MATCH (a:Person {contact_id: $src}), (b:Person {contact_id: $tgt})
                            OPTIONAL MATCH p = shortestPath((a)-[*..6]-(b))
                            RETURN CASE WHEN p IS NULL THEN 999 ELSE length(p) END AS hops
                            """,
                            src=src, tgt=tgt
                        ).single()
                        hops = rec["hops"] if rec else 999
                        db.contacts.update_one({"_id": tgt}, {"$set": {"notes_json.graph_distance": hops}})
                    except Exception:
                        continue

    except Exception as e:
        print(f"[connectgraph_builder] path_analysis error: {e}")

    print(f"[connectgraph_builder] path_analysis complete for user {user_id}")


# ── Celery Task ───────────────────────────────────────────────────────────────

@celery_app.task(name="connectgraph_builder_task", bind=True, max_retries=3)
def connectgraph_builder_task(self, payload: dict):
    job_id      = payload.get("job_id")
    user_id     = payload.get("user_id")
    contact_ids = payload.get("contact_ids", [])

    db    = get_sync_db()
    start = time.time()

    try:
        update_job_status(db, job_id, "running")
        publish_ws_event(user_id, {
            "type": "agent:job_started", "job_id": job_id, "agent_name": "connectgraph_builder"
        })

        # 1. MERGE Person / Company / Topic nodes
        publish_ws_event(user_id, {
            "type": "agent:job_progress", "job_id": job_id,
            "agent_name": "connectgraph_builder", "node_name": "node_upsert", "progress_pct": 20,
        })
        nodes_added, edges_added = _node_upsert(user_id, contact_ids, db)

        # 2. Create (User)-[:KNOWS]->(Person) edges
        publish_ws_event(user_id, {
            "type": "agent:job_progress", "job_id": job_id,
            "agent_name": "connectgraph_builder", "node_name": "user_knows_edges", "progress_pct": 40,
        })
        _user_knows_edges(user_id, contact_ids, db)

        # 3. Cross-user overlap detection
        publish_ws_event(user_id, {
            "type": "agent:job_progress", "job_id": job_id,
            "agent_name": "connectgraph_builder", "node_name": "cross_user_overlap", "progress_pct": 60,
        })
        _cross_user_overlap(user_id, contact_ids, db)

        # 4. Graph algorithms (GDS)
        publish_ws_event(user_id, {
            "type": "agent:job_progress", "job_id": job_id,
            "agent_name": "connectgraph_builder", "node_name": "graph_algorithms", "progress_pct": 80,
        })
        _graph_algorithms(user_id, db)

        # 5. Path analysis
        publish_ws_event(user_id, {
            "type": "agent:job_progress", "job_id": job_id,
            "agent_name": "connectgraph_builder", "node_name": "path_analysis", "progress_pct": 100,
        })
        _path_analysis(user_id, db)

        duration_ms = int((time.time() - start) * 1000)
        output = {"nodes_added": nodes_added, "edges_added": edges_added}
        update_job_status(db, job_id, "success", output=output,
                          explanation=f"Graph updated: {nodes_added} nodes",
                          duration_ms=duration_ms)

        # Publish graph_updated → Opportunity Detection
        import redis as sync_redis
        from ..config import settings
        r = sync_redis.from_url(settings.redis_url, decode_responses=True)
        r.publish("graph_updated", json.dumps({
            "user_id": user_id, "nodes_added": nodes_added, "edges_added": edges_added,
            "graph_metrics": {},
        }))

        publish_ws_event(user_id, {
            "type": "agent:graph_updated",
            "user_id": user_id, "nodes_added": nodes_added, "edges_added": edges_added,
        })
        publish_ws_event(user_id, {
            "type": "agent:job_complete", "job_id": job_id,
            "agent_name": "connectgraph_builder", "status": "success",
            "output_summary": f"Graph: +{nodes_added} nodes, +{edges_added} edges",
        })

    except Exception as exc:
        duration_ms = int((time.time() - start) * 1000)
        update_job_status(db, job_id, "failed", errors=[str(exc)], duration_ms=duration_ms)
        retry_or_deadletter(self, db, "connectgraph_builder_task", payload, exc)
