<h1 align="left">
  <br>
  <a href="https://ne-dos.ru/"><img src="https://raw.githubusercontent.com/PRO100BYTE/ne-dos/master/.github/images/nedos-title.png" alt="NE-DOS" width="500"></a>
</h1>

# NE-DOS Store - каталог команд для NE-DOS

NE-DOS Store - fullstack-магазин команд для NE-DOS:
- NodeJS backend (реестр, install payload, модерация, отзывы, install history)
- React frontend (каталог, submit-форма, админка)

Что уже реализовано:
- 72 core-команды из ветки `big-reload-1.3.0` репозитория `ne-dos`
- 10 community-команд/программ, хранящихся внутри магазина
- SHA-256 для install payload
- публичная отправка команд на модерацию
- админка для approve/reject
- PostgreSQL-ready схема + файловый fallback
- Docker-образ для fullstack-развёртывания
- GitHub workflows: test, build, integration, deploy

## Быстрый старт

1. Клонировать репозиторий:
   `git clone https://github.com/PRO100BYTE/ne-dos-store`
2. Установить зависимости:
   `npm install`
3. Запустить backend + frontend вместе:
   `npm run dev`

После запуска:
- Frontend: `http://localhost:3000`
- API: `http://localhost:8787`

Админ-токен по умолчанию в dev-режиме:
- `ne-dos-admin-dev-token`

Для production:
- выставить `ADMIN_TOKEN`
- при необходимости выставить `DATABASE_URL`

## Скрипты

- `npm run dev` - одновременно запускает API и React
- `npm run server` - только NodeJS backend
- `npm run start:prod` - backend + выдача собранного frontend из `build/`
- `npm start` - только React frontend
- `npm run build` / `npm run build:frontend` - production build frontend
- `npm run test:ci` - запуск unit tests без watch
- `npm run test:integration` - smoke/integration проверки API

## API

- `GET /api/health` - health check
- `GET /api/meta` - категории, теги, происхождение, размер реестра, moderation stats
- `GET /api/commands` - список команд
   - query params: `query`, `category`, `tag`, `sort`, `verified`, `origin`, `status`
- `GET /api/commands/:slug` - карточка команды
- `GET /api/commands/:slug/install` - install payload + SHA-256 + verification source
- `POST /api/commands/:slug/install-track` - фиксация установки
- `GET /api/commands/:slug/reviews` - отзывы
- `POST /api/commands/:slug/reviews` - оставить отзыв
- `POST /api/submissions` - отправка community-команды в очередь модерации
- `GET /api/admin/overview` - обзор магазина (admin)
- `GET /api/admin/submissions` - очередь модерации (admin)
- `POST /api/admin/submissions/:id/approve` - одобрить команду (admin)
- `POST /api/admin/submissions/:id/reject` - отклонить команду (admin)
- `PATCH /api/admin/commands/:slug` - правка community-команды (admin)
- `GET /api/packages/:scope/:file` - выдача локальных JS-пакетов магазина

## Источники каталога

- `server/data/coreCommands.generated.json` - core-команды из `ne-dos` branch `big-reload-1.3.0`
- `server/data/communityCommands.json` - встроенные community-команды
- `server/data/submissions.json` - пользовательские отправки

### Генерация core-реестра

Скрипт:
- `server/scripts/generate-core-registry.js`

Он:
- читает список команд из соседнего локального репозитория `../ne-dos`
- забирает содержимое из ветки `big-reload-1.3.0`
- считает `sha256`
- генерирует `server/data/coreCommands.generated.json`

## PostgreSQL схема

Файл:
- `server/db/schema.sql`

Таблицы:
- `command_reviews`
- `install_history`
- `command_submissions`

Если `DATABASE_URL` не задан, backend работает через JSON-файлы в `server/data/`.

## Admin flow

1. Пользователь отправляет команду через вкладку `Публикация`
2. Скрипт сохраняется в `server/packages/submitted/`
3. Backend считает SHA-256 и ставит статус `pending`
4. Модератор заходит во вкладку `Админка`
5. После `approve` команда сразу попадает в каталог

## Docker / deployment

Собрать контейнер локально:
- `docker build -t ne-dos-store .`

Запустить:
- `docker run -p 8787:8787 -e ADMIN_TOKEN=your-token ne-dos-store`

Контейнер публикует fullstack-магазин:
- Express API
- статический frontend из `build/`

## GitHub Workflows

- `.github/workflows/ci.yml`
   - unit tests
   - production frontend build
   - smoke по артефактам

- `.github/workflows/integration.yml`
   - поднимает backend
   - гоняет integration script
   - проверяет submission -> approve -> publish flow

- `.github/workflows/deploy.yml`
   - собирает Docker image
   - публикует контейнер в GHCR

## Дальнейшее развитие

- OAuth / XorekID для авторов и модераторов
- Автоматическая подпись пакетов
- PostgreSQL-only режим без JSON fallback
- Публичные страницы авторов и changelog команд
- Автообновление реестра из `ne-dos` по расписанию
