import crypto from 'crypto';
import { Router } from 'express';
import mongoose from 'mongoose';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config.js';
import { authenticate } from '../middleware/auth.js';
import AgentJob from '../models/AgentJob.js';
import Contact from '../models/Contact.js';
import UserIntegration from '../models/UserIntegration.js';
import { EVENTS, publishEvent } from '../services/redis.js';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });
router.use(authenticate);

function decryptToken(encryptedPayload) {
  if (!encryptedPayload || !encryptedPayload.includes(':')) return null;
  const [ivHex, encryptedHex] = encryptedPayload.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  const encrypted = Buffer.from(encryptedHex, 'hex');
  const key = crypto.createHash('sha256').update(config.jwt.secret).digest();
  const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return decrypted.toString('utf8');
}

function normalizeCsvHeader(header) {
  return header
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function parseCsv(csvText) {
  const rows = [];
  let current = '';
  let row = [];
  let inQuotes = false;

  for (let i = 0; i < csvText.length; i += 1) {
    const char = csvText[i];
    const next = csvText[i + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === ',' && !inQuotes) {
      row.push(current);
      current = '';
      continue;
    }

    if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && next === '\n') continue;
      row.push(current);
      rows.push(row);
      row = [];
      current = '';
      continue;
    }

    current += char;
  }

  if (current !== '' || row.length) {
    row.push(current);
    rows.push(row);
  }

  return rows;
}

function buildLinkedInContact(row) {
  const firstName = row.first_name || row.first || '';
  const lastName = row.last_name || row.last || '';
  const fullName = row.full_name || row.name || `${firstName} ${lastName}`.trim();
  const email = row.email_address || row.email || '';
  const linkedinUrl = row.linkedin_profile_url || row.profile_url || row.public_profile_url || '';
  const company = row.company || row.current_company || row.organization || '';
  const title = row.position || row.job_title || row.title || '';
  const location = row.location || '';

  const contact = {
    name: fullName || linkedinUrl || email || 'LinkedIn Connection',
    email,
    company,
    title,
    location,
    linkedin_url: linkedinUrl,
    avatar_url: null,
    source: 'linkedin',
    imported_from: 'linkedin_csv',
    imported_at: new Date(),
    notes_json: { linkedin_data: row },
  };

  if (row.connected_on) {
    contact.notes_json.connected_on = row.connected_on;
  }

  return contact;
}

function buildGithubContact(profile) {
  return {
    user_id: null,
    name: profile.name || profile.login || 'GitHub Connection',
    email: profile.email || '',
    title: profile.bio || '',
    company: profile.company || '',
    location: profile.location || '',
    avatar_url: profile.avatar_url || null,
    github_url: profile.html_url || profile.url || '',
    source: 'github',
    imported_from: 'github_api',
    imported_at: new Date(),
    notes_json: { github_data: profile },
  };
}

async function fetchGithubConnections(accessToken) {
  const headers = {
    Authorization: `Bearer ${accessToken}`,
    Accept: 'application/vnd.github+json',
    'User-Agent': 'ConnectSphere',
  };

  const fetchList = async (path) => {
    const res = await fetch(`https://api.github.com/user/${path}?per_page=100`, { headers });
    if (!res.ok) {
      throw new Error(`GitHub ${path} fetch failed: ${res.status} ${res.statusText}`);
    }
    return res.json();
  };

  const [followers, following] = await Promise.all([fetchList('followers'), fetchList('following')]);
  const unique = new Map();

  for (const item of [...followers, ...following]) {
    const login = item.login || item.node_id || '';
    if (!login) continue;
    if (!unique.has(login)) unique.set(login, item.url || item.html_url || `https://api.github.com/users/${login}`);
  }

  const profiles = [];
  for (const [login, url] of unique.entries()) {
    try {
      const res = await fetch(url, { headers });
      if (!res.ok) continue;
      const profile = await res.json();
      profiles.push(profile);
    } catch (err) {
      console.warn(`[integrations] GitHub profile fetch failed for ${login}: ${err.message}`);
    }
  }

  return profiles;
}

async function upsertContacts(userId, docs, source) {
  if (!docs.length) return [];

  const operations = docs.map((doc) => {
    const contact = { ...doc, user_id: userId, source };
    const filter = { user_id: userId, source };

    if (source === 'github' && contact.github_url) {
      filter.github_url = contact.github_url;
    } else if (source === 'linkedin' && contact.linkedin_url) {
      filter.linkedin_url = contact.linkedin_url;
    } else if (contact.email) {
      filter.email = contact.email;
    } else if (contact.name) {
      filter.name = contact.name;
    } else {
      filter._id = new mongoose.Types.ObjectId();
    }

    return {
      updateOne: {
        filter,
        update: { $setOnInsert: contact },
        upsert: true,
      },
    };
  });

  await Contact.bulkWrite(operations, { ordered: false });

  const query = {
    user_id: userId,
    source,
    $or: [],
  };

  for (const doc of docs) {
    if (source === 'github' && doc.github_url) query.$or.push({ github_url: doc.github_url });
    if (source === 'linkedin' && doc.linkedin_url) query.$or.push({ linkedin_url: doc.linkedin_url });
    if (doc.email) query.$or.push({ email: doc.email });
  }

  if (!query.$or.length) delete query.$or;
  const inserted = await Contact.find(query).select('_id').lean();
  return inserted.map((doc) => doc._id);
}

// GET /api/integrations
router.get('/', async (req, res) => {
  const integrations = await UserIntegration.find({ user_id: req.user._id })
    .select('-access_token -refresh_token').lean();
  res.json(integrations);
});

// GET /api/integrations/:provider/status
router.get('/:provider/status', async (req, res) => {
  const integration = await UserIntegration.findOne({
    user_id: req.user._id, provider: req.params.provider,
  }).select('-access_token -refresh_token').lean();
  res.json(integration || { provider: req.params.provider, is_active: false });
});

// POST /api/integrations/:provider/connect — OAuth stub
router.post('/:provider/connect', async (req, res) => {
  res.json({ message: `OAuth ${req.params.provider} connect — configure credentials in .env` });
});

// DELETE /api/integrations/:provider/disconnect
router.delete('/:provider/disconnect', async (req, res) => {
  await UserIntegration.findOneAndUpdate(
    { user_id: req.user._id, provider: req.params.provider },
    { is_active: false, disconnected_at: new Date() },
  );
  res.json({ message: `${req.params.provider} disconnected` });
});

// POST /api/integrations/:provider/sync — provider-specific sync
router.post('/:provider/sync', async (req, res) => {
  const provider = req.params.provider;
  if (provider === 'github') {
    const integration = await UserIntegration.findOne({ user_id: req.user._id, provider: 'github' });
    if (!integration?.access_token) {
      return res.status(400).json({ error: 'GitHub is not connected' });
    }

    const accessToken = decryptToken(integration.access_token);
    if (!accessToken) return res.status(500).json({ error: 'Unable to decrypt GitHub token' });

    const profiles = await fetchGithubConnections(accessToken);
    const docs = profiles.map((profile) => buildGithubContact(profile));
    const contact_ids = await upsertContacts(req.user._id, docs, 'github');

    const job_id = uuidv4();
    await AgentJob.create({
      job_id, user_id: req.user._id, agent_name: 'profile_parsing',
      trigger_event: EVENTS.CONTACT_IMPORTED, status: 'queued',
      input: { contact_ids, source: 'github' },
    });
    await publishEvent(EVENTS.CONTACT_IMPORTED, { user_id: req.user._id, job_id, contact_ids, source: 'github' });

    return res.json({ job_id, status: 'queued', imported: contact_ids.length });
  }

  if (provider === 'linkedin') {
    return res.status(501).json({
      error: 'LinkedIn direct sync is not enabled. Use the LinkedIn CSV import endpoint instead.',
      csv_upload: '/api/integrations/linkedin/import-csv',
    });
  }

  const job_id = uuidv4();
  await AgentJob.create({
    job_id, user_id: req.user._id, agent_name: 'profile_parsing',
    trigger_event: EVENTS.CONTACT_IMPORTED, status: 'queued',
    input: { source: provider },
  });
  await publishEvent(EVENTS.CONTACT_IMPORTED, {
    user_id: req.user._id, job_id, source: provider,
  });
  res.json({ job_id, status: 'queued' });
});

// Columns that must appear (normalized) in a LinkedIn Connections CSV export
const LINKEDIN_REQUIRED_HEADERS = new Set([
  'first_name', 'last_name', 'email_address', 'company', 'position',
]);
// Aliases LinkedIn uses across different export versions
const LINKEDIN_KNOWN_HEADERS = new Set([
  ...LINKEDIN_REQUIRED_HEADERS,
  'full_name', 'name', 'first', 'last',
  'linkedin_profile_url', 'profile_url', 'public_profile_url',
  'current_company', 'organization', 'job_title', 'title',
  'location', 'connected_on', 'email',
]);

// POST /api/integrations/linkedin/import-csv — upload LinkedIn export CSV
router.post('/linkedin/import-csv', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'LinkedIn CSV file is required' });

  // 1. MIME type check
  const allowedMimes = new Set(['text/csv', 'application/csv', 'application/vnd.ms-excel', 'text/plain']);
  if (!allowedMimes.has(req.file.mimetype) && !req.file.originalname.toLowerCase().endsWith('.csv')) {
    return res.status(400).json({ error: 'File must be a CSV (.csv). Got: ' + req.file.mimetype });
  }

  // 2. UTF-8 decode — reject binary/corrupt files
  let text;
  try {
    text = req.file.buffer.toString('utf8');
    if (text.includes('\uFFFD')) throw new Error('Non-UTF-8 characters detected');
  } catch (err) {
    return res.status(400).json({ error: 'CSV file must be UTF-8 encoded: ' + err.message });
  }

  // 3. Parse and validate structure
  const rows = parseCsv(text);
  if (rows.length < 2) {
    return res.status(400).json({ error: 'CSV must contain a header row and at least one data row' });
  }

  const headers = rows[0].map(normalizeCsvHeader);

  // 4. Header sanity check — at least one recognisable LinkedIn column must exist
  const recognisedCount = headers.filter((h) => LINKEDIN_KNOWN_HEADERS.has(h)).length;
  if (recognisedCount === 0) {
    return res.status(400).json({
      error: 'File does not appear to be a LinkedIn Connections CSV export. ' +
             'Expected columns like: First Name, Last Name, Email Address, Company, Position.',
      found_headers: rows[0].slice(0, 10),
    });
  }

  // 5. Column count consistency — every data row must have the same number of columns as the header
  const malformedRows = rows.slice(1).reduce((acc, row, i) => {
    if (row.length !== headers.length) acc.push(i + 2); // 1-based, +1 for header
    return acc;
  }, []);
  if (malformedRows.length > Math.ceil(rows.length * 0.1)) {
    // Allow up to 10% malformed rows (trailing newlines, etc.) but reject clearly broken files
    return res.status(400).json({
      error: `CSV structure is inconsistent. ${malformedRows.length} rows have the wrong number of columns.`,
      sample_bad_rows: malformedRows.slice(0, 5),
    });
  }

  // 6. Build contact docs (skip malformed rows silently)
  const docs = rows.slice(1)
    .filter((row) => row.length === headers.length)
    .map((row) => {
      const values = row.reduce((acc, value, index) => {
        if (headers[index]) acc[headers[index]] = value.trim();
        return acc;
      }, {});
      return buildLinkedInContact(values);
    })
    .filter((doc) => doc.name || doc.linkedin_url || doc.email);

  if (!docs.length) {
    return res.status(400).json({ error: 'No valid LinkedIn contacts were found in the file. Ensure Name, Email, or Profile URL columns are populated.' });
  }

  const contact_ids = await upsertContacts(req.user._id, docs, 'linkedin');
  const job_id = uuidv4();
  await AgentJob.create({
    job_id, user_id: req.user._id, agent_name: 'profile_parsing',
    trigger_event: EVENTS.CONTACT_IMPORTED, status: 'queued',
    input: { contact_ids, source: 'linkedin' },
  });
  await publishEvent(EVENTS.CONTACT_IMPORTED, { user_id: req.user._id, job_id, contact_ids, source: 'linkedin' });

  res.status(202).json({ job_id, status: 'queued', imported: contact_ids.length });
});

// Source-specific import routes
for (const provider of ['linkedin', 'github', 'google']) {
  router.post(`/${provider}/import-contacts`, async (req, res) => {
    const { contacts: raw = [] } = req.body;
    if (!raw.length) return res.status(400).json({ error: 'contacts array required' });

    const docs = raw.map((c) => ({ ...c, user_id: req.user._id, source: provider }));
    const created = await Contact.insertMany(docs, { ordered: false }).catch((e) => e.insertedDocs || []);
    const contact_ids = created.map((c) => c._id);

    const job_id = uuidv4();
    await AgentJob.create({
      job_id, user_id: req.user._id, agent_name: 'profile_parsing',
      trigger_event: EVENTS.CONTACT_IMPORTED, status: 'queued',
      input: { contact_ids, source: provider },
    });
    await publishEvent(EVENTS.CONTACT_IMPORTED, { user_id: req.user._id, job_id, contact_ids, source: provider });
    res.json({ job_id, count: contact_ids.length });
  });
}

export default router;
