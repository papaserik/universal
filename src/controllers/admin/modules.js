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

  // Синхронизируем старые ключи для совместимости
  const { setSetting: ss } = require('../../services/settings');
  await ss('loyalty_enabled', enabledArr.includes('loyalty') ? '1' : '0');
  await ss('referral_enabled', enabledArr.includes('club') ? '1' : '0');

  res.redirect('/admin/modules?saved=1');
};
