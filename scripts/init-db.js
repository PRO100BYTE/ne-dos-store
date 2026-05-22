#!/usr/bin/env node

/**
 * Инициализирует admin пользователя и необходимые данные в БД
 */

const { db } = require('./server/db/database');
const { getUserByUsername, createUser, ROLE_ADMINISTRATOR, ROLE_UPLOADER } = require('./server/db/users');

console.log('🔧 Инициализация ne-dos-store...');

try {
  // Проверяем существует ли admin пользователь
  const adminUser = getUserByUsername('admin');
  
  if (!adminUser) {
    console.log('📝 Создаём admin пользователя...');
    const admin = createUser(
      'admin',
      process.env.PASSPORT_BOOTSTRAP_PASSWORD || 'admin123',
      '.nedos Passport Admin',
      [ROLE_UPLOADER, ROLE_ADMINISTRATOR]
    );
    console.log(`✓ Admin пользователь создан: ${admin.username}`);
  } else {
    console.log(`✓ Admin пользователь уже существует: ${adminUser.username}`);
  }

  console.log('✓ Инициализация завершена');
} catch (err) {
  console.error('✗ Ошибка инициализации:', err);
  process.exit(1);
}
