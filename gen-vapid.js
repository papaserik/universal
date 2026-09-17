const webpush = require('web-push');
const fs = require('fs');

// Генерируем пару ключей (публичный + приватный)
const keys = webpush.generateVAPIDKeys();

console.log('');
console.log('══════════════════════════════════════════════');
console.log('🔑 VAPID-ключи сгенерированы');
console.log('══════════════════════════════════════════════');
console.log('');
console.log('PUBLIC:');
console.log(keys.publicKey);
console.log('');
console.log('PRIVATE:');
console.log(keys.privateKey);
console.log('');

// Сохраняем во временный файл, чтобы забрать и вставить в .env
const envContent = '\n# ─── Push-уведомления (VAPID) ───\n' +
  'VAPID_PUBLIC_KEY=' + keys.publicKey + '\n' +
  'VAPID_PRIVATE_KEY=' + keys.privateKey + '\n' +
  'VAPID_SUBJECT=mailto:admin@shop.local\n';

fs.appendFileSync('.env', envContent);
console.log('✅ Добавлено в .env');
console.log('');
