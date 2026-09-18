const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

const TIPS = [
  {
    title: 'Сколько сиропа добавлять в кофе',
    slug: 'skolko-sirope-v-kofe',
    excerpt: 'Найдите своё идеальное соотношение насыщенности вкуса.',
    content: `<p>Сколько сиропа добавлять — вопрос вкуса, но есть универсальные пропорции, на которые можно ориентироваться.</p>
<p><strong>Классические пропорции:</strong></p>
<ul>
  <li><strong>Латте 300 мл</strong> — 15–20 мл сиропа (1 ст. ложка)</li>
  <li><strong>Капучино 200 мл</strong> — 10–15 мл</li>
  <li><strong>Американо 250 мл</strong> — 15–25 мл</li>
  <li><strong>Холодный кофе 400 мл</strong> — 25–30 мл</li>
</ul>
<p>Если вы только начинаете — начните с 10 мл на чашку и постепенно добавляйте. Так вы найдёте ту самую золотую середину, когда вкус сиропа дополняет кофе, а не перебивает его.</p>`
  },
  {
    title: 'С чем сочетать разные вкусы',
    slug: 's-chem-sochetaem',
    excerpt: 'Удачные комбинации для напитков и десертов.',
    content: `<p>Каждый вкус PULSUN раскрывается по-разному в зависимости от того, с чем его сочетать. Вот проверенные комбинации:</p>
<ul>
  <li><strong>Карамель</strong> — кофе, яблоки, орехи, сливочные десерты</li>
  <li><strong>Солёная карамель</strong> — латте, шоколад, мороженое</li>
  <li><strong>Кокос</strong> — холодный кофе, тропические смузи, чизкейки</li>
  <li><strong>Ваниль</strong> — капучино, творожные десерты, выпечка</li>
  <li><strong>Малина</strong> — чай, лимонады, йогурты, панна-котта</li>
  <li><strong>Клубника</strong> — молочные коктейли, смузи, чизкейки</li>
  <li><strong>Лесной орех</strong> — эспрессо, шоколад, брауни</li>
  <li><strong>Шоколад</strong> — мокко, десерты, какао</li>
</ul>
<p>Попробуйте неожиданные дуэты — например, солёная карамель + кокос в холодном латте. Вкус получится глубокий и многослойный.</p>`
  },
  {
    title: 'Как использовать в холодных напитках и десертах',
    slug: 'v-holodnyh-napitkah',
    excerpt: 'Лёгкие рецепты для любого сезона.',
    content: `<p>Сиропы PULSUN отлично работают не только в горячем, но и в холодном виде. Вот несколько идей:</p>
<h3>Холодные напитки</h3>
<ul>
  <li><strong>Айс-латте</strong> — 20 мл сиропа + эспрессо + молоко + лёд</li>
  <li><strong>Лимонад</strong> — 30 мл сиропа + газированная вода + лёд + мята</li>
  <li><strong>Смузи</strong> — 20 мл сиропа + банан + молоко + лёд</li>
  <li><strong>Холодный чай</strong> — 25 мл сиропа + чай + лёд + лимон</li>
</ul>
<h3>Десерты</h3>
<ul>
  <li>Полейте сиропом панна-котту или мороженое</li>
  <li>Добавьте в творожный крем для чизкейка</li>
  <li>Используйте как топпинг для блинчиков и вафель</li>
  <li>Смешайте с греческим йогуртом и ягодами</li>
</ul>
<p>Сироп не содержит сахара, поэтому десерты получаются лёгкими, но при этом вкусными.</p>`
  },
];

(async () => {
  // Ищем категорию «tips»
  const cat = await p.blogCategory.findFirst({ where: { slug: 'tips' } });
  if (!cat) {
    console.log('❌ Категория «Советы» (slug=tips) не найдена.');
    console.log('   Сначала запусти seed-blog-cats.js');
    p.$disconnect();
    return;
  }
  console.log('✅ Категория «Советы» найдена, id=' + cat.id + '\n');

  for (const t of TIPS) {
    const exists = await p.blogPost.findFirst({ where: { slug: t.slug } });
    if (exists) {
      console.log('⏭️  уже есть:', t.title);
      continue;
    }

    try {
      const created = await p.blogPost.create({
        data: {
          title: t.title,
          slug: t.slug,
          excerpt: t.excerpt,
          content: t.content,
          published: true,
          blogCategoryId: cat.id,
        }
      });
      console.log('✅ создан:', t.title, '| id=' + created.id);
    } catch (e) {
      console.error('❌', t.title, '—', e.message.split('\n')[0]);
    }
  }

  console.log('\n📊 Посты категории «Советы»:');
  const list = await p.blogPost.findMany({
    where: { blogCategory: { slug: 'tips' } },
    orderBy: { id: 'asc' },
    select: { id: true, title: true, slug: true, cover: true, published: true }
  });
  list.forEach(b => console.log('  id=' + b.id, '| ' + b.title, '| cover=' + (b.cover || '✗')));
  console.log('Всего: ' + list.length);

  p.$disconnect();
})();
