// tests.js — простой набор тестов
// Проверяем основные сценарии участники, CRUD задач, назначение,
// выполнение, рейтинг, уведомления Результаты выводятся на страниц

(function () {
  const results = [];

  function assert(name, condition) {
    results.push({ name, ok: !!condition });
  }

  function assertThrows(name, fn) {
    let threw = false;
    try { fn(); } catch (e) { threw = true; }
    results.push({ name, ok: threw });
  }

  function fresh() {
    return Storage.defaultState();
  }

  // ---- Участники ----
  (function testUsers() {
    const s = fresh();
    const u = Users.addUser(s, '  Аня ');
    assert('Добавление участника', s.users.length === 1);
    assert('Имя обрезается от пробелов', u.name === 'Аня');

    assertThrows('Пустое имя запрещено', () => Users.addUser(s, '   '));
    assertThrows('Дубликат имени запрещён', () => Users.addUser(s, 'аня'));

    Users.addUser(s, 'Петя');
    assert('Список участников = 2', Users.listUsers(s).length === 2);

    Users.removeUser(s, u.id);
    assert('Удаление участника', s.users.length === 1);
  })();

  // ---- Создание и валидация задач ----
  (function testCreate() {
    const s = fresh();
    const t = Tasks.createTask(s, { title: 'Помыть пол', category: 'Уборка' });
    assert('Создание задачи', s.tasks.length === 1);
    assert('Статус новой задачи = planned', t.status === 'planned');
    assert('Категория сохранена', t.category === 'Уборка');

    assertThrows('Задача без названия запрещена', () =>
      Tasks.createTask(s, { title: '   ' }));
    assertThrows('Неизвестная категория запрещена', () =>
      Tasks.createTask(s, { title: 'X', category: 'НетТакой' }));
    assertThrows('Некорректная дата запрещена', () =>
      Tasks.createTask(s, { title: 'X', dueDate: 'не дата' }));
  })();

  // ---- Назначение исполнителей (несколько) ----
  (function testAssign() {
    const s = fresh();
    const a = Users.addUser(s, 'Аня');
    const b = Users.addUser(s, 'Петя');
    const t = Tasks.createTask(s, { title: 'Покупки', category: 'Покупки', assignees: [a.id, b.id] });
    assert('Назначено двое исполнителей', t.assignees.length === 2);

    assertThrows('Назначение несуществующего участника запрещено', () =>
      Tasks.createTask(s, { title: 'Y', assignees: ['нет_такого'] }));

    Users.removeUser(s, a.id);
    assert('После удаления участника он исчез из задачи', t.assignees.indexOf(a.id) === -1);
  })();

  (function testUpdate() {
    const s = fresh();
    const t = Tasks.createTask(s, { title: 'Старое', category: 'Прочее' });
    Tasks.updateTask(s, t.id, { title: 'Новое', category: 'Ремонт' });
    const after = Tasks.getTask(s, t.id);
    assert('Название обновилось', after.title === 'Новое');
    assert('Категория обновилась', after.category === 'Ремонт');
  })();

  (function testComplete() {
    const s = fresh();
    const t = Tasks.createTask(s, { title: 'Вынести мусор', category: 'Прочее' });
    Tasks.complete(s, t.id);
    assert('Задача отмечена выполненной', Tasks.getTask(s, t.id).status === 'done');
    assert('Проставлена дата выполнения', !!Tasks.getTask(s, t.id).completedAt);
    assert('Задача попала в историю', Tasks.history(s).length === 1);

    Tasks.reopen(s, t.id);
    assert('Возврат в работу', Tasks.getTask(s, t.id).status === 'planned');
    assert('История пуста после возврата', Tasks.history(s).length === 0);
  })();

  (function testQuery() {
    const s = fresh();
    Tasks.createTask(s, { title: 'Купить хлеб', category: 'Покупки' });
    Tasks.createTask(s, { title: 'Помыть окна', category: 'Уборка' });
    assert('Фильтр по категории', Tasks.query(s, { category: 'Покупки' }).length === 1);
    assert('Поиск по подстроке', Tasks.query(s, { search: 'окна' }).length === 1);
    assert('Поиск без совпадений', Tasks.query(s, { search: 'самолёт' }).length === 0);
  })();

  (function testRating() {
    const s = fresh();
    const a = Users.addUser(s, 'Аня');
    const b = Users.addUser(s, 'Петя');
    const t1 = Tasks.createTask(s, { title: 'T1', assignees: [a.id] });
    const t2 = Tasks.createTask(s, { title: 'T2', assignees: [a.id] });
    Tasks.createTask(s, { title: 'T3', assignees: [b.id] });
    Tasks.complete(s, t1.id);
    Tasks.complete(s, t2.id);

    const r = Analytics.rating(s);
    assert('Лидер рейтинга — Аня', r[0].name === 'Аня' && r[0].done === 2);
    assert('У Пети 0 выполненных', r[1].done === 0);
  })();

  // ---- Уведомления о сроках ----
  (function testNotifications() {
    const s = fresh();
    // дата на вчера -> просрочено
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    Tasks.createTask(s, { title: 'Просроченная', dueDate: yesterday });
    const notes = Notifications.collect(s);
    assert('Просроченная задача попала в уведомления', notes.some(n => n.level === 'overdue'));
  })();

  (function testStorage() {
    const s = fresh();
    Tasks.createTask(s, { title: 'Сохрани меня', category: 'Прочее' });
    Storage.save(s);
    const loaded = Storage.load();
    assert('Данные читаются обратно из localStorage',
      loaded.tasks.length >= 1 && loaded.tasks.some(t => t.title === 'Сохрани меня'));
    Storage.clear(); 
  })();

  render(results);

  function render(list) {
    const root = document.getElementById('results');
    const passed = list.filter(r => r.ok).length;
    const total = list.length;

    const head = document.createElement('div');
    head.className = 'summary ' + (passed === total ? 'all-ok' : 'has-fail');
    head.textContent = 'Пройдено ' + passed + ' из ' + total;
    root.appendChild(head);

    list.forEach(r => {
      const div = document.createElement('div');
      div.className = 'case ' + (r.ok ? 'ok' : 'fail');
      div.textContent = (r.ok ? '✓ ' : '✗ ') + r.name;
      root.appendChild(div);
    });

    console.log('Тесты: пройдено ' + passed + ' из ' + total);
  }
})();
