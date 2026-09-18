const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

(async () => {
  // Ищем существующий about-баннер
  let existing = await p.banner.findFirst({ where: { layout: 'about' } });

  const data = {
    title: 'О бренде PULSUN',
    subtitle: null,
    body: 'PULSUN — это больше, чем просто сиропы. Это забота о себе в каждой детали, вдохновение на полезные привычки и удовольствие от вкуса без компромиссов.',
    ctaText: null,
    ctaUrl: null,
    bgColor: '#FAF4EB',
    textColor: '#2A1A0F',
    textPosition: 'left',
    overlay: 0,
    layout: 'about',
    sort: 5,
    active: true,
  };

  if (existing) {
    await p.banner.update({ where: { id: existing.id }, data });
    console.log('✅ Обновлён баннер id=' + existing.id);
  } else {
    const created = await p.banner.create({ data });
    console.log('✅ Создан баннер id=' + created.id);
  }

  // Показываем результат
  const all = await p.banner.findMany({
    select: { id: true, layout: true, title: true, imageUrl: true, active: true }
  });

  console.log('\n📊 Все баннеры в БД:');
  all.forEach(b => {
    console.log('  — id=' + b.id,
                '| layout=' + (b.layout || '—'),
                '| title=' + (b.title || '—'),
                '| img=' + (b.imageUrl ? '✓' : '✗'),
                '| active=' + b.active);
  });

  p.$disconnect();
})();
