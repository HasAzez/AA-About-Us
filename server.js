const http = require('http');
const fs   = require('fs');
const path = require('path');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js':   'application/javascript',
  '.css':  'text/css',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg':  'image/svg+xml',
  '.mp4':  'video/mp4',
  '.glb':  'model/gltf-binary',
  '.gltf': 'model/gltf+json',
  '.hdr':  'application/octet-stream',
  '.woff2':'font/woff2',
  '.woff': 'font/woff',
};

const PORT = 3000;
const DIST = path.join(__dirname, 'dist');
const ROOT = __dirname;

function serveFile(req, res, filePath, next) {
  fs.stat(filePath, function (statErr, stat) {
    if (statErr || !stat.isFile()) { next(); return; }

    var ext      = path.extname(filePath).toLowerCase();
    var mime     = MIME[ext] || 'application/octet-stream';
    var rangeHdr = req.headers['range'];

    if (rangeHdr) {
      var parts = rangeHdr.replace(/bytes=/, '').split('-');
      var start = parseInt(parts[0], 10);
      var end   = parts[1] ? parseInt(parts[1], 10) : stat.size - 1;
      end = Math.min(end, stat.size - 1);
      if (isNaN(start) || start > end || start >= stat.size) {
        res.writeHead(416, { 'Content-Range': 'bytes */' + stat.size });
        res.end(); return;
      }
      res.writeHead(206, {
        'Content-Type':   mime,
        'Content-Range':  'bytes ' + start + '-' + end + '/' + stat.size,
        'Content-Length': end - start + 1,
        'Accept-Ranges':  'bytes',
      });
      fs.createReadStream(filePath, { start: start, end: end }).pipe(res);
    } else {
      res.writeHead(200, {
        'Content-Type':   mime,
        'Content-Length': stat.size,
        'Accept-Ranges':  'bytes',
      });
      fs.createReadStream(filePath).pipe(res);
    }
  });
}

http.createServer(function (req, res) {
  var url      = decodeURIComponent(req.url.split('?')[0]);
  var rel      = url === '/' ? 'index.html' : url.replace(/^\//, '');
  var distPath = path.join(DIST, rel);
  var rootPath = path.join(ROOT, rel);

  serveFile(req, res, distPath, function () {
    serveFile(req, res, rootPath, function () {
      res.writeHead(404);
      res.end('Not found: ' + rel);
    });
  });
}).listen(PORT, '0.0.0.0', function () {
  const os   = require('os');
  const nets = os.networkInterfaces();
  let lan = '';
  for (const iface of Object.values(nets)) {
    for (const addr of iface) {
      if (addr.family === 'IPv4' && !addr.internal) { lan = addr.address; break; }
    }
    if (lan) break;
  }
  console.log('Local:   http://localhost:' + PORT);
  if (lan) console.log('Network: http://' + lan + ':' + PORT + '  ← open on your phone');
});
