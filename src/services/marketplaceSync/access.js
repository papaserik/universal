const { prisma } = require('../../config/db');

// Какие поля config нужны для работы с API
const API_FIELDS = {
  ozon:        ['clientId', 'apiKey'],
  wildberries: ['apiKey'],
  yandex:      ['campaignId', 'token'],
  sbermarket:  ['apiKey', 'partnerId']
};

/**
 * Проверяет, доступно ли API интеграции.
 * Возвращает { ok: bool, missing: [], integration }
 */
async function hasApiAccess(slug) {
  const integration = await prisma.marketplaceIntegration.findUnique({
    where: { slug }
  });

  if (!integration) return { ok: false, missing: ['integration'], integration: null };
  if (!integration.enabled) return { ok: false, missing: ['enabled'], integration };

  let config = {};
  try { config = JSON.parse(integration.config || '{}'); } catch (e) {}

  const required = API_FIELDS[slug] || [];
  const missing = required.filter(f => !config[f]);

  return {
    ok: missing.length === 0 && required.length > 0,
    missing,
    integration,
    config
  };
}

/**
 * Возвращает список интеграций, готовых к синхронизации через API.
 */
async function listApiReady() {
  const integrations = await prisma.marketplaceIntegration.findMany({
    where: { enabled: true },
    orderBy: { name: 'asc' }
  });

  const result = [];
  for (const i of integrations) {
    const access = await hasApiAccess(i.slug);
    result.push({
      slug: i.slug,
      name: i.name,
      enabled: i.enabled,
      apiReady: access.ok,
      missing: access.missing,
      direction: i.direction,
      lastSyncAt: i.lastSyncAt,
      lastSyncStatus: i.lastSyncStatus
    });
  }
  return result;
}

module.exports = { hasApiAccess, listApiReady, API_FIELDS };
