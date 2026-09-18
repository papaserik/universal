const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

(async () => {
  await p.setting.upsert({
    where:  { key: 'module_preloader' },
    update: { value: '1' },
    create: { key: 'module_preloader', value: '1' },
  });
  console.log('✅ module_preloader = 1');

  const check = await p.setting.findUnique({ where: { key: 'module_preloader' } });
  console.log('   Проверка:', check.value);

  await p.$disconnect();
})();
