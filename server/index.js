const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const semver = require('semver');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 8787;
const REGISTRY_FILE = path.join(__dirname, 'data', 'commands.json');

app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));
app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(morgan('dev'));

function loadCommands() {
  try {
    const raw = fs.readFileSync(REGISTRY_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch (error) {
    console.error('[store] failed to read registry:', error.message);
    return [];
  }
}

function normalizeCommand(command) {
  return {
    ...command,
    downloads: Number(command.downloads || 0),
    rating: Number(command.rating || 0),
    verified: Boolean(command.verified),
  };
}

function filterCommands(commands, query, category, tag, verified) {
  return commands.filter((item) => {
    if (category && item.category !== category) return false;
    if (tag && !item.tags?.includes(tag)) return false;
    if (verified !== undefined && item.verified !== verified) return false;
    if (!query) return true;

    const haystack = [
      item.name,
      item.title,
      item.description,
      item.author,
      ...(item.tags || []),
    ].join(' ').toLowerCase();

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
    case 'downloads':
    default:
      return copy.sort((a, b) => b.downloads - a.downloads);
  }
}

app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'ne-dos-store-api',
    now: new Date().toISOString(),
  });
});

app.get('/api/meta', (_req, res) => {
  const commands = loadCommands().map(normalizeCommand);
  const categories = [...new Set(commands.map((item) => item.category))].sort();
  const tags = [...new Set(commands.flatMap((item) => item.tags || []))].sort();

  res.json({
    service: 'NE-DOS Store',
    count: commands.length,
    categories,
    tags,
  });
});

app.get('/api/commands', (req, res) => {
  const commands = loadCommands().map(normalizeCommand);
  const query = String(req.query.query || '').trim();
  const category = req.query.category ? String(req.query.category) : '';
  const tag = req.query.tag ? String(req.query.tag) : '';
  const sortBy = req.query.sort ? String(req.query.sort) : 'downloads';
  const verified = req.query.verified === undefined
    ? undefined
    : String(req.query.verified) === 'true';

  const filtered = filterCommands(commands, query, category, tag, verified);
  const sorted = sortCommands(filtered, sortBy);

  res.json({
    total: sorted.length,
    items: sorted,
  });
});

app.get('/api/commands/:slug', (req, res) => {
  const commands = loadCommands().map(normalizeCommand);
  const command = commands.find((item) => item.slug === req.params.slug);

  if (!command) {
    res.status(404).json({ message: 'Command not found' });
    return;
  }

  res.json(command);
});

app.get('/api/commands/:slug/install', (req, res) => {
  const commands = loadCommands().map(normalizeCommand);
  const command = commands.find((item) => item.slug === req.params.slug);

  if (!command) {
    res.status(404).json({ message: 'Command not found' });
    return;
  }

  res.json({
    slug: command.slug,
    version: command.version,
    sourceUrl: command.sourceUrl,
    installSnippet: `store install ${command.slug}`,
    manualSnippet: `download ${command.sourceUrl} /apps/${command.slug}.js && registercommand ${command.slug} /apps/${command.slug}.js`,
    permissions: ['fs:read', 'fs:write', 'net:fetch'],
    verified: command.verified,
  });
});

const installStats = new Map();

app.post('/api/commands/:slug/install-track', (req, res) => {
  const slug = req.params.slug;
  const current = installStats.get(slug) || 0;
  installStats.set(slug, current + 1);
  res.status(201).json({ slug, installs: installStats.get(slug) });
});

app.use((_req, res) => {
  res.status(404).json({ message: 'Not found' });
});

app.listen(PORT, () => {
  console.log(`[store] API listening at http://localhost:${PORT}`);
});
