
// Здесь собрано всё, что касается сохранения и чтения данных,
// чтобы остальные модули не знали, где именно лежат данные

const STORAGE_KEY = 'familyHelper:data:v1';

// Структура хранилища по умолчанию. Если в браузере ещё ничего нет,
// приложение стартует с этими значениями
function defaultState() {
  return {
    users: [],
    tasks: [],
    categories: ['Уборка', 'Покупки', 'Ремонт', 'Прочее'],
    settings: {
      // за сколько дней до срока показывать предупреждение
      reminderDays: 2,
    },
  };
}

// Читаем всё состояние из localStorage.
// localStorage хранит только строки, поэтому разбираем JSON вручную
// и аккуратно обрабатываем случай, когда данные битые
function load() {
  let raw;
  try {
    raw = localStorage.getItem(STORAGE_KEY);
  } catch (e) {
    // приватный режим в некоторых браузерах вообще запрещает доступ
    console.warn('Не удалось прочитать localStorage:', e);
    return defaultState();
  }

  if (!raw) {
    return defaultState();
  }

  try {
    const data = JSON.parse(raw);
    // подстраховка вдруг сохранён объект без нужных полей
    return Object.assign(defaultState(), data);
  } catch (e) {
    console.error('Данные в хранилище повреждены, начинаем с чистого листа.', e);
    return defaultState();
  }
}

// Сохраняем состояние целиком. Сериализуем в JSON
function save(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch (e) {
    // например, переполнено хранилище
    console.error('Не получилось сохранить данные:', e);
    return false;
  }
}

function clear() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (e) {
    console.warn(e);
  }
}

window.Storage = { load, save, clear, defaultState, STORAGE_KEY };
