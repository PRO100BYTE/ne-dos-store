<h1 align="left">
  <br>
  <a href="https://ne-dos.ru/"><img src="https://raw.githubusercontent.com/PRO100BYTE/ne-dos/master/.github/images/nedos-title.png" alt="NE-DOS" width="500"></a>
</h1>

# NE-DOS Store - каталог команд для NE-DOS

NE-DOS Store - fullstack-магазин команд для NE-DOS:
- NodeJS backend (реестр команд, поиск, install payload)
- React frontend (каталог, фильтры, установка)

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

## Скрипты

- `npm run dev` - одновременно запускает API и React
- `npm run server` - только NodeJS backend
- `npm start` - только React frontend
- `npm run build` - production build frontend

## API (MVP)

- `GET /api/health` - health check
- `GET /api/meta` - категории, теги, размер реестра
- `GET /api/commands` - список команд
  - query params: `query`, `category`, `tag`, `sort`, `verified`
- `GET /api/commands/:slug` - карточка команды
- `GET /api/commands/:slug/install` - install payload для NE-DOS
- `POST /api/commands/:slug/install-track` - фиксация установки

## Формат команды в реестре

Реестр: `server/data/commands.json`

Поля:
- `slug`, `name`, `title`, `description`
- `version`, `author`, `category`, `tags`
- `sourceUrl` (raw JS из репозитория команд)
- `downloads`, `rating`, `verified`

## Дальнейшее расширение

- Верификация команд по SHA-256
- Авторизация и публикация community-команд
- Рейтинги/отзывы в базе (PostgreSQL)
- WebSocket-метрики онлайн-установок
