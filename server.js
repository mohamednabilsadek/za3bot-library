'use strict';

/**
 * Za3bot Library - backend
 * - Scans process.cwd() AND its sub-folders for .pdf files (re-scanned on every
 *   /api/books call); every folder becomes a shelf in the UI
 * - Renders page 1 of each PDF to .covers/<id>.png (pdf.js + @napi-rs/canvas,
 *   so no Poppler / system binaries are needed)
 * - Keeps reading bookmarks and per-page notes in .za3bot/state.json
 * - Serves the UI, the vendor libraries (from node_modules) and the PDFs
 */

const express = require('express');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const fsp = fs.promises;

const PORT = Number(process.env.PORT) || 6060;
const HOST = process.env.HOST || '127.0.0.1';
const ROOT = process.cwd(); // folder that holds the PDFs
const COVERS_DIR = path.join(ROOT, '.covers');
const DATA_DIR = path.join(ROOT, '.za3bot');
const STATE_FILE = path.join(DATA_DIR, 'state.json');
const NODE_MODULES = path.join(__dirname, 'node_modules');
const COVER_WIDTH = 640; // px
// Bump when the way covers are drawn changes: old cached files are then replaced automatically.
const COVER_VERSION = 2;
const coverFileName = (id) => `${id}-v${COVER_VERSION}.png`;
const MAX_CONCURRENT_RENDERS = 2;

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function createLimiter(max) {
  let active = 0;
  const queue = [];
  const next = () => {
    if (active >= max || queue.length === 0) return;
    active++;
    const { fn, resolve, reject } = queue.shift();
    fn()
      .then(resolve, reject)
      .finally(() => {
        active--;
        next();
      });
  };
  return (fn) =>
    new Promise((resolve, reject) => {
      queue.push({ fn, resolve, reject });
      next();
    });
}

const limitRender = createLimiter(MAX_CONCURRENT_RENDERS);

function prettifyTitle(fileName) {
  return fileName
    .replace(/\.pdf$/i, '')
    .replace(/[_]+/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

/* ------------------------------------------------------------------ */
/* Library scan                                                        */
/* ------------------------------------------------------------------ */

const booksById = new Map();

// Folders that are never scanned (dot-folders such as .covers/.za3bot/.git are skipped too)
const SKIP_DIRS = new Set(['node_modules', '$recycle.bin', 'system volume information']);
const MAX_DEPTH = 8;

const naturalCompare = (a, b) =>
  a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });

async function walk(dirAbs, relDir, depth, out) {
  let entries;
  try {
    entries = await fsp.readdir(dirAbs, { withFileTypes: true });
  } catch {
    return; // unreadable folder: skip it
  }

  for (const entry of entries) {
    if (entry.name.startsWith('.')) continue;
    const rel = relDir ? `${relDir}/${entry.name}` : entry.name; // always "/" separated

    if (entry.isDirectory()) {
      if (depth < MAX_DEPTH && !SKIP_DIRS.has(entry.name.toLowerCase())) {
        await walk(path.join(dirAbs, entry.name), rel, depth + 1, out);
      }
      continue;
    }
    if (!entry.isFile() || !/\.pdf$/i.test(entry.name)) continue;

    let stat;
    try {
      stat = await fsp.stat(path.join(dirAbs, entry.name));
    } catch {
      continue;
    }
    const id = crypto
      .createHash('sha1')
      .update(`${rel}|${stat.size}|${stat.mtimeMs}`)
      .digest('hex')
      .slice(0, 16);

    out.push({
      id,
      file: rel, // path relative to the library folder, e.g. "Science/Physics/Quantum.pdf"
      folder: relDir, // "" for the main folder
      title: prettifyTitle(entry.name),
      size: stat.size,
    });
  }
}

async function scanBooks() {
  const books = [];
  await walk(ROOT, '', 0, books);

  // main folder first, then folders in natural order; books A-Z inside each folder
  books.sort((a, b) => {
    if (a.folder !== b.folder) {
      if (a.folder === '') return -1;
      if (b.folder === '') return 1;
      return naturalCompare(a.folder, b.folder);
    }
    return naturalCompare(a.title, b.title);
  });

  booksById.clear();
  for (const b of books) booksById.set(b.id, b);

  pruneCovers(books).catch(() => {});
  return books;
}

/** Remove cached covers that no longer belong to any PDF. */
async function pruneCovers(books) {
  let files;
  try {
    files = await fsp.readdir(COVERS_DIR);
  } catch {
    return;
  }
  const keep = new Set(books.map((b) => coverFileName(b.id)));
  await Promise.all(
    files
      .filter((f) => f.endsWith('.png') && !keep.has(f))
      .map((f) => fsp.unlink(path.join(COVERS_DIR, f)).catch(() => {}))
  );
}

/* ------------------------------------------------------------------ */
/* Cover rendering (page 1 -> PNG)                                     */
/* ------------------------------------------------------------------ */

let pdfjsPromise = null;
const getPdfjs = () =>
  (pdfjsPromise ||= import('pdfjs-dist/legacy/build/pdf.mjs'));

const PDFJS_DIR = path.join(NODE_MODULES, 'pdfjs-dist');
const STANDARD_FONTS = path.join(PDFJS_DIR, 'standard_fonts') + path.sep;
const CMAPS = path.join(PDFJS_DIR, 'cmaps') + path.sep;

async function renderCover(pdfPath, outPath) {
  const pdfjs = await getPdfjs();
  const data = new Uint8Array(await fsp.readFile(pdfPath));

  const doc = await pdfjs.getDocument({
    data,
    standardFontDataUrl: STANDARD_FONTS,
    cMapUrl: CMAPS,
    cMapPacked: true,
    // NOTE: do not enable useSystemFonts here - in Node it makes pdf.js drop all text from the cover.
    isEvalSupported: false,
    verbosity: 0,
  }).promise;

  try {
    const page = await doc.getPage(1);
    const base = page.getViewport({ scale: 1 });
    const viewport = page.getViewport({ scale: COVER_WIDTH / base.width });
    const width = Math.ceil(viewport.width);
    const height = Math.ceil(viewport.height);

    // Prefer pdf.js' own canvas factory; fall back to @napi-rs/canvas directly.
    let canvas, context, factory, handle;
    if (doc.canvasFactory && typeof doc.canvasFactory.create === 'function') {
      factory = doc.canvasFactory;
      handle = factory.create(width, height);
      canvas = handle.canvas;
      context = handle.context;
    } else {
      const { createCanvas } = require('@napi-rs/canvas');
      canvas = createCanvas(width, height);
      context = canvas.getContext('2d');
    }

    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, width, height);

    await page.render({ canvasContext: context, canvas, viewport }).promise;

    const png = canvas.toBuffer('image/png');
    await fsp.mkdir(COVERS_DIR, { recursive: true });
    const tmp = `${outPath}.${process.pid}.tmp`;
    await fsp.writeFile(tmp, png);
    await fsp.rename(tmp, outPath);

    if (factory && handle) factory.destroy(handle);
    page.cleanup();
  } finally {
    await doc.destroy();
  }
}

const inflight = new Map();

function ensureCover(book) {
  const out = path.join(COVERS_DIR, coverFileName(book.id));
  if (inflight.has(book.id)) return inflight.get(book.id);

  const job = (async () => {
    try {
      await fsp.access(out);
      return out; // cached
    } catch {
      /* not cached yet */
    }
    await limitRender(() => renderCover(path.join(ROOT, book.file), out));
    return out;
  })().finally(() => inflight.delete(book.id));

  inflight.set(book.id, job);
  return job;
}

/* ------------------------------------------------------------------ */
/* Reading state: bookmark + notes per book (keyed by file name)       */
/* ------------------------------------------------------------------ */

const MAX_NOTE_LENGTH = 20000;
const MAX_PAGE = 100000;

// { "<file name>": { bookmark: <1-based page> | null, notes: { "<1-based page>": "text" } } }
let state = {};
try {
  const raw = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) state = raw;
} catch {
  /* first run, or unreadable file: start empty */
}

let saveChain = Promise.resolve();
function saveState() {
  saveChain = saveChain
    .then(async () => {
      await fsp.mkdir(DATA_DIR, { recursive: true });
      const tmp = `${STATE_FILE}.${process.pid}.tmp`;
      await fsp.writeFile(tmp, JSON.stringify(state, null, 2), 'utf8');
      await fsp.rename(tmp, STATE_FILE);
    })
    .catch((err) => console.warn('Could not save state:', err.message));
  return saveChain;
}

function bookState(file) {
  const s = state[file];
  return {
    bookmark: s && Number.isInteger(s.bookmark) ? s.bookmark : null,
    notes: s && s.notes && typeof s.notes === 'object' ? s.notes : {},
  };
}

function ensureBook(file) {
  const s = (state[file] ||= { bookmark: null, notes: {} });
  s.notes ||= {};
  return s;
}

function dropIfEmpty(file) {
  const s = state[file];
  if (s && s.bookmark == null && Object.keys(s.notes || {}).length === 0) delete state[file];
}

const parsePage = (v) => {
  const n = Number(v);
  return Number.isInteger(n) && n >= 1 && n <= MAX_PAGE ? n : null;
};

/**
 * A library path like "Science/Physics/Quantum.pdf": "/"-separated, relative, no "..",
 * no hidden / skipped folders, and it must end in .pdf.
 */
function safeRel(rel) {
  if (typeof rel !== 'string' || !rel || rel.length > 1024) return false;
  if (rel.includes('\\') || rel.includes('\0') || rel.startsWith('/')) return false;
  const parts = rel.split('/');
  if (parts.some((p) => !p || p.startsWith('.') || SKIP_DIRS.has(p.toLowerCase()))) return false;
  return /\.pdf$/i.test(parts[parts.length - 1]);
}
const knownFile = safeRel;

/* ------------------------------------------------------------------ */
/* Express app                                                         */
/* ------------------------------------------------------------------ */

const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '256kb' }));

// Writes are only accepted from pages served by this server (blocks other websites
// from changing your notes through the browser).
app.use('/api', (req, res, next) => {
  if (req.method === 'GET' || req.method === 'HEAD') return next();
  const origin = req.headers.origin;
  if (origin) {
    let host = '';
    try {
      host = new URL(origin).host;
    } catch {
      /* invalid origin */
    }
    if (host !== req.headers.host) return res.status(403).json({ error: 'forbidden' });
  }
  next();
});

const vendorOptions = {
  fallthrough: false,
  setHeaders(res, filePath) {
    // Older `mime` versions don't know .mjs -> browsers refuse ES modules
    if (filePath.endsWith('.mjs')) {
      res.setHeader('Content-Type', 'text/javascript; charset=utf-8');
    }
  },
};

// Only these three packages are exposed from node_modules
app.use('/vendor/swiper', express.static(path.join(NODE_MODULES, 'swiper'), vendorOptions));
app.use('/vendor/page-flip', express.static(path.join(NODE_MODULES, 'page-flip'), vendorOptions));
app.use('/vendor/pdfjs', express.static(path.join(NODE_MODULES, 'pdfjs-dist'), vendorOptions));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/api/books', async (req, res) => {
  try {
    const books = await scanBooks();
    res.set('Cache-Control', 'no-store');
    res.json(
      books.map((b) => {
        const st = bookState(b.file);
        return {
          id: b.id,
          file: b.file,
          folder: b.folder,
          title: b.title,
          size: b.size,
          pdfUrl: '/pdf/' + b.file.split('/').map(encodeURIComponent).join('/'),
          coverUrl: `/api/cover/${b.id}.png?v=${COVER_VERSION}`,
          bookmark: st.bookmark,
          noteCount: Object.values(st.notes).filter((t) => String(t).trim()).length,
        };
      })
    );
  } catch (err) {
    console.error('Scan failed:', err);
    res.status(500).json({ error: 'Could not scan the folder.' });
  }
});

app.get('/api/state/:file', (req, res) => {
  if (!knownFile(req.params.file)) return res.status(400).json({ error: 'bad file' });
  res.set('Cache-Control', 'no-store');
  res.json(bookState(req.params.file));
});

// body: { page: <1-based number> | null }
app.put('/api/state/:file/bookmark', async (req, res) => {
  const file = req.params.file;
  if (!knownFile(file)) return res.status(400).json({ error: 'bad file' });
  const page = req.body && req.body.page;
  if (page === null) {
    if (state[file]) state[file].bookmark = null;
    dropIfEmpty(file);
  } else {
    const n = parsePage(page);
    if (n === null) return res.status(400).json({ error: 'bad page' });
    ensureBook(file).bookmark = n;
  }
  await saveState();
  res.json(bookState(file));
});

// body: { text: "..." }  (empty text deletes the note)
app.put('/api/state/:file/notes/:page', async (req, res) => {
  const file = req.params.file;
  const page = parsePage(req.params.page);
  if (!knownFile(file) || page === null) return res.status(400).json({ error: 'bad request' });
  const text = req.body && typeof req.body.text === 'string' ? req.body.text : null;
  if (text === null || text.length > MAX_NOTE_LENGTH) {
    return res.status(400).json({ error: 'bad text' });
  }
  if (text.trim() === '') {
    if (state[file]) delete state[file].notes[String(page)];
    dropIfEmpty(file);
  } else {
    ensureBook(file).notes[String(page)] = text;
  }
  await saveState();
  res.json({ ok: true });
});

app.get('/api/cover/:id.png', async (req, res) => {
  let book = booksById.get(req.params.id);
  if (!book) {
    await scanBooks().catch(() => {});
    book = booksById.get(req.params.id);
  }
  if (!book) return res.status(404).end();

  try {
    const file = await ensureCover(book);
    res.set('Cache-Control', 'public, max-age=31536000, immutable');
    res.sendFile(file);
  } catch (err) {
    console.warn(`Cover failed for "${book.file}": ${err.message}`);
    res.status(500).end();
  }
});

// Only PDFs inside the library folder (any depth) can be downloaded
app.get('/pdf/*', (req, res) => {
  const rel = req.params[0];
  if (!safeRel(rel)) return res.status(400).end();
  const full = path.resolve(ROOT, rel);
  if (!full.startsWith(ROOT + path.sep)) return res.status(400).end();
  fs.access(full, fs.constants.R_OK, (err) => {
    if (err) return res.status(404).end();
    res.sendFile(full); // supports Range requests
  });
});

app.use((err, req, res, next) => {
  if (err && err.status === 404) return res.status(404).end();
  next(err);
});

app.listen(PORT, HOST, async () => {
  let count = 0;
  try {
    count = (await scanBooks()).length;
  } catch {
    /* ignore */
  }
  console.log('\n  Za3bot Library');
  console.log(`  Folder : ${ROOT}`);
  console.log(`  Books  : ${count} PDF file(s)`);
  console.log(`  Data   : ${DATA_DIR}  (bookmarks & notes)`);
  const shown = HOST === '127.0.0.1' || HOST === '0.0.0.0' || HOST === '::' ? 'localhost' : HOST;
  console.log(`  Open   : http://${shown}:${PORT}`);
  if (HOST !== '127.0.0.1' && HOST !== 'localhost' && HOST !== '::1') {
    console.log('  Note   : listening on the network - anyone on your LAN can read this library and edit its notes.');
  }
  console.log('');
});
