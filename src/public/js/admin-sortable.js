(function () {
  'use strict';

  var table = document.querySelector('[data-sortable]');
  if (!table) return;

  var type = table.dataset.sortable;
  var tbody = table.querySelector('tbody');
  if (!tbody) return;

  var dragEl = null;

  function getRows() {
    return Array.from(tbody.querySelectorAll('tr[data-id]'));
  }

  function saveOrder() {
    var ids = getRows().map(function (r) { return r.dataset.id; });
    fetch('/admin/reorder/' + type, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: ids })
    })
      .then(function (r) { return r.json(); })
      .then(function (d) {
        if (!d.ok) alert('Ошибка: ' + (d.error || 'неизвестно'));
        else showSaved();
      })
      .catch(function (e) { alert('Ошибка сети: ' + e.message); });
  }

  function showSaved() {
    var el = document.getElementById('sort-saved');
    if (!el) {
      el = document.createElement('div');
      el.id = 'sort-saved';
      el.className = 'sort-saved';
      document.body.appendChild(el);
    }
    el.textContent = '✓ Порядок сохранён';
    el.classList.add('show');
    clearTimeout(el._timer);
    el._timer = setTimeout(function () { el.classList.remove('show'); }, 1500);
  }

  // Находим ручку в каждой строке (уже в HTML) и включаем drag
  getRows().forEach(function (row) {
    var handle = row.querySelector('.drag-handle');
    if (!handle) return;

    handle.addEventListener('mousedown', function () {
      row.setAttribute('draggable', 'true');
    });
    handle.addEventListener('mouseup', function () {
      row.removeAttribute('draggable');
    });
    row.addEventListener('dragend', function () {
      row.removeAttribute('draggable');
    });
  });

  tbody.addEventListener('dragstart', function (e) {
    var row = e.target.closest('tr[data-id]');
    if (!row || !row.hasAttribute('draggable')) return;
    dragEl = row;
    row.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', row.dataset.id);
  });

  tbody.addEventListener('dragover', function (e) {
    if (!dragEl) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';

    var after = null;
    var rows = getRows().filter(function (r) { return r !== dragEl; });
    var y = e.clientY;

    for (var i = 0; i < rows.length; i++) {
      var r = rows[i];
      var box = r.getBoundingClientRect();
      if (y < box.top + box.height / 2) {
        after = r;
        break;
      }
    }
    if (after) tbody.insertBefore(dragEl, after);
    else tbody.appendChild(dragEl);
  });

  tbody.addEventListener('drop', function (e) {
    if (!dragEl) return;
    e.preventDefault();
    dragEl.classList.remove('dragging');
    dragEl = null;
    saveOrder();
  });

  tbody.addEventListener('dragend', function () {
    if (dragEl) {
      dragEl.classList.remove('dragging');
      dragEl = null;
      saveOrder();
    }
  });
})();
