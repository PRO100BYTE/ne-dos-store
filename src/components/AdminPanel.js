import React, { useCallback, useEffect, useMemo, useState } from 'react';
import './AdminPanel.css';
import HttpErrorPage from './HttpErrorPage';

function AdminPanel() {
  const [loginMode, setLoginMode] = useState('passport');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [sculkMode, setSculkMode] = useState('token');
  const [sculkValue, setSculkValue] = useState('');
  const [sculkConfig, setSculkConfig] = useState(null);

  const [session, setSession] = useState(localStorage.getItem('nedos-store-passport-session') || '');
  const [account, setAccount] = useState(() => {
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

  const isAdministrator = useMemo(() => {
    const roles = (account && account.roles) || [];
    return roles.includes('Administrator');
  }, [account]);

  const authHeaders = useCallback(() => {
    const headers = { 'Content-Type': 'application/json' };
    if (session) headers['x-nedos-session'] = session;
    return headers;
  }, [session]);

  const saveSession = (nextSession, nextAccount) => {
    setSession(nextSession);
    setAccount(nextAccount || null);
    localStorage.setItem('nedos-store-passport-session', nextSession);
    localStorage.setItem('nedos-store-passport-account', JSON.stringify(nextAccount || null));
  };

  const logout = useCallback(() => {
    setSession('');
    setAccount(null);
    setOverview(null);
    setSubmissions([]);
    setError('');
    setHttpError(null);
    localStorage.removeItem('nedos-store-passport-session');
    localStorage.removeItem('nedos-store-passport-account');
  }, []);

  const loadProfile = useCallback(async () => {
    if (!session) return;
    const res = await fetch('/api/auth/session', { headers: authHeaders() });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const err = new Error(data.message || 'Сессия недействительна');
      err.httpStatus = res.status;
      throw err;
    }
    setAccount(data.account || null);
  }, [authHeaders, session]);

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
    fetch('/api/auth/sculk/config')
      .then((res) => res.json())
      .then((data) => setSculkConfig(data))
      .catch(() => setSculkConfig(null));
  }, []);

  useEffect(() => {
    loadProfile().catch(() => logout());
  }, [loadProfile, logout]);

  useEffect(() => {
    loadAdminData();
  }, [loadAdminData]);

  const loginPassport = async () => {
    const res = await fetch('/api/auth/passport/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const err = new Error(data.message || 'Не удалось войти в .nedos Passport');
      err.httpStatus = res.status;
      throw err;
    }
    saveSession(data.session, data.account);
  };

  const loginSculk = async () => {
    const res = await fetch('/api/auth/sculk/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode: sculkMode, [sculkMode === 'token' ? 'token' : 'code']: sculkValue }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const err = new Error(data.message || 'Sculk login failed');
      err.httpStatus = res.status;
      throw err;
    }
    saveSession(data.session, data.account);
  };

  const login = async () => {
    setError('');
    setHttpError(null);
    try {
      if (loginMode === 'passport') {
        await loginPassport();
      } else {
        await loginSculk();
      }
    } catch (err) {
      setError(err.message);
      setHttpError({ status: err.httpStatus || 500, message: err.message });
    }
  };

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

  const callbackUrl = sculkConfig?.callbackUrl || 'http://localhost:8787/api/auth/sculk/callback';
  const authorizeUrl = sculkConfig?.authorizeUrl || 'https://my.sculk.ltd/api/sso/authorize';

  if (!account) {
    return (
      <section className="admin-section">
        <div className="admin-head">
          <h2>Админ-панель NE-DOS Store</h2>
          <p>Вход через .nedos Passport является основным. Sculk Account используется как дополнительный OAuth способ.</p>
        </div>

        <div className="admin-auth">
          <select value={loginMode} onChange={(e) => setLoginMode(e.target.value)}>
            <option value="passport">.nedos Passport</option>
            <option value="sculk">Sculk Account</option>
          </select>

          {loginMode === 'passport' ? (
            <>
              <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Username" />
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" />
            </>
          ) : (
            <>
              <select value={sculkMode} onChange={(e) => setSculkMode(e.target.value)}>
                <option value="token">Sculk token</option>
                <option value="code">Grant code</option>
              </select>
              <input value={sculkValue} onChange={(e) => setSculkValue(e.target.value)} placeholder={sculkMode === 'token' ? 'Sculk access token' : 'Authorization code'} />
            </>
          )}

          <button onClick={login} type="button">Войти</button>
        </div>

        <div className="admin-sculk">
          <span>Authorize:</span>
          <a href={authorizeUrl} target="_blank" rel="noreferrer">{authorizeUrl}</a>
          <span>Callback: {callbackUrl}</span>
        </div>

        {error && !httpError && <div className="admin-error">{error}</div>}
        {httpError && (
          <HttpErrorPage
            status={httpError.status}
            title="Ошибка авторизации в админке"
            message={httpError.message}
            onRetry={login}
          />
        )}
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
          <button type="button" onClick={() => window.location.replace('/')}>Вернуться на главную</button>
          <button type="button" onClick={logout}>Выйти</button>
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
        <button onClick={logout} type="button">Выйти</button>
        <button type="button" onClick={() => window.location.replace('/')}>На главную</button>
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
