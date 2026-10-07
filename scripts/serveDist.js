import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distDir = path.resolve(__dirname, '../client/dist');

const mime = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.json': 'application/json'
};

const server = http.createServer((req, res) => {
  let reqPath = req.url.split('?')[0];
  let p = path.join(distDir, reqPath === '/' ? 'index.html' : reqPath);
  if (!fs.existsSync(p) || fs.statSync(p).isDirectory()) {
    p = path.join(distDir, 'index.html');
  }
  res.writeHead(200, { 'Content-Type': mime[path.extname(p)] || 'application/octet-stream' });
  fs.createReadStream(p).pipe(res);
});

server.listen(4173, () => {
  console.log('Server listening on http://localhost:4173');
});
