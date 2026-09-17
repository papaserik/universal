(function () {
  'use strict';

  // ─── Регистрация Service Worker ───
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('/modules/pwa/sw.js', { scope: '/' })
        .then(function (reg) {
          console.log('[PWA] SW зарегистрирован:', reg.scope);

          // Проверка обновлений каждые 60 минут
          setInterval(function () {
            reg.update().catch(function () {});
          }, 60 * 60 * 1000);
        })
        .catch(function (err) {
          console.warn('[PWA] SW не зарегистрирован:', err.message);
        });
    });
  }

  // ─── Кастомный баннер «Установить приложение» ───
  var deferredPrompt = null;
  var installBanner = null;

  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault();
    deferredPrompt = e;
    showInstallBanner();
  });

  function showInstallBanner() {
    if (installBanner) return;
    if (localStorage.getItem('pwa-install-dismissed')) return;

    installBanner = document.createElement('div');
    installBanner.className = 'pwa-install-banner';
    installBanner.innerHTML = ''
      + '<div class="pwa-install-icon">📲</div>'
      + '<div class="pwa-install-text">'
      +   '<strong>Установить приложение</strong>'
      +   '<span>Быстрый доступ к магазину с домашнего экрана</span>'
      + '</div>'
      + '<button class="pwa-install-btn" id="pwa-install-accept">Установить</button>'
      + '<button class="pwa-install-close" id="pwa-install-close" aria-label="Закрыть">×</button>';

    document.body.appendChild(installBanner);
    setTimeout(function () { installBanner.classList.add('show'); }, 100);

    document.getElementById('pwa-install-accept').addEventListener('click', function () {
      installBanner.classList.remove('show');
      setTimeout(function () {
        if (installBanner && installBanner.parentNode) installBanner.parentNode.removeChild(installBanner);
      }, 300);

      if (deferredPrompt) {
        deferredPrompt.prompt();
        deferredPrompt.userChoice.then(function (choice) {
          console.log('[PWA] install choice:', choice.outcome);
          deferredPrompt = null;
        });
      }
    });

    document.getElementById('pwa-install-close').addEventListener('click', function () {
      installBanner.classList.remove('show');
      localStorage.setItem('pwa-install-dismissed', '1');
      setTimeout(function () {
        if (installBanner && installBanner.parentNode) installBanner.parentNode.removeChild(installBanner);
      }, 300);
    });
  }

  // ─── Для iOS: свой баннер-подсказка ───
  var isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
  var isStandalone = window.navigator.standalone || window.matchMedia('(display-mode: standalone)').matches;

  if (isIOS && !isStandalone && !localStorage.getItem('pwa-ios-dismissed')) {
    // Показываем iOS-баннер через 8 секунд
    setTimeout(showIosHint, 8000);
  }

  function showIosHint() {
    var banner = document.createElement('div');
    banner.className = 'pwa-ios-hint';
    banner.innerHTML = ''
      + '<div class="pwa-ios-hint-inner">'
      +   '<div class="pwa-ios-icon">📲</div>'
      +   '<div class="pwa-ios-text">'
      +     '<strong>Установить приложение</strong>'
      +     '<span>Нажмите <b>«Поделиться»</b> '
      +       '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>'
      +     ' и выберите <b>«На экран Домой»</b></span>'
      +   '</div>'
      +   '<button class="pwa-ios-close" aria-label="Закрыть">×</button>'
      + '</div>';
    document.body.appendChild(banner);
    setTimeout(function () { banner.classList.add('show'); }, 100);

    banner.querySelector('.pwa-ios-close').addEventListener('click', function () {
      banner.classList.remove('show');
      localStorage.setItem('pwa-ios-dismissed', '1');
      setTimeout(function () {
        if (banner.parentNode) banner.parentNode.removeChild(banner);
      }, 300);
    });
  }
})();
