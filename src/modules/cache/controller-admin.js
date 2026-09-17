const cache = require('./service');
const { getAllSettings, setSetting } = require('../../services/settings');

exports.index = async (req, res) => {
  const values = await getAllSettings();
  const stats = cache.getStats();

  res.render('admin/cache/index', {
    values,
    stats,
    saved: req.query.saved === '1',
    cleared: req.query.cleared === '1'
  });
};

exports.save = async (req, res) => {
  const keys = ['cache_pages_enabled', 'cache_pages_ttl', 'cache_settings_ttl', 'cache_busting_enabled'];

  for (const key of keys) {
    if (key === 'cache_busting_enabled' || key === 'cache_pages_enabled') {
      await setSetting(key, req.body[key] ? '1' : '0');
    } else if (req.body[key] !== undefined) {
      await setSetting(key, req.body[key]);
    }
  }

  res.redirect('/admin/cache?saved=1');
};

exports.clear = async (req, res) => {
  cache.clear();
  cache.resetStats();
  res.redirect('/admin/cache?cleared=1');
};

exports.reloadSettings = async (req, res) => {
  // Сброс кеша настроек
  try {
    const { getSetting } = require('../../services/settings');
    const path = require('path');
    // Очищаем кеш настроек (просто перебираем все настройки и обновляем)
    const { prisma } = require('../../config/db');
    const all = await prisma.setting.findMany();
    // Сброс кеша через удаление + запись заново
    cache.clear();
    res.redirect('/admin/cache?cleared=1');
  } catch (e) {
    res.redirect('/admin/cache');
  }
};
