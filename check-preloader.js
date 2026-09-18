const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

(async () => {
  const row = await p.setting.findUnique({ where: { key: 'module_preloader' } });
  console.log('module_preloader =', row ? row.value : 'null');

  const modules = require('./src/services/modules');
  const enabled = await modules.isEnabled('preloader');
  console.log('isEnabled(preloader) =', enabled);

  await p.$disconnect();
})();
