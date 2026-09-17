// PULSUN — бургер-меню
(function () {
  var btn = document.querySelector('[data-burger]');
  var menu = document.querySelector('[data-burger-menu]');
  if (!btn || !menu) return;
  btn.addEventListener('click', function () {
    btn.classList.toggle('is-open');
    menu.classList.toggle('is-open');
  });
  menu.querySelectorAll('a').forEach(function (a) {
    a.addEventListener('click', function () {
      btn.classList.remove('is-open');
      menu.classList.remove('is-open');
    });
  });
})();
