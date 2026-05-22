const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { db } = require('./db/database');
const { getUserById, getUserByUsernameWithPassword, createUser, ROLE_ADMINISTRATOR, ROLE_UPLOADER } = require('./db/users');

const app = express();
const PORT = process.env.PORT || 8787;
const DATA_DIR = path.join(__dirname, 'data');
const PACKAGES_DIR = path.join(__dirname, 'packages');

// Middleware
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors());
app.use(express.json({ limit: '2mb' }));
app.use(morgan('dev'));

// Serving static build
const BUILD_DIR = path.resolve(__dirname, '..', 'build');
if (fs.existsSync(BUILD_DIR)) {
  app.use(express.static(BUILD_DIR));
}

/**
 * Вспомогательные функции
 */
function nowIso() {
  return new Date().toISOString();
}

function sha256(text) {
  return crypto. createHash('sha256').update(text).digest('hex');
}

/**
 * Инициализирует admin пользователя если его нет
 */
function ensureBootstrapAdmin() {
  try {
    const admin = db.prepare('SELECT * FROM users WHERE username = ? COLLATE NOCASE').get('admin');
    if (!admin) {
      console.log('🔧 Creating bootstrap admin user...');
      const password = process.env.PASSPORT_BOOTSTRAP_PASSWORD || 'admin123';
      const passwordHash = sha256(`.nedos-passport:${password}`);
      const now = nowIso();
      const userId = crypto.randomUUID();
      
      db.prepare(`
        INSERT INTO users (id, username, password_hash, display_name, roles, status, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, 'active', ?, ?)
      `).run(userId, 'admin', passwordHash, '.nedos Passport Admin',  JSON.stringify([ROLE_UPLOADER, ROLE_ADMINISTRATOR]), now, now);
      
      console.log('✓ Bootstrap admin created');
    }
  } catch (err) {
    console.error('✗ Failed to ensure bootstrap admin:', err);
  }
}

ensureBootstrapAdmin();

/**
 * Здравоохранение
 */
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'ne-dos-store-api', now: nowIso() });
});

/**
 * Авторизация - Вход
 */
app.post('/api/auth/passport/login', (req, res) => {
  try {
    const { username, password } = req.body || {};
    
    if (!username || !password) {
      return res.status(400).json({ message: 'Username and password required' });
    }
    
    const userRecord = db.prepare('SELECT * FROM users WHERE username = ? COLLATE NOCASE').get(username);
    if (!userRecord) {
      return res.status(401).json({ message: 'Invalid username or password' });
    }
    
    const passwordHash = sha256(`.nedos-passport:${password}`);
    if (passwordHash !== userRecord.password_hash) {
      return res.status(401).json({ message: 'Invalid username or password' });
    }
    
    // Update last login
    db.prepare('UPDATE users SET last_login_at = ? WHERE id = ?').run(nowIso(), userRecord.id);
    
    // Create session token
    const payload = {
      userId: userRecord.id,
      username: userRecord.username,
      displayName: userRecord.display_name,
      roles: JSON.parse(userRecord.roles || '[]'),
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60),
    };
    
    const tokenBody = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const sig = crypto.createHmac('sha256', process.env.SESSION_SECRET || 'dev-secret')
      .update(tokenBody).digest('hex');
    const token = `${tokenBody}.${sig}`;
    
    res.json({
      session: token,
      account: {
        id: userRecord.id,
        username: userRecord.username,
        displayName: userRecord.display_name,
        roles: JSON.parse(userRecord.roles || '[]'),
      },
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

/**
 * Авторизация - Сессия
 */
app.get('/api/auth/session', (req, res) => {
  try {
    const token = req.header('x-nedos-session') || String(req.header('authorization') || '').replace(/^Bearer\s+/i, '');
    
    if (!token) {
      return res.status(401).json({ message: 'No session' });
    }
    
    const [tokenBody, sig] = token.split('.');
    if (!tokenBody || !sig) {
      return res.status(401).json({ message: 'Invalid token format' });
    }
    
    const expectedSig = crypto.createHmac('sha256', process.env.SESSION_SECRET || 'dev-secret')
      .update(tokenBody).digest('hex');
    
    if (expectedSig !== sig) {
      return res.status(401).json({ message: 'Invalid token signature' });
    }
    
    const payload = JSON.parse(Buffer.from(tokenBody, 'base64url').toString());
    
    // Check expiration
    if (payload.exp && Math.floor(Date.now() / 1000) > payload.exp) {
      return res.status(401).json({ message: 'Token expired' });
    }
    
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(payload.userId);
    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }
    
    res.json({
      session: { ...payload },
      account: {
        id: user.id,
        username: user.username,
        displayName: user.display_name,
        roles: JSON.parse(user.roles || '[]'),
      },
    });
  } catch (err) {
    console.error('Session error:', err);
    res.status(401).json({ message: 'Invalid session' });
  }
});

/**
 * Fallback - serve React app
 */
app.get('*', (req, res) => {
  if (req.accepts('html')) {
    res.sendFile(path.join(BUILD_DIR, 'index.html'));
  } else {
    res.status(404).json({ message: 'Not Found' });
  }
});

/**
 * Start server
 */
app.listen(PORT, () => {
  console.log(`🚀 NE-DOS Store API running on http://localhost:${PORT}`);
});

module.exports = app;
