const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DATA_DIR = path.join(__dirname, '..', 'data');
const DB_PATH = path.join(DATA_DIR, 'store.db');

// Убедимся, что директория существует
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const db = new Database(DB_PATH);

// Включим foreign keys
db.pragma('foreign_keys = ON');

/**
 * Инициализация схемы БД с миграциями
 */
function initializeDatabase() {
  // Создаём таблицу миграций для отслеживания версии схемы
  db.exec(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  const appliedMigrations = new Set(
    db.prepare('SELECT name FROM _migrations').all().map(row => row.name)
  );

  // Определяем все миграции в порядке
  const migrations = [
    {
      name: '001_users_table',
      sql: `
        CREATE TABLE IF NOT EXISTS users (
          id TEXT PRIMARY KEY,
          username TEXT UNIQUE NOT NULL COLLATE NOCASE,
          password_hash TEXT NOT NULL,
          display_name TEXT,
          roles TEXT NOT NULL DEFAULT 'user',
          status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'disabled', 'suspended')),
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          last_login_at TEXT
        );
        CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
        CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
      `,
    },
    {
      name: '002_commands_table',
      sql: `
        CREATE TABLE IF NOT EXISTS commands (
          id TEXT PRIMARY KEY,
          slug TEXT UNIQUE NOT NULL,
          name TEXT NOT NULL,
          title TEXT,
          description TEXT,
          author TEXT,
          category TEXT,
          tags TEXT,
          version TEXT,
          status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
          source_url TEXT,
          sha256 TEXT,
          origin TEXT NOT NULL DEFAULT 'submitted' CHECK (origin IN ('core', 'community', 'submitted')),
          moderation_note TEXT,
          script_path TEXT,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          reviewed_at TEXT,
          reviewed_by TEXT
        );
        CREATE INDEX IF NOT EXISTS idx_commands_slug ON commands(slug);
        CREATE INDEX IF NOT EXISTS idx_commands_status ON commands(status);
        CREATE INDEX IF NOT EXISTS idx_commands_origin ON commands(origin);
        CREATE INDEX IF NOT EXISTS idx_commands_author ON commands(author);
      `,
    },
    {
      name: '003_command_reviews_table',
      sql: `
        CREATE TABLE IF NOT EXISTS command_reviews (
          id TEXT PRIMARY KEY,
          command_slug TEXT NOT NULL,
          author_name TEXT NOT NULL,
          rating INTEGER CHECK (rating >= 1 and rating <= 5),
          comment TEXT,
          created_at TEXT NOT NULL,
          FOREIGN KEY (command_slug) REFERENCES commands(slug) ON DELETE CASCADE
        );
        CREATE INDEX IF NOT EXISTS idx_reviews_command ON command_reviews(command_slug);
      `,
    },
    {
      name: '004_install_history_table',
      sql: `
        CREATE TABLE IF NOT EXISTS install_history (
          id TEXT PRIMARY KEY,
          command_slug TEXT NOT NULL,
          origin TEXT,
          installer_fingerprint TEXT,
          created_at TEXT NOT NULL,
          FOREIGN KEY (command_slug) REFERENCES commands(slug) ON DELETE CASCADE
        );
        CREATE INDEX IF NOT EXISTS idx_install_command ON install_history(command_slug);
        CREATE INDEX IF NOT EXISTS idx_install_date ON install_history(created_at);
      `,
    },
    {
      name: '005_sessions_table',
      sql: `
        CREATE TABLE IF NOT EXISTS sessions (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          auth_method TEXT NOT NULL,
          token TEXT UNIQUE NOT NULL,
          issued_at TEXT NOT NULL,
          expires_at TEXT NOT NULL,
          is_active INTEGER NOT NULL DEFAULT 1,
          created_at TEXT NOT NULL,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );
        CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
        CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
        CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);
      `,
    },
    {
      name: '006_sculk_linked_accounts_table',
      sql: `
        CREATE TABLE IF NOT EXISTS sculk_linked_accounts (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL UNIQUE,
          sculk_id TEXT UNIQUE NOT NULL,
          sculk_data TEXT,
          linked_at TEXT NOT NULL,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );
        CREATE INDEX IF NOT EXISTS idx_sculk_user ON sculk_linked_accounts(user_id);
        CREATE INDEX IF NOT EXISTS idx_sculk_id ON sculk_linked_accounts(sculk_id);
      `,
    },
  ];

  // Применяем миграции
  for (const migration of migrations) {
    if (!appliedMigrations.has(migration.name)) {
      try {
        db.exec(migration.sql);
        db.prepare('INSERT INTO _migrations (name) VALUES (?)').run(migration.name);
        console.log(`✓ Migration applied: ${migration.name}`);
      } catch (err) {
        console.error(`✗ Migration failed: ${migration.name}`, err);
        throw err;
      }
    }
  }

  console.log('✓ Database schema initialized');
}

// Инициализируем БД при загрузке модуля
initializeDatabase();

module.exports = {
  db,
  DB_PATH,
  DATA_DIR,
};
