(function () {
  'use strict';

  var favIds = new Set();

  function updateHeaderCount(count) {
    // Все счётчики в шапке (мобильная + десктопная + меню)
    document.querySelectorAll('.js-favorites-count').forEach(function (el) {
      if (count > 0) {
        el.textContent = count;
        el.hidden = false;
      } else {
        el.hidden = true;
      }
    });
  }

  function updateMenuCount(count) {
    document.querySelectorAll('.js-favorites-count-menu').forEach(function (el) {
      if (count > 0) {
        el.textContent = count;
        el.hidden = false;
      } else {
        el.hidden = true;
      }
    });
  }

  function updateAllButtons() {
    document.querySelectorAll('[data-fav-id]').forEach(function (btn) {
      var id = Number(btn.dataset.favId);
      if (favIds.has(id)) {
        btn.classList.add('active');
        btn.setAttribute('title', 'Убрать из избранного');
      } else {
        btn.classList.remove('active');
        btn.setAttribute('title', 'В избранное');
      }
    });
  }

  function loadFavorites() {
    return fetch('/api/favorites/ids')
      .then(function (r) { return r.json(); })
      .then(function (d) {
        if (d && d.ok && Array.isArray(d.ids)) {
          d.ids.forEach(function (id) { favIds.add(Number(id)); });
          updateHeaderCount(d.ids.length);
          updateMenuCount(d.ids.length);
        }
        updateAllButtons();
      })
      .catch(function () {});
  }

  document.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-fav-id]');
    if (!btn) return;
    e.preventDefault();

    var id = Number(btn.dataset.favId);
    btn.classList.add('loading');

    fetch('/api/favorites/toggle', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productId: id })
    })
      .then(function (r) { return r.json(); })
      .then(function (d) {
        btn.classList.remove('loading');

        if (!d.ok) {
          if (d.needAuth) {
            if (confirm('Войдите в аккаунт, чтобы добавлять товары в избранное. Перейти на страницу входа?')) {
              location.href = '/login';
            }
          } else {
            alert(d.error || 'Ошибка');
          }
          return;
        }

        // Обновляем счётчики в шапке и меню
        updateHeaderCount(d.count);
        updateMenuCount(d.count);

        if (d.isFavorite) {
          favIds.add(id);
          btn.classList.add('active');
          btn.classList.add('pop');
          setTimeout(function () { btn.classList.remove('pop'); }, 400);
        } else {
          favIds.delete(id);
          btn.classList.remove('active');
        }
      })
      .catch(function () {
        btn.classList.remove('loading');
      });
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadFavorites);
  } else {
    loadFavorites();
  }
})();
