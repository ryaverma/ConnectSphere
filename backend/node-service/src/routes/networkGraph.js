/**
 * Network Graph API
 *
 * GET  /api/network-graph/data                 — nodes + edges for current user
 * POST /api/network-graph/confirm-relationship — create/update explicit edge
 * GET  /api/network-graph/warm-intro           — shortest path between two contacts
 * GET  /api/network-graph/shared/:contactId    — how many other users share this contact
 * POST /api/network-graph/update-positions     — persist drag positions
 * DELETE /api/network-graph/relationship       — remove an explicit relationship
 */

import { Router } from 'express';
import neo4j from 'neo4j-driver';
import { authenticate } from '../middleware/auth.js';
import { getCache, setCache, delCache, keys, ttl } from '../services/redis.js';
import Contact from '../models/Contact.js';
import { config } from '../config.js';

const router = Router();
router.use(authenticate);

// ── Neo4j driver (lazy, optional) ─────────────────────────────────────────────
let _driver = null;

function getDriver() {
  if (_driver) return _driver;
  const { uri, user, password } = config.neo4j;
  if (!uri || !password) return null;
  try {
    _driver = neo4j.driver(uri, neo4j.auth.basic(user, password));
    return _driver;
  } catch (e) {
    console.warn('[networkGraph] Neo4j driver init failed:', e.message);
    return null;
  }
}

function neo4jInt(val) {
  if (val === null || val === undefined) return 0;
  if (typeof val === 'object' && 'low' in val) return neo4j.integer.toNumber(val);
  return Number(val);
}

function normalizeText(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

function uniqueNormalizedSkills(skills = []) {
  return [...new Set(
    skills
      .map((skill) => normalizeText(skill))
      .filter(Boolean)
  )];
}

function edgeKey(a, b) {
  return [String(a), String(b)].sort().join('::');
}

// ── Neo4j: edges query ────────────────────────────────────────────────────────

async function getEdgesFromNeo4j(contactIds) {
  const driver = getDriver();
  if (!driver || !contactIds.length) return [];

  const ids = contactIds.map(String);
  const session = driver.session();
  const edges = [];
  const seen = new Set();

  try {
    // Explicit confirmed relationships between Person nodes
    const knownResult = await session.run(
      `MATCH (a:Person)-[r:KNOWS|WORKED_WITH|MET_AT_EVENT|STUDIED_WITH]->(b:Person)
       WHERE a.contact_id IN $ids AND b.contact_id IN $ids
       RETURN a.contact_id AS from, b.contact_id AS to,
              type(r) AS relType,
              coalesce(r.strength, 0.8) AS strength,
              coalesce(r.confidence, 'confirmed') AS confidence,
              r.relationship_id AS relId`,
      { ids }
    );
    for (const r of knownResult.records) {
      const key = `${r.get('from')}-${r.get('to')}`;
      if (!seen.has(key)) {
        seen.add(key);
        edges.push({
          from: r.get('from'), to: r.get('to'),
          type: r.get('relType').toLowerCase().replace(/_/g, '-'),
          strength: Number(r.get('strength')),
          confidence: r.get('confidence'),
          relId: r.get('relId'),
        });
      }
    }

    return edges;
  } catch (e) {
    console.warn('[networkGraph] Neo4j edge query failed:', e.message);
    return [];
  } finally {
    await session.close();
  }
}

// ── MongoDB fallback: build edges from shared company/skills ─────────────────

function buildFallbackEdges(contacts) {
  const edges = [];
  const seen = new Set();

  for (let i = 0; i < contacts.length; i++) {
    for (let j = i + 1; j < contacts.length; j++) {
      const a = contacts[i], b = contacts[j];
      const aId = String(a._id), bId = String(b._id);
      const key = edgeKey(aId, bId);
      if (seen.has(key)) continue;

      const aSkills = uniqueNormalizedSkills(a.skills);
      const bSkills = uniqueNormalizedSkills(b.skills);
      const sharedSkills = bSkills.filter((skill) => aSkills.includes(skill));
      const sameCompany = normalizeText(a.company) && normalizeText(a.company) === normalizeText(b.company);
      const sameTitle = normalizeText(a.title) && normalizeText(a.title) === normalizeText(b.title);

      if (sharedSkills.length >= 2) {
        seen.add(key);
        edges.push({
          from: aId,
          to: bId,
          type: 'skill',
          strength: Math.min(0.45 + sharedSkills.length * 0.12, 0.85),
          confidence: 'inferred',
          label: sharedSkills.slice(0, 2).join(', '),
        });
        continue;
      }

      if (sameCompany && (sharedSkills.length >= 1 || sameTitle)) {
        seen.add(key);
        const labelParts = [a.company];
        if (sharedSkills[0]) labelParts.push(sharedSkills[0]);
        else if (sameTitle) labelParts.push(a.title);
        edges.push({
          from: aId,
          to: bId,
          type: 'computed',
          strength: sharedSkills.length >= 1 ? 0.42 : 0.35,
          confidence: 'inferred',
          label: labelParts.filter(Boolean).join(' • '),
        });
      }
    }
  }
  return edges;
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/network-graph/data
// ─────────────────────────────────────────────────────────────────────────────
router.get('/data', async (req, res) => {
  const cached = await getCache(keys.graphNodes(req.user._id));
  if (cached) return res.json({ ...cached, source: 'cache' });

  const contacts = await Contact.find({
    user_id: req.user._id, deleted_at: null,
  }).select('_id name title company skills graph_x graph_y strength_score avatar_color initials source status notes_json').lean();

  const nodes = contacts.map(c => ({
    id: String(c._id),
    x: c.graph_x || null,
    y: c.graph_y || null,
    contact: {
      id:           String(c._id),
      name:         c.name,
      title:        c.title,
      company:      c.company,
      skills:       c.skills || [],
      strengthScore: c.strength_score || 0,
      avatarColor:  c.avatar_color || 'bg-indigo-500',
      initials:     c.initials || (c.name || '??').slice(0, 2).toUpperCase(),
      source:       c.source,
      status:       c.status,
      community:    c.notes_json?.community_id ?? null,
      pagerank:     c.notes_json?.pagerank_score ?? null,
      sharedUserCount: c.notes_json?.shared_user_count ?? 0,
    },
  }));

  const contactIds = contacts.map(c => c._id);
  const confirmedEdges = await getEdgesFromNeo4j(contactIds);
  const inferredEdges = buildFallbackEdges(contacts).filter(
    (edge) => !confirmedEdges.some((confirmed) => edgeKey(confirmed.from, confirmed.to) === edgeKey(edge.from, edge.to))
  );
  const edges = [...confirmedEdges, ...inferredEdges];
  const dataSource =
    confirmedEdges.length > 0 && inferredEdges.length > 0 ? 'neo4j+computed'
      : confirmedEdges.length > 0 ? 'neo4j'
      : 'computed';

  const payload = { nodes, edges, source: dataSource };
  await setCache(keys.graphNodes(req.user._id), payload, ttl.graphNodes);
  res.json(payload);
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/network-graph/confirm-relationship
// Body: { from_contact_id, to_contact_id, relationship_type, notes? }
// relationship_type: 'knows' | 'worked_with' | 'met_at_event' | 'studied_with'
// ─────────────────────────────────────────────────────────────────────────────
router.post('/confirm-relationship', async (req, res) => {
  const { from_contact_id, to_contact_id, relationship_type = 'knows', notes = '' } = req.body;

  if (!from_contact_id || !to_contact_id) {
    return res.status(400).json({ error: 'from_contact_id and to_contact_id are required' });
  }

  const VALID_TYPES = ['knows', 'worked_with', 'met_at_event', 'studied_with'];
  const relType = relationship_type.toLowerCase().replace(/-/g, '_');
  if (!VALID_TYPES.includes(relType)) {
    return res.status(400).json({ error: `relationship_type must be one of: ${VALID_TYPES.join(', ')}` });
  }

  // Verify both contacts belong to this user
  const [fromContact, toContact] = await Promise.all([
    Contact.findOne({ _id: from_contact_id, user_id: req.user._id, deleted_at: null }).lean(),
    Contact.findOne({ _id: to_contact_id,   user_id: req.user._id, deleted_at: null }).lean(),
  ]);
  if (!fromContact) return res.status(404).json({ error: 'from_contact not found' });
  if (!toContact)   return res.status(404).json({ error: 'to_contact not found' });

  const driver = getDriver();
  if (!driver) {
    return res.status(503).json({ error: 'Graph database unavailable' });
  }

  const fromId = String(from_contact_id);
  const toId   = String(to_contact_id);
  const relTypeNeo = relType.toUpperCase(); // KNOWS, WORKED_WITH, etc.
  const relId = `${fromId}-${toId}-${relType}`;

  const session = driver.session();
  try {
    await session.run(
      `MATCH (a:Person {contact_id: $fromId})
       MATCH (b:Person {contact_id: $toId})
       MERGE (a)-[r:${relTypeNeo}]->(b)
       ON CREATE SET
         r.confidence    = 'confirmed',
         r.relationship_id = $relId,
         r.created_at    = timestamp(),
         r.notes         = $notes,
         r.strength      = 0.9
       ON MATCH SET
         r.confidence    = 'confirmed',
         r.notes         = $notes,
         r.updated_at    = timestamp()
       RETURN r`,
      { fromId, toId, relId, notes }
    );

    // Invalidate graph cache for this user
    await delCache(keys.graphNodes(req.user._id));

    res.json({
      success: true,
      edge: {
        from: fromId, to: toId,
        type: relType.replace(/_/g, '-'),
        confidence: 'confirmed',
        strength: 0.9,
        relId,
      },
    });
  } catch (e) {
    console.error('[networkGraph] confirm-relationship error:', e.message);
    res.status(500).json({ error: 'Failed to save relationship' });
  } finally {
    await session.close();
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/network-graph/relationship
// Body: { from_contact_id, to_contact_id, relationship_type }
// ─────────────────────────────────────────────────────────────────────────────
router.delete('/relationship', async (req, res) => {
  const { from_contact_id, to_contact_id, relationship_type = 'knows' } = req.body;
  if (!from_contact_id || !to_contact_id) {
    return res.status(400).json({ error: 'from_contact_id and to_contact_id are required' });
  }

  const driver = getDriver();
  if (!driver) return res.status(503).json({ error: 'Graph database unavailable' });

  const relTypeNeo = relationship_type.toUpperCase().replace(/-/g, '_');
  const session = driver.session();
  try {
    await session.run(
      `MATCH (a:Person {contact_id: $fromId})-[r:${relTypeNeo}]->(b:Person {contact_id: $toId})
       DELETE r`,
      { fromId: String(from_contact_id), toId: String(to_contact_id) }
    );
    await delCache(keys.graphNodes(req.user._id));
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: 'Failed to delete relationship' });
  } finally {
    await session.close();
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/network-graph/warm-intro?from=<contactId>&to=<contactId>
//
// Finds the shortest path between two contacts through the graph.
// Returns the path as a sequence of nodes and edges.
// ─────────────────────────────────────────────────────────────────────────────
router.get('/warm-intro', async (req, res) => {
  const { from: fromId, to: toId } = req.query;
  if (!fromId || !toId) return res.status(400).json({ error: 'from and to query params required' });

  // Verify both contacts belong to this user
  const [fromContact, toContact] = await Promise.all([
    Contact.findOne({ _id: fromId, user_id: req.user._id, deleted_at: null })
      .select('_id name initials avatarColor title company').lean(),
    Contact.findOne({ _id: toId, user_id: req.user._id, deleted_at: null })
      .select('_id name initials avatarColor title company').lean(),
  ]);
  if (!fromContact) return res.status(404).json({ error: 'from contact not found' });
  if (!toContact)   return res.status(404).json({ error: 'to contact not found' });

  const driver = getDriver();
  if (!driver) {
    // Fallback: no path found without Neo4j
    return res.json({ found: false, hops: null, path: [], message: 'Graph database unavailable' });
  }

  const session = driver.session();
  try {
    // Search for path through confirmed relationships first, then any
    const result = await session.run(
      `MATCH (a:Person {contact_id: $fromId}), (b:Person {contact_id: $toId})
       OPTIONAL MATCH p = shortestPath(
         (a)-[:KNOWS|WORKED_WITH|MET_AT_EVENT|STUDIED_WITH*..6]-(b)
       )
       RETURN p,
              CASE WHEN p IS NULL THEN 999 ELSE length(p) END AS hops`,
      { fromId: String(fromId), toId: String(toId) }
    );

    const record = result.records[0];
    if (!record || neo4jInt(record.get('hops')) === 999) {
      return res.json({ found: false, hops: null, path: [], message: 'No connection found within 6 hops' });
    }

    const hops = neo4jInt(record.get('hops'));
    const pathObj = record.get('p');

    // Extract contact_ids along the path
    const pathContactIds = [];
    if (pathObj && pathObj.segments) {
      for (const seg of pathObj.segments) {
        const startId = seg.start.properties?.contact_id;
        const endId   = seg.end.properties?.contact_id;
        if (startId && !pathContactIds.includes(startId)) pathContactIds.push(startId);
        if (endId   && !pathContactIds.includes(endId))   pathContactIds.push(endId);
      }
    }

    // Enrich with MongoDB data
    const pathContacts = await Contact.find({
      _id: { $in: pathContactIds }, user_id: req.user._id,
    }).select('_id name initials avatarColor title company').lean();

    const contactMap = Object.fromEntries(pathContacts.map(c => [String(c._id), c]));

    const pathNodes = pathContactIds.map(cid => {
      const c = contactMap[cid];
      return c ? {
        id: String(c._id), name: c.name, initials: c.initials,
        avatarColor: c.avatarColor, title: c.title, company: c.company,
      } : { id: cid, name: cid };
    });

    res.json({ found: true, hops, path: pathNodes });
  } catch (e) {
    console.error('[networkGraph] warm-intro error:', e.message);
    res.json({ found: false, hops: null, path: [], message: 'Path search failed' });
  } finally {
    await session.close();
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/network-graph/shared/:contactId
//
// Returns how many other users also know this contact (anonymized count).
// This is the cross-user overlap feature.
// ─────────────────────────────────────────────────────────────────────────────
router.get('/shared/:contactId', async (req, res) => {
  const contact = await Contact.findOne({
    _id: req.params.contactId, user_id: req.user._id, deleted_at: null,
  }).select('_id name email company notes_json').lean();

  if (!contact) return res.status(404).json({ error: 'Contact not found' });

  // Count from MongoDB (updated by Python worker)
  const sharedUserCount = contact.notes_json?.shared_user_count || 0;

  // Also check Neo4j for real-time count
  const driver = getDriver();
  let neo4jCount = sharedUserCount;
  if (driver && contact.email) {
    const session = driver.session();
    try {
      const result = await session.run(
        `MATCH (p:Person {contact_id: $cid})
         MATCH (u:User)-[:KNOWS]->(p)
         WHERE u.user_id <> $uid
         RETURN count(u) AS otherUserCount`,
        { cid: String(contact._id), uid: String(req.user._id) }
      );
      const rec = result.records[0];
      if (rec) neo4jCount = neo4jInt(rec.get('otherUserCount'));
    } catch (e) {
      // use MongoDB value
    } finally {
      await session.close();
    }
  }

  res.json({
    contactId: String(contact._id),
    sharedUserCount: neo4jCount,
    // We never reveal which users — only the count
    message: neo4jCount > 0
      ? `${neo4jCount} other user${neo4jCount > 1 ? 's' : ''} in ConnectSphere also know this person`
      : 'No other ConnectSphere users have this contact yet',
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/network-graph/update-positions
// ─────────────────────────────────────────────────────────────────────────────
router.post('/update-positions', async (req, res) => {
  const { positions = [] } = req.body;
  const ops = positions.map(({ contact_id, x, y }) => ({
    updateOne: {
      filter: { _id: contact_id, user_id: req.user._id },
      update: { $set: { graph_x: x, graph_y: y } },
    },
  }));
  if (ops.length) await Contact.bulkWrite(ops);
  res.json({ updated: ops.length });
});

export default router;
