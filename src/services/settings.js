const { prisma } = require('../config/db');
const cache = new Map();
async function getSetting(key, def = '') {
  if (cache.has(key)) return cache.get(key);
  const s = await prisma.setting.findUnique({ where: { key } });
  const v = s?.value ?? def; cache.set(key, v); return v;
}
async function setSetting(key, value) {
  await prisma.setting.upsert({ where: { key }, update: { value: String(value ?? '') }, create: { key, value: String(value ?? '') } });
  cache.delete(key);
}
async function getAllSettings() {
  const list = await prisma.setting.findMany();
  return Object.fromEntries(list.map(s => [s.key, s.value]));
}
module.exports = { getSetting, setSetting, getAllSettings };
