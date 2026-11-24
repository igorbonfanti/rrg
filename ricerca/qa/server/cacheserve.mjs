// come GitHub Pages: max-age=600 ed ETag; data/sector_members.json dal file indicato in $P/which.txt
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path'; import crypto from 'node:crypto';
const [dir, port, P] = process.argv.slice(2);
const T = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.woff2': 'font/woff2' };
http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html';
  let f = path.join(dir, p);
  if (p === '/data/sector_members.json') f = path.join(P, fs.readFileSync(path.join(P, 'which.txt'), 'utf8').trim());
  fs.readFile(f, (e, buf) => {
    if (e) { res.writeHead(404); return res.end(); }
    const etag = '"' + crypto.createHash('md5').update(buf).digest('hex') + '"';
    if (req.headers['if-none-match'] === etag) { res.writeHead(304, { ETag: etag, 'Cache-Control': 'max-age=600' }); return res.end(); }
    res.writeHead(200, { 'Content-Type': T[path.extname(f)] || 'application/octet-stream', ETag: etag, 'Cache-Control': 'max-age=600' });
    res.end(buf);
  });
}).listen(+port);
