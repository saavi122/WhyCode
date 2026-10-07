import http from 'http';
import fs from 'fs';
import path from 'path';
import { execFile } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distDir = path.resolve(__dirname, '../client/dist');
const screenshotsDir = path.resolve(__dirname, '../docs/screenshots');

if (!fs.existsSync(screenshotsDir)) {
  fs.mkdirSync(screenshotsDir, { recursive: true });
}

const mimeTypes = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2'
};

const server = http.createServer((req, res) => {
  let reqPath = req.url.split('?')[0];
  let filePath = path.join(distDir, reqPath === '/' ? 'index.html' : reqPath);
  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    filePath = path.join(distDir, 'index.html');
  }
  const ext = path.extname(filePath);
  const contentType = mimeTypes[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.writeHead(500);
      res.end('Server Error');
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content);
    }
  });
});

const PORT = 4173;
server.listen(PORT, async () => {
  console.log(`Preview server running at http://localhost:${PORT}`);
  
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const widths = [
    { width: 1440, height: 900, name: 'screenshot-1440.png' },
    { width: 1024, height: 768, name: 'screenshot-1024.png' },
    { width: 390, height: 844, name: 'screenshot-390.png' }
  ];

  for (const w of widths) {
    const outPath = path.join(screenshotsDir, w.name);
    console.log(`Capturing ${w.width}px -> ${outPath}...`);
    await new Promise((resolve, reject) => {
      const args = [
        '--headless',
        '--disable-gpu',
        '--hide-scrollbars',
        `--window-size=${w.width},${w.height}`,
        `--screenshot=${outPath}`,
        `http://localhost:${PORT}/`
      ];
      execFile(chromePath, args, (error, stdout, stderr) => {
        if (error) {
          console.error(`Error for ${w.width}:`, error);
          reject(error);
        } else {
          console.log(`Saved ${w.name}`);
          resolve();
        }
      });
    });
  }

  console.log('All screenshots captured successfully!');
  server.close(() => {
    process.exit(0);
  });
});
