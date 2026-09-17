const { prisma } = require('../../../config/db');
const { getSetting } = require('../../../services/settings');

function xml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function cdata(str) {
  if (str == null) return '';
  return '<![CDATA[' + String(str).replace(/]]>/g, ']]]]><![CDATA[>') + ']]>';
}

async function generateYml(options = {}) {
  const siteName = await getSetting('site_name', 'Магазин');
  const siteUrl  = process.env.SITE_URL || 'http://localhost:3000';
  const onlyWithStock = options.onlyWithStock !== false;
  const onlyPublished = options.onlyPublished !== false;

  const where = {};
  if (onlyPublished) where.published = true;
  if (onlyWithStock) where.stock = { gt: 0 };

  const products = await prisma.product.findMany({
    where,
    include: { category: true, brand: true },
    orderBy: { id: 'asc' }
  });

  const categories = await prisma.category.findMany({ orderBy: { id: 'asc' } });
  const usedCategoryIds = new Set(products.map(p => p.categoryId).filter(Boolean));
  const activeCategories = categories.filter(c => usedCategoryIds.has(c.id));

  const date = new Date().toISOString();
  let out = '<?xml version="1.0" encoding="UTF-8"?>\n';
  out += '<!DOCTYPE yml_catalog SYSTEM "shops.dtd">\n';
  out += '<yml_catalog date="' + date + '">\n';
  out += '  <shop>\n';
  out += '    <name>' + xml(siteName) + '</name>\n';
  out += '    <company>' + xml(siteName) + '</company>\n';
  out += '    <url>' + xml(siteUrl) + '</url>\n';
  out += '    <currencies>\n';
  out += '      <currency id="RUB" rate="1"/>\n';
  out += '    </currencies>\n';

  out += '    <categories>\n';
  for (const c of activeCategories) {
    out += '      <category id="' + c.id + '"';
    if (c.parentId) out += ' parentId="' + c.parentId + '"';
    out += '>' + xml(c.name) + '</category>\n';
  }
  out += '    </categories>\n';

  out += '    <offers>\n';
  for (const p of products) {
    let images = [];
    try { images = JSON.parse(p.images || '[]'); } catch (e) {}
    let externalIds = {};
    try { externalIds = JSON.parse(p.externalIds || '{}'); } catch (e) {}
    const offerId = p.sku || externalIds.ozon || externalIds.wb || String(p.id);

    out += '      <offer id="' + xml(offerId) + '" available="true">\n';
    out += '        <url>' + xml(siteUrl + '/product/' + p.slug) + '</url>\n';
    out += '        <price>' + p.price + '</price>\n';
    if (p.oldPrice && p.oldPrice > p.price) {
      out += '        <oldprice>' + p.oldPrice + '</oldprice>\n';
    }
    out += '        <currencyId>RUB</currencyId>\n';
    if (p.categoryId) out += '        <categoryId>' + p.categoryId + '</categoryId>\n';

    for (const img of images.slice(0, 10)) {
      const fullUrl = img.startsWith('http') ? img : siteUrl + img;
      out += '        <picture>' + xml(fullUrl) + '</picture>\n';
    }

    out += '        <name>' + xml(p.name) + '</name>\n';
    out += '        <vendor>' + xml(p.brand ? p.brand.name : 'Без бренда') + '</vendor>\n';
    if (p.sku) out += '        <vendorCode>' + xml(p.sku) + '</vendorCode>\n';
    if (p.description) out += '        <description>' + cdata(p.description) + '</description>\n';
    out += '        <stock>' + (p.stock || 0) + '</stock>\n';
    out += '        <weight>' + (p.weight || 0.5) + '</weight>\n';
    out += '      </offer>\n';
  }
  out += '    </offers>\n';
  out += '  </shop>\n';
  out += '</yml_catalog>\n';

  return { xml: out, productsCount: products.length, categoriesCount: activeCategories.length };
}

async function generateCsv() {
  const products = await prisma.product.findMany({
    where: { published: true },
    include: { brand: true },
    orderBy: { id: 'asc' }
  });

  const header = ['Артикул продавца','Наименование','Бренд','Описание','Цена','Цена до скидки','Остаток','Вес','Штрихкод','Ссылка'].join(';');
  const rows = [header];
  const siteUrl = process.env.SITE_URL || 'http://localhost:3000';

  for (const p of products) {
    let externalIds = {};
    try { externalIds = JSON.parse(p.externalIds || '{}'); } catch (e) {}
    const sku = p.sku || externalIds.wb || String(p.id);
    rows.push([
      sku, p.name,
      p.brand ? p.brand.name : '',
      (p.description || '').replace(/[\r\n;]/g, ' ').slice(0, 1000),
      p.price, p.oldPrice || '', p.stock || 0, p.weight || 0.5, '',
      siteUrl + '/product/' + p.slug
    ].map(v => {
      const str = String(v == null ? '' : v);
      return /[;"]/.test(str) ? '"' + str.replace(/"/g, '""') + '"' : str;
    }).join(';'));
  }

  return '\uFEFF' + rows.join('\n');
}

module.exports = { generateYml, generateCsv, xml, cdata };
