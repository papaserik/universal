(function () {
  'use strict';

  var tip = null;
  var activeTrigger = null;

  function ensure() {
    if (tip) return tip;
    tip = document.createElement('div');
    tip.className = 'global-info-tip';
    tip.setAttribute('role', 'tooltip');
    tip.hidden = true;
    document.body.appendChild(tip);
    return tip;
  }

  function show(trigger) {
    var text = trigger.getAttribute('data-tip');
    if (!text) return;

    activeTrigger = trigger;
    var t = ensure();
    t.textContent = text;
    t.hidden = false;

    // Сбросим позицию для корректных измерений
    t.style.top = '0px';
    t.style.left = '0px';

    var tipRect = t.getBoundingClientRect();
    var trgRect = trigger.getBoundingClientRect();

    var vw = window.innerWidth;
    var vh = window.innerHeight;
    var margin = 10;

    // Позиция над кружком
    var top = trgRect.top - tipRect.height - 12;
    var left = trgRect.left + trgRect.width / 2 - tipRect.width / 2;

    // Не помещается сверху — показываем снизу
    if (top < margin) {
      top = trgRect.bottom + 12;
    }

    // Прижимаем к краям, если вылезает
    if (left < margin) left = margin;
    if (left + tipRect.width > vw - margin) left = vw - tipRect.width - margin;

    // Прижимаем по вертикали
    if (top + tipRect.height > vh - margin) {
      top = vh - tipRect.height - margin;
    }
    if (top < margin) top = margin;

    t.style.position = 'fixed';
    t.style.top = top + 'px';
    t.style.left = left + 'px';
  }

  function hide() {
    if (tip) tip.hidden = true;
    activeTrigger = null;
  }

  // Desktop hover
  document.addEventListener('mouseover', function (e) {
    var t = e.target.closest('.info-tip');
    if (t && window.matchMedia('(hover: hover)').matches) show(t);
  });

  document.addEventListener('mouseout', function (e) {
    var t = e.target.closest('.info-tip');
    if (t && window.matchMedia('(hover: hover)').matches) hide();
  });

  // Tap / click (мобильные + desktop)
  document.addEventListener('click', function (e) {
    var t = e.target.closest('.info-tip');
    if (t) {
      e.preventDefault();
      e.stopPropagation();
      if (activeTrigger === t && tip && !tip.hidden) hide();
      else show(t);
      return;
    }
    if (!e.target.closest('.global-info-tip')) hide();
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') hide();
  });

  // На мобильных закрываем при скролле и повороте
  window.addEventListener('scroll', function () {
    if (!window.matchMedia('(hover: hover)').matches) hide();
  }, { passive: true });
  window.addEventListener('resize', hide);
  window.addEventListener('orientationchange', hide);
})();
