// analytics.js подсчёт статистики и рейтинга участников
function rating(state) {
  const rows = state.users.map(user => {
    let done = 0;
    let active = 0;

    state.tasks.forEach(task => {
      if (!task.assignees.includes(user.id)) return;
      if (task.status === Tasks.STATUSES.DONE) {
        done++;
      } else {
        active++;
      }
    });

    return {
      userId: user.id,
      name: user.name,
      done,
      active,
      total: done + active,
    };
  });

  rows.sort((a, b) => b.done - a.done || a.name.localeCompare(b.name, 'ru'));
  return rows;
}

// общие цифры по всем задачам
function summary(state) {
  const total = state.tasks.length;
  const done = state.tasks.filter(t => t.status === Tasks.STATUSES.DONE).length;
  const planned = total - done;
  const overdue = state.tasks.filter(t => isOverdue(t)).length;

  return {
    total,
    done,
    planned,
    overdue,
    // процент выполнени,делим на ноль
    completionRate: total === 0 ? 0 : Math.round((done / total) * 100),
  };
}

// Просрочена ли задача есть срок, он в прошлом и она ещё не выполнена
function isOverdue(task) {
  if (task.status === Tasks.STATUSES.DONE) return false;
  if (!task.dueDate) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(task.dueDate);
  due.setHours(0, 0, 0, 0);
  return due.getTime() < today.getTime();
}

// Распределение задач по категориям для второй диаграммы
function byCategory(state) {
  const map = {};
  state.categories.forEach(c => (map[c] = 0));
  state.tasks.forEach(t => {
    if (map[t.category] == null) map[t.category] = 0;
    map[t.category]++;
  });
  return Object.keys(map).map(name => ({ name, count: map[name] }));
}

window.Analytics = { rating, summary, isOverdue, byCategory };
