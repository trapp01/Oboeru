// Serves the site on http://localhost:4321 (or the port in PORT) the way Cloudflare does: requests go
// through worker/index.js, with the files read from site/ and the shared mix
// state held in memory, so it is empty again after a restart. There is no
// Workers AI here, so /api/transcribe answers 501 and the page falls back.

import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import worker from '../worker/index.js';

const PORT = Number(process.env.PORT) || 4321;
const SITE = fileURLToPath(new URL('../site/', import.meta.url));
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.mp3': 'audio/mpeg',
  '.svg': 'image/svg+xml',
};

const kv = new Map();
const env = {
  PROGRESS: {
    get: async (key) => (kv.has(key) ? JSON.parse(kv.get(key)) : null),
    put: async (key, value) => void kv.set(key, value),
  },
  ASSETS: {
    async fetch(request) {
      const path = decodeURIComponent(new URL(request.url).pathname);
      // normalize() resolves any ".." before the join, so the path cannot leave site/.
      const file = join(SITE, normalize(path.endsWith('/') ? `${path}index.html` : path));
      try {
        return new Response(await readFile(file), {
          headers: { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream', 'cache-control': 'no-store' },
        });
      } catch {
        return new Response('Not found', { status: 404 });
      }
    },
  },
};

createServer(async (req, res) => {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const hasBody = req.method !== 'GET' && req.method !== 'HEAD';
  const request = new Request(`http://localhost:${PORT}${req.url}`, {
    method: req.method,
    headers: req.headers,
    body: hasBody ? Buffer.concat(chunks) : undefined,
  });
  const response = await worker.fetch(request, env);
  res.writeHead(response.status, Object.fromEntries(response.headers));
  res.end(Buffer.from(await response.arrayBuffer()));
}).listen(PORT, () => console.log(`Oboeru on http://localhost:${PORT}`));
