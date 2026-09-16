const fs = require('fs');
const { XMLParser } = require('fast-xml-parser');
const slugify = require('slugify');
const { prisma } = require('../../config/db');

module.exports = async function importXml(filePath) {
  const xmlStr = fs.readFileSync(filePath, 'utf8');
  const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_' });
  const doc = parser.parse(xmlStr);

  // Ищем массив товаров: поддерживаем разные корни
  let items = [];
  if (Array.isArray(doc?.products?.product)) items = doc.products.product;
  else if (doc?.products?.product) items = [doc.products.product];
  else if (Array.isArray(doc?.catalog?.product)) items = doc.catalog.product;
  else if (doc?.catalog?.product) items = [doc.catalog.product];
  else if (Array.isArray(doc?.items?.item)) items = doc.items.item;
  else if (doc?.items?.item) items = [doc.items.item];

  const stats = { created: 0, updated: 0, skipped: 0, errors: [] };
  for (const r of items) {
    try {
      const name = r.name || r.title;
      const price = Number(r.price);
      if (!name || !price) { stats.skipped++; continue; }
      const slug = slugify(String(name), { lower: true, strict: true });
      const images = r.images ? [].concat(r.images).map(String) : [];
      const data = {
        name: String(name), slug, price,
        oldPrice: r.old_price ? Number(r.old_price) : null,
        description: r.description || '',
        images: JSON.stringify(images),
        sku: r.sku ? String(r.sku) : null
      };

      const exists = await prisma.product.findUnique({ where: { slug } });
      if (exists) {
        await prisma.product.update({ where: { slug }, data });
        stats.updated++;
      } else {
        await prisma.product.create({ data });
        stats.created++;
      }
    } catch (e) {
      stats.errors.push(String(e.message));
    }
  }
  return stats;
};
