// ui.js — отрисовка интерфейса. Модуль ничего не хранит сам
function esc(str) {
  return String(str == null ? '' : str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

const CATEGORY_LABELS = {}; // зарезервировано, если захотим переводы

function $(id) {
  return document.getElementById(id);
}

function renderStats(state) {
  const s = Analytics.summary(state);
  const box = $('stats');
  box.innerHTML = '';

  const cards = [
    { label: 'Всего дел', value: s.total, mod: '' },
    { label: 'Выполнено', value: s.done, mod: 'ok' },
    { label: 'В работе', value: s.planned, mod: 'wait' },
    { label: 'Просрочено', value: s.overdue, mod: 'bad' },
    { label: 'Прогресс', value: s.completionRate + '%', mod: '' },
  ];

  cards.forEach(c => {
    const el = document.createElement('div');
    el.className = 'stat-card ' + (c.mod ? 'stat-' + c.mod : '');
    el.innerHTML = '<span class="stat-value">' + esc(c.value) +
      '</span><span class="stat-label">' + esc(c.label) + '</span>';
    box.appendChild(el);
  });
}

// ---- Уведомления о сроках ----
function renderNotifications(state) {
  const box = $('notifications');
  const items = Notifications.collect(state);

  if (items.length === 0) {
    box.hidden = true;
    box.innerHTML = '';
    return;
  }

  box.hidden = false;
  box.innerHTML = '<strong>Напоминания:</strong>';
  const ul = document.createElement('ul');
  items.forEach(n => {
    const li = document.createElement('li');
    li.className = 'note note-' + n.level;
    li.textContent = n.text;
    ul.appendChild(li);
  });
  box.appendChild(ul);
}

function renderTaskList(state, filters, actions) {
  const list = $('task-list');
  list.innerHTML = '';

  const tasks = Tasks.query(state, filters);

  if (tasks.length === 0) {
    list.innerHTML = '<li class="empty">Задач не найдено. Добавьте первую!</li>';
    return;
  }

  tasks.forEach(task => {
    list.appendChild(buildTaskItem(state, task, actions));
  });
}

function buildTaskItem(state, task, actions) {
  const li = document.createElement('li');
  li.className = 'task-item';
  if (task.status === Tasks.STATUSES.DONE) li.classList.add('is-done');
  if (Analytics.isOverdue(task)) li.classList.add('is-overdue');

  const due = task.dueDate
    ? formatDate(task.dueDate)
    : 'без срока';

  const assignees = Users.namesByIds(state, task.assignees);

  li.innerHTML =
    '<div class="task-main">' +
      '<div class="task-title">' + esc(task.title) + '</div>' +
      (task.description ? '<div class="task-desc">' + esc(task.description) + '</div>' : '') +
      '<div class="task-meta">' +
        '<span class="badge badge-cat">' + esc(task.category) + '</span>' +
        '<span class="task-due">срок: ' + esc(due) + '</span>' +
        '<span class="task-assignees">' + esc(assignees) + '</span>' +
      '</div>' +
    '</div>';

  // блок кнопок
  const controls = document.createElement('div');
  controls.className = 'task-controls';

  if (task.status === Tasks.STATUSES.DONE) {
    controls.appendChild(makeBtn('Вернуть', 'btn-sm', () => actions.reopen(task.id)));
  } else {
    controls.appendChild(makeBtn('Выполнено', 'btn-sm btn-ok', () => actions.complete(task.id)));
  }
  controls.appendChild(makeBtn('Изм.', 'btn-sm', () => actions.edit(task.id)));
  controls.appendChild(makeBtn('Удал.', 'btn-sm btn-danger', () => actions.remove(task.id)));

  li.appendChild(controls);
  return li;
}

function makeBtn(text, cls, onClick) {
  const b = document.createElement('button');
  b.className = 'btn ' + cls;
  b.textContent = text;
  b.addEventListener('click', onClick);
  return b;
}

function renderMembers(state, actions) {
  const list = $('member-list');
  list.innerHTML = '';

  if (state.users.length === 0) {
    list.innerHTML = '<li class="empty">Пока никого нет</li>';
    return;
  }

  state.users.forEach(u => {
    const li = document.createElement('li');
    li.className = 'member-item';
    li.innerHTML = '<span>' + esc(u.name) + '</span>';
    li.appendChild(makeBtn('Удалить', 'btn-sm btn-danger', () => actions.removeUser(u.id)));
    list.appendChild(li);
  });
}

function renderCategories(state) {
  const list = $('category-list');
  list.innerHTML = '';
  state.categories.forEach(c => {
    const li = document.createElement('li');
    li.className = 'chip';
    li.textContent = c;
    list.appendChild(li);
  });
}

// ---- Заполнение выпадающих списков и чекбоксов в форме ----
function fillFormSelects(state) {
  // категории в форме задачи
  const catSelect = $('task-category');
  const current = catSelect.value;
  catSelect.innerHTML = '';
  state.categories.forEach(c => {
    const opt = document.createElement('option');
    opt.value = c;
    opt.textContent = c;
    catSelect.appendChild(opt);
  });
  if (current) catSelect.value = current;

  // чекбоксы исполнителей
  const box = $('task-assignees');
  box.innerHTML = '';
  if (state.users.length === 0) {
    box.innerHTML = '<span class="hint">Сначала добавьте участников во вкладке «Участники»</span>';
    return;
  }
  state.users.forEach(u => {
    const label = document.createElement('label');
    label.className = 'check';
    label.innerHTML = '<input type="checkbox" value="' + esc(u.id) + '"> ' + esc(u.name);
    box.appendChild(label);
  });
}

// фильтры (категории и участники подгружаются динамически)
function fillFilterSelects(state) {
  const catSel = $('filter-category');
  const keepCat = catSel.value;
  catSel.innerHTML = '<option value="all">Все категории</option>';
  state.categories.forEach(c => {
    const o = document.createElement('option');
    o.value = c; o.textContent = c;
    catSel.appendChild(o);
  });
  catSel.value = keepCat || 'all';

  const asgSel = $('filter-assignee');
  const keepAsg = asgSel.value;
  asgSel.innerHTML = '<option value="all">Все исполнители</option>';
  state.users.forEach(u => {
    const o = document.createElement('option');
    o.value = u.id; o.textContent = u.name;
    asgSel.appendChild(o);
  });
  asgSel.value = keepAsg || 'all';
}

function renderRating(state) {
  const tbody = $('rating-table').querySelector('tbody');
  tbody.innerHTML = '';
  const rows = Analytics.rating(state);

  if (rows.length === 0) {
    tbody.innerHTML = '<tr><td colspan="4" class="empty">Нет участников</td></tr>';
    return;
  }

  rows.forEach((r, i) => {
    const tr = document.createElement('tr');
    let medal = i + 1;
    if (i === 0 && r.done > 0) medal = '🥇';
    else if (i === 1 && r.done > 0) medal = '🥈';
    else if (i === 2 && r.done > 0) medal = '🥉';
    tr.innerHTML =
      '<td>' + medal + '</td>' +
      '<td>' + esc(r.name) + '</td>' +
      '<td>' + r.done + '</td>' +
      '<td>' + r.active + '</td>';
    tbody.appendChild(tr);
  });
}

function renderCharts(state) {
  const ratingData = Analytics.rating(state).map(r => ({ label: r.name, value: r.done }));
  Charts.barChart($('chart-rating'), ratingData);

  const catData = Analytics.byCategory(state).map(c => ({ label: c.name, value: c.count }));
  Charts.barChart($('chart-category'), catData);
}

function renderHistory(state, actions) {
  const list = $('history-list');
  list.innerHTML = '';
  const done = Tasks.history(state);

  if (done.length === 0) {
    list.innerHTML = '<li class="empty">Ещё ничего не выполнено</li>';
    return;
  }

  done.forEach(task => {
    const li = document.createElement('li');
    li.className = 'task-item is-done';
    const when = task.completedAt ? formatDateTime(task.completedAt) : '';
    li.innerHTML =
      '<div class="task-main">' +
        '<div class="task-title">' + esc(task.title) + '</div>' +
        '<div class="task-meta">' +
          '<span class="badge badge-cat">' + esc(task.category) + '</span>' +
          '<span>выполнили: ' + esc(Users.namesByIds(state, task.assignees)) + '</span>' +
          '<span class="task-due">' + esc(when) + '</span>' +
        '</div>' +
      '</div>';
    list.appendChild(li);
  });
}

function formatDate(iso) {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('ru-RU');
}

function formatDateTime(iso) {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleString('ru-RU', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

window.UI = {
  esc,
  renderStats,
  renderNotifications,
  renderTaskList,
  renderMembers,
  renderCategories,
  renderRating,
  renderCharts,
  renderHistory,
  fillFormSelects,
  fillFilterSelects,
};
