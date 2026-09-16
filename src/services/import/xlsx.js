const XLSX = require('xlsx');
const slugify = require('slugify');
const { prisma } = require('../../config/db');

module.exports = async function importXlsx(filePath) {
  const wb = XLSX.readFile(filePath);
  const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
  const stats = { created: 0, updated: 0, skipped: 0, errors: [] };

  for (const r of rows) {
    try {
      const name = r.name || r['Название'] || r['Наименование'];
      const price = Number(r.price || r['Цена']);
      if (!name || !price) { stats.skipped++; continue; }

      const slug = r.slug || slugify(name, { lower: true, strict: true });
      const data = {
        name, slug,
        sku: r.sku ? String(r.sku) : null,
        price,
        oldPrice: r.old_price ? Number(r.old_price) : null,
        stock: Number(r.stock || r['Остаток'] || 0),
        weight: Number(r.weight || 0.5),
        description: r.description || r['Описание'] || '',
        images: JSON.stringify((r.images || '').toString().split(',').map(s => s.trim()).filter(Boolean)),
        seoTitle: r.seo_title || name,
        seoDesc: r.seo_desc || '',
        seoKeywords: r.seo_keywords || ''
      };

      const catSlug = r.category ? slugify(r.category, { lower: true, strict: true }) : null;
      if (catSlug) {
        const cat = await prisma.category.upsert({
          where: { slug: catSlug },
          update: {},
          create: { slug: catSlug, name: r.category }
        });
        data.categoryId = cat.id;
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
