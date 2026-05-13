const http = require('http');
const fs   = require('fs');
const path = require('path');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js':   'application/javascript',
  '.css':  'text/css',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.glb':  'model/gltf-binary',
  '.gltf': 'model/gltf+json',
  '.woff2':'font/woff2',
  '.woff': 'font/woff',
};

const PORT = 3000;
const ROOT = __dirname;

http.createServer(function (req, res) {
  var url      = req.url.split('?')[0];
  var filePath = path.join(ROOT, url === '/' ? 'index.html' : url);

  fs.readFile(filePath, function (err, data) {
    if (err) {
      res.writeHead(404);
      res.end('Not found: ' + filePath);
      return;
    }
    var ext  = path.extname(filePath).toLowerCase();
    var mime = MIME[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': mime });
    res.end(data);
  });
}).listen(PORT, function () {
  console.log('Open http://localhost:' + PORT + ' in your browser');
});
