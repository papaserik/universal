const flat   = require('./flat');
const weight = require('./weight');
const providers = { flat, weight };
async function calculate(method, cart, opts = {}) {
  const p = providers[method] || flat;
  return p.calculate(cart, opts);
}
async function list() {
  return Object.entries(providers).map(([code, p]) => ({ code, title: p.title }));
}
module.exports = { calculate, list };
