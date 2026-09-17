# Создание модуля в Universal Shop

## Структура

src/modules/NAME/
├── module.json          # метаданные: code, name, desc, icon, group, default
├── index.js             # экспорт: meta, service, adminRoutes, apiRoutes, publicRoutes, viewsPath, publicPath, staticUrl
├── controller-admin/    # админ-контроллеры
├── controller-public/   # публичные контроллеры (если нужно)
├── service/             # бизнес-логика
│   └── api/             # вложенные сервисы (по необходимости)
├── routes/
│   ├── admin.js         # router.use / router.get / router.post
│   ├── api.js           # /api/* (опционально)
│   └── public.js        # публичные страницы (опционально)
├── views/               # EJS-шаблоны модуля
└── public/              # статика → раздаётся на /modules/NAME/*

## module.json

{
  "code": "newsletter",
  "name": "Рассылки",
  "desc": "Подписка, email-рассылки, экспорт подписчиков",
  "icon": "📧",
  "group": "marketing",     // system | content | marketing | other
  "default": true           // включён по умолчанию
}

## index.js — эталон

const path = require('path');
module.exports = {
  meta:        require('./module.json'),
  service:     require('./service'),           // опционально
  adminRoutes: require('./routes/admin'),      // монтируется на /admin
  apiRoutes:   require('./routes/api'),        // опционально
  publicRoutes: require('./routes/public'),    // опционально
  viewsPath:   path.join(__dirname, 'views'),
  publicPath:  path.join(__dirname, 'public'),
  staticUrl:   '/modules/NAME'
};

## Правила require (важно!)

| Файл находится в...                            | require до config/db         |
|------------------------------------------------|------------------------------|
| src/modules/NAME/                              | ../../config/db              |
| src/modules/NAME/controller-admin/             | ../../../config/db           |
| src/modules/NAME/service/                      | ../../../config/db           |
| src/modules/NAME/service/api/                  | ../../../../config/db        |
| src/modules/NAME/routes/                       | ../../../config/db           |
| src/modules/NAME/views/                        | (не применимо)               |

## Монтирование admin-роутов

В `src/routes/admin.js` добавить одну строку рядом с другими модульными роутерами:

router.use(require('../modules/NAME/routes/admin'));

Файл `src/modules/NAME/routes/admin.js` ОБЯЗАН заканчиваться:

module.exports = router;

## Views

- Модуль кладёт views в `src/modules/NAME/views/`.
- app.js добавляет этот путь в EJS root — модуль может рендерить просто:
  `res.render('subfolder/template', { ... })`
- НЕ используй префикс `admin/` в render-путях модуля — только имя папки внутри views модуля.

## Чек-лист переноса

1. `mkdir -p` структура
2. `git mv` файлов (сохраняет историю)
3. Пересчитать **все** relative require в перемещённых файлах
4. Поправить `res.render('admin/...')` → `res.render('...')`
5. Создать `module.json` и `index.js`
6. В `src/routes/admin.js`:
   - вырезать блок роутов модуля
   - удалить require контроллера
   - добавить `router.use(require('../modules/NAME/routes/admin'))`
7. `node -e "require('./src/app'); console.log('APP OK')"`
8. Перезапуск + curl всех маршрутов
9. Коммит: `refactor: move NAME module`
