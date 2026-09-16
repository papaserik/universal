(function () {
  'use strict';

  // Загружаем список уже избранных
  var favIds = new Set();
  var loading = true;

  function loadFavorites() {
    return fetch('/api/favorites/ids')
      .then(function (r) { return r.json(); })
      .then(function (d) {
        if (d && d.ok && Array.isArray(d.ids)) {
          d.ids.forEach(function (id) { favIds.add(Number(id)); });
        }
        loading = false;
        updateAllButtons();
      })
      .catch(function () { loading = false; });
  }

  function updateAllButtons() {
    document.querySelectorAll('.fav-btn[data-fav-id]').forEach(function (btn) {
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

  // Клик — toggle
  document.addEventListener('click', function (e) {
    var btn = e.target.closest('.fav-btn');
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

        if (d.isFavorite) {
          favIds.add(id);
          btn.classList.add('active');
          btn.setAttribute('title', 'Убрать из избранного');
          btn.classList.add('pop');
          setTimeout(function () { btn.classList.remove('pop'); }, 400);
        } else {
          favIds.delete(id);
          btn.classList.remove('active');
          btn.setAttribute('title', 'В избранное');
        }
      })
      .catch(function () {
        btn.classList.remove('loading');
      });
  });

  // Запуск после загрузки DOM
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadFavorites);
  } else {
    loadFavorites();
  }
})();
