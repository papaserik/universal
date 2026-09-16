require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const slugify = require('slugify');
const prisma = new PrismaClient();

async function main() {
  const hash = await bcrypt.hash('admin123', 10);
  await prisma.user.upsert({
    where: { email: 'admin@shop.local' }, update: {},
    create: { email: 'admin@shop.local', password: hash, name: 'Admin', role: 'ADMIN' }
  });
  const settings = {
    site_name: 'Universal Shop', phone: '+7 (900) 000-00-00', email: 'shop@example.com',
    address: 'г. Москва, ул. Примерная, 1', active_theme: 'default',
    delivery_flat_cost: '300', delivery_free_from: '5000', delivery_per_kg: '100',
    stripe_secret: '', yookassa_shop_id: '', yookassa_secret: '',
    ga_id: '', metrika_id: '', custom_head: '', custom_body: ''
  };
  for (const [key, value] of Object.entries(settings)) {
    await prisma.setting.upsert({ where: { key }, update: {}, create: { key, value } });
  }
  const cat = await prisma.category.upsert({
    where: { slug: 'electronics' }, update: {},
    create: { slug: 'electronics', name: 'Электроника', seoTitle: 'Электроника — купить', seoDesc: 'Электроника в интернет-магазине' }
  });
  await prisma.option.upsert({
    where: { slug: 'color' }, update: {},
    create: { slug: 'color', name: 'Цвет', values: { create: [
      { slug: 'red', value: 'Красный' }, { slug: 'blue', value: 'Синий' }, { slug: 'black', value: 'Чёрный' }
    ]}}
  });
  const products = [
    { name: 'Смартфон X1', price: 19990, oldPrice: 24990, stock: 12 },
    { name: 'Наушники Pro', price: 4990, oldPrice: 6990, stock: 30 },
    { name: 'Планшет Z', price: 29990, oldPrice: null, stock: 5 },
    { name: 'Умные часы W', price: 12990, oldPrice: 14990, stock: 8 }
  ];
  for (const p of products) {
    const slug = slugify(p.name, { lower: true, strict: true });
    await prisma.product.upsert({
      where: { slug }, update: {},
      create: {
        slug, name: p.name, price: p.price, oldPrice: p.oldPrice, stock: p.stock,
        description: 'Описание товара ' + p.name, images: JSON.stringify([]),
        categoryId: cat.id, seoTitle: p.name + ' — купить',
        seoDesc: 'Купить ' + p.name + ' по выгодной цене', seoKeywords: p.name + ', купить'
      }
    });
  }
  await prisma.page.upsert({ where: { slug: 'privacy-policy' }, update: {}, create: { slug: 'privacy-policy', title: 'Политика конфиденциальности', content: 'Текст политики...' } });
  await prisma.page.upsert({ where: { slug: 'terms' }, update: {}, create: { slug: 'terms', title: 'Пользовательское соглашение', content: 'Текст соглашения...' } });
  await prisma.blogPost.upsert({ where: { slug: 'welcome' }, update: {}, create: { slug: 'welcome', title: 'Добро пожаловать', excerpt: 'Первый пост', content: '<p>Привет!</p>' } });
  console.log('✅ Seed завершён. Админ: admin@shop.local / admin123');
}
main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
