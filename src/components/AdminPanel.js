import React, { useCallback, useEffect, useState } from 'react';
import './AdminPanel.css';
import HttpErrorPage from './HttpErrorPage';

function AdminPanel() {
  const [mode, setMode] = useState('token');
  const [authValue, setAuthValue] = useState('');
  const [sculkConfig, setSculkConfig] = useState(null);
  const [session, setSession] = useState(localStorage.getItem('nedos-store-passport-session') || '');
  const [profile, setProfile] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('nedos-store-passport-account') || 'null');
    } catch {
      return null;
    }
  });
  const [overview, setOverview] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [status, setStatus] = useState('pending');
  const [error, setError] = useState('');
  const [httpError, setHttpError] = useState(null);
  const [loading, setLoading] = useState(false);

  const authHeaders = useCallback(() => {
    const headers = { 'Content-Type': 'application/json' };
    if (session) headers['x-nedos-session'] = session;
    return headers;
  }, [session]);

  const refreshConfig = useCallback(async () => {
    const res = await fetch('/api/auth/sculk/config');
    const data = await res.json();
    if (res.ok) {
      setSculkConfig(data);
    }
  }, []);

  const handleLogout = useCallback(() => {
    setSession('');
    setProfile(null);
    localStorage.removeItem('nedos-store-passport-session');
    localStorage.removeItem('nedos-store-passport-account');
  }, []);

  const load = useCallback(async () => {
    if (!session) return;
    const headers = authHeaders();
    setLoading(true);
    setError('');
    setHttpError(null);
    try {
      const [overviewRes, submissionsRes] = await Promise.all([
        fetch('/api/admin/overview', { headers }),
        fetch(`/api/admin/submissions?status=${status}`, { headers }),
      ]);
      const overviewData = await overviewRes.json();
      const submissionsData = await submissionsRes.json();
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
      if (/auth|required|session/i.test(err.message)) {
        handleLogout();
      }
    } finally {
      setLoading(false);
    }
  }, [authHeaders, handleLogout, session, status]);

  const login = useCallback(async () => {
    if (!authValue.trim()) {
      setError('Введите Sculk token или grant code');
      return;
    }

    setLoading(true);
    setError('');
    setHttpError(null);
    try {
      const res = await fetch('/api/auth/sculk/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode, [mode === 'token' ? 'token' : 'code']: authValue.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        const err = new Error(data.message || 'Sculk login failed');
        err.httpStatus = res.status;
        throw err;
      }

      setSession(data.session);
      setProfile(data.account || null);
      localStorage.setItem('nedos-store-passport-session', data.session);
      localStorage.setItem('nedos-store-passport-account', JSON.stringify(data.account || null));
      setAuthValue('');
    } catch (err) {
      setError(err.message);
      setHttpError({ status: err.httpStatus || 500, message: err.message });
    } finally {
      setLoading(false);
    }
  }, [authValue, mode]);

  useEffect(() => {
    refreshConfig();
  }, [refreshConfig]);

  useEffect(() => {
    load();
  }, [load]);

  const moderate = async (id, action) => {
    const note = window.prompt('Комментарий модератора:', action === 'reject' ? 'Причина отклонения' : 'Approved');
    try {
      const headers = authHeaders();
      const res = await fetch(`/api/admin/submissions/${id}/${action}`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ moderationNote: note || '' }),
      });
      const data = await res.json();
      if (!res.ok) {
        const err = new Error(data.message || 'Moderation failed');
        err.httpStatus = res.status;
        throw err;
      }
      await load();
    } catch (err) {
      setError(err.message);
      setHttpError({ status: err.httpStatus || 500, message: err.message });
    }
  };

  const authorizeLink = sculkConfig?.authorizeUrl || 'https://my.sculk.ltd/api/sso/authorize';
  const callbackUrl = sculkConfig?.callbackUrl || 'http://localhost:8787/api/auth/sculk/callback';

  return (
    <section className="admin-section">
      <div className="admin-head">
        <h2>Админка магазина</h2>
        <p>Модерация новых команд и управление публикацией через .nedos Passport (Sculk ID + связанный аккаунт).</p>
      </div>

      <div className="admin-auth">
        <select value={mode} onChange={(e) => setMode(e.target.value)}>
          <option value="token">Sculk token</option>
          <option value="code">Grant code</option>
        </select>
        <input
          value={authValue}
          onChange={(e) => setAuthValue(e.target.value)}
          placeholder={mode === 'token' ? 'Sculk access token' : 'Authorization code'}
        />
        <button onClick={login}>Войти</button>
        <button onClick={handleLogout} type="button">Выйти</button>
      </div>

      <div className="admin-sculk">
        <span>Authorize:</span>
        <a href={authorizeLink} target="_blank" rel="noreferrer">{authorizeLink}</a>
        <span>Callback: {callbackUrl}</span>
        {profile && <strong>{profile.displayName || profile.username || 'NE-DOS User'}</strong>}
      </div>

      {error && !httpError && <div className="admin-error">{error}</div>}

      {httpError && (
        <HttpErrorPage
          status={httpError.status}
          title="Ошибка админского API"
          message={httpError.message}
          onRetry={load}
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
      {!session && <div className="admin-state">Требуется вход через .nedos Passport (роль admin).</div>}

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
