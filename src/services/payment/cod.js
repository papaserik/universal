exports.title = 'Оплата при получении';
exports.enabled = async () => true;
exports.create = async (order) => ({ redirect: '/checkout/success?order=' + order.number });
