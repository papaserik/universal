const { getSetting } = require('../settings');
let _client;
async function client() {
  if (_client) return _client;
  const key = await getSetting('stripe_secret');
  if (!key) throw new Error('Stripe не настроен');
  _client = require('stripe')(key);
  return _client;
}
exports.title = 'Stripe';
exports.enabled = async () => !!(await getSetting('stripe_secret'));
exports.create = async (order) => {
  const s = await client();
  const session = await s.checkout.sessions.create({
    mode: 'payment',
    line_items: order.items.map(i => ({
      price_data: { currency: 'rub', product_data: { name: i.name }, unit_amount: Math.round(i.price * 100) },
      quantity: i.qty
    })),
    success_url: (process.env.SITE_URL || 'http://localhost:3000') + '/checkout/success?order=' + order.number,
    cancel_url:  (process.env.SITE_URL || 'http://localhost:3000') + '/checkout/cancel',
    metadata: { orderId: order.id }
  });
  return { redirect: session.url };
};
