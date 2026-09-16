document.addEventListener('submit', async (e) => {
  const form = e.target.closest('.add-form');
  if (!form) return;
  e.preventDefault();
  const productId = form.dataset.product;
  const qty = form.querySelector('.qty') ? form.querySelector('.qty').value : 1;
  const res = await fetch('/cart/add', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ productId, qty })
  });
  const data = await res.json();
  if (data.ok) {
    const cartLink = document.querySelector('.nav a[href="/cart"]');
    if (cartLink) cartLink.textContent = 'Корзина (' + data.count + ')';
    const btn = form.querySelector('button');
    if (btn) {
      const old = btn.textContent;
      btn.textContent = '✓ Добавлено';
      setTimeout(() => { btn.textContent = old; }, 1200);
    }
  }
});

document.addEventListener('change', async (e) => {
  const form = e.target.closest('.update-form');
  if (!form) return;
  await fetch('/cart/update', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ productId: form.dataset.product, qty: form.querySelector('.qty').value })
  });
  location.reload();
});

document.addEventListener('click', async (e) => {
  if (!e.target.classList.contains('remove-btn')) return;
  const id = e.target.dataset.product;
  await fetch('/cart/remove', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ productId: id })
  });
  location.reload();
});
