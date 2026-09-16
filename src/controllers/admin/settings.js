const { getAllSettings, setSetting } = require('../../services/settings');
const { listThemes } = require('../../services/theme');

const GROUPS = [
  { title: 'Общие', fields: [
    { key: 'site_name', label: 'Название сайта' },
    { key: 'phone', label: 'Телефон' },
    { key: 'email', label: 'Email' },
    { key: 'address', label: 'Адрес' }
  ]},
  { title: 'Оформление', fields: [
    { key: 'active_theme', label: 'Активная тема', type: 'theme' }
  ]},
  { title: 'Доставка', fields: [
    { key: 'delivery_flat_cost', label: 'Фиксированная стоимость доставки, ₽' },
    { key: 'delivery_free_from', label: 'Бесплатная доставка от, ₽' },
    { key: 'delivery_per_kg', label: 'Цена за кг, ₽' }
  ]},
  { title: 'Оплата — Stripe', fields: [
    { key: 'stripe_secret', label: 'Stripe Secret Key', type: 'password' }
  ]},
  { title: 'Оплата — ЮKassa', fields: [
    { key: 'yookassa_shop_id', label: 'Shop ID' },
    { key: 'yookassa_secret', label: 'Secret Key', type: 'password' }
  ]},
  { title: 'Аналитика и счётчики', fields: [
    { key: 'ga_id', label: 'Google Analytics ID (G-XXXX)' },
    { key: 'metrika_id', label: 'Яндекс.Метрика ID' }
  ]},
  { title: 'Произвольный код (вставляется на всех страницах)', fields: [
    { key: 'custom_head', label: 'HTML в <head>', type: 'textarea' },
    { key: 'custom_body', label: 'HTML перед </body>', type: 'textarea' }
  ]}
];

exports.form = async (req, res) => {
  const values = await getAllSettings();
  const themes = listThemes();
  res.render('admin/settings/form', { groups: GROUPS, values, themes, saved: req.query.saved === '1' });
};

exports.save = async (req, res) => {
  for (const [key, value] of Object.entries(req.body)) {
    if (typeof value === 'string') await setSetting(key, value);
  }
  res.redirect('/admin/settings?saved=1');
};
