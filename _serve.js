const http = require('http'), fs = require('fs'), path = require('path');
const root = __dirname;
const types = { '.html':'text/html; charset=utf-8', '.png':'image/png', '.js':'text/javascript', '.css':'text/css', '.jpg':'image/jpeg', '.webp':'image/webp', '.svg':'image/svg+xml', '.json':'application/json', '.ico':'image/x-icon', '.woff2':'font/woff2' };
http.createServer((req, res) => {
  let f = decodeURIComponent(req.url.split('?')[0]);
  if (f === '/' || f === '') f = '/index.html';
  const fp = path.join(root, f);
  fs.readFile(fp, (e, data) => {
    if (e) { res.writeHead(404); res.end('not found'); return; }
    res.writeHead(200, {
      'Content-Type': types[path.extname(fp).toLowerCase()] || 'application/octet-stream',
      'Cache-Control': 'no-cache'
    });
    res.end(data);
  });
}).listen(5588, () => console.log('Trasteos Ya on http://localhost:5588'));
