const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

// Собираем данные баннера
const data = {
  title: 'Сиропы PULSUN<br>с коллагеном',
  subtitle: 'Без сахара. 8 вкусов. На каждый день.',
  body: 'Сиропы без сахара с коллагеном для кофе, десертов и повседневных рецептов. 8 вкусов, приятный вкус и удобное применение каждый день.',
  ctaText: 'Выбрать вкус',
  ctaUrl: '/catalog',
  active: true,
  sort: 1,
};

(async () => {
  // Пытаемся найти любой баннер
  let banner = await p.banner.findFirst();

  if (banner) {
    // Обновляем только текстовые поля, image НЕ трогаем
    const update = {};
    for (const [k, v] of Object.entries(data)) {
      // Пробуем разные названия полей
      try {
        update[k] = v;
      } catch (e) { /* skip */ }
    }
    try {
      await p.banner.update({ where: { id: banner.id }, data: update });
      console.log('✅ Баннер обновлён:', banner.id);
    } catch (e) {
      console.error('❌ Ошибка обновления:', e.message.split('\n')[0]);
      // Пробуем альтернативные поля
      const alt = {
        title: data.title,
        subtitle: data.subtitle,
        description: data.body,
        buttonText: data.ctaText,
        buttonUrl: data.ctaUrl,
        enabled: true,
        active: true,
      };
      try {
        await p.banner.update({ where: { id: banner.id }, data: alt });
        console.log('✅ Баннер обновлён (альтернативные поля)');
      } catch (e2) {
        console.error('❌ Не смогли:', e2.message.split('\n')[0]);
      }
    }
  } else {
    try {
      const b = await p.banner.create({ data });
      console.log('✅ Баннер создан:', b.id);
    } catch (e) {
      console.error('❌ Ошибка создания:', e.message.split('\n')[0]);
    }
  }

  // Показываем что получилось
  const list = await p.banner.findMany();
  console.log('\n📊 Баннеров в БД:', list.length);
  list.forEach(b => {
    console.log('  — id:', b.id);
    console.log('    title:  ', b.title || '—');
    console.log('    active: ', b.active);
    console.log('    image:  ', b.image || '(нет — загрузи через админку)');
  });
  p.$disconnect();
})();
