const { getSetting } = require('../settings');
exports.title = 'ЮKassa';
exports.enabled = async () => !!(await getSetting('yookassa_shop_id')) && !!(await getSetting('yookassa_secret'));
exports.create = async (order) => ({ redirect: '/checkout/success?order=' + order.number });
