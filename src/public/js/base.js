(function () {
  'use strict';

  // ---------- Утилиты ----------
  function setCartCount(n) {
    document.querySelectorAll('.js-cart-count').forEach(el => { el.textContent = n; });
  }

  async function postJSON(url, data) {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    try { return await res.json(); } catch (e) { return { ok: false }; }
  }

  // ---------- Добавление в корзину ----------
  document.addEventListener('submit', async (e) => {
    const form = e.target.closest('.add-form');
    if (!form) return;
    e.preventDefault();

    const productId = form.dataset.product;
    const qtyInput = form.querySelector('input[name="qty"]');
    const qty = qtyInput ? Math.max(1, Number(qtyInput.value) || 1) : 1;

    const data = await postJSON('/cart/add', { productId, qty });
    if (data && data.ok) {
      setCartCount(data.count);
      const btn = form.querySelector('button[type="submit"]');
      if (btn) {
        const old = btn.textContent;
        btn.textContent = '✓ Добавлено';
        btn.disabled = true;
        setTimeout(() => { btn.textContent = old; btn.disabled = false; }, 900);
      }
    }
  });

  // ---------- Изменение количества в корзине ----------
  document.addEventListener('change', async (e) => {
    const form = e.target.closest('.update-form');
    if (!form) return;
    const data = await postJSON('/cart/update', {
      productId: form.dataset.product,
      qty: form.querySelector('.qty').value
    });
    if (data && data.ok) setCartCount(data.count);
    location.reload();
  });

  // ---------- Удаление из корзины ----------
  document.addEventListener('click', async (e) => {
    if (!e.target.classList.contains('remove-btn')) return;
    const data = await postJSON('/cart/remove', { productId: e.target.dataset.product });
    if (data && data.ok) setCartCount(data.count);
    location.reload();
  });

  // ---------- Качелька количества ----------
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('.qty-dec, .qty-inc');
    if (!btn) return;
    e.preventDefault();
    const wrap = btn.closest('.qty-wrap');
    const input = wrap.querySelector('input[name="qty"], .qty');
    const min = Number(input.min) || 1;
    let v = Number(input.value) || 1;
    if (btn.classList.contains('qty-inc')) v++;
    else v = Math.max(min, v - 1);
    input.value = v;
    input.dispatchEvent(new Event('change', { bubbles: true }));
  });

  // ---------- Автоприменение фильтров ----------
  const filtersForm = document.querySelector('.filters form');
  if (filtersForm) {
    let debounceTimer = null;
    const submit = () => filtersForm.submit();
    filtersForm.querySelectorAll('input[type="checkbox"], input[type="radio"], select').forEach(el => {
      el.addEventListener('change', submit);
    });
    filtersForm.querySelectorAll('input[type="number"], input[type="text"]').forEach(el => {
      el.addEventListener('input', () => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(submit, 600);
      });
    });
  }

  // ---------- Галерея в карточке товара ----------
  const gallery = document.querySelector('[data-gallery]');
  if (gallery) {
    const imgs = JSON.parse(gallery.dataset.gallery || '[]');
    if (imgs.length) {
      let idx = 0;
      const mainImg = gallery.querySelector('.gallery-main img');
      const counter = gallery.querySelector('.gallery-counter');
      const thumbs = gallery.querySelectorAll('.thumbs img');

      function show(i) {
        idx = (i + imgs.length) % imgs.length;
        mainImg.src = imgs[idx];
        if (counter) counter.textContent = (idx + 1) + ' / ' + imgs.length;
        thumbs.forEach((t, k) => t.classList.toggle('active', k === idx));
      }

      gallery.querySelector('.gallery-prev')?.addEventListener('click', () => show(idx - 1));
      gallery.querySelector('.gallery-next')?.addEventListener('click', () => show(idx + 1));
      thumbs.forEach((t, k) => t.addEventListener('click', () => show(k)));

      // Свайп
      let startX = 0, moved = false;
      const main = gallery.querySelector('.gallery-main');
      main.addEventListener('touchstart', (e) => { startX = e.touches[0].clientX; moved = false; }, { passive: true });
      main.addEventListener('touchmove',  () => { moved = true; }, { passive: true });
      main.addEventListener('touchend',   (e) => {
        if (!moved) return;
        const dx = e.changedTouches[0].clientX - startX;
        if (Math.abs(dx) > 40) show(dx < 0 ? idx + 1 : idx - 1);
      });

      // Модалка с увеличенным
      const modal = document.querySelector('#image-modal');
      if (modal) {
        const modalImg = modal.querySelector('img');
        main.addEventListener('click', () => {
          modalImg.src = imgs[idx];
          modal.classList.add('open');
        });
        modal.addEventListener('click', (e) => {
          if (e.target === modal || e.target.classList.contains('modal-close')) {
            modal.classList.remove('open');
          }
        });
        document.addEventListener('keydown', (e) => {
          if (!modal.classList.contains('open')) return;
          if (e.key === 'Escape') modal.classList.remove('open');
          if (e.key === 'ArrowLeft') { show(idx - 1); modalImg.src = imgs[idx]; }
          if (e.key === 'ArrowRight') { show(idx + 1); modalImg.src = imgs[idx]; }
        });
      }
    }
  }
})();
