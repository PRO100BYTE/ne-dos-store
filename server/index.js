const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const semver = require('semver');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 8787;
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || 'ne-dos-admin-dev-token';

const DATA_DIR = path.join(__dirname, 'data');
const PACKAGES_DIR = path.join(__dirname, 'packages');
const COMMUNITY_DIR = path.join(PACKAGES_DIR, 'community');
const SUBMITTED_DIR = path.join(PACKAGES_DIR, 'submitted');
const BUILD_DIR = path.resolve(__dirname, '..', 'build');

const CORE_REGISTRY_FILE = path.join(DATA_DIR, 'coreCommands.generated.json');
const COMMUNITY_REGISTRY_FILE = path.join(DATA_DIR, 'communityCommands.json');
const SUBMISSIONS_FILE = path.join(DATA_DIR, 'submissions.json');
const REVIEWS_FILE = path.join(DATA_DIR, 'reviews.json');
const INSTALL_HISTORY_FILE = path.join(DATA_DIR, 'install-history.json');
const SCHEMA_FILE = path.join(__dirname, 'db', 'schema.sql');

const db = process.env.DATABASE_URL
  ? new Pool({ connectionString: process.env.DATABASE_URL, ssl: process.env.PGSSL === 'disable' ? false : undefined })
  : null;

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors());
app.use(express.json({ limit: '2mb' }));
app.use(morgan('dev'));

function readJson(filePath, fallback = []) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch {
    return fallback;
  }
}

function writeJson(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

function sha256FromText(content) {
  return crypto.createHash('sha256').update(content, 'utf8').digest('hex');
}

function sha256FromFile(filePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

function nowIso() {
  return new Date().toISOString();
}

async function initDb() {
  if (!db) return false;
  const sql = fs.readFileSync(SCHEMA_FILE, 'utf-8');
  await db.query(sql);
  return true;
}

function normalizeCommand(command) {
  return {
    ...command,
    downloads: Number(command.downloads || 0),
    rating: Number(command.rating || 0),
    verified: Boolean(command.verified),
    tags: Array.isArray(command.tags) ? command.tags : [],
    status: command.status || 'approved',
    origin: command.origin || 'community',
  };
}

function localPackageSource(scope, slug) {
  return `/api/packages/${scope}/${slug}.js`;
}

function fileNameSafe(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

function commandTitle(name) {
  return name.charAt(0).toUpperCase() + name.slice(1);
}

async function loadReviews() {
  if (!db) return readJson(REVIEWS_FILE, []);
  const result = await db.query('SELECT * FROM command_reviews ORDER BY created_at DESC');
  return result.rows.map((row) => ({
    id: row.id,
    commandSlug: row.command_slug,
    authorName: row.author_name,
    rating: row.rating,
    comment: row.comment,
    createdAt: row.created_at,
  }));
}

async function saveReview(review) {
  if (!db) {
    const reviews = readJson(REVIEWS_FILE, []);
    reviews.push(review);
    writeJson(REVIEWS_FILE, reviews);
    return review;
  }
  await db.query(
    'INSERT INTO command_reviews (id, command_slug, author_name, rating, comment, created_at) VALUES ($1, $2, $3, $4, $5, $6)',
    [review.id, review.commandSlug, review.authorName, review.rating, review.comment, review.createdAt]
  );
  return review;
}

async function loadInstallHistory() {
  if (!db) return readJson(INSTALL_HISTORY_FILE, []);
  const result = await db.query('SELECT * FROM install_history ORDER BY created_at DESC');
  return result.rows.map((row) => ({
    id: row.id,
    commandSlug: row.command_slug,
    origin: row.origin,
    installerFingerprint: row.installer_fingerprint,
    createdAt: row.created_at,
  }));
}

async function saveInstallHistory(item) {
  if (!db) {
    const items = readJson(INSTALL_HISTORY_FILE, []);
    items.push(item);
    writeJson(INSTALL_HISTORY_FILE, items);
    return item;
  }
  await db.query(
    'INSERT INTO install_history (id, command_slug, origin, installer_fingerprint, created_at) VALUES ($1, $2, $3, $4, $5)',
    [item.id, item.commandSlug, item.origin, item.installerFingerprint, item.createdAt]
  );
  return item;
}

async function loadSubmissions() {
  if (!db) return readJson(SUBMISSIONS_FILE, []);
  const result = await db.query('SELECT * FROM command_submissions ORDER BY created_at DESC');
  return result.rows.map((row) => ({
    id: row.id,
    slug: row.slug,
    name: row.name,
    title: row.title,
    description: row.description,
    author: row.author,
    category: row.category,
    tags: row.tags || [],
    version: row.version,
    status: row.status,
    sourceUrl: row.source_url,
    sha256: row.sha256,
    moderationNote: row.moderation_note,
    scriptPath: row.script_path,
    createdAt: row.created_at,
    reviewedAt: row.reviewed_at,
    reviewedBy: row.reviewed_by,
    verified: false,
    origin: 'submitted',
  }));
}

async function insertSubmission(entry) {
  if (!db) {
    const items = readJson(SUBMISSIONS_FILE, []);
    items.push(entry);
    writeJson(SUBMISSIONS_FILE, items);
    return entry;
  }
  await db.query(
    `INSERT INTO command_submissions
      (id, slug, name, title, description, author, category, tags, version, status, source_url, sha256, moderation_note, script_path, created_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)`,
    [
      entry.id,
      entry.slug,
      entry.name,
      entry.title,
      entry.description,
      entry.author,
      entry.category,
      JSON.stringify(entry.tags),
      entry.version,
      entry.status,
      entry.sourceUrl,
      entry.sha256,
      entry.moderationNote || null,
      entry.scriptPath,
      entry.createdAt,
    ]
  );
  return entry;
}

async function updateSubmission(id, patch) {
  if (!db) {
    const items = readJson(SUBMISSIONS_FILE, []);
    const next = items.map((item) => item.id === id ? { ...item, ...patch } : item);
    writeJson(SUBMISSIONS_FILE, next);
    return next.find((item) => item.id === id) || null;
  }
  const current = (await loadSubmissions()).find((item) => item.id === id);
  if (!current) return null;
  const merged = { ...current, ...patch };
  await db.query(
    `UPDATE command_submissions
     SET status = $2, moderation_note = $3, reviewed_at = $4, reviewed_by = $5, source_url = $6, sha256 = $7
     WHERE id = $1`,
    [id, merged.status, merged.moderationNote || null, merged.reviewedAt || null, merged.reviewedBy || null, merged.sourceUrl || null, merged.sha256 || null]
  );
  return merged;
}

function loadCoreCommands() {
  return readJson(CORE_REGISTRY_FILE, []).map(normalizeCommand);
}

function loadCommunityCommands() {
  return readJson(COMMUNITY_REGISTRY_FILE, []).map((item) => {
    const filePath = path.join(COMMUNITY_DIR, `${item.slug}.js`);
    return normalizeCommand({
      ...item,
      sha256: fs.existsSync(filePath) ? sha256FromFile(filePath) : item.sha256,
    });
  });
}

async function loadPublishedCommands() {
  const approvedSubmissions = (await loadSubmissions())
    .filter((item) => item.status === 'approved')
    .map((item) => normalizeCommand({
      ...item,
      sourceUrl: item.sourceUrl || localPackageSource('submitted', item.slug),
      status: 'approved',
    }));

  return [...loadCoreCommands(), ...loadCommunityCommands(), ...approvedSubmissions];
}

async function loadAllCommandsAndMeta() {
  const commands = await loadPublishedCommands();
  const reviews = await loadReviews();
  const installs = await loadInstallHistory();
  const reviewStats = reviews.reduce((acc, item) => {
    acc[item.commandSlug] = acc[item.commandSlug] || { total: 0, count: 0 };
    acc[item.commandSlug].total += Number(item.rating || 0);
    acc[item.commandSlug].count += 1;
    return acc;
  }, {});
  const installStats = installs.reduce((acc, item) => {
    acc[item.commandSlug] = (acc[item.commandSlug] || 0) + 1;
    return acc;
  }, {});

  return commands.map((command) => {
    const stats = reviewStats[command.slug];
    const rating = stats ? Number((stats.total / stats.count).toFixed(1)) : command.rating;
    const downloads = command.downloads + (installStats[command.slug] || 0);
    return { ...command, rating, downloads };
  });
}

function filterCommands(commands, { query, category, tag, verified, origin, status }) {
  return commands.filter((item) => {
    if (category && item.category !== category) return false;
    if (tag && !item.tags?.includes(tag)) return false;
    if (origin && item.origin !== origin) return false;
    if (status && item.status !== status) return false;
    if (verified !== undefined && item.verified !== verified) return false;
    if (!query) return true;
    const haystack = [item.name, item.title, item.description, item.author, ...(item.tags || [])].join(' ').toLowerCase();
    return haystack.includes(query.toLowerCase());
  });
}

function sortCommands(commands, sortBy) {
  const copy = [...commands];
  switch (sortBy) {
    case 'rating':
      return copy.sort((a, b) => b.rating - a.rating);
    case 'newest':
      return copy.sort((a, b) => semver.rcompare(a.version || '0.0.0', b.version || '0.0.0'));
    case 'name':
      return copy.sort((a, b) => a.name.localeCompare(b.name));
    case 'origin':
      return copy.sort((a, b) => a.origin.localeCompare(b.origin) || a.name.localeCompare(b.name));
    case 'downloads':
    default:
      return copy.sort((a, b) => b.downloads - a.downloads);
  }
}

function adminOnly(req, res, next) {
  const token = req.header('x-admin-token');
  if (!token || token !== ADMIN_TOKEN) {
    res.status(401).json({ message: 'Admin token required' });
    return;
  }
  next();
}

async function resolveCommandWithVerification(command) {
  if (!command) return null;

  let sha256 = command.sha256 || null;
  let verification = 'registry';

  if (!sha256 && command.origin === 'community') {
    const filePath = path.join(COMMUNITY_DIR, `${command.slug}.js`);
    if (fs.existsSync(filePath)) {
      sha256 = sha256FromFile(filePath);
      verification = 'local-package';
    }
  }

  if (!sha256 && command.origin === 'submitted') {
    const filePath = path.join(SUBMITTED_DIR, `${command.slug}.js`);
    if (fs.existsSync(filePath)) {
      sha256 = sha256FromFile(filePath);
      verification = 'submitted-package';
    }
  }

  return {
    ...command,
    sha256,
    verification,
  };
}

function packageFilePath(scope, slug) {
  if (scope === 'community') return path.join(COMMUNITY_DIR, `${slug}.js`);
  if (scope === 'submitted') return path.join(SUBMITTED_DIR, `${slug}.js`);
  return null;
}

app.get('/api/health', async (_req, res) => {
  let dbStatus = 'disabled';
  if (db) {
    try {
      await db.query('SELECT 1');
      dbStatus = 'online';
    } catch {
      dbStatus = 'error';
    }
  }
  res.json({
    status: 'ok',
    service: 'ne-dos-store-api',
    now: nowIso(),
    db: dbStatus,
  });
});

app.get('/api/meta', async (_req, res) => {
  const commands = await loadAllCommandsAndMeta();
  const submissions = await loadSubmissions();
  const categories = [...new Set(commands.map((item) => item.category))].sort();
  const tags = [...new Set(commands.flatMap((item) => item.tags || []))].sort();
  const origins = [...new Set(commands.map((item) => item.origin))].sort();
  res.json({
    service: 'NE-DOS Store',
    count: commands.length,
    categories,
    tags,
    origins,
    moderation: {
      pending: submissions.filter((item) => item.status === 'pending').length,
      approved: submissions.filter((item) => item.status === 'approved').length,
      rejected: submissions.filter((item) => item.status === 'rejected').length,
    },
  });
});

app.get('/api/commands', async (req, res) => {
  const commands = await loadAllCommandsAndMeta();
  const query = String(req.query.query || '').trim();
  const category = req.query.category ? String(req.query.category) : '';
  const tag = req.query.tag ? String(req.query.tag) : '';
  const origin = req.query.origin ? String(req.query.origin) : '';
  const status = req.query.status ? String(req.query.status) : '';
  const sortBy = req.query.sort ? String(req.query.sort) : 'downloads';
  const verified = req.query.verified === undefined ? undefined : String(req.query.verified) === 'true';
  const filtered = filterCommands(commands, { query, category, tag, verified, origin, status });
  const sorted = sortCommands(filtered, sortBy);
  res.json({ total: sorted.length, items: sorted });
});

app.get('/api/commands/:slug', async (req, res) => {
  const commands = await loadAllCommandsAndMeta();
  const reviews = await loadReviews();
  const command = commands.find((item) => item.slug === req.params.slug);
  if (!command) {
    res.status(404).json({ message: 'Command not found' });
    return;
  }
  res.json({
    ...(await resolveCommandWithVerification(command)),
    reviews: reviews.filter((item) => item.commandSlug === command.slug).slice(0, 20),
  });
});

app.get('/api/commands/:slug/install', async (req, res) => {
  const commands = await loadAllCommandsAndMeta();
  const command = commands.find((item) => item.slug === req.params.slug);
  if (!command) {
    res.status(404).json({ message: 'Command not found' });
    return;
  }
  const resolved = await resolveCommandWithVerification(command);
  res.json({
    slug: resolved.slug,
    version: resolved.version,
    sourceUrl: resolved.sourceUrl,
    sha256: resolved.sha256,
    verification: resolved.verification,
    installSnippet: `store install ${resolved.slug}`,
    manualSnippet: `download ${resolved.sourceUrl} /apps/${resolved.slug}.js && registercommand ${resolved.slug} /apps/${resolved.slug}.js`,
    permissions: resolved.origin === 'core' ? ['fs:read', 'fs:write', 'net:fetch'] : ['fs:read', 'fs:write', 'net:fetch', 'community-package'],
    verified: resolved.verified,
    origin: resolved.origin,
  });
});

app.post('/api/commands/:slug/install-track', async (req, res) => {
  const commands = await loadAllCommandsAndMeta();
  const command = commands.find((item) => item.slug === req.params.slug);
  if (!command) {
    res.status(404).json({ message: 'Command not found' });
    return;
  }
  const entry = {
    id: crypto.randomUUID(),
    commandSlug: command.slug,
    origin: command.origin,
    installerFingerprint: req.ip,
    createdAt: nowIso(),
  };
  await saveInstallHistory(entry);
  const installs = await loadInstallHistory();
  const total = installs.filter((item) => item.commandSlug === command.slug).length;
  res.status(201).json({ slug: command.slug, installs: total });
});

app.get('/api/commands/:slug/reviews', async (req, res) => {
  const reviews = await loadReviews();
  res.json({ items: reviews.filter((item) => item.commandSlug === req.params.slug) });
});

app.post('/api/commands/:slug/reviews', async (req, res) => {
  const { authorName, rating, comment } = req.body || {};
  if (!authorName || !rating) {
    res.status(400).json({ message: 'authorName and rating are required' });
    return;
  }
  const review = {
    id: crypto.randomUUID(),
    commandSlug: req.params.slug,
    authorName: String(authorName).slice(0, 80),
    rating: Math.max(1, Math.min(5, Number(rating))),
    comment: comment ? String(comment).slice(0, 500) : '',
    createdAt: nowIso(),
  };
  await saveReview(review);
  res.status(201).json(review);
});

app.post('/api/submissions', async (req, res) => {
  const { name, title, description, author, category, tags, version, scriptBody } = req.body || {};
  if (!name || !description || !author || !category || !scriptBody) {
    res.status(400).json({ message: 'name, description, author, category and scriptBody are required' });
    return;
  }
  const slug = fileNameSafe(name);
  const existingCommands = await loadAllCommandsAndMeta();
  const existingSubmissions = await loadSubmissions();
  if (existingCommands.some((item) => item.slug === slug) || existingSubmissions.some((item) => item.slug === slug)) {
    res.status(409).json({ message: 'A command with this slug already exists' });
    return;
  }

  const safeScript = String(scriptBody);
  const scriptPath = path.join(SUBMITTED_DIR, `${slug}.js`);
  fs.writeFileSync(scriptPath, safeScript);
  const entry = {
    id: crypto.randomUUID(),
    slug,
    name: slug,
    title: String(title || commandTitle(slug)),
    description: String(description),
    author: String(author),
    category: String(category),
    tags: Array.isArray(tags) ? tags.map((item) => String(item)) : [],
    version: String(version || '1.0.0'),
    status: 'pending',
    sourceUrl: localPackageSource('submitted', slug),
    sha256: sha256FromText(safeScript),
    moderationNote: '',
    scriptPath,
    createdAt: nowIso(),
    verified: false,
    origin: 'submitted',
  };
  await insertSubmission(entry);
  res.status(201).json(entry);
});

app.get('/api/admin/overview', adminOnly, async (_req, res) => {
  const commands = await loadAllCommandsAndMeta();
  const submissions = await loadSubmissions();
  const reviews = await loadReviews();
  const installs = await loadInstallHistory();
  res.json({
    commands: commands.length,
    submissions: {
      pending: submissions.filter((item) => item.status === 'pending').length,
      approved: submissions.filter((item) => item.status === 'approved').length,
      rejected: submissions.filter((item) => item.status === 'rejected').length,
    },
    reviews: reviews.length,
    installs: installs.length,
  });
});

app.get('/api/admin/submissions', adminOnly, async (req, res) => {
  const status = req.query.status ? String(req.query.status) : '';
  const submissions = await loadSubmissions();
  const filtered = status ? submissions.filter((item) => item.status === status) : submissions;
  res.json({ items: filtered });
});

app.post('/api/admin/submissions/:id/approve', adminOnly, async (req, res) => {
  const current = (await loadSubmissions()).find((item) => item.id === req.params.id);
  if (!current) {
    res.status(404).json({ message: 'Submission not found' });
    return;
  }
  const updated = await updateSubmission(req.params.id, {
    status: 'approved',
    moderationNote: String(req.body?.moderationNote || ''),
    reviewedAt: nowIso(),
    reviewedBy: 'admin',
    sourceUrl: localPackageSource('submitted', current.slug),
  });
  res.json(updated);
});

app.post('/api/admin/submissions/:id/reject', adminOnly, async (req, res) => {
  const current = (await loadSubmissions()).find((item) => item.id === req.params.id);
  if (!current) {
    res.status(404).json({ message: 'Submission not found' });
    return;
  }
  const updated = await updateSubmission(req.params.id, {
    status: 'rejected',
    moderationNote: String(req.body?.moderationNote || 'Rejected by moderator'),
    reviewedAt: nowIso(),
    reviewedBy: 'admin',
  });
  res.json(updated);
});

app.patch('/api/admin/commands/:slug', adminOnly, async (req, res) => {
  const { verified, category, tags } = req.body || {};
  const community = readJson(COMMUNITY_REGISTRY_FILE, []);
  const idx = community.findIndex((item) => item.slug === req.params.slug);
  if (idx === -1) {
    res.status(404).json({ message: 'Only community commands can be edited directly in admin MVP' });
    return;
  }
  const next = { ...community[idx] };
  if (verified !== undefined) next.verified = Boolean(verified);
  if (category) next.category = String(category);
  if (Array.isArray(tags)) next.tags = tags.map((item) => String(item));
  community[idx] = next;
  writeJson(COMMUNITY_REGISTRY_FILE, community);
  res.json(next);
});

app.get('/api/packages/:scope/:file', (req, res) => {
  const scope = req.params.scope;
  const slug = String(req.params.file || '').replace(/\.js$/, '');
  const filePath = packageFilePath(scope, slug);
  if (!filePath || !fs.existsSync(filePath)) {
    res.status(404).json({ message: 'Package file not found' });
    return;
  }
  res.type('application/javascript');
  res.send(fs.readFileSync(filePath, 'utf8'));
});

app.use('/api', (_req, res) => {
  res.status(404).json({ message: 'API route not found' });
});

if (fs.existsSync(BUILD_DIR)) {
  app.use(express.static(BUILD_DIR));
  app.use((req, res, next) => {
    if (req.path.startsWith('/api/')) {
      next();
      return;
    }
    res.sendFile(path.join(BUILD_DIR, 'index.html'));
  });
}

initDb()
  .catch((error) => {
    console.error('[store] database init failed:', error.message);
  })
  .finally(() => {
    app.listen(PORT, () => {
      console.log(`[store] API listening at http://localhost:${PORT}`);
    });
  });
