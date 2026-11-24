// server statico con gzip, come GitHub Pages: node gzserve.mjs <dir> <port>
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path'; import zlib from 'node:zlib';
const [dir, port] = process.argv.slice(2);
const T = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png' };
const cache = new Map();
http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html';
  const f = path.join(dir, p);
  fs.readFile(f, (e, buf) => {
    if (e) { res.writeHead(404); return res.end(); }
    const ext = path.extname(f), gz = /json|js|css|html|svg/.test(ext);
    const key = f + fs.statSync(f).mtimeMs;
    const body = gz ? (cache.get(key) || cache.set(key, zlib.gzipSync(buf, { level: 6 })).get(key)) : buf;
    res.writeHead(200, { 'Content-Type': T[ext] || 'application/octet-stream', ...(gz ? { 'Content-Encoding': 'gzip' } : {}), 'Cache-Control': 'no-store' });
    res.end(body);
  });
}).listen(+port);
