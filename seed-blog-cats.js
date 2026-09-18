const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

(async () => {
  const cats = [
    { slug: 'recipes', name: 'Рецепты', sort: 1 },
    { slug: 'tips',    name: 'Советы',  sort: 2 },
  ];

  for (const c of cats) {
    const exists = await p.blogCategory.findFirst({ where: { slug: c.slug } });
    if (exists) {
      console.log('⏭️  уже есть:', c.name, '| id=' + exists.id);
    } else {
      const created = await p.blogCategory.create({ data: c });
      console.log('✅ создана:', c.name, '| id=' + created.id);
    }
  }

  console.log('\n📊 Все категории блога:');
  const list = await p.blogCategory.findMany({
    include: { _count: { select: { posts: true } } }
  });
  list.forEach(c => console.log('  id=' + c.id, '| ' + c.slug, '| ' + c.name, '| постов: ' + c._count.posts));

  p.$disconnect();
})();
