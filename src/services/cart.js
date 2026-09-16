function getCart(req) {
  return req.session.cart || (req.session.cart = []);
}
function addToCart(req, product, qty = 1) {
  const cart = getCart(req);
  const item = cart.find(i => i.productId === product.id);
  if (item) item.qty += qty;
  else cart.push({
    productId: product.id, slug: product.slug, name: product.name,
    price: product.price, image: (JSON.parse(product.images || '[]')[0]) || null, qty
  });
}
function updateQty(req, productId, qty) {
  const item = getCart(req).find(i => i.productId === productId);
  if (item) item.qty = Math.max(1, qty);
}
function removeFromCart(req, productId) {
  req.session.cart = getCart(req).filter(i => i.productId !== productId);
}
function cartTotal(cart) {
  return cart.reduce((s, i) => s + i.price * i.qty, 0);
}
module.exports = { getCart, addToCart, updateQty, removeFromCart, cartTotal };
