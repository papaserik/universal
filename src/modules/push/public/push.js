(function () {
  'use strict';

  var statusEl = null;
  var subscribeBtn = null;
  var testBtn = null;
  var urlBase64ToUint8Array = null;

  // ─── Утилита: конвертация base64 VAPID в Uint8Array ───
  urlBase64ToUint8Array = function (base64String) {
    var padding = '='.repeat((4 - base64String.length % 4) % 4);
    var base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');
    var rawData = window.atob(base64);
    var outputArray = new Uint8Array(rawData.length);
    for (var i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  };

  // ─── Поддерживает ли браузер push ───
  function isSupported() {
    return 'serviceWorker' in navigator
      && 'PushManager' in window
      && 'Notification' in window;
  }

  // ─── Инициализация UI ───
  function init() {
    statusEl = document.getElementById('push-status');
    subscribeBtn = document.getElementById('push-subscribe');
    testBtn = document.getElementById('push-test');

    if (!statusEl || !subscribeBtn) return;

    if (!isSupported()) {
      statusEl.textContent = '⚠️ Ваш браузер не поддерживает push-уведомления';
      statusEl.style.color = '#9ca3af';
      subscribeBtn.disabled = true;
      return;
    }

    // Проверяем текущий статус
    checkStatus();
  }

  // ─── Проверка текущего статуса ───
  function checkStatus() {
    if (Notification.permission === 'denied') {
      statusEl.innerHTML = '🚫 Уведомления заблокированы в настройках браузера';
      statusEl.style.color = '#dc2626';
      subscribeBtn.disabled = true;
      return;
    }

    navigator.serviceWorker.ready.then(function (reg) {
      return reg.pushManager.getSubscription();
    }).then(function (sub) {
      if (sub) {
        statusEl.innerHTML = '✓ Уведомления включены';
        statusEl.style.color = '#16a34a';
        subscribeBtn.textContent = '🔕 Отключить уведомления';
        subscribeBtn.classList.add('active');
        subscribeBtn.dataset.state = 'on';
        if (testBtn) testBtn.style.display = '';
      } else {
        statusEl.innerHTML = 'Уведомления отключены';
        statusEl.style.color = '#6b7280';
        subscribeBtn.textContent = '🔔 Включить уведомления';
        subscribeBtn.classList.remove('active');
        subscribeBtn.dataset.state = 'off';
        if (testBtn) testBtn.style.display = 'none';
      }
    });
  }

  // ─── Подписка ───
  function subscribe() {
    subscribeBtn.disabled = true;
    statusEl.textContent = 'Запрашиваем разрешение…';

    Notification.requestPermission().then(function (perm) {
      if (perm !== 'granted') {
        statusEl.innerHTML = '🚫 Разрешение отклонено';
        statusEl.style.color = '#dc2626';
        subscribeBtn.disabled = false;
        return;
      }

      return fetch('/api/push/public-key').then(function (r) { return r.json(); }).then(function (data) {
        if (!data.key) throw new Error('Публичный ключ не получен');

        return navigator.serviceWorker.ready.then(function (reg) {
          return reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(data.key)
          });
        });
      }).then(function (subscription) {
        return fetch('/api/push/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(subscription.toJSON())
        });
      }).then(function (r) { return r.json(); }).then(function (data) {
        if (data.ok) {
          statusEl.innerHTML = '✓ Уведомления включены';
          statusEl.style.color = '#16a34a';
          subscribeBtn.textContent = '🔕 Отключить уведомления';
          subscribeBtn.classList.add('active');
          subscribeBtn.dataset.state = 'on';
          if (testBtn) testBtn.style.display = '';
        } else {
          throw new Error(data.error || 'Ошибка подписки');
        }
      }).catch(function (e) {
        console.error('[push]', e);
        statusEl.innerHTML = '✗ ' + e.message;
        statusEl.style.color = '#dc2626';
      }).finally(function () {
        subscribeBtn.disabled = false;
      });
    });
  }

  // ─── Отписка ───
  function unsubscribe() {
    subscribeBtn.disabled = true;

    navigator.serviceWorker.ready.then(function (reg) {
      return reg.pushManager.getSubscription();
    }).then(function (sub) {
      if (!sub) return;
      return fetch('/api/push/unsubscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpoint: sub.endpoint })
      }).then(function () { return sub.unsubscribe(); });
    }).then(function () {
      statusEl.innerHTML = 'Уведомления отключены';
      statusEl.style.color = '#6b7280';
      subscribeBtn.textContent = '🔔 Включить уведомления';
      subscribeBtn.classList.remove('active');
      subscribeBtn.dataset.state = 'off';
      if (testBtn) testBtn.style.display = 'none';
    }).catch(function (e) {
      console.error('[push]', e);
    }).finally(function () {
      subscribeBtn.disabled = false;
    });
  }

  // ─── Клик по кнопке ───
  document.addEventListener('click', function (e) {
    if (e.target.id === 'push-subscribe' || e.target.closest('#push-subscribe')) {
      e.preventDefault();
      var btn = document.getElementById('push-subscribe');
      if (btn.dataset.state === 'on') unsubscribe();
      else subscribe();
    }

    if (e.target.id === 'push-test' || e.target.closest('#push-test')) {
      e.preventDefault();
      fetch('/api/push/test', { method: 'POST' })
        .then(function (r) { return r.json(); })
        .then(function (d) {
          if (d.ok) {
            var st = document.getElementById('push-status');
            var old = st.innerHTML;
            st.innerHTML = '✓ Тестовое уведомление отправлено';
            st.style.color = '#16a34a';
            setTimeout(function () { checkStatus(); }, 2000);
          }
        });
    }
  });

  // ─── Инициализация после загрузки DOM ───
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
