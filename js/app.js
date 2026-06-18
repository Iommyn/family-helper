// app.js — связующий модуль (контроллер)

(function () {
  'use strict';

  let state = Storage.load();

  function $(id) {
    return document.getElementById(id);
  }

  // Сохранить и перерисовать,вызывается после любого изменения данных
  function persistAndRender() {
    Storage.save(state);
    render();
  }

  function readFilters() {
    return {
      search: $('filter-search').value,
      status: $('filter-status').value,
      category: $('filter-category').value,
      assignee: $('filter-assignee').value,
      sort: $('filter-sort').value,
    };
  }

  function render() {
    UI.renderStats(state);
    UI.renderNotifications(state);
    UI.fillFilterSelects(state);
    UI.renderTaskList(state, readFilters(), taskActions);
    UI.renderMembers(state, memberActions);
    UI.renderCategories(state);
    UI.renderRating(state);
    UI.renderCharts(state);
    UI.renderHistory(state, taskActions);
  }

  function showError(elId, message) {
    const el = $(elId);
    el.textContent = message;
    el.hidden = false;
  }
  function hideError(elId) {
    $(elId).hidden = true;
  }

  const taskActions = {
    complete(id) {
      try {
        Tasks.complete(state, id);
        persistAndRender();
      } catch (e) { alert(e.message); }
    },
    reopen(id) {
      try {
        Tasks.reopen(state, id);
        persistAndRender();
      } catch (e) { alert(e.message); }
    },
    remove(id) {
      const task = Tasks.getTask(state, id);
      if (!task) return;
      if (!confirm('Удалить задачу «' + task.title + '»?')) return;
      try {
        Tasks.deleteTask(state, id);
        persistAndRender();
      } catch (e) { alert(e.message); }
    },
    edit(id) {
      openTaskForm(id);
    },
  };

  const memberActions = {
    removeUser(id) {
      const u = Users.getUser(state, id);
      if (!u) return;
      if (!confirm('Удалить участника ' + u.name + '? Он исчезнет из всех задач.')) return;
      try {
        Users.removeUser(state, id);
        persistAndRender();
      } catch (e) { alert(e.message); }
    },
  };

  function openTaskForm(id) {
    const form = $('task-form');
    form.hidden = false;
    hideError('task-error');
    UI.fillFormSelects(state);

    if (id) {
      // режим редактирования заполняем поля
      const task = Tasks.getTask(state, id);
      if (!task) return;
      $('task-id').value = task.id;
      $('task-title').value = task.title;
      $('task-desc').value = task.description;
      $('task-category').value = task.category;
      $('task-due').value = task.dueDate;
      $('task-submit').textContent = 'Сохранить изменения';
      // отмечаем чекбоксы исполнителей
      checkAssignees(task.assignees);
    } else {
      // режим создания чистим
      $('task-id').value = '';
      $('task-title').value = '';
      $('task-desc').value = '';
      $('task-due').value = '';
      $('task-submit').textContent = 'Добавить задачу';
      checkAssignees([]);
    }

    $('task-title').focus();
  }

  function closeTaskForm() {
    $('task-form').hidden = true;
  }

  function checkAssignees(ids) {
    const boxes = $('task-assignees').querySelectorAll('input[type=checkbox]');
    boxes.forEach(cb => { cb.checked = ids.indexOf(cb.value) !== -1; });
  }

  function readAssignees() {
    const boxes = $('task-assignees').querySelectorAll('input[type=checkbox]:checked');
    return Array.prototype.map.call(boxes, cb => cb.value);
  }

  function submitTaskForm(e) {
    e.preventDefault();
    hideError('task-error');

    const payload = {
      title: $('task-title').value,
      description: $('task-desc').value,
      category: $('task-category').value,
      dueDate: $('task-due').value,
      assignees: readAssignees(),
    };

    const id = $('task-id').value;

    try {
      if (id) {
        Tasks.updateTask(state, id, payload);
      } else {
        Tasks.createTask(state, payload);
      }
      closeTaskForm();
      persistAndRender();
    } catch (err) {

      showError('task-error', err.message);
    }
  }

  function init() {
    $('tabs').addEventListener('click', function (e) {
      const btn = e.target.closest('.tab');
      if (!btn) return;
      switchTab(btn.dataset.tab);
    });

    // форма задачи
    $('btn-add-task').addEventListener('click', () => openTaskForm(null));
    $('task-cancel').addEventListener('click', closeTaskForm);
    $('task-form').addEventListener('submit', submitTaskForm);

    // фильтры любая правка перерисовывает список
    ['filter-search', 'filter-status', 'filter-category', 'filter-assignee', 'filter-sort']
      .forEach(elId => {
        const ev = elId === 'filter-search' ? 'input' : 'change';
        $(elId).addEventListener(ev, () => {
          UI.renderTaskList(state, readFilters(), taskActions);
        });
      });

    // добавление участника
    $('member-form').addEventListener('submit', function (e) {
      e.preventDefault();
      hideError('member-error');
      try {
        Users.addUser(state, $('member-name').value);
        $('member-name').value = '';
        persistAndRender();
      } catch (err) {
        showError('member-error', err.message);
      }
    });

    // добавление категории
    $('category-form').addEventListener('submit', function (e) {
      e.preventDefault();
      hideError('category-error');
      try {
        Tasks.addCategory(state, $('category-name').value);
        $('category-name').value = '';
        persistAndRender();
      } catch (err) {
        showError('category-error', err.message);
      }
    });

    // экспорт данных
    $('btn-export').addEventListener('click', exportData);

    // сброс
    $('btn-reset').addEventListener('click', function () {
      if (!confirm('Точно удалить ВСЕ данные? Это действие необратимо.')) return;
      Storage.clear();
      state = Storage.defaultState();
      persistAndRender();
    });

    render();
  }

  function switchTab(name) {
    document.querySelectorAll('.tab').forEach(t => {
      t.classList.toggle('is-active', t.dataset.tab === name);
    });
    document.querySelectorAll('.panel').forEach(p => {
      p.classList.toggle('is-active', p.id === 'panel-' + name);
    });
    // диаграммы перерисуем при открытии вкладки
    if (name === 'analytics') UI.renderCharts(state);
  }

  // Экспорт всего состояния в JSON файл
  function exportData() {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'family-helper-export.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // стартуем после загрузки DOM
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
