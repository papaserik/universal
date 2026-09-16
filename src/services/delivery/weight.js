const { getSetting } = require('../settings');
exports.title = 'По весу';
exports.calculate = async (cart) => {
  const perKg = Number(await getSetting('delivery_per_kg', '100'));
  const weight = cart.reduce((s, i) => s + (i.weight || 0.5) * i.qty, 0);
  return { cost: Math.round(weight * perKg), weight };
};
