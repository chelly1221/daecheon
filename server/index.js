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

// Merge two comment maps as a convergent set union (keyed by comment id). A
// message is immutable once created except for its `del` tombstone, which is
// monotonic (false→true only): `del:true` always wins over the live copy of the
// same id. This lets a client that PUTs a slightly stale comments map (e.g. two
// people commenting within one poll interval) never clobber another device's
// message, while a deletion is applied once and never resurrected.
function mergeComments(a, b) {
  const A = a && typeof a === 'object' ? a : {};
  const B = b && typeof b === 'object' ? b : {};
  const out = {};
  for (const k of new Set([...Object.keys(A), ...Object.keys(B)])) {
    const byId = new Map();
    for (const c of Array.isArray(A[k]) ? A[k] : []) if (c && c.id != null) byId.set(c.id, c);
    for (const c of Array.isArray(B[k]) ? B[k] : []) {
      if (!c || c.id == null) continue;
      const cur = byId.get(c.id);
      if (!cur) byId.set(c.id, c);
      else if (c.del && !cur.del) byId.set(c.id, { ...cur, text: '', del: true });
    }
    out[k] = [...byId.values()].sort((x, y) => (x.ts || 0) - (y.ts || 0));
  }
  return out;
}

// Serialize read-modify-write per room so concurrent PUTs can't interleave and
// drop a merged comment. Each room keeps a promise chain; work runs in order.
const roomChains = new Map();
function serialize(id, fn) {
  const prev = roomChains.get(id) || Promise.resolve();
  const run = prev.then(fn, fn);
  roomChains.set(
    id,
    run.then(
      () => {},
      () => {},
    ),
  );
  return run;
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
    const incoming = req.body ?? {};
    await serialize(id, async () => {
      const existing = await readRoom(id);
      // Last-write-wins for the rest of the doc; append-only union for comments.
      const doc = {
        ...incoming,
        comments: mergeComments(existing && existing.comments, incoming.comments),
      };
      await writeRoom(id, doc);
    });
    return res.status(204).end();
  } catch {
    return res.status(500).json({ error: 'write failed' });
  }
});

// --- Translation proxy (MyMemory) with an in-memory cache. -------------------
// The client machine-translates KO<->ZH text that has no manual translation
// (chat messages, user-added items). Proxying keeps any quota email server-side,
// shares one cache across all devices (saving the free daily quota), and avoids
// browser CORS/rate-limit issues. Any failure returns the original text so the
// UI degrades gracefully.
const TR_LANG = { ko: 'ko', zh: 'zh-CN' };
const TR_EMAIL = process.env.MYMEMORY_EMAIL || ''; // optional: ~10x the free quota
const trCache = new Map();

function decodeEntities(s) {
  return s
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
}

app.get('/api/translate', async (req, res) => {
  const from = String(req.query.from || '');
  const to = String(req.query.to || '');
  const q = String(req.query.q || '');
  if (!TR_LANG[from] || !TR_LANG[to] || from === to || !q) {
    return res.status(400).json({ error: 'bad request' });
  }
  // MyMemory rejects a single request over 500 chars; leave long strings as-is.
  if (q.length > 500) return res.json({ text: q, translated: false });

  const key = `${from}|${to}|${q}`;
  if (trCache.has(key)) return res.json({ text: trCache.get(key), translated: true });

  try {
    const langpair = `${TR_LANG[from]}|${TR_LANG[to]}`;
    const url =
      `https://api.mymemory.translated.net/get?q=${encodeURIComponent(q)}` +
      `&langpair=${encodeURIComponent(langpair)}` +
      (TR_EMAIL ? `&de=${encodeURIComponent(TR_EMAIL)}` : '');
    const r = await fetch(url);
    const j = await r.json();
    const raw =
      j && j.responseData && typeof j.responseData.translatedText === 'string'
        ? j.responseData.translatedText
        : '';
    // MyMemory signals quota/errors via an uppercase message in translatedText.
    const ok =
      raw &&
      Number(j.responseStatus) === 200 &&
      !/MYMEMORY WARNING|INVALID|QUERY LENGTH|PLEASE SELECT/i.test(raw);
    if (!ok) return res.json({ text: q, translated: false });

    const out = decodeEntities(raw);
    if (trCache.size > 5000) trCache.clear(); // crude bound for a long-lived server
    trCache.set(key, out);
    return res.json({ text: out, translated: true });
  } catch {
    return res.json({ text: q, translated: false });
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
