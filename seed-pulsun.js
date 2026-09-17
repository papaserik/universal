const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

const FLAVORS = [
  { name: 'Карамель',         slug: 'karamel',          price: 990  },
  { name: 'Солёная карамель', slug: 'solyonaya-karamel', price: 990  },
  { name: 'Кокос',            slug: 'kokos',            price: 990  },
  { name: 'Ваниль',           slug: 'vanil',            price: 990  },
  { name: 'Малина',           slug: 'malina',           price: 990  },
  { name: 'Клубника',         slug: 'klubnika',         price: 990  },
  { name: 'Лесной орех',      slug: 'lesnoy-oreh',      price: 1090 },
  { name: 'Шоколад',          slug: 'shokolad',         price: 1090 },
];

function rndSku() {
  return 'PLS-' + Math.random().toString(36).slice(2, 8).toUpperCase();
}

(async () => {
  // 1. Категория "Сиропы" — без published (нет такого поля)
  let cat = await p.category.findFirst({ where: { slug: 'siropy' } });
  if (!cat) {
    cat = await p.category.create({
      data: { name: 'Сиропы', slug: 'siropy' },
    });
    console.log('✅ категория:', cat.name, '/', cat.slug);
  } else {
    console.log('ℹ️  категория уже есть:', cat.name);
  }

  // 2. Товары
  for (const f of FLAVORS) {
    const exists = await p.product.findFirst({ where: { slug: f.slug } });
    if (exists) {
      console.log('⏭️  пропуск:', f.name);
      continue;
    }

    const data = {
      name: f.name,
      slug: f.slug,
      price: f.price,
      oldPrice: Math.round(f.price * 1.3),
      stock: 100,
      published: true,
      categoryId: cat.id,
      description: `${f.name} — сироп PULSUN без сахара с коллагеном. Идеально для кофе, десертов и повседневных рецептов.`,
    };

    // SKU — пробуем, если нет поля — пропустим
    try {
      data.sku = rndSku();
      await p.product.create({ data });
      console.log('✅', f.name, '·', data.sku);
    } catch (e) {
      delete data.sku;
      try {
        await p.product.create({ data });
        console.log('✅', f.name);
      } catch (e2) {
        console.error('❌', f.name, '—', e2.message.split('\n')[0]);
      }
    }
  }

  const total = await p.product.count({ where: { published: true } });
  console.log('\n📊 Товаров published:', total);
  p.$disconnect();
})();
