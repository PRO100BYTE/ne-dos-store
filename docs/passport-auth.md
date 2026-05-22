# .nedos Passport и Sculk ID

NE-DOS Store использует локальную систему учетных записей `.nedos Passport`.

## Callback URL для Sculk

Для Strict URL Check используйте:

- `http://localhost:8787/api/auth/sculk/callback`

Этот URL отдается backend-ом в `GET /api/auth/sculk/config` как `callbackUrl`.

## Локальная модель авторизации

Поддерживаются 2 варианта входа:

1. Локальный `.nedos Passport` (`username` + `password`)
2. Sculk ID (token или authorization code) при условии, что Sculk-аккаунт связан с `.nedos Passport`

Если пользователь входит через Sculk ID без связанного аккаунта, backend возвращает:

- `409`
- `code: SCULK_NOT_LINKED`
- сообщение с предложением:
  - указать существующую учетную запись NE-DOS
  - или зарегистрировать новую

UI формы публикации поддерживает оба действия:

- `POST /api/auth/passport/link-existing`
- `POST /api/auth/passport/register`

## Основные эндпоинты auth

- `GET /api/auth/sculk/config`
- `GET /api/auth/sculk/callback`
- `POST /api/auth/sculk/login`
- `POST /api/auth/passport/register`
- `POST /api/auth/passport/login`
- `POST /api/auth/passport/link-existing`
- `GET /api/auth/session`

## Сессия

После успешного входа выдается `.nedos Passport` session token.

Передавайте токен в заголовке:

- `x-nedos-session: <token>`

Токен включает:

- идентификатор аккаунта
- имя пользователя
- роли
- срок действия

## Хранилище аккаунтов

Файл локальных аккаунтов:

- `server/data/passportAccounts.json`

Файл истории модерации и административных действий:

- `server/data/moderation-history.json`

При первом запуске backend автоматически создает bootstrap-админа:

- username: значение `PASSPORT_BOOTSTRAP_ADMIN` (по умолчанию `admin`)
- password: значение `PASSPORT_BOOTSTRAP_PASSWORD` (по умолчанию `admin123`)

Для production обязательно задайте свои значения через переменные окружения.
