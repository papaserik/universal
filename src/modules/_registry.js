const fs = require('fs');
const path = require('path');
const { prisma } = require('../config/db');

const MODULES_DIR = __dirname;

// Кеш состояния модулей
let cache = null;
let cacheTime = 0;
const CACHE_TTL = 30 * 1000;

/**
 * Сканирует папку modules/ и собирает список всех модулей.
 * Каждый модуль = папка с файлом module.json
 */
function scan() {
  const dirs = fs.readdirSync(MODULES_DIR, { withFileTypes: true })
    .filter(d => d.isDirectory() && !d.name.startsWith('_'))
    .map(d => d.name);

  const modules = [];
  for (const name of dirs) {
    const metaPath = path.join(MODULES_DIR, name, 'module.json');
    if (!fs.existsSync(metaPath)) continue;

    try {
      const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
      // Обязательные поля
      if (!meta.code) meta.code = name;
      if (!meta.name) meta.name = name;
      if (!meta.group) meta.group = 'other';

      meta._path = path.join(MODULES_DIR, name);
      meta._dir = name;
      modules.push(meta);
    } catch (e) {
      console.error('[modules] Ошибка чтения ' + name + '/module.json:', e.message);
    }
  }
  return modules;
}

/**
 * Возвращает список модулей с флагом enabled
 */
async function loadAll() {
  const now = Date.now();
  if (cache && (now - cacheTime) < CACHE_TTL) return cache;

  const modules = scan();
  const settings = await prisma.setting.findMany({
    where: { key: { startsWith: 'module_' } }
  });

  const state = {};
  for (const m of modules) {
    const s = settings.find(x => x.key === 'module_' + m.code);
    state[m.code] = s ? s.value === '1' : (m.default !== false);
  }
  cache = { modules, state };
  cacheTime = now;
  return cache;
}

/**
 * Проверка, включён ли модуль
 */
async function isEnabled(code) {
  const { state } = await loadAll();
  return state[code] !== false;
}

/**
 * Возвращает карту: code → true/false
 */
async function getState() {
  const { state } = await loadAll();
  return state;
}

/**
 * Возвращает массив модулей с флагом enabled (для админки)
 */
async function listWithState() {
  const { modules, state } = await loadAll();
  return modules.map(m => ({ ...m, enabled: state[m.code] !== false }));
}

/**
 * Загрузка главного файла модуля (index.js)
 */
function loadModule(name) {
  const modulePath = path.join(MODULES_DIR, name, 'index.js');
  if (!fs.existsSync(modulePath)) return null;
  try {
    return require(modulePath);
  } catch (e) {
    console.error('[modules] Ошибка загрузки ' + name + ':', e.message);
    return null;
  }
}

function invalidate() {
  cache = null;
  cacheTime = 0;
}

module.exports = {
  scan,
  loadAll,
  isEnabled,
  getState,
  listWithState,
  loadModule,
  invalidate
};
