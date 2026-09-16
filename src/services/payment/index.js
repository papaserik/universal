const cod      = require('./cod');
const stripe   = require('./stripe');
const yookassa = require('./yookassa');
const providers = { cod, stripe, yookassa };
async function list() {
  const out = [];
  for (const [code, p] of Object.entries(providers)) {
    if (await p.enabled()) out.push({ code, title: p.title });
  }
  return out;
}
async function createPayment(order, code) {
  const p = providers[code] || cod;
  return p.create(order);
}
module.exports = { list, createPayment, get: c => providers[c] };
