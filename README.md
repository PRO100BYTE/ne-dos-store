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
- локальная авторизация `.nedos Passport`
- вход через Sculk ID для связанных аккаунтов
- публичная отправка команд на модерацию только для авторизованных пользователей
- RBAC: uploader / moderator / admin
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
- Frontend: `http://localhost:3055`
- API: `http://localhost:8787`

Bootstrap-админ `.nedos Passport` по умолчанию в dev-режиме:
- username: `admin`
- password: `admin123`

Sculk Callback URL для Strict URL Check:
- `http://localhost:8787/api/auth/sculk/callback`

Для production:
- выставить `PASSPORT_BOOTSTRAP_ADMIN`
- выставить `PASSPORT_BOOTSTRAP_PASSWORD`
- выставить `SCULK_CALLBACK_URL` (если callback не локальный)
- при необходимости выставить `DATABASE_URL`

## Скрипты

- `npm run dev` - одновременно запускает API и React (WEB на `3055`)
- `npm run server` - только NodeJS backend
- `npm run start:prod` - backend + выдача собранного frontend из `build/`
- `npm start` / `npm run frontend` - только React frontend (порт `3055`)
- `npm run build` / `npm run build:frontend` - production build frontend
- `npm run test:ci` - запуск unit tests без watch
- `npm run test:integration` - smoke/integration проверки API

## API

- `GET /api/health` - health check
- `GET /api/meta` - категории, теги, происхождение, размер реестра, moderation stats
- `GET /api/auth/sculk/config` - конфиг Sculk + callback URL
- `GET /api/auth/sculk/callback` - callback endpoint
- `POST /api/auth/sculk/login` - вход через Sculk ID
- `POST /api/auth/passport/register` - регистрация `.nedos Passport`
- `POST /api/auth/passport/login` - вход `.nedos Passport`
- `POST /api/auth/passport/link-existing` - связка Sculk ID с существующим `.nedos Passport`
- `GET /api/auth/session` - информация о текущей сессии
- `GET /api/commands` - список команд
   - query params: `query`, `category`, `tag`, `sort`, `verified`, `origin`, `status`
- `GET /api/commands/:slug` - карточка команды
- `GET /api/commands/:slug/install` - install payload + SHA-256 + verification source
- `POST /api/commands/:slug/install-track` - фиксация установки
- `GET /api/commands/:slug/reviews` - отзывы
- `POST /api/commands/:slug/reviews` - оставить отзыв
- `POST /api/submissions` - отправка community-команды (uploader/moderator/admin)
- `GET /api/admin/overview` - обзор магазина (moderator/admin)
- `GET /api/admin/submissions` - очередь модерации (moderator/admin)
- `POST /api/admin/submissions/:id/approve` - одобрить команду (moderator/admin)
- `POST /api/admin/submissions/:id/reject` - отклонить команду (moderator/admin)
- `GET /api/admin/moderation-history` - история модерации (admin)
- `GET /api/admin/accounts` - список аккаунтов (admin)
- `POST /api/admin/accounts` - создание аккаунта (admin)
- `PATCH /api/admin/accounts/:username` - изменение аккаунта (admin)
- `DELETE /api/admin/accounts/:username` - удаление аккаунта (admin)
- `GET /api/admin/apps` - список приложений (admin)
- `POST /api/admin/apps` - добавление приложения (admin)
- `PATCH /api/admin/commands/:slug` - изменение/скрытие community-приложения (admin)
- `DELETE /api/admin/apps/:slug` - удаление приложения (admin)
- `GET /api/packages/core/:group/:file` - выдача core-пакетов из локального snapshot
- `GET /api/packages/:scope/:file` - выдача локальных JS-пакетов магазина

## Источники каталога

- `server/data/coreCommands.generated.json` - core-команды из `ne-dos` branch `big-reload-1.3.0`
- `server/data/communityCommands.json` - встроенные community-команды
- `server/data/submissions.json` - пользовательские отправки

### Генерация core-реестра

Скрипт:
- `server/scripts/generate-core-registry.js`
- `server/scripts/sync-core-packages.js`

Он:
- читает список команд из соседнего локального репозитория `../ne-dos`
- забирает содержимое из ветки `big-reload-1.3.0`
- считает `sha256`
- генерирует `server/data/coreCommands.generated.json`
- синхронизирует локальный snapshot в `server/packages/core/`

Это дает fallback-модель: установка команд не зависит от доступности GitHub в runtime.

## PostgreSQL схема

Файл:
- `server/db/schema.sql`

Таблицы:
- `command_reviews`
- `install_history`
- `command_submissions`

Если `DATABASE_URL` не задан, backend работает через JSON-файлы в `server/data/`.

## Passport и роли

- Документация по авторизации: `docs/passport-auth.md`
- Документация по ролям: `docs/roles-and-access.md`

## Moderation flow

1. Пользователь отправляет команду через вкладку `Публикация`
2. Скрипт сохраняется в `server/packages/submitted/`
3. Backend считает SHA-256 и ставит статус `pending`
4. Модератор/админ заходит во вкладку `Админка`
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

- Интеграция PRO100ID (PRO100BYTE Team ID) как SSO-провайдера
- Подключение Authentik как внешнего Identity Provider
- Автоматическая подпись пакетов
- PostgreSQL-only режим без JSON fallback
- Публичные страницы авторов и changelog команд
