import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { handleCoach } from './server/coach.mjs';

const assets = new Map([
  ['/', ['index.html', 'text/html']],
  ['/index.html', ['index.html', 'text/html']],
  ['/styles.css', ['styles.css', 'text/css']],
  ['/app.mjs', ['app.mjs', 'text/javascript']],
  ['/planner.mjs', ['planner.mjs', 'text/javascript']],
  ['/imports.mjs', ['imports.mjs', 'text/javascript']],
  ['/mark.svg', ['mark.svg', 'image/svg+xml']],
]);

const port = Number(process.env.PORT || 4173);
const host = '127.0.0.1';
const server = createServer(async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Content-Security-Policy', "default-src 'self'; style-src 'self' 'unsafe-inline'; object-src 'none'; base-uri 'none'; frame-ancestors 'self'");
  try {
    if (![host + ':' + port, 'localhost:' + port].includes(req.headers.host)) {
      res.writeHead(403).end();
      return;
    }
    const url = new URL(req.url, 'http://' + req.headers.host);
    if (await handleCoach(req, res, url)) return;
    if (!['GET', 'HEAD'].includes(req.method)) {
      res.writeHead(405, { Allow: 'GET, HEAD' }).end();
      return;
    }
    const asset = assets.get(url.pathname);
    if (!asset) {
      res.writeHead(404).end();
      return;
    }
    const [filename, mime] = asset;
    const contents = await readFile(new URL('./public/' + filename, import.meta.url));
    res.writeHead(200, { 'Content-Type': mime + '; charset=utf-8' });
    res.end(req.method === 'HEAD' ? undefined : contents);
  } catch (error) {
    console.error(error.message);
    if (!res.headersSent) res.writeHead(500);
    res.end();
  }
});
server.listen(port, host, () => console.log('Local: http://' + host + ':' + port));
