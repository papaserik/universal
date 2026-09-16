const { getAllSettings, setSetting } = require('../../services/settings');
const { listThemes } = require('../../services/theme');

const SECTIONS = [
  {
    id: 'general', icon: '⚙️', title: 'Общие',
    desc: 'Название магазина, контакты, адрес — то, что видно покупателю в шапке и футере.',
    fields: [
      { key: 'site_name', label: 'Название сайта' },
      { key: 'phone', label: 'Телефон' },
      { key: 'email', label: 'Email' },
      { key: 'address', label: 'Адрес' }
    ]
  },
  {
    id: 'theme', icon: '🎨', title: 'Оформление',
    desc: 'Какая тема используется на витрине. Переключение — мгновенное.',
    fields: [
      { key: 'active_theme', label: 'Активная тема', type: 'theme' }
    ]
  },
  {
    id: 'orders', icon: '🛒', title: 'Заказы',
    desc: 'Куда приходят уведомления о новых заказах. Если пусто — используется основной Email.',
    fields: [
      { key: 'order_notify_email', label: 'Email для уведомлений о заказах' }
    ]
  },
  {
    id: 'delivery', icon: '🚚', title: 'Доставка',
    desc: 'Стоимость доставки и порог бесплатной доставки. Порог 0 — отключить бесплатную доставку.',
    fields: [
      { key: 'delivery_flat_cost', label: 'Фиксированная стоимость, ₽' },
      { key: 'delivery_free_from', label: 'Бесплатная доставка от, ₽' },
      { key: 'delivery_per_kg', label: 'Цена за кг (для расчёта по весу), ₽' }
    ]
  },
  {
    id: 'payment', icon: '💳', title: 'Оплата',
    desc: 'Ключи платёжных систем. Оплата при получении работает без настроек.',
    fields: [
      { key: 'stripe_secret', label: 'Stripe Secret Key', type: 'password' },
      { key: 'yookassa_shop_id', label: 'ЮKassa Shop ID' },
      { key: 'yookassa_secret', label: 'ЮKassa Secret Key', type: 'password' }
    ]
  },
  {
    id: 'mail', icon: '✉️', title: 'Почта (SMTP)',
    desc: 'Настройки отправки писем клиентам и админу. Если не заполнено — письма пропускаются.',
    fields: [
      { key: 'smtp_host', label: 'SMTP-хост', placeholder: 'smtp.yandex.ru' },
      { key: 'smtp_port', label: 'Порт', placeholder: '587 / 465' },
      { key: 'smtp_user', label: 'Логин' },
      { key: 'smtp_pass', label: 'Пароль', type: 'password' },
      { key: 'smtp_from', label: 'Адрес отправителя', placeholder: 'Магазин <shop@example.com>' },
      { key: 'smtp_secure', label: 'SSL (для порта 465)', type: 'checkbox' }
    ]
  },
  {
    id: 'marketplaces', icon: '🏪', title: 'Маркетплейсы',
    desc: 'Список маркетплейсов в JSON-формате. Используется в форме товара. Формат: [{"name":"Ozon","slug":"ozon"}]',
    fields: [
      { key: 'marketplaces', label: 'Список маркетплейсов (JSON)', type: 'textarea' }
    ]
  },
  {
    id: 'contacts', icon: '🗺️', title: 'Карта на контактах',
    desc: 'Вставьте HTML-код карты из Яндекс.Карт, Google Maps или 2ГИС (iframe-код «Поделиться» → «Встроить»).',
    fields: [
      { key: 'contacts_map', label: 'HTML карты', type: 'textarea' }
    ]
  },
  {
    id: 'analytics', icon: '📊', title: 'Счётчики и аналитика',
    desc: 'ID счётчиков. Google Analytics и Яндекс.Метрика подключатся автоматически.',
    fields: [
      { key: 'ga_id', label: 'Google Analytics ID', placeholder: 'G-XXXXXXXXXX' },
      { key: 'metrika_id', label: 'Яндекс.Метрика ID', placeholder: '12345678' }
    ]
  },
  {
    id: 'custom', icon: '</>', title: 'Произвольный код',
    desc: 'HTML/JS вставляется на всех страницах сайта. Для сторонних виджетов, чатов, пикселей.',
    fields: [
      { key: 'custom_head', label: 'HTML в <head>', type: 'textarea' },
      { key: 'custom_body', label: 'HTML перед </body>', type: 'textarea' }
    ]
  }
];

exports.form = async (req, res) => {
  const values = await getAllSettings();
  const themes = listThemes();
  res.render('admin/settings/form', {
    sections: SECTIONS, values, themes, saved: req.query.saved === '1'
  });
};

exports.save = async (req, res) => {
  for (const section of SECTIONS) {
    for (const field of section.fields) {
      if (field.type === 'checkbox') {
        await setSetting(field.key, req.body[field.key] ? '1' : '0');
      } else if (req.body[field.key] !== undefined) {
        await setSetting(field.key, req.body[field.key]);
      }
    }
  }
  res.redirect('/admin/settings?saved=1');
};
