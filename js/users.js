// users.js — всё, что связано с членами семьи.
// Функции принимают объект состояния (state) и работают с массивом state.users.
// Так модуль проще тестировать: можно подсунуть любое состояние.

// Простой генератор id. Дата + случайный хвост — этого достаточно,
// чтобы id не повторялись в рамках одного приложения.
function makeId(prefix) {
  return prefix + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

// Добавление нового члена семьи.
// Имя обрезаем по краям и проверяем, что оно не пустое и не дублируется.
function addUser(state, name) {
  const clean = String(name == null ? '' : name).trim();

  if (clean.length === 0) {
    throw new Error('Имя не может быть пустым');
  }
  if (clean.length > 40) {
    throw new Error('Слишком длинное имя (максимум 40 символов)');
  }

  // сравниваем без учёта регистра, чтобы "Аня" и "аня" не плодились
  const exists = state.users.some(u => u.name.toLowerCase() === clean.toLowerCase());
  if (exists) {
    throw new Error('Такой участник уже есть');
  }

  const user = {
    id: makeId('u'),
    name: clean,
    createdAt: new Date().toISOString(),
  };

  state.users.push(user);
  return user;
}

function getUser(state, id) {
  return state.users.find(u => u.id === id) || null;
}

function listUsers(state) {
  // отдаём копию, чтобы снаружи случайно не сломали порядок
  return state.users.slice();
}

// Удаление участника. Заодно убираем его из исполнителей всех задач,
// иначе в задачах останутся "висячие" id.
function removeUser(state, id) {
  const idx = state.users.findIndex(u => u.id === id);
  if (idx === -1) {
    throw new Error('Участник не найден');
  }

  state.users.splice(idx, 1);

  state.tasks.forEach(task => {
    task.assignees = task.assignees.filter(uid => uid !== id);
  });

  return true;
}

// Удобный помощник: по массиву id вернуть строку с именами.
// Используется при выводе задачи ("Исполнители: Аня, Петя").
function namesByIds(state, ids) {
  if (!ids || ids.length === 0) {
    return 'не назначено';
  }
  return ids
    .map(id => {
      const u = getUser(state, id);
      return u ? u.name : '???';
    })
    .join(', ');
}

window.Users = { addUser, getUser, listUsers, removeUser, namesByIds, makeId };
