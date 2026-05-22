# Роли и доступ

Ролевой доступ в NE-DOS Store строится на `.nedos Passport`.

## Роли

- `uploader`: может загружать пользовательские команды
- `moderator`: может модерировать заявки (approve/reject)
- `admin`: полный контроль над системой

## Требования по действиям

Загрузка пользовательских команд:

- нужен `.nedos Passport` с ролью `uploader`/`moderator`/`admin`

Модерация заявок:

- нужен `.nedos Passport` с ролью `moderator` или `admin`

Администрирование:

- нужен `.nedos Passport` с ролью `admin`

## Права администратора

Администратор может:

- создавать, изменять, удалять учетные записи
- модерировать приложения
- просматривать историю модерации
- управлять доступными приложениями (добавление, удаление, изменение, скрытие)

## API

Uploader/Moderator/Admin:

- `POST /api/submissions`

Moderator/Admin:

- `GET /api/admin/overview`
- `GET /api/admin/submissions`
- `POST /api/admin/submissions/:id/approve`
- `POST /api/admin/submissions/:id/reject`

Admin:

- `GET /api/admin/accounts`
- `POST /api/admin/accounts`
- `PATCH /api/admin/accounts/:username`
- `DELETE /api/admin/accounts/:username`
- `GET /api/admin/moderation-history`
- `GET /api/admin/apps`
- `POST /api/admin/apps`
- `PATCH /api/admin/commands/:slug`
- `DELETE /api/admin/apps/:slug`
