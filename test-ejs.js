const ejs = require('ejs');
const fs = require('fs');
const path = require('path');

function walk(dir, list = []) {
  for (const f of fs.readdirSync(dir)) {
    const full = path.join(dir, f);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) walk(full, list);
    else if (f.endsWith('.ejs')) list.push(full);
  }
  return list;
}

const files = [
  ...walk('src/views'),
  ...walk('src/themes')
];

console.log('══════════════════════════════════════════════');
console.log('🧪 Компиляция EJS-шаблонов');
console.log('══════════════════════════════════════════════');
console.log('');

let ok = 0, fail = 0;
const failures = [];

for (const file of files) {
  try {
    const content = fs.readFileSync(file, 'utf8');
    ejs.compile(content, { filename: file });
    ok++;
  } catch (e) {
    fail++;
    failures.push({ file, error: e.message });
  }
}

console.log('✓ Всего:', files.length);
console.log('✓ OK:', ok);
console.log('✗ Ошибок:', fail);

if (failures.length) {
  console.log('');
  console.log('───── Проблемные файлы ─────');
  failures.forEach(f => {
    console.log('');
    console.log('❌', f.file);
    console.log('   ', f.error);
  });
  process.exit(1);
} else {
  console.log('');
  console.log('══════════════════════════════════════════════');
  console.log('✅ ВСЕ ШАБЛОНЫ ВАЛИДНЫ');
  console.log('══════════════════════════════════════════════');
}
