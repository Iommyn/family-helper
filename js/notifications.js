// notifications.js напоминания о приближающихся и просроченных сроках

// Сколько целых дней осталось до срока (отрицательное число просрочено)
function daysLeft(dueDate) {
  if (!dueDate) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);
  const diffMs = due.getTime() - today.getTime();
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

// Собираем список уведомлени просроченные и те, у которых срок
// наступает в блжайшие reminderDays дней только активные задачи
function collect(state) {
  const limit = state.settings.reminderDays;
  const result = [];

  state.tasks.forEach(task => {
    if (task.status === Tasks.STATUSES.DONE) return;
    if (!task.dueDate) return;

    const left = daysLeft(task.dueDate);
    if (left == null) return;

    if (left < 0) {
      result.push({
        task,
        left,
        level: 'overdue',
        text: 'Просрочено на ' + Math.abs(left) + ' дн.: «' + task.title + '»',
      });
    } else if (left === 0) {
      result.push({
        task,
        left,
        level: 'today',
        text: 'Сегодня срок: «' + task.title + '»',
      });
    } else if (left <= limit) {
      result.push({
        task,
        left,
        level: 'soon',
        text: 'Осталось ' + left + ' дн.: «' + task.title + '»',
      });
    }
  });

  // сначала самые срочные
  result.sort((a, b) => a.left - b.left);
  return result;
}

window.Notifications = { daysLeft, collect };
