const crypto = require('crypto');
const { db } = require('./database');

const ROLE_ADMINISTRATOR = 'Administrator';
const ROLE_APP_MODERATOR = 'ApplicationModerator';
const ROLE_UPLOADER = 'uploader';
const ROLE_USER = 'user';

/**
 * Генерирует хеш пароля
 */
function hashPassword(password) {
  return crypto.createHash('sha256').update(`.nedos-passport:${String(password)}`).digest('hex');
}

/**
 * Проверяет пароль
 */
function verifyPassword(password, hash) {
  return hashPassword(password) === hash;
}

/**
 * Валидирует сложность пароля
 */
function validatePasswordStrength(password) {
  const errors = [];
  
  if (password.length < 8) {
    errors.push('Пароль должен быть не менее 8 символов');
  }
  if (!/[a-z]/.test(password)) {
    errors.push('Пароль должен содержать строчные буквы (a-z)');
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('Пароль должен содержать прописные буквы (A-Z)');
  }
  if (!/[0-9]/.test(password)) {
    errors.push('Пароль должен содержать цифры (0-9)');
  }
  
  return { valid: errors.length === 0, errors };
}

/**
 * Валидирует имя пользователя
 */
function validateUsername(username) {
  const errors = [];
  const trimmed = String(username || '').trim();
  
  if (!trimmed) {
    errors.push('Имя пользователя не может быть пустым');
  } else if (trimmed.length < 3) {
    errors.push('Имя пользователя должно быть не менее 3 символов');
  } else if (trimmed.length > 32) {
    errors.push('Имя пользователя не может быть более 32 символов');
  } else if (!/^[a-zA-Z0-9_-]+$/.test(trimmed)) {
    errors.push('Имя пользователя может содержать только буквы, цифры, подчеркивание и дефис');
  }
  
  return { valid: errors.length === 0, errors };
}

/**
 * Получает пользователя по ID
 */
function getUserById(userId) {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
  return user ? normalizeUser(user) : null;
}

/**
 * Получает пользователя по имени (с паролем для проверки)
 */
function getUserByUsername(username) {
  const user = db.prepare('SELECT * FROM users WHERE username = ? COLLATE NOCASE').get(username);
  return user ? normalizeUser(user) : null;
}

/**
 * Получает пользователя по имени с хешем пароля (только для авторизации)
 */
function getUserByUsernameWithPassword(username) {
  return db.prepare('SELECT * FROM users WHERE username = ? COLLATE NOCASE').get(username);
}

/**
 * Проверяет существует ли имя пользователя
 */
function usernameExists(username) {
  return db.prepare('SELECT 1 FROM users WHERE username = ? COLLATE NOCASE').get(username) !== undefined;
}

/**
 * Нормализует объект пользователя
 */
function normalizeUser(user) {
  return {
    id: user.id,
    username: user.username,
    displayName: user.display_name,
    roles: parseRoles(user.roles),
    status: user.status,
    createdAt: user.created_at,
    updatedAt: user.updated_at,
    lastLoginAt: user.last_login_at,
  };
}

/**
 * Парсит строку ролей (JSON или comma-separated)
 */
function parseRoles(rolesStr) {
  if (!rolesStr) return [];
  try {
    const parsed = JSON.parse(rolesStr);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return String(rolesStr).split(',').map(r => r.trim()).filter(Boolean);
  }
}

/**
 * Сохраняет роли как JSON
 */
function serializeRoles(roles) {
  return JSON.stringify(Array.isArray(roles) ? roles : []);
}

/**
 * Создаёт нового пользователя
 */
function createUser(username, password, displayName = null, roles = [ROLE_USER]) {
  const validation = validateUsername(username);
  if (!validation.valid) {
    const err = new Error(validation.errors[0]);
    err.code = 'INVALID_USERNAME';
    throw err;
  }
  
  if (usernameExists(username)) {
    const err = new Error('Это имя пользователя уже занято');
    err.code = 'USERNAME_EXISTS';
    throw err;
  }
  
  const passwordValidation = validatePasswordStrength(password);
  if (!passwordValidation.valid) {
    const err = new Error(passwordValidation.errors[0]);
    err.code = 'WEAK_PASSWORD';
    throw err;
  }
  
  const userId = crypto.randomUUID();
  const now = new Date().toISOString();
  const passwordHash = hashPassword(password);
  const rolesJson = serializeRoles(roles);
  
  db.prepare(`
    INSERT INTO users (id, username, password_hash, display_name, roles, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, 'active', ?, ?)
  `).run(userId, username, passwordHash, displayName || null, rolesJson, now, now);
  
  return normalizeUser(db.prepare('SELECT * FROM users WHERE id = ?').get(userId));
}

/**
 * Обновляет пользователя
 */
function updateUser(userId, patch) {
  const user = getUserById(userId);
  if (!user) {
    const err = new Error('User not found');
    err.code = 'USER_NOT_FOUND';
    throw err;
  }
  
  let roles = user.roles;
  if (patch.roles) {
    roles = patch.roles;
  }
  
  const now = new Date().toISOString();
  const rolesJson = serializeRoles(roles);
  
  db.prepare(`
    UPDATE users
    SET display_name = ?, roles = ?, status = ?, updated_at = ?
    WHERE id = ?
  `).run(patch.displayName !== undefined ? patch.displayName : user.displayName, rolesJson, patch.status || user.status, now, userId);
  
  if (patch.lastLoginAt) {
    db.prepare('UPDATE users SET last_login_at = ? WHERE id = ?').run(patch.lastLoginAt, userId);
  }
  
  return normalizeUser(db.prepare('SELECT * FROM users WHERE id = ?').get(userId));
}

/**
 * Удаляет пользователя
 */
function deleteUser(userId) {
  db.prepare('DELETE FROM users WHERE id = ?').run(userId);
}

/**
 * Получает все пользователей (админ функция)
 */
function getAllUsers(limit = 100, offset = 0) {
  const users = db.prepare('SELECT * FROM users LIMIT ? OFFSET ?').all(limit, offset);
  return users.map(normalizeUser);
}

module.exports = {
  ROLE_ADMINISTRATOR,
  ROLE_APP_MODERATOR,
  ROLE_UPLOADER,
  ROLE_USER,
  
  hashPassword,
  verifyPassword,
  validatePasswordStrength,
  validateUsername,
  
  getUserById,
  getUserByUsername,
  getUserByUsernameWithPassword,
  usernameExists,
  normalizeUser,
  
  createUser,
  updateUser,
  deleteUser,
  getAllUsers,
  
  parseRoles,
  serializeRoles,
};
