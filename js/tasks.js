// tasks.js — ядро приложения задачи (домашние дела)

const STATUSES = {
  PLANNED: 'planned',
  DONE: 'done',
};

// Проверка и нормализация данных задачи перед сохранение м
function validateTaskInput(state, data) {
  const title = String(data.title == null ? '' : data.title).trim();
  if (!title) {
    throw new Error('У задачи должно быть название');
  }
  if (title.length > 120) {
    throw new Error('Название слишком длинное');
  }

  const category = String(data.category == null ? '' : data.category).trim() || 'Прочее';
  if (!state.categories.includes(category)) {
    throw new Error('Неизвестная категория: ' + category);
  }

  let dueDate = String(data.dueDate == null ? '' : data.dueDate).trim();
  if (dueDate) {
    const d = new Date(dueDate);
    if (isNaN(d.getTime())) {
      throw new Error('Некорректная дата срока');
    }
  }

  const assignees = Array.isArray(data.assignees) ? data.assignees.slice() : [];
  for (const uid of assignees) {
    if (!state.users.some(u => u.id === uid)) {
      throw new Error('Назначен несуществующий участник');
    }
  }

  const description = String(data.description == null ? '' : data.description).trim();

  return { title, description, category, dueDate, assignees };
}

function createTask(state, data) {
  const fields = validateTaskInput(state, data);

  const task = {
    id: Users.makeId('t'),
    title: fields.title,
    description: fields.description,
    category: fields.category,
    dueDate: fields.dueDate,
    assignees: fields.assignees,
    status: STATUSES.PLANNED,
    createdAt: new Date().toISOString(),
    completedAt: null,
  };

  state.tasks.push(task);
  return task;
}

function getTask(state, id) {
  return state.tasks.find(t => t.id === id) || null;
}

function updateTask(state, id, data) {
  const task = getTask(state, id);
  if (!task) {
    throw new Error('Задача не найдена');
  }

  const merged = validateTaskInput(state, {
    title: data.title != null ? data.title : task.title,
    description: data.description != null ? data.description : task.description,
    category: data.category != null ? data.category : task.category,
    dueDate: data.dueDate != null ? data.dueDate : task.dueDate,
    assignees: data.assignees != null ? data.assignees : task.assignees,
  });

  task.title = merged.title;
  task.description = merged.description;
  task.category = merged.category;
  task.dueDate = merged.dueDate;
  task.assignees = merged.assignees;

  return task;
}

function deleteTask(state, id) {
  const idx = state.tasks.findIndex(t => t.id === id);
  if (idx === -1) {
    throw new Error('Задача не найдена');
  }
  state.tasks.splice(idx, 1);
  return true;
}

// Назначенин исполнитьней
function assign(state, id, userIds) {
  return updateTask(state, id, { assignees: userIds });
}

function complete(state, id) {
  const task = getTask(state, id);
  if (!task) {
    throw new Error('Задача не найдена');
  }
  if (task.status === STATUSES.DONE) {
    return task;
  }
  task.status = STATUSES.DONE;
  task.completedAt = new Date().toISOString();
  return task;
}

// Вернуть задачу в рабоу
function reopen(state, id) {
  const task = getTask(state, id);
  if (!task) {
    throw new Error('Задача не найдена');
  }
  task.status = STATUSES.PLANNED;
  task.completedAt = null;
  return task;
}

function query(state, opts) {
  opts = opts || {};
  let result = state.tasks.slice();

  if (opts.status && opts.status !== 'all') {
    result = result.filter(t => t.status === opts.status);
  }

  if (opts.category && opts.category !== 'all') {
    result = result.filter(t => t.category === opts.category);
  }

  if (opts.assignee && opts.assignee !== 'all') {
    result = result.filter(t => t.assignees.includes(opts.assignee));
  }

  if (opts.search) {
    const needle = opts.search.trim().toLowerCase();
    if (needle) {
      result = result.filter(t =>
        t.title.toLowerCase().includes(needle) ||
        t.description.toLowerCase().includes(needle)
      );
    }
  }

  result = sortTasks(result, opts.sort);
  return result;
}

function sortTasks(tasks, sort) {
  const list = tasks.slice();
  switch (sort) {
    case 'title':
      list.sort((a, b) => a.title.localeCompare(b.title, 'ru'));
      break;
    case 'created':
      list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      break;
    case 'due':
    default:
      list.sort((a, b) => {
        if (!a.dueDate && !b.dueDate) return 0;
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return a.dueDate.localeCompare(b.dueDate);
      });
      break;
  }
  return list;
}

function history(state) {
  return state.tasks
    .filter(t => t.status === STATUSES.DONE)
    .sort((a, b) => String(b.completedAt).localeCompare(String(a.completedAt)));
}


function addCategory(state, name) {
  const clean = String(name == null ? '' : name).trim();
  if (!clean) {
    throw new Error('Название категории пустое');
  }
  if (state.categories.includes(clean)) {
    throw new Error('Такая категория уже есть');
  }
  state.categories.push(clean);
  return clean;
}

window.Tasks = {
  STATUSES,
  createTask,
  getTask,
  updateTask,
  deleteTask,
  assign,
  complete,
  reopen,
  query,
  sortTasks,
  history,
  addCategory,
  validateTaskInput,
};
