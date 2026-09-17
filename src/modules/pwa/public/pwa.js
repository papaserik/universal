(function () {
  'use strict';

  // ——— Регистрация Service Worker ———
  (function () {
    var isLocalhost = location.hostname === 'localhost' || location.hostname === '127.0.0.1';
    var isAdmin = location.pathname.indexOf('/admin') === 0;

    if (!('serviceWorker' in navigator)) return;
    if (isAdmin || isLocalhost) return;

    window.addEventListener('load', function () {
      navigator.serviceWorker.register('/modules/pwa/sw.js', { scope: '/' })
        .then(function (reg) {
          console.log('[PWA] SW зарегистрирован:', reg.scope);
          setInterval(function () {
            reg.update().catch(function () {});
          }, 60 * 60 * 1000);
        })
        .catch(function (err) {
          console.warn('[PWA] SW не зарегистрирован:', err.message);
        });
    });
  })();

  // ——— Кастомный баннер «Установить приложение» ———
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
    installBanner.innerHTML =
      '<span>Установить Universal Shop на устройство?</span>' +
      '<button class="pwa-install-yes">Установить</button>' +
      '<button class="pwa-install-no">Позже</button>';
    document.body.appendChild(installBanner);

    installBanner.querySelector('.pwa-install-yes').addEventListener('click', function () {
      if (!deferredPrompt) return;
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then(function () {
        deferredPrompt = null;
        hideInstallBanner();
      });
    });

    installBanner.querySelector('.pwa-install-no').addEventListener('click', function () {
      localStorage.setItem('pwa-install-dismissed', '1');
      hideInstallBanner();
    });
  }

  function hideInstallBanner() {
    if (installBanner && installBanner.parentNode) {
      installBanner.parentNode.removeChild(installBanner);
    }
    installBanner = null;
  }

  // ——— Индикатор онлайн/оффлайн ———
  window.addEventListener('offline', function () {
    document.body.classList.add('is-offline');
  });
  window.addEventListener('online', function () {
    document.body.classList.remove('is-offline');
  });
})();
