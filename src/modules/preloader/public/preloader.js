/* PULSUN — управление прелоадером */
(function () {
  var el = document.getElementById('shopPreloader');
  if (!el) return;

  var minDuration = parseInt(el.getAttribute('data-duration') || '600', 10);
  var shownAt = Date.now();

  function hide() {
    var elapsed = Date.now() - shownAt;
    var wait = Math.max(0, minDuration - elapsed);
    setTimeout(function () {
      el.classList.add('is-hidden');
      setTimeout(function () {
        if (el.parentNode) el.parentNode.removeChild(el);
      }, 500);
    }, wait);
  }

  if (document.readyState === 'complete') {
    hide();
  } else {
    window.addEventListener('load', hide, { once: true });
    // Фолбэк — если load не сработал за 4 сек
    setTimeout(hide, 4000);
  }
})();
