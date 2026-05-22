const express = require('express');
const crypto = require('crypto');
const {
  ROLE_ADMINISTRATOR,
  hashPassword,
  verifyPassword,
  validatePasswordStrength,
  validateUsername,
  getUserById,
  getUserByUsername,
  getUserByUsernameWithPassword,
  createUser,
  updateUser,
} = require('../db/users');

const router = express.Router();

function base64UrlEncode(value) {
  return Buffer.from(value).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

function base64UrlDecode(value) {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4);
  return Buffer.from(padded, 'base64').toString('utf-8');
}

function signSessionToken(payload, secret) {
  const body = base64UrlEncode(JSON.stringify(payload));
  const signature = crypto.createHmac('sha256', secret).update(body).digest('hex');
  return `${body}.${signature}`;
}

function verifySessionToken(token, secret) {
  if (!token || typeof token !== 'string') return null;
  const [body, signature] = token.split('.');
  if (!body || !signature) return null;
  const expected = crypto.createHmac('sha256', secret).update(body).digest('hex');
  if (expected !== signature) return null;
  try {
    const payload = JSON.parse(base64UrlDecode(body));
    if (payload.expiresAt && Date.now() > Number(payload.expiresAt)) return null;
    return payload;
  } catch {
    return null;
  }
}

const SESSION_SECRET = process.env.SCULK_SESSION_SECRET || 'ne-dos-store-session-secret-dev';

/**
 * POST /api/auth/passport/login
 * Вход с username и password
 */
router.post('/passport/login', (req, res) => {
  const { username, password } = req.body || {};

  if (!username || !password) {
    return res.status(400).json({ message: 'username и password обязательны' });
  }

  const userRecord = getUserByUsernameWithPassword(username);
  if (!userRecord) {
    return res.status(401).json({ message: 'Неверное имя пользователя или пароль' });
  }

  const passwordHash = hashPassword(password);
  if (passwordHash !== userRecord.password_hash) {
    return res.status(401).json({ message: 'Неверное имя пользователя или пароль' });
  }

  const user = getUserById(userRecord.id);

  // Обновляем last_login_at
  updateUser(user.id, { lastLoginAt: new Date().toISOString() });

  // Создаём сессию
  const session = signSessionToken(
    {
      userId: user.id,
      username: user.username,
      displayName: user.displayName,
      roles: user.roles,
      issuedAt: Date.now(),
      expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
    },
    SESSION_SECRET
  );

  res.json({
    session,
    account: user,
  });
});

/**
 * POST /api/auth/passport/register
 * Регистрация нового пользователя
 */
router.post('/passport/register', (req, res) => {
  const { username, password, passwordConfirm, displayName } = req.body || {};

  // Валидация username
  const usernameValidation = validateUsername(username);
  if (!usernameValidation.valid) {
    return res.status(400).json({ message: usernameValidation.errors[0] });
  }

  // Валидация пароля
  const passwordValidation = validatePasswordStrength(password);
  if (!passwordValidation.valid) {
    return res.status(400).json({ message: passwordValidation.errors[0] });
  }

  // Проверка совпадения паролей
  if (password !== passwordConfirm) {
    return res.status(400).json({ message: 'Пароли не совпадают' });
  }

  // Создаём пользователя
  try {
    const user = createUser(username, password, displayName);

    // Создаём сессию
    const session = signSessionToken(
      {
        userId: user.id,
        username: user.username,
        displayName: user.displayName,
        roles: user.roles,
        issuedAt: Date.now(),
        expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
      },
      SESSION_SECRET
    );

    res.status(201).json({
      session,
      account: user,
    });
  } catch (err) {
    if (err.code === 'USERNAME_EXISTS') {
      return res.status(409).json({ message: 'Это имя пользователя уже занято' });
    }
    if (err.code === 'WEAK_PASSWORD') {
      return res.status(400).json({ message: err.message });
    }
    if (err.code === 'INVALID_USERNAME') {
      return res.status(400).json({ message: err.message });
    }
    return res.status(500).json({ message: 'Ошибка при создании аккаунта' });
  }
});

/**
 * GET /api/auth/session
 * Проверка текущей сессии
 */
router.get('/session', (req, res) => {
  const token = req.header('x-nedos-session') || String(req.header('authorization') || '').replace(/^Bearer\s+/i, '');

  if (!token) {
    return res.status(401).json({ message: 'Сессия не найдена' });
  }

  const session = verifySessionToken(token, SESSION_SECRET);
  if (!session || !session.userId) {
    return res.status(401).json({ message: 'Неверная или истёкшая сессия' });
  }

  const user = getUserById(session.userId);
  if (!user) {
    return res.status(401).json({ message: 'Пользователь не найден' });
  }

  res.json({
    session,
    account: user,
  });
});

/**
 * GET /api/auth/sculk/authorize
 * Инициирует OAuth флоу для Sculk
 */
router.get('/sculk/authorize', (req, res) => {
  const clientId = process.env.SCULK_CLIENT_ID || '';
  if (!clientId) {
    return res.status(503).json({ message: 'Sculk OAuth не настроен (отсутствует SCULK_CLIENT_ID)' });
  }

  const state = base64UrlEncode(
    JSON.stringify({
      nonce: crypto.randomBytes(16).toString('hex'),
      iat: Date.now(),
    })
  );

  const SCULK_AUTHORIZE_URL = process.env.SCULK_AUTHORIZE_URL || 'https://my.sculk.ltd/api/sso/authorize';
  const SCULK_CALLBACK_URL = process.env.SCULK_CALLBACK_URL || `http://localhost:8787/api/auth/sculk/callback`;

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: SCULK_CALLBACK_URL,
    response_type: 'code',
    scope: 'profile',
    state,
  });

  const redirectUrl = `${SCULK_AUTHORIZE_URL}?${params.toString()}`;

  res.json({ redirectUrl, state });
});

module.exports = {
  router,
  signSessionToken,
  verifySessionToken,
  SESSION_SECRET,
};
