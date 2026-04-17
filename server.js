const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = parseInt(process.env.PORT, 10) || 8000;
const ROOT = __dirname;
const COMMENTS_FILE = path.join(ROOT, 'data', 'comments.json');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.js':   'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.svg':  'image/svg+xml',
  '.ico':  'image/x-icon',
};

function readComments() {
  try {
    return JSON.parse(fs.readFileSync(COMMENTS_FILE, 'utf-8'));
  } catch (_) {
    return {};
  }
}

function writeComments(data) {
  fs.writeFileSync(COMMENTS_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', c => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks).toString()));
    req.on('error', reject);
  });
}

http.createServer(async (req, res) => {
  const url = decodeURIComponent(req.url.split('?')[0]);

  // --- Comments API ---
  if (url === '/api/comments') {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');

    if (req.method === 'GET') {
      res.writeHead(200);
      res.end(JSON.stringify(readComments()));
      return;
    }

    if (req.method === 'POST') {
      try {
        const body = JSON.parse(await readBody(req));
        const key = String(body.key || '');
        const text = String((body.comment && body.comment.text) || '');
        if (!key || !text) { res.writeHead(400); res.end('{}'); return; }
        const comments = readComments();
        if (!comments[key]) comments[key] = [];
        comments[key].push({ text, ts: body.comment.ts || new Date().toISOString() });
        writeComments(comments);
        res.writeHead(200);
        res.end(JSON.stringify({ ok: true }));
      } catch (e) {
        res.writeHead(400);
        res.end(JSON.stringify({ error: e.message }));
      }
      return;
    }

    res.writeHead(405);
    res.end('{}');
    return;
  }

  // --- Static files ---
  let filePath = url;
  if (filePath.endsWith('/')) filePath += 'index.html';
  filePath = path.join(ROOT, filePath);

  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403);
    res.end();
    return;
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end('Not Found');
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    res.end(data);
  });
}).listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}/app/`);
});
