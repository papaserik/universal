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
    desc: 'Логотип, фавикон и активная тема витрины.',
    fields: [
      { key: 'logo_image', label: 'Логотип — картинка', type: 'image', hint: 'PNG/SVG, высота 40–60 px. Если загружен — показывается вместо текста.' },
      { key: 'logo_text', label: 'Логотип — текст', hint: 'Если картинка не загружена.' },
      { key: 'favicon', label: 'Фавикон', type: 'image', hint: 'ICO или PNG 32×32 / 64×64.' },
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
    id: 'notifications', icon: '🔔', title: 'Уведомления в мессенджеры',
    desc: 'Куда отправлять уведомления о новых заказах: Telegram-бот, WhatsApp. Email настраивается в разделе «Почта».',
    fields: [
      { key: 'telegram_enabled', label: 'Telegram — включить', type: 'checkbox' },
      { key: 'telegram_bot_token', label: 'Telegram Bot Token', placeholder: '123456:ABC-DEF...', hint: 'Получить у @BotFather' },
      { key: 'telegram_chat_id', label: 'Telegram Chat ID', placeholder: '123456789', hint: 'Узнать у @userinfobot' },
      { key: 'whatsapp_enabled', label: 'WhatsApp — включить', type: 'checkbox' },
      { key: 'whatsapp_provider', label: 'WhatsApp провайдер', type: 'select', options: [
        { value: 'webhook', label: 'Webhook URL (Wazzup, Make, n8n, свой сервер)' },
        { value: 'callmebot', label: 'CallMeBot (бесплатно, простой)' }
      ]},
      { key: 'whatsapp_phone', label: 'WhatsApp номер для уведомлений', placeholder: '+79001234567' },
      { key: 'whatsapp_webhook_url', label: 'Webhook URL', placeholder: 'https://...' },
      { key: 'whatsapp_callmebot_apikey', label: 'CallMeBot API-key', placeholder: '123456' },
      { key: 'max_enabled', label: 'MAX — включить', type: 'checkbox' },
      { key: 'max_bot_token', label: 'MAX Bot Token', placeholder: 'access_token бота', hint: 'Получить в @MasterBot в MAX' },
      { key: 'max_chat_id', label: 'MAX Chat ID', placeholder: '123456789', hint: 'ID чата или вашего диалога с ботом' }
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
    id: 'contacts', icon: '🗺️', title: 'Карта на контактах',
    desc: 'Вставьте HTML-код карты из Яндекс.Карт, Google Maps или 2ГИС.',
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
    desc: 'HTML/JS вставляется на всех страницах сайта.',
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
