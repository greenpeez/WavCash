const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

const options = {
  key: fs.readFileSync(path.join(__dirname, 'certificates', 'localhost+3-key.pem')),
  cert: fs.readFileSync(path.join(__dirname, 'certificates', 'localhost+3.pem')),
};

const proxy = https.createServer(options, (req, res) => {
  const proxyReq = http.request(
    {
      hostname: '127.0.0.1',
      port: 3001,
      path: req.url,
      method: req.method,
      headers: req.headers,
    },
    (proxyRes) => {
      res.writeHead(proxyRes.statusCode, proxyRes.headers);
      proxyRes.pipe(res);
    }
  );
  req.pipe(proxyReq);
  proxyReq.on('error', (e) => {
    res.writeHead(502);
    res.end('Bad Gateway');
  });
});

proxy.listen(3002, '0.0.0.0', () => {
  console.log('HTTPS proxy running at https://localhost:3002 and https://172.20.10.4:3002 -> http://127.0.0.1:3001');
});
