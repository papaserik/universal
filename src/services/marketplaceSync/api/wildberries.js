const access = require('../access');

// ─── Базовый запрос к WB API ───
async function call(method, endpoint, body, baseUrl) {
  const a = await access.hasApiAccess('wildberries');
  if (!a.ok) throw new Error('WB API не настроен: ' + a.missing.join(', '));

  const base = baseUrl || 'https://suppliers-api.wildberries.ru';
  const url = base + endpoint;

  const res = await fetch(url, {
    method,
    headers: {
      'Authorization': a.config.apiKey,
      'Content-Type': 'application/json'
    },
    body: body ? JSON.stringify(body) : undefined
  });

  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch (e) { data = text; }

  if (!res.ok) {
    const msg = (data && data.errorText) || (data && data.message) || (typeof data === 'string' ? data : JSON.stringify(data));
    throw new Error('WB API ' + res.status + ': ' + msg);
  }
  return data;
}

// ─── Тест подключения ───
async function testConnection() {
  try {
    // Запрос остатков — простой и безопасный
    const result = await call('GET', '/api/v3/stocks/' + (await getWarehouseId() || 0));
    return { ok: true, stocks: (result.stocks || []).length };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

async function getWarehouseId() {
  const a = await access.hasApiAccess('wildberries');
  return a.ok ? a.config.warehouseId : null;
}

// ─── Получить список заказов (FBS) ───
async function getOrders(since, to = new Date()) {
  // WB: заказы получаем через /api/v3/orders
  const from = since.toISOString();
  const till = to.toISOString();
  const result = await call('GET', '/api/v3/orders?dateFrom=' + encodeURIComponent(from) + '&dateTo=' + encodeURIComponent(till) + '&limit=1000');
  return result.orders || [];
}

// ─── Получить детали заказа ───
async function getOrderDetails(orderId) {
  const result = await call('GET', '/api/v3/orders/' + orderId);
  return result;
}

// ─── Обновить остатки (FBS) ───
async function updateStocks(items) {
  // items: [{ sku (barcode), amount }]
  const warehouseId = await getWarehouseId();
  if (!warehouseId) return { ok: false, error: 'Warehouse ID не задан' };

  const stocks = items.map(i => ({
    sku: String(i.sku || i.barcode),
    amount: Number(i.stock) || 0
  }));

  try {
    const result = await call('PUT', '/api/v3/stocks/' + warehouseId, { stocks });
    return { ok: true, result };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

// ─── Обновить цены ───
async function updatePrices(items) {
  // items: [{ nmID, price, discount }]
  const prices = items.map(i => ({
    nmID: Number(i.nmID),
    price: Number(i.price),
    discount: Number(i.discount) || 0
  }));

  try {
    const result = await call('POST', '/public/api/v1/prices', prices);
    return { ok: true, result };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

module.exports = { call, testConnection, getOrders, getOrderDetails, updateStocks, updatePrices };
