const { getSetting } = require('../settings');
exports.title = 'Фиксированная стоимость';
exports.calculate = async () => {
  const cost = Number(await getSetting('delivery_flat_cost', '300'));
  const freeFrom = Number(await getSetting('delivery_free_from', '5000'));
  return { cost, freeFrom };
};
