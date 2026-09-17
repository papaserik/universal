const modules = require('../../services/modules');
const { setSetting } = require('../../services/settings');

exports.index = async (req, res) => {
  const all = await modules.listWithState();

  // Группируем
  const groups = {};
  for (const m of all) {
    if (!groups[m.group]) groups[m.group] = [];
    groups[m.group].push(m);
  }

  const groupMeta = {
    catalog:   { title: '📦 Каталог',     desc: 'Всё, что связано с товарами и их отображением' },
    content:   { title: '📝 Контент',     desc: 'Блог, баннеры, страницы' },
    marketing: { title: '📣 Маркетинг',   desc: 'Программы лояльности, клуб, рассылки' },
    customer:  { title: '🛍️ Для покупателя', desc: 'Удобство и сервис на витрине' },
    system:    { title: '⚙️ Система',     desc: 'Внутренние улучшения' }
  };

  res.render('admin/modules/index', {
    groups,
    groupMeta,
    saved: req.query.saved === '1'
  });
};

exports.save = async (req, res) => {
  const all = modules.MODULES;
  const enabled = req.body.modules || [];
  const enabledArr = Array.isArray(enabled) ? enabled : [enabled];

  for (const m of all) {
    const val = enabledArr.includes(m.code) ? '1' : '0';
    await setSetting('module_' + m.code, val);
  }

  modules.invalidate();

  // cache-sync: сброс HTML-кеша публичных страниц — иначе баннеры/товары
  // остаются в старом HTML до истечения TTL
  try {
    const cache = require('../modules/cache');
    if (cache && typeof cache.invalidate === 'function') await cache.invalidate();
    if (cache && typeof cache.clear === 'function')      await cache.clear();
    if (cache && cache.service && typeof cache.service.invalidate === 'function') await cache.service.invalidate();
    if (cache && cache.service && typeof cache.service.clear === 'function')      await cache.service.clear();
    // если кеш использует файловое хранилище
    const fs = require('fs');
    const path = require('path');
    const cacheDir = path.join(__dirname, '..', '..', 'tmp', 'cache');
    if (fs.existsSync(cacheDir)) {
      fs.readdirSync(cacheDir).forEach(f => { try { fs.unlinkSync(path.join(cacheDir, f)); } catch(e){} });
    }
  } catch (e) {
    console.error('[modules.save] cache.invalidate failed:', e.message);
  }

  // Синхронизируем старые ключи для совместимости
  const { setSetting: ss } = require('../../services/settings');
  await ss('loyalty_enabled', enabledArr.includes('loyalty') ? '1' : '0');
  await ss('referral_enabled', enabledArr.includes('club') ? '1' : '0');

  res.redirect('/admin/modules?saved=1');
};
