import React, { useCallback, useEffect, useMemo, useState } from 'react';
import './AdminPanel.css';
import HttpErrorPage from './HttpErrorPage';

function AdminPanel({ session, account, onLogout, onNavigate }) {
  const [overview, setOverview] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [status, setStatus] = useState('pending');
  const [error, setError] = useState('');
  const [httpError, setHttpError] = useState(null);
  const [loading, setLoading] = useState(false);

  const isAdministrator = useMemo(() => {
    const roles = (account && account.roles) || [];
    return roles.includes('Administrator');
  }, [account]);

  const authHeaders = useCallback(() => {
    const headers = { 'Content-Type': 'application/json' };
    if (session) headers['x-nedos-session'] = session;
    return headers;
  }, [session]);

  const loadAdminData = useCallback(async () => {
    if (!session || !isAdministrator) return;
    setLoading(true);
    setError('');
    setHttpError(null);
    try {
      const headers = authHeaders();
      const [overviewRes, submissionsRes] = await Promise.all([
        fetch('/api/admin/overview', { headers }),
        fetch(`/api/admin/submissions?status=${status}`, { headers }),
      ]);
      const overviewData = await overviewRes.json().catch(() => ({}));
      const submissionsData = await submissionsRes.json().catch(() => ({}));
      if (!overviewRes.ok) {
        const err = new Error(overviewData.message || 'Admin auth failed');
        err.httpStatus = overviewRes.status;
        throw err;
      }
      if (!submissionsRes.ok) {
        const err = new Error(submissionsData.message || 'Failed to load submissions');
        err.httpStatus = submissionsRes.status;
        throw err;
      }
      setOverview(overviewData);
      setSubmissions(submissionsData.items || []);
    } catch (err) {
      setError(err.message);
      setHttpError({ status: err.httpStatus || 500, message: err.message });
    } finally {
      setLoading(false);
    }
  }, [authHeaders, isAdministrator, session, status]);

  useEffect(() => {
    loadAdminData();
  }, [loadAdminData]);

  const moderate = async (id, action) => {
    const note = window.prompt('Комментарий модератора:', action === 'reject' ? 'Причина отклонения' : 'Approved');
    try {
      const res = await fetch(`/api/admin/submissions/${id}/${action}`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ moderationNote: note || '' }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const err = new Error(data.message || 'Moderation failed');
        err.httpStatus = res.status;
        throw err;
      }
      await loadAdminData();
    } catch (err) {
      setError(err.message);
      setHttpError({ status: err.httpStatus || 500, message: err.message });
    }
  };

  if (!account) {
    return (
      <section className="admin-section">
        <div className="admin-head">
          <h2>Админ-панель NE-DOS Store</h2>
          <p>Для доступа к админ-панели необходимо авторизоваться</p>
        </div>
        <div className="admin-denied">
          <p>Пожалуйста, <button type="button" onClick={() => onNavigate('auth')} className="link-btn">войдите в систему</button></p>
        </div>
      </section>
    );
  }

  if (!isAdministrator) {
    return (
      <section className="admin-section">
        <div className="admin-head">
          <h2>Доступ запрещен</h2>
          <p>Эта страница доступна только пользователям с ролью Administrator.</p>
        </div>
        <div className="admin-denied">
          <div><strong>Пользователь:</strong> {account.displayName || account.username}</div>
          <div><strong>Роли:</strong> {(account.roles || []).join(', ') || 'нет'}</div>
          <div className="admin-denied-actions">
            <button type="button" onClick={() => onNavigate('catalog')}>Вернуться на главную</button>
            <button type="button" onClick={onLogout}>Выйти</button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="admin-section">
      <div className="admin-head">
        <h2>Админ-панель NE-DOS Store</h2>
        <p>Авторизовано: {account.displayName || account.username} (Administrator)</p>
      </div>

      <div className="admin-auth admin-auth--info">
        <button onClick={onLogout} type="button">Выйти</button>
        <button type="button" onClick={() => onNavigate('catalog')}>На главную</button>
      </div>

      {error && !httpError && <div className="admin-error">{error}</div>}
      {httpError && (
        <HttpErrorPage
          status={httpError.status}
          title="Ошибка админского API"
          message={httpError.message}
          onRetry={loadAdminData}
        />
      )}

      {overview && !httpError && (
        <div className="admin-stats">
          <div className="admin-card"><strong>{overview.commands}</strong><span>команд в каталоге</span></div>
          <div className="admin-card"><strong>{overview.submissions.pending}</strong><span>pending</span></div>
          <div className="admin-card"><strong>{overview.reviews}</strong><span>reviews</span></div>
          <div className="admin-card"><strong>{overview.installs}</strong><span>install events</span></div>
        </div>
      )}

      {!httpError && (
        <div className="admin-toolbar">
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
      )}

      {loading && <div className="admin-state">Загрузка админки...</div>}

      {!httpError && (
        <div className="admin-list">
          {submissions.map((item) => (
            <article className="admin-item" key={item.id}>
              <div className="admin-item__head">
                <h3>{item.slug}</h3>
                <span>{item.status}</span>
              </div>
              <p>{item.description}</p>
              <div className="admin-meta">
                <span>{item.author}</span>
                <span>{item.category}</span>
                <span>{item.version}</span>
              </div>
              <code>{item.sha256}</code>
              <div className="admin-actions">
                <button onClick={() => moderate(item.id, 'approve')}>Approve</button>
                <button onClick={() => moderate(item.id, 'reject')}>Reject</button>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

export default AdminPanel;
