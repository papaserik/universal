const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');
const { XMLParser } = require('fast-xml-parser');
const slugify = require('slugify');
const { prisma } = require('../../../config/db');

// ─── Хелпер: найти товар по SKU / External ID ───
async function findExistingProduct(item) {
  // 1. По SKU
  if (item.sku) {
    const bySku = await prisma.product.findUnique({ where: { sku: String(item.sku) } });
    if (bySku) return bySku;
  }

  // 2. По externalIds (ozon/wb/yandex/sbermarket)
  if (item.externalId) {
    const candidates = await prisma.product.findMany({
      where: { externalIds: { contains: String(item.externalId) } }
    });
    const extKey = item.marketplace || 'external';
    for (const p of candidates) {
      try {
        const ids = JSON.parse(p.externalIds || '{}');
        if (Object.values(ids).includes(String(item.externalId))) return p;
      } catch (e) {}
    }
  }

  // 3. По slug (если задан)
  if (item.slug) {
    const bySlug = await prisma.product.findUnique({ where: { slug: item.slug } });
    if (bySlug) return bySlug;
  }

  return null;
}

// ─── Хелпер: обработать одну позицию ───
async function processItem(item, options) {
  const { marketplace, strategy } = options;
  const stats = { action: 'skipped', product: null };

  const existing = await findExistingProduct(item);

  // Подготавливаем данные для сохранения
  const data = {
    name: item.name,
    price: Number(item.price) || 0,
    oldPrice: item.oldPrice ? Number(item.oldPrice) : null,
    stock: Number(item.stock || 0),
    weight: Number(item.weight || 0.5),
    description: item.description || '',
    images: JSON.stringify(item.images || []),
    sku: item.sku ? String(item.sku) : null
  };

  // externalId
  if (item.externalId) {
    let extIds = {};
    if (existing) {
      try { extIds = JSON.parse(existing.externalIds || '{}'); } catch (e) {}
    }
    extIds[marketplace] = String(item.externalId);
    data.externalIds = JSON.stringify(extIds);
    data.syncStatus = 'imported';
  }

  // Категория (по названию)
  if (item.category) {
    const catSlug = slugify(item.category, { lower: true, strict: true });
    const cat = await prisma.category.upsert({
      where: { slug: catSlug },
      update: {},
      create: { slug: catSlug, name: item.category }
    });
    data.categoryId = cat.id;
  }

  // Бренд (по названию)
  if (item.brand) {
    const brandSlug = slugify(item.brand, { lower: true, strict: true });
    const brand = await prisma.brand.upsert({
      where: { slug: brandSlug },
      update: {},
      create: { slug: brandSlug, name: item.brand, active: true }
    });
    data.brandId = brand.id;
  }

  if (existing) {
    // ─── Товар уже есть ───
    if (strategy === 'skip') {
      stats.action = 'skipped';
      stats.product = existing;
      return stats;
    }
    if (strategy === 'merge' || strategy === 'overwrite') {
      // В merge — не перезаписываем локальные поля, если они не пришли
      if (strategy === 'merge') {
        if (!data.name) delete data.name;
        if (data.price === 0) delete data.price;
        if (!data.description) delete data.description;
      }
      try {
        const updated = await prisma.product.update({
          where: { id: existing.id },
          data
        });
        stats.action = 'updated';
        stats.product = updated;
      } catch (e) {
        stats.action = 'error';
        stats.error = e.message;
      }
      return stats;
    }
  }

  // ─── Создаём новый ───
  const baseSlug = item.slug || slugify(item.name, { lower: true, strict: true });
  let slug = baseSlug;
  let suffix = 1;
  while (await prisma.product.findUnique({ where: { slug } })) {
    slug = baseSlug + '-' + (++suffix);
    if (suffix > 100) { slug = baseSlug + '-' + Date.now(); break; }
  }

  try {
    const created = await prisma.product.create({
      data: { ...data, slug, published: true }
    });
    stats.action = 'created';
    stats.product = created;
  } catch (e) {
    stats.action = 'error';
    stats.error = e.message;
  }

  return stats;
}

// ─── Парсер YML ───
function parseYml(filePath, marketplace) {
  const xmlStr = fs.readFileSync(filePath, 'utf8');
  const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_' });
  const doc = parser.parse(xmlStr);
  const shop = doc?.yml_catalog?.shop || {};

  // Категории
  const catMap = {};
  const rawCats = shop?.categories?.category || [];
  const cats = Array.isArray(rawCats) ? rawCats : (rawCats ? [rawCats] : []);
  for (const c of cats) {
    const id = c['@_id'];
    const name = typeof c === 'string' ? c : (c['#text'] || String(c));
    if (id) catMap[String(id)] = name;
  }

  const offers = shop?.offers?.offer || [];
  const list = Array.isArray(offers) ? offers : [offers];

  return list.map(o => {
    const images = o.picture ? [].concat(o.picture).map(String) : [];
    return {
      name: o.name || '',
      price: Number(o.price) || 0,
      oldPrice: o.oldprice ? Number(o.oldprice) : null,
      stock: Number(o.stock || o['@_available'] === 'true' ? 1 : 0) || 0,
      weight: Number(o.weight || 0.5),
      description: o.description || '',
      sku: o.vendorCode || null,
      externalId: o['@_id'] || null,
      category: o.categoryId ? catMap[String(o.categoryId)] : null,
      brand: o.vendor || null,
      images
    };
  }).filter(x => x.name && x.price);
}

// ─── Парсер XLSX / CSV ───
function parseXlsx(filePath, marketplace) {
  const wb = XLSX.readFile(filePath);
  const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
  return rows.map(r => {
    const name = r.name || r['Наименование'] || r['Название'];
    const price = Number(r.price || r['Цена']);
    if (!name || !price) return null;
    return {
      name,
      price,
      oldPrice: r.old_price ? Number(r.old_price) : (r['Цена до скидки'] ? Number(r['Цена до скидки']) : null),
      stock: Number(r.stock || r['Остаток'] || 0),
      weight: Number(r.weight || r['Вес'] || 0.5),
      description: r.description || r['Описание'] || '',
      sku: r.sku || r['Артикул'] || r['Артикул продавца'] || null,
      externalId: r.external_id || null,
      category: r.category || r['Категория'] || null,
      brand: r.brand || r['Бренд'] || null,
      images: (r.images || r['Изображения'] || '').toString().split(',').map(s => s.trim()).filter(Boolean)
    };
  }).filter(Boolean);
}

// ─── Основная функция импорта ───
async function importFile(filePath, originalName, options = {}) {
  const ext = path.extname(originalName).toLowerCase();
  const marketplace = options.marketplace || 'generic';
  const strategy = options.strategy || 'merge';

  // Парсинг
  let items = [];
  if (ext === '.yml' || ext === '.yaml') items = parseYml(filePath, marketplace);
  else if (ext === '.xml') items = parseYml(filePath, marketplace); // тот же формат
  else if (ext === '.xlsx' || ext === '.xls') items = parseXlsx(filePath, marketplace);
  else if (ext === '.csv') {
    // CSV через тот же xlsx-парсер
    const wb = XLSX.readFile(filePath);
    const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, raw: false });
    if (rows.length > 1) {
      const headers = rows[0];
      const list = rows.slice(1).map(r => {
        const obj = {};
        headers.forEach((h, i) => { obj[h] = r[i]; });
        return obj;
      });
      const tmp = XLSX.utils.json_to_sheet(list);
      const tmpWb = { SheetNames: ['x'], Sheets: { x: tmp } };
      const buf = XLSX.write(tmpWb, { type: 'buffer', bookType: 'xlsx' });
      const tmpFile = filePath + '.tmp.xlsx';
      fs.writeFileSync(tmpFile, buf);
      items = parseXlsx(tmpFile, marketplace);
      fs.unlinkSync(tmpFile);
    }
  } else {
    throw new Error('Неподдерживаемый формат: ' + ext);
  }

  // Обрабатываем
  const stats = {
    marketplace, strategy, format: ext.replace('.', ''),
    total: items.length,
    created: 0, updated: 0, skipped: 0, errors: 0,
    details: []
  };

  for (const item of items) {
    const result = await processItem(item, { marketplace, strategy });
    if (result.action === 'created') stats.created++;
    else if (result.action === 'updated') stats.updated++;
    else if (result.action === 'skipped') stats.skipped++;
    else if (result.action === 'error') stats.errors++;

    stats.details.push({
      name: item.name,
      sku: item.sku,
      action: result.action,
      error: result.error || null
    });
  }

  return stats;
}

module.exports = { importFile, findExistingProduct };
