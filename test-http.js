const http = require('http');

const BASE = 'http://localhost:3000';
const PAGES = [
  { url: '/',                     name: 'Главная' },
  { url: '/catalog',              name: 'Каталог' },
  { url: '/catalog/electronics',  name: 'Категория' },
  { url: '/product/smartfon-x1',  name: 'Товар' },
  { url: '/blog',                 name: 'Блог' },
  { url: '/contacts',             name: 'Контакты' },
  { url: '/login',                name: 'Вход' },
  { url: '/admin/login',          name: 'Вход в админку' },
];

function fetch(url) {
  return new Promise((resolve, reject) => {
    const req = http.get(BASE + url, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve({ status: res.statusCode, size: data.length }));
    });
    req.on('error', reject);
    req.setTimeout(5000, () => { req.destroy(); reject(new Error('timeout')); });
  });
}

(async () => {
  console.log('══════════════════════════════════════════════');
  console.log('🧪 HTTP-тест страниц');
  console.log('══════════════════════════════════════════════');
  console.log('');

  let ok = 0, fail = 0;
  for (const p of PAGES) {
    try {
      const r = await fetch(p.url);
      const sizeKb = Math.round(r.size / 1024);
      const good = r.status === 200 || r.status === 302 || r.status === 404;
      const mark = good ? '✓' : '✗';
      console.log(`${mark} ${p.url.padEnd(30)} HTTP ${r.status}  (${sizeKb} KB)  ${p.name}`);
      if (good) ok++; else fail++;
    } catch (e) {
      console.log(`✗ ${p.url.padEnd(30)} ОШИБКА: ${e.message}`);
      fail++;
    }
  }

  console.log('');
  console.log('══════════════════════════════════════════════');
  console.log(`📊 OK: ${ok}, Ошибок: ${fail}`);
  console.log('══════════════════════════════════════════════');
})();
