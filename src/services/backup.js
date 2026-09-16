const { prisma } = require('../config/db');
const fs = require('fs');
const path = require('path');

// Какие таблицы выгружаем и в каком порядке (важен для импорта)
const TABLES = [
  'setting',
  'user',
  'category',
  'marketplace',
  'option',
  'optionValue',
  'product',
  'productOption',
  'deliveryMethod',
  'paymentMethod',
  'orderStatus',
  'order',
  'orderItem',
  'blogCategory',
  'blogPost',
  'page',
  'menuItem',
  'subscriber',
  'newsletter',
  'newsletterLog',
  'cart',
  'cartItem',
  'review',
  'loyaltyLevel',
  'loyaltyTransaction',
  'loginCode'
];

async function exportAll() {
  const data = {
    meta: {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      tables: TABLES.length
    },
    tables: {}
  };

  for (const t of TABLES) {
    if (!prisma[t]) {
      console.warn('Пропускаю неизвестную модель:', t);
      continue;
    }
    try {
      data.tables[t] = await prisma[t].findMany();
    } catch (e) {
      console.warn('Ошибка выгрузки', t, ':', e.message);
      data.tables[t] = [];
    }
  }

  return data;
}

async function importAll(json, options = {}) {
  const mode = options.mode || 'replace'; // replace | merge
  const stats = {};
  const errors = [];

  if (!json || !json.tables) throw new Error('Неверный формат файла');

  // В merge-режиме очищаем все таблицы перед загрузкой
  if (mode === 'replace') {
    // Удаляем в обратном порядке (сначала зависимые)
    const reversed = [...TABLES].reverse();
    for (const t of reversed) {
      if (!prisma[t]) continue;
      try {
        await prisma[t].deleteMany();
      } catch (e) {
        errors.push(t + ': ' + e.message);
      }
    }
  }

  // Загружаем в прямом порядке
  for (const t of TABLES) {
    if (!prisma[t] || !json.tables[t]) continue;
    const rows = json.tables[t];
    if (!Array.isArray(rows)) continue;

    stats[t] = { total: rows.length, imported: 0, skipped: 0 };

    for (const row of rows) {
      try {
        // Приводим даты
        const cleaned = { ...row };
        for (const key of Object.keys(cleaned)) {
          if (typeof cleaned[key] === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(cleaned[key])) {
            const d = new Date(cleaned[key]);
            if (!isNaN(d.getTime())) cleaned[key] = d;
          }
        }
        if (mode === 'merge') {
          await prisma[t].upsert({
            where: { id: cleaned.id },
            update: cleaned,
            create: cleaned
          });
        } else {
          await prisma[t].create({ data: cleaned });
        }
        stats[t].imported++;
      } catch (e) {
        stats[t].skipped++;
      }
    }
  }

  return { stats, errors };
}

module.exports = { exportAll, importAll, TABLES };
