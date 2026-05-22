const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execSync } = require('child_process');

const branch = process.env.NE_DOS_BRANCH || 'big-reload-1.3.0';
const repo = process.env.NE_DOS_REPO || path.resolve(__dirname, '..', '..', '..', 'ne-dos');
const outFile = path.resolve(__dirname, '..', 'data', 'coreCommands.generated.json');

const overrides = {
  ansidemo: 'Демонстрирует ANSI-стили, цвета и терминальные эффекты.',
  debug: 'Показывает отладочную информацию о текущем состоянии NE-DOS.',
  edit: 'Открывает встроенный текстовый редактор в терминальном интерфейсе.',
  js: 'Запускает JavaScript REPL внутри NE-DOS.',
  list: 'Показывает список данных или объектов в приложении.',
  nc: 'Терминальный netcat-подобный клиент для сетевых сценариев.',
  paint: 'Запускает рисовалку в терминале.',
  player: 'Запускает музыкальный плеер внутри NE-DOS.',
  qb: 'Открывает экспериментальную BASIC/QB-подобную среду.',
  snake: 'Классическая игра Snake.',
  telnet: 'Подключение к удалённым адресам по telnet-подобному сценарию.',
  tetris: 'Классическая игра Tetris.',
  ecode: 'Работа с ECode API из терминала.',
  attrib: 'Показывает или меняет атрибуты файлов.',
  cat: 'Выводит содержимое текстового файла.',
  cd: 'Меняет текущую директорию.',
  chkdsk: 'Проверяет файловую систему BrowserFS на ошибки.',
  copy: 'Копирует файлы и директории.',
  dir: 'Показывает содержимое директории.',
  download: 'Скачивает файл во внешнюю систему пользователя.',
  fc: 'Сравнивает содержимое двух файлов.',
  find: 'Ищет файлы или текст по шаблону.',
  findstr: 'Ищет строки по тексту или шаблону.',
  mkdir: 'Создаёт директорию.',
  move: 'Перемещает файлы и директории.',
  rename: 'Переименовывает файл или директорию.',
  rm: 'Удаляет файл.',
  rmdir: 'Удаляет директорию.',
  tree: 'Показывает дерево каталогов.',
  upload: 'Загружает файл в BrowserFS.',
  xcopy: 'Расширенное копирование файлов и папок.',
  confetti: 'Запускает праздничный визуальный эффект.',
  credits: 'Показывает авторов проекта.',
  date: 'Показывает текущую дату.',
  github: 'Открывает GitHub-репозиторий проекта.',
  httpcat: 'Показывает HTTP-картинки с котами по статус-коду.',
  httpdog: 'Показывает HTTP-картинки с собаками по статус-коду.',
  matrix: 'Запускает эффект Matrix.',
  time: 'Показывает текущее время.',
  www: 'Открывает URL в новой вкладке.',
  cls: 'Очищает экран терминала.',
  command: 'Показывает информацию о команде или запускает системную оболочку команды.',
  doskey: 'Управляет макросами и историей команд.',
  fullscreen: 'Переключает полноэкранный режим приложения.',
  help: 'Показывает справку по командам.',
  mem: 'Показывает использование памяти.',
  mode: 'Настраивает режимы терминала.',
  path: 'Показывает или меняет пути поиска команд.',
  prompt: 'Меняет приглашение терминала.',
  reboot: 'Перезапускает NE-DOS.',
  registercommand: 'Регистрирует внешнюю JS-команду в системе.',
  set: 'Задаёт или показывает переменные окружения.',
  status: 'Показывает состояние системы.',
  ver: 'Показывает версию NE-DOS.',
  wait: 'Делает искусственную паузу.',
  aboutme: 'Показывает информацию об авторе/пользователе.',
  base64: 'Кодирует и декодирует Base64.',
  calc: 'Выполняет арифметические вычисления.',
  calendar: 'Показывает календарь.',
  echo: 'Выводит текст в терминал.',
  geo: 'Показывает географическую информацию по координатам или городу.',
  geoip: 'Определяет геолокацию по IP.',
  ip: 'Показывает внешний IP-адрес.',
  ipconfig: 'Показывает сетевую конфигурацию.',
  more: 'Показывает текст постранично.',
  netstat: 'Показывает сетевую статистику и соединения.',
  notes: 'Открывает заметки пользователя.',
  password: 'Генерирует пароль.',
  ping: 'Проверяет сетевую доступность хоста.',
  sort: 'Сортирует строки.',
  traceroute: 'Показывает маршрут до хоста.',
  weather: 'Показывает погоду по городу.'
};

const categoryMap = {
  Apps: 'apps',
  ECodeAPI: 'api',
  Filesystem: 'filesystem',
  General: 'general',
  System: 'system',
  Utility: 'utility'
};

const tagsByCategory = {
  apps: ['app', 'interactive'],
  api: ['api', 'online'],
  filesystem: ['filesystem', 'files'],
  general: ['general', 'ui'],
  system: ['system', 'core'],
  utility: ['utility', 'productivity']
};

function titleFromName(name) {
  return name.charAt(0).toUpperCase() + name.slice(1);
}

function genericDescription(category, name) {
  const textByCategory = {
    apps: 'Интерактивное терминальное приложение для NE-DOS.',
    api: 'Команда для работы с внешним API и онлайновыми данными.',
    filesystem: 'Команда для работы с виртуальной файловой системой NE-DOS.',
    general: 'Общая пользовательская команда NE-DOS.',
    system: 'Системная команда управления окружением NE-DOS.',
    utility: 'Практическая утилита для повседневных задач в NE-DOS.'
  };
  return overrides[name] || textByCategory[category] || 'Команда для NE-DOS.';
}

const fileList = execSync(`git -C "${repo}" ls-tree -r --name-only ${branch} src/commands`, { encoding: 'utf8' })
  .split(/\r?\n/)
  .filter(Boolean)
  .filter((item) => item.endsWith('.js'))
  .filter((item) => !item.endsWith('StorageManager.js'));

const registry = fileList.map((filePath, index) => {
  const parts = filePath.split('/');
  const group = parts[2];
  const fileName = parts[3].replace(/\.js$/, '');
  const category = categoryMap[group] || 'community';
  const source = execSync(`git -C "${repo}" show ${branch}:${filePath}`, { encoding: 'utf8', maxBuffer: 1024 * 1024 * 4 });
  const sha256 = crypto.createHash('sha256').update(source, 'utf8').digest('hex');

  return {
    slug: fileName,
    name: fileName,
    title: titleFromName(fileName),
    description: genericDescription(category, fileName),
    version: '1.3.0',
    author: 'NE-DOS Core',
    category,
    tags: [...new Set([...(tagsByCategory[category] || []), group.toLowerCase()])],
    sourceUrl: `https://raw.githubusercontent.com/PRO100BYTE/ne-dos/${branch}/${filePath}`,
    sha256,
    downloads: 10000 - index * 71 > 0 ? 10000 - index * 71 : 500,
    rating: Number((4.2 + ((index % 8) * 0.1)).toFixed(1)),
    verified: true,
    origin: 'core',
    status: 'approved'
  };
});

fs.writeFileSync(outFile, JSON.stringify(registry, null, 2));
console.log(`Generated ${registry.length} commands -> ${outFile}`);
