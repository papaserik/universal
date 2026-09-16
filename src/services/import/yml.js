const fs = require('fs');
const { XMLParser } = require('fast-xml-parser');
const slugify = require('slugify');
const { prisma } = require('../../config/db');

module.exports = async function importYml(filePath) {
  const xmlStr = fs.readFileSync(filePath, 'utf8');
  const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_' });
  const doc = parser.parse(xmlStr);
  const shop = doc?.yml_catalog?.shop || {};
  const offers = shop?.offers?.offer || [];
  const list = Array.isArray(offers) ? offers : [offers];

  // карта категорий по id
  const catMap = {};
  const rawCats = shop?.categories?.category || [];
  const cats = Array.isArray(rawCats) ? rawCats : (rawCats ? [rawCats] : []);
  for (const c of cats) {
    const id = c['@_id'];
    const name = typeof c === 'string' ? c : (c['#text'] || c);
    if (id) {
      const slug = slugify(String(name), { lower: true, strict: true });
      const cat = await prisma.category.upsert({
        where: { slug }, update: {}, create: { slug, name: String(name) }
      });
      catMap[String(id)] = cat.id;
    }
  }

  const stats = { created: 0, updated: 0, skipped: 0, errors: [] };
  for (const o of list) {
    try {
      const name = o.name;
      const price = Number(o.price);
      if (!name || !price) { stats.skipped++; continue; }
      const slug = slugify(String(name), { lower: true, strict: true });
      const images = o.picture ? [].concat(o.picture).map(String) : [];
      const data = {
        name: String(name), slug, price,
        oldPrice: o.oldprice ? Number(o.oldprice) : null,
        description: o.description || '',
        images: JSON.stringify(images),
        sku: o['@_id'] ? String(o['@_id']) : null
      };
      if (o.categoryId && catMap[String(o.categoryId)]) {
        data.categoryId = catMap[String(o.categoryId)];
      }

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
