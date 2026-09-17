const http = require('http');
const BASE = 'http://localhost:3000';

function fetch(url) {
  return new Promise((resolve, reject) => {
    const t0 = Date.now();
    const req = http.get(BASE + url, res => {
      let size = 0;
      res.on('data', c => size += c.length);
      res.on('end', () => resolve({ status: res.statusCode, time: Date.now() - t0, headers: res.headers, size }));
    });
    req.on('error', reject);
    req.setTimeout(5000, () => { req.destroy(); reject(new Error('timeout')); });
  });
}

(async () => {
  console.log('\n═══ Проверка кеша ═══\n');
  const r1 = await fetch('/');
  const r2 = await fetch('/');
  const r3 = await fetch('/');
  console.log('HTML-кеш:');
  console.log('  #1  x-cache: ' + (r1.headers['x-cache'] || '—') + '  (' + r1.time + ' ms)');
  console.log('  #2  x-cache: ' + (r2.headers['x-cache'] || '—') + '  (' + r2.time + ' ms)');
  console.log('  #3  x-cache: ' + (r3.headers['x-cache'] || '—') + '  (' + r3.time + ' ms)');

  const html = await new Promise((resolve, reject) => {
    const req = http.get(BASE + '/', res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve(data));
    });
    req.on('error', reject);
  });
  const css = html.match(/\/css\/[a-z\-]+\.css\?v=\d+/g) || [];
  const js  = html.match(/\/js\/[a-z\-]+\.js\?v=\d+/g) || [];

  console.log('\nCache busting:');
  console.log('  CSS с ?v= : ' + css.length);
  css.forEach(m => console.log('    ' + m));
  console.log('  JS с ?v=  : ' + js.length);
  js.slice(0, 5).forEach(m => console.log('    ' + m));

  const admin = await fetch('/admin/login');
  const api = await fetch('/api/health');
  console.log('\nИсключения (не должны кешироваться):');
  console.log('  /admin/login: ' + (admin.headers['x-cache'] || '— правильно'));
  console.log('  /api/health:  ' + (api.headers['x-cache'] || '— правильно'));
  console.log('\n═══ Готово ═══\n');
})().catch(e => console.error('ERR:', e.message));
