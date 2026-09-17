const access = require('../access');

const BASE = 'https://api-seller.ozon.ru';

// ─── Базовый запрос к Ozon Seller API ───
async function call(method, endpoint, body) {
  const a = await access.hasApiAccess('ozon');
  if (!a.ok) throw new Error('Ozon API не настроен: ' + a.missing.join(', '));

  const config = a.config;
  const url = BASE + endpoint;

  const res = await fetch(url, {
    method,
    headers: {
      'Client-Id': config.clientId,
      'Api-Key': config.apiKey,
      'Content-Type': 'application/json'
    },
    body: body ? JSON.stringify(body) : undefined
  });

  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch (e) { data = text; }

  if (!res.ok) {
    const msg = (data && data.message) || (typeof data === 'string' ? data : JSON.stringify(data));
    throw new Error('Ozon API ' + res.status + ': ' + msg);
  }
  return data;
}

// ─── Тест подключения ───
async function testConnection() {
  try {
    // Простой запрос — список категорий или информация о лимитах
    const result = await call('POST', '/v1/description-category/tree', { language: 'RU' });
    return { ok: true, categories: (result.result || []).length };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

// ─── Получить список заказов (FBS) ───
async function getOrders(since, to = new Date()) {
  const a = await access.hasApiAccess('ozon');
  if (!a.ok) return [];

  const sinceStr = since.toISOString();
  const toStr = to.toISOString();

  const result = await call('POST', '/v3/posting/fbs/list', {
    dir: 'DESC',
    filter: {
      since: sinceStr,
      to: toStr
    },
    limit: 100,
    offset: 0,
    with: { analytics_data: true, financial_data: true }
  });

  return (result.result && result.result.postings) || [];
}

// ─── Получить детали заказа ───
async function getOrderDetails(postingNumber) {
  const result = await call('POST', '/v3/posting/fbs/get', {
    posting_number: postingNumber,
    with: { analytics_data: true, financial_data: true }
  });
  return result.result;
}

// ─── Обновить остатки (FBS) ───
async function updateStocks(items) {
  // items: [{ offer_id, stock, warehouse_id }]
  const a = await access.hasApiAccess('ozon');
  if (!a.ok) return { ok: false, error: 'API не настроен' };

  const warehouseId = a.config.warehouseId;
  if (!warehouseId) return { ok: false, error: 'Warehouse ID не задан' };

  const stocks = items.map(i => ({
    offer_id: String(i.offer_id),
    stock: Number(i.stock) || 0,
    warehouse_id: Number(warehouseId)
  }));

  try {
    const result = await call('POST', '/v2/products/stocks', { stocks });
    return { ok: true, result };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

// ─── Обновить цены ───
async function updatePrices(items) {
  // items: [{ offer_id, price, old_price }]
  const a = await access.hasApiAccess('ozon');
  if (!a.ok) return { ok: false, error: 'API не настроен' };

  const prices = items.map(i => ({
    offer_id: String(i.offer_id),
    price: String(i.price),
    old_price: i.old_price ? String(i.old_price) : '0',
    currency_code: 'RUB'
  }));

  try {
    const result = await call('POST', '/v1/product/import/prices', { prices });
    return { ok: true, result };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

module.exports = { call, testConnection, getOrders, getOrderDetails, updateStocks, updatePrices };
