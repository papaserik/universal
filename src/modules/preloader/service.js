const { prisma } = require('../../config/db');

const KEYS = {
  bg:        'preloader_bg',
  accent:    'preloader_accent',
  text:      'preloader_text',
  textColor: 'preloader_text_color',
  style:     'preloader_style',
  duration:  'preloader_duration',
};

const DEFAULTS = {
  bg:        '#FAF4EB',
  accent:    '#B8935A',
  text:      'PULSUN',
  textColor: '#2A1A0F',
  style:     'logo-dots',
  duration:  600,
};

async function getSettings() {
  const rows = await prisma.setting.findMany({
    where: { key: { in: Object.values(KEYS) } }
  });
  const map = {};
  rows.forEach(r => { map[r.key] = r.value; });

  return {
    enabled:   true,
    bg:        map[KEYS.bg]        || DEFAULTS.bg,
    accent:    map[KEYS.accent]    || DEFAULTS.accent,
    text:      map[KEYS.text]      || DEFAULTS.text,
    textColor: map[KEYS.textColor] || DEFAULTS.textColor,
    style:     map[KEYS.style]     || DEFAULTS.style,
    duration:  parseInt(map[KEYS.duration], 10) || DEFAULTS.duration,
  };
}

async function saveSettings(data) {
  const updates = [
    [KEYS.bg,        data.bg],
    [KEYS.accent,    data.accent],
    [KEYS.text,      data.text],
    [KEYS.textColor, data.textColor],
    [KEYS.style,     data.style],
    [KEYS.duration,  data.duration],
  ];
  for (const [key, value] of updates) {
    await prisma.setting.upsert({
      where:  { key },
      update: { value: String(value ?? '') },
      create: { key, value: String(value ?? '') },
    });
  }
}

module.exports = { getSettings, saveSettings, DEFAULTS, KEYS };
