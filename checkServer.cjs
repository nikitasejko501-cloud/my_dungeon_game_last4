// проверка доступности сервера
const http = require('http');
const opts = { hostname: '127.0.0.1', port: 8080, path: '/index.html', method: 'GET' };
const req = http.request(opts, (res) => { console.log('HTTP', res.statusCode, res.statusMessage); process.exit(0); });
req.on('error', (e) => { console.error('ERR', e.message); process.exit(1); });
req.end();


