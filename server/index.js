import express from 'express';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');
const dataDir = path.join(repoRoot, 'data');
const mediaDir = path.join(dataDir, 'media');
const clientDist = path.join(repoRoot, 'client', 'dist');

const PORT = process.env.PORT || 3001;
const serveClient =
  process.env.NODE_ENV === 'production' || process.argv.includes('--serve-client');
const ID_RE = /^[A-Za-z0-9-]{1,64}$/;

// Shared photo/video storage. Binaries live as standalone files under
// data/media/<roomId>/, never inline in the room JSON — the whole room doc is
// re-PUT on every change and polled every 2s, so embedded media would wreck
// sync. Only lightweight metadata (filenames + dimensions) rides in the doc.
const MEDIA_MAX = 64 * 1024 * 1024; // 64MB hard cap per uploaded file
const MIME_EXT = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
  'video/mp4': '.mp4',
  'video/webm': '.webm',
  'video/quicktime': '.mov',
};

fs.mkdirSync(dataDir, { recursive: true });
fs.mkdirSync(mediaDir, { recursive: true });

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

// Resolve the surviving version of one list item present on two devices.
// Content is last-write-wins by `ts` (ties keep the existing copy); the `del`
// tombstone is monotonic, so a deleted item can never be resurrected.
// Merge two versions' per-member check sets (packing checkedBy) by last-write
// -wins on each member's own checkTs toggle time. Mirrors the client.
function mergeChecks(l, r) {
  const lTs = (l && l.checkTs) || {};
  const rTs = (r && r.checkTs) || {};
  const lOn = new Set((l && l.checkedBy) || []);
  const rOn = new Set((r && r.checkedBy) || []);
  const ids = new Set([...Object.keys(lTs), ...Object.keys(rTs), ...lOn, ...rOn]);
  const checkedBy = [];
  const checkTs = {};
  for (const mid of [...ids].sort()) {
    const lt = lTs[mid] || 0;
    const rt = rTs[mid] || 0;
    const on = rt > lt ? rOn.has(mid) : lt > rt ? lOn.has(mid) : lOn.has(mid) || rOn.has(mid);
    const ts = lt > rt ? lt : rt;
    if (ts) checkTs[mid] = ts;
    if (on) checkedBy.push(mid);
  }
  return { checkedBy, checkTs };
}

function sameChecks(a, m) {
  const cb = (a && a.checkedBy) || [];
  if (cb.length !== m.checkedBy.length) return false;
  const s = new Set(cb);
  for (const id of m.checkedBy) if (!s.has(id)) return false;
  const ct = (a && a.checkTs) || {};
  const mk = Object.keys(m.checkTs);
  if (Object.keys(ct).length !== mk.length) return false;
  for (const k of mk) if ((ct[k] || 0) !== m.checkTs[k]) return false;
  return true;
}

function pickItem(l, r) {
  if (!r) return l;
  const del = !!(l && l.del) || !!(r && r.del);
  const lt = (l && l.ts) || 0;
  const rt = (r && r.ts) || 0;
  // LWW by ts; exact ties broken deterministically and symmetrically (max JSON,
  // order-independent) so the server and every client agree on the winner.
  let winner;
  if (rt > lt) winner = r;
  else if (lt > rt) winner = l;
  else winner = JSON.stringify(r) > JSON.stringify(l) ? r : l;
  let result = !!winner.del === del ? winner : { ...winner, del };
  if ((l && (l.checkedBy || l.checkTs)) || (r && (r.checkedBy || r.checkTs))) {
    const merged = mergeChecks(l, r);
    if (!sameChecks(result, merged)) {
      result = { ...result, checkedBy: merged.checkedBy, checkTs: merged.checkTs };
    }
  }
  return result;
}

// Merge two arrays of id'd items as a convergent union (mirrors the client's
// mergeItems). Every id from either side survives; a shared id is resolved by
// pickItem. This is what stops a device PUTting a stale array from deleting
// another device's freshly added item — deletions travel as `del` tombstones,
// never as a missing element.
function mergeItems(a, b) {
  const A = Array.isArray(a) ? a : [];
  const B = Array.isArray(b) ? b : [];
  const bById = new Map();
  for (const r of B) if (r && r.id != null) bById.set(r.id, r);
  const seen = new Set();
  const out = [];
  for (const l of A) {
    if (!l || l.id == null) {
      out.push(l);
      continue;
    }
    seen.add(l.id);
    out.push(pickItem(l, bById.get(l.id)));
  }
  for (const r of B) if (r && r.id != null && !seen.has(r.id)) out.push(r);
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
      // Per-item convergent union for every list (a stale incoming array can no
      // longer delete an item it never saw); append-only union for comments.
      // presence + updatedAt stay last-write-wins via the `...incoming` spread.
      const doc = {
        ...incoming,
        activities: mergeItems(existing && existing.activities, incoming.activities),
        packing: mergeItems(existing && existing.packing, incoming.packing),
        foods: mergeItems(existing && existing.foods, incoming.foods),
        photos: mergeItems(existing && existing.photos, incoming.photos),
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

// --- Shared media: upload (streamed to disk) + static serving. --------------
// Uploads are streamed straight to a temp file with a hard size cap so a large
// video never buffers in memory, then atomically renamed. The room JSON body
// parser above ignores these requests (their content-type isn't JSON), so the
// raw request stream is intact here.
app.post('/api/rooms/:id/media', async (req, res) => {
  const { id } = req.params;
  if (!ID_RE.test(id)) return res.status(400).json({ error: 'invalid room id' });
  const ct = String(req.headers['content-type'] || '')
    .split(';')[0]
    .trim()
    .toLowerCase();
  const ext = MIME_EXT[ct];
  if (!ext) return res.status(415).json({ error: 'unsupported media type' });

  const dir = path.join(mediaDir, id);
  try {
    await fsp.mkdir(dir, { recursive: true });
  } catch {
    return res.status(500).json({ error: 'storage error' });
  }
  const name = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}${ext}`;
  const dest = path.join(dir, name);
  const tmp = `${dest}.${process.pid}.tmp`;
  const out = fs.createWriteStream(tmp);

  let size = 0;
  let settled = false;
  const cleanupTmp = () => fsp.unlink(tmp).catch(() => {});
  const fail = (code, msg) => {
    if (settled) return;
    settled = true;
    req.unpipe(out);
    out.destroy();
    cleanupTmp();
    if (!res.headersSent) res.status(code).json({ error: msg });
  };

  req.on('data', (chunk) => {
    size += chunk.length;
    if (size > MEDIA_MAX) {
      fail(413, 'file too large');
      req.destroy();
    }
  });
  req.on('error', () => fail(400, 'upload error'));
  out.on('error', () => fail(500, 'write failed'));
  out.on('finish', async () => {
    if (settled) return;
    settled = true;
    try {
      await fsp.rename(tmp, dest);
      res.json({ file: name, url: `/api/media/${id}/${name}` });
    } catch {
      cleanupTmp();
      if (!res.headersSent) res.status(500).json({ error: 'write failed' });
    }
  });
  req.pipe(out);
});

// Serve stored media. Filenames are unique + immutable, so cache hard. Range
// requests (default on) let iOS scrub through videos. fallthrough:false makes a
// missing file a real 404 instead of falling through to the SPA HTML shell.
app.use(
  '/api/media',
  express.static(mediaDir, {
    fallthrough: false,
    immutable: true,
    maxAge: '365d',
    index: false,
    dotfiles: 'ignore',
  }),
);

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
