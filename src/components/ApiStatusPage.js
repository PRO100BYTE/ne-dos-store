import React, { useEffect, useMemo, useState } from 'react';
import './ApiStatusPage.css';
import HttpErrorPage from './HttpErrorPage';

const ROUTES = [
  { method: 'GET', path: '/api/health', auth: 'public', description: 'Health check API и статуса БД' },
  { method: 'GET', path: '/api/meta', auth: 'public', description: 'Метаданные каталога: count, categories, tags, origins' },
  { method: 'GET', path: '/api/commands', auth: 'public', description: 'Список команд. query: query, category, tag, sort, verified, origin, status' },
  { method: 'GET', path: '/api/commands/:slug', auth: 'public', description: 'Карточка команды + отзывы' },
  { method: 'GET', path: '/api/commands/:slug/install', auth: 'public', description: 'Install payload: sourceUrl, sha256, verification, snippets' },
  { method: 'POST', path: '/api/commands/:slug/install-track', auth: 'public', description: 'Лог анонимной установки команды' },
  { method: 'GET', path: '/api/commands/:slug/reviews', auth: 'public', description: 'Отзывы по команде' },
  { method: 'POST', path: '/api/commands/:slug/reviews', auth: 'public', description: 'Создание отзыва' },
  { method: 'POST', path: '/api/submissions', auth: 'x-nedos-session + role uploader/ApplicationModerator/Administrator', description: 'Публикация пользовательской команды' },
  { method: 'GET', path: '/api/auth/sculk/config', auth: 'public', description: 'OAuth конфиг Sculk (authorize, callback, modes)' },
  { method: 'GET', path: '/api/auth/sculk/callback', auth: 'public', description: 'Callback endpoint Sculk authorize flow' },
  { method: 'POST', path: '/api/auth/sculk/login', auth: 'public', description: 'Вход через Sculk token/code (только для привязанных аккаунтов)' },
  { method: 'POST', path: '/api/auth/passport/register', auth: 'public', description: 'Регистрация .nedos Passport' },
  { method: 'POST', path: '/api/auth/passport/login', auth: 'public', description: 'Вход .nedos Passport' },
  { method: 'POST', path: '/api/auth/passport/link-existing', auth: 'public', description: 'Привязка Sculk ID к существующему .nedos Passport' },
  { method: 'GET', path: '/api/auth/session', auth: 'x-nedos-session', description: 'Информация о текущей авторизованной сессии' },
  { method: 'GET', path: '/api/admin/overview', auth: 'x-nedos-session + role ApplicationModerator/Administrator', description: 'Обзор админки' },
  { method: 'GET', path: '/api/admin/submissions', auth: 'x-nedos-session + role ApplicationModerator/Administrator', description: 'Очередь модерации' },
  { method: 'POST', path: '/api/admin/submissions/:id/approve', auth: 'x-nedos-session + role ApplicationModerator/Administrator', description: 'Одобрение заявки' },
  { method: 'POST', path: '/api/admin/submissions/:id/reject', auth: 'x-nedos-session + role ApplicationModerator/Administrator', description: 'Отклонение заявки' },
  { method: 'GET', path: '/api/admin/moderation-history', auth: 'x-nedos-session + role Administrator', description: 'История модерации' },
  { method: 'GET', path: '/api/admin/accounts', auth: 'x-nedos-session + role Administrator', description: 'Список аккаунтов' },
  { method: 'POST', path: '/api/admin/accounts', auth: 'x-nedos-session + role Administrator', description: 'Создание аккаунта' },
  { method: 'PATCH', path: '/api/admin/accounts/:username', auth: 'x-nedos-session + role Administrator', description: 'Обновление аккаунта' },
  { method: 'DELETE', path: '/api/admin/accounts/:username', auth: 'x-nedos-session + role Administrator', description: 'Удаление аккаунта' },
  { method: 'GET', path: '/api/admin/apps', auth: 'x-nedos-session + role Administrator', description: 'Список приложений' },
  { method: 'POST', path: '/api/admin/apps', auth: 'x-nedos-session + role Administrator', description: 'Добавление приложения' },
  { method: 'PATCH', path: '/api/admin/commands/:slug', auth: 'x-nedos-session + role Administrator', description: 'Изменение/скрытие community-команды' },
  { method: 'DELETE', path: '/api/admin/apps/:slug', auth: 'x-nedos-session + role Administrator', description: 'Удаление приложения' },
  { method: 'GET', path: '/api/packages/core/:group/:file', auth: 'public', description: 'Получение локального core package файла' },
  { method: 'GET', path: '/api/packages/:scope/:file', auth: 'public', description: 'Получение локального community/submitted package файла' },
];

function ApiStatusPage() {
  const [health, setHealth] = useState(null);
  const [meta, setMeta] = useState(null);
  const [error, setError] = useState(null);
  const [samples, setSamples] = useState([]);

  const load = async () => {
    try {
      setError(null);
      const started = performance.now();
      const healthRes = await fetch('/api/health');
      const healthData = await healthRes.json();
      if (!healthRes.ok) throw new Error(healthData.message || 'Failed to load health');

      const metaRes = await fetch('/api/meta');
      const metaData = await metaRes.json();
      if (!metaRes.ok) throw new Error(metaData.message || 'Failed to load meta');

      const duration = Math.round(performance.now() - started);
      setHealth(healthData);
      setMeta(metaData);
      setSamples((prev) => [...prev.slice(-29), { at: Date.now(), duration, ok: true }]);
    } catch (e) {
      setError(e.message || 'API monitoring failed');
      setSamples((prev) => [...prev.slice(-29), { at: Date.now(), duration: 0, ok: false }]);
    }
  };

  useEffect(() => {
    load();
    const id = setInterval(load, 10000);
    return () => clearInterval(id);
  }, []);

  const monitoring = useMemo(() => {
    if (!samples.length) return { uptime: 'n/a', avgMs: 'n/a', lastChecks: 0 };
    const total = samples.length;
    const okCount = samples.filter((s) => s.ok).length;
    const timings = samples.filter((s) => s.ok).map((s) => s.duration);
    const avg = timings.length ? Math.round(timings.reduce((a, b) => a + b, 0) / timings.length) : 0;
    return {
      uptime: `${Math.round((okCount / total) * 100)}%`,
      avgMs: `${avg} ms`,
      lastChecks: total,
    };
  }, [samples]);

  if (error && !health) {
    return (
      <HttpErrorPage
        status={503}
        title="Статус API недоступен"
        message={error}
        onRetry={load}
      />
    );
  }

  return (
    <section className="api-status-section">
      <div className="api-status-head">
        <h2>Статус и мониторинг API</h2>
        <p>Мониторинг обезличенный: только технические метрики доступности и времени ответа.</p>
      </div>

      <div className="api-status-grid">
        <article className="api-card">
          <h3>Сервис</h3>
          <div><strong>Service:</strong> {health?.service || 'n/a'}</div>
          <div><strong>Status:</strong> {health?.status || 'n/a'}</div>
          <div><strong>DB:</strong> {health?.db || 'n/a'}</div>
          <div><strong>Now:</strong> {health?.now || 'n/a'}</div>
        </article>

        <article className="api-card">
          <h3>Мониторинг</h3>
          <div><strong>Uptime:</strong> {monitoring.uptime}</div>
          <div><strong>Avg response:</strong> {monitoring.avgMs}</div>
          <div><strong>Checks:</strong> {monitoring.lastChecks}</div>
        </article>

        <article className="api-card">
          <h3>Каталог</h3>
          <div><strong>Команд:</strong> {meta?.count ?? 'n/a'}</div>
          <div><strong>Origins:</strong> {(meta?.origins || []).join(', ') || 'n/a'}</div>
          <div><strong>Categories:</strong> {(meta?.categories || []).length || 0}</div>
        </article>
      </div>

      {error && <div className="api-inline-error">Последняя ошибка мониторинга: {error}</div>}

      <div className="api-routes">
        <h3>Полная документация маршрутов API</h3>
        <div className="api-routes-table">
          <div className="api-routes-header">
            <span>Method</span>
            <span>Path</span>
            <span>Auth</span>
            <span>Description</span>
          </div>
          {ROUTES.map((route) => (
            <div className="api-route-row" key={`${route.method}-${route.path}`}>
              <span>{route.method}</span>
              <code>{route.path}</code>
              <span>{route.auth}</span>
              <span>{route.description}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default ApiStatusPage;
