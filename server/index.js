import express from 'express';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');
const dataDir = path.join(repoRoot, 'data');
const clientDist = path.join(repoRoot, 'client', 'dist');

const PORT = process.env.PORT || 3001;
const serveClient =
  process.env.NODE_ENV === 'production' || process.argv.includes('--serve-client');
const ID_RE = /^[A-Za-z0-9-]{1,64}$/;

fs.mkdirSync(dataDir, { recursive: true });

// In-memory cache to avoid re-reading room files from disk on every poll.
const cache = new Map();

async function readRoom(id) {
  if (cache.has(id)) return cache.get(id);
  try {
    const txt = await fsp.readFile(path.join(dataDir, `${id}.json`), 'utf8');
    const doc = JSON.parse(txt);
    cache.set(id, doc);
    return doc;
  } catch {
    return null;
  }
}

async function writeRoom(id, doc) {
  const file = path.join(dataDir, `${id}.json`);
  const tmp = `${file}.${process.pid}.${Date.now()}.tmp`;
  await fsp.writeFile(tmp, JSON.stringify(doc));
  await fsp.rename(tmp, file); // atomic replace
  cache.set(id, doc); // only cache state that is persisted on disk
}

const app = express();
app.use(express.json({ limit: '1mb' }));

app.get('/api/rooms/:id', async (req, res) => {
  const { id } = req.params;
  if (!ID_RE.test(id)) return res.status(400).json({ error: 'invalid room id' });
  const doc = await readRoom(id);
  if (!doc) return res.status(404).json({ error: 'not found' });
  return res.json(doc);
});

app.put('/api/rooms/:id', async (req, res) => {
  const { id } = req.params;
  if (!ID_RE.test(id)) return res.status(400).json({ error: 'invalid room id' });
  try {
    await writeRoom(id, req.body ?? {});
    return res.status(204).end();
  } catch {
    return res.status(500).json({ error: 'write failed' });
  }
});

if (serveClient) {
  app.use(express.static(clientDist));
  // SPA fallback — everything except the API is served the built index.html.
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/')) return next();
    return res.sendFile(path.join(clientDist, 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`paros server listening on :${PORT} (serveClient=${serveClient})`);
});
