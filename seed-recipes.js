const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

const RECIPES = [
  { title: 'Ванильный латте', slug: 'vanilnyy-latte', excerpt: 'Нежный вкус и аромат для идеального начала дня.' },
  { title: 'Ягодный лимонад', slug: 'yagodnyy-limonad', excerpt: 'Освежающий напиток с натуральным вкусом.' },
  { title: 'Творожный десерт', slug: 'tvorozhnyy-desert', excerpt: 'Легкий и полезный десерт для сладких моментов.' },
  { title: 'Айс-кофе с карамелью', slug: 'ays-kofe-s-karamelyu', excerpt: 'Любимая классика в полезном решении.' },
];

(async () => {
  for (const r of RECIPES) {
    const exists = await p.blogPost.findFirst({ where: { slug: r.slug } });
    if (exists) { console.log('⏭️ ', r.title); continue; }
    try {
      await p.blogPost.create({
        data: {
          title: r.title,
          slug: r.slug,
          excerpt: r.excerpt,
          content: `<p>${r.excerpt}</p><p>Рецепт скоро появится…</p>`,
          published: true,
        }
      });
      console.log('✅', r.title);
    } catch (e) {
      console.error('❌', r.title, '—', e.message.split('\n')[0]);
    }
  }
  const total = await p.blogPost.count({ where: { published: true } });
  console.log('\n📊 Постов в блоге:', total);
  p.$disconnect();
})();
