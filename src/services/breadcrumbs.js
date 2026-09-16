const { prisma } = require('../config/db');

/**
 * Строит массив крошек: [{ name, url }]
 * Первая всегда — "Главная"
 */
function crumbs(items) {
  return [{ name: 'Главная', url: '/' }].concat(items);
}

/**
 * Для карточки товара — иерархия: Главная / Каталог / [Категория] / Товар
 */
async function forProduct(product) {
  const list = [{ name: 'Каталог', url: '/catalog' }];

  if (product.categoryId) {
    const chain = await categoryChain(product.categoryId);
    chain.forEach(c => list.push({ name: c.name, url: '/catalog/' + c.slug }));
  }

  list.push({ name: product.name, url: '/product/' + product.slug });
  return crumbs(list);
}

/**
 * Для категории — все предки от корня до неё
 */
async function forCategory(category) {
  const list = [{ name: 'Каталог', url: '/catalog' }];
  const chain = await categoryChain(category.id);
  chain.forEach(c => list.push({ name: c.name, url: '/catalog/' + c.slug }));
  return crumbs(list);
}

/**
 * Рекурсивно собирает цепочку родителей категории от корня до самой категории
 */
async function categoryChain(catId) {
  const chain = [];
  let current = await prisma.category.findUnique({ where: { id: catId } });
  while (current) {
    chain.unshift({ name: current.name, slug: current.slug, id: current.id });
    if (!current.parentId) break;
    current = await prisma.category.findUnique({ where: { id: current.parentId } });
  }
  return chain;
}

/**
 * Для поста блога
 */
async function forBlogPost(post) {
  const list = [{ name: 'Блог', url: '/blog' }];
  if (post.blogCategoryId) {
    const cat = await prisma.blogCategory.findUnique({ where: { id: post.blogCategoryId } });
    if (cat) list.push({ name: cat.name, url: '/blog/category/' + cat.slug });
  }
  list.push({ name: post.title, url: '/blog/' + post.slug });
  return crumbs(list);
}

/**
 * Для страницы
 */
function forPage(page) {
  return crumbs([{ name: page.title, url: '/page/' + page.slug }]);
}

/**
 * JSON-LD BreadcrumbList
 */
function jsonLd(items, baseUrl) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((it, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: it.name,
      item: baseUrl + it.url
    }))
  };
}

module.exports = { crumbs, forProduct, forCategory, forBlogPost, forPage, jsonLd };
