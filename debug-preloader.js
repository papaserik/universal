const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

(async () => {
  const row = await p.setting.findUnique({ where: { key: 'module_preloader' } });
  console.log('1. DB module_preloader =', row ? row.value : 'null');

  // Через _registry
  try {
    const _registry = require('./src/modules/_registry');
    const enabled1 = await _registry.isEnabled('preloader');
    console.log('2. _registry.isEnabled =', enabled1);
  } catch (e) {
    console.log('2. _registry ERROR:', e.message);
  }

  // Через services/modules
  try {
    const modules = require('./src/services/modules');
    const enabled2 = await modules.isEnabled('preloader');
    console.log('3. services/modules.isEnabled =', enabled2);
  } catch (e) {
    console.log('3. services/modules ERROR:', e.message);
  }

  // Settings
  try {
    const svc = require('./src/modules/preloader/service');
    const settings = await svc.getSettings();
    console.log('4. svc.getSettings() =', JSON.stringify(settings, null, 2));
  } catch (e) {
    console.log('4. svc ERROR:', e.message);
    console.log('   stack:', e.stack.split('\n').slice(0, 3).join('\n   '));
  }

  await p.$disconnect();
})();
