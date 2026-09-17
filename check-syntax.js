const ejs = require('ejs');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('═══ EJS синтаксис ═══');
let ok = 0, bad = 0;
function walkEJS(d) {
  if (!fs.existsSync(d)) return;
  for (const f of fs.readdirSync(d)) {
    const p = path.join(d, f);
    const st = fs.statSync(p);
    if (st.isDirectory()) walkEJS(p);
    else if (f.endsWith('.ejs')) {
      try { ejs.compile(fs.readFileSync(p, 'utf8'), { filename: p }); ok++; }
      catch (e) { bad++; console.log('  FAIL:', p, '—', e.message.split('\n')[0]); }
    }
  }
}
walkEJS('src/views');
walkEJS('src/modules');
console.log(`  EJS OK: ${ok} | FAIL: ${bad}`);

console.log('\n═══ JS синтаксис ═══');
let err = 0, total = 0;
function walkJS(d) {
  if (!fs.existsSync(d)) return;
  for (const f of fs.readdirSync(d)) {
    if (f === 'node_modules') continue;
    const p = path.join(d, f);
    const st = fs.statSync(p);
    if (st.isDirectory()) walkJS(p);
    else if (f.endsWith('.js')) {
      total++;
      try { execSync(`node --check "${p}"`, { stdio: 'pipe' }); }
      catch (e) { err++; console.log('  FAIL:', p); }
    }
  }
}
walkJS('src');
console.log(`  JS OK: ${total - err} | FAIL: ${err}`);
