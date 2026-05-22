import React, { useState } from 'react';
import './AuthPage.css';
import HttpErrorPage from './HttpErrorPage';

function AuthPage({ onAuthSuccess, account, onLogout }) {
  const [authMode, setAuthMode] = useState('passport');
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [authError, setAuthError] = useState(null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const submitPassport = async (e) => {
    e.preventDefault();
    setAuthError(null);
    setMessage('');
    setLoading(true);
    try {
      const url = isRegister ? '/api/auth/passport/register' : '/api/auth/passport/login';
      const body = isRegister 
        ? { username, password, displayName }
        : { username, password };
      
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const err = new Error(data.message || 'Ошибка авторизации');
        err.httpStatus = res.status;
        throw err;
      }
      setMessage(isRegister ? 'Профиль создан и вход выполнен' : 'Вход выполнен');
      onAuthSuccess(data.session, data.account);
    } catch (err) {
      setAuthError({ status: err.httpStatus || 500, message: err.message });
    } finally {
      setLoading(false);
    }
  };

  const startSculkOAuth = async () => {
    setAuthError(null);
    try {
      const res = await fetch('/api/auth/sculk/authorize');
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const err = new Error(data.message || 'Ошибка инициирования Sculk OAuth');
        err.httpStatus = res.status;
        throw err;
      }
      window.location.href = data.redirectUrl;
    } catch (err) {
      setAuthError({ status: err.httpStatus || 500, message: err.message });
    }
  };

  return (
    <section className="auth-page">
      <div className="auth-head">
        <h1>Добро пожаловать</h1>
        <p>Выберите способ входа</p>
      </div>

      {account ? (
        <div className="auth-profile">
          <div className="profile-header">
            <h3>Профиль</h3>
          </div>
          <div className="profile-info">
            <div className="profile-item">
              <span className="label">Имя:</span>
              <span className="value">{account.displayName || '-'}</span>
            </div>
            <div className="profile-item">
              <span className="label">Username:</span>
              <span className="value">{account.username || '-'}</span>
            </div>
            <div className="profile-item">
              <span className="label">Роли:</span>
              <span className="value">{(account.roles || []).join(', ') || 'нет'}</span>
            </div>
          </div>
          <button type="button" className="btn-logout" onClick={onLogout}>Выйти</button>
        </div>
      ) : (
        <div className="auth-container">
          <div className="auth-modes">
            <button
              type="button"
              className={`auth-tab ${authMode === 'passport' ? 'active' : ''}`}
              onClick={() => setAuthMode('passport')}
            >
              .nedos Passport
            </button>
            <button
              type="button"
              className={`auth-tab ${authMode === 'sculk' ? 'active' : ''}`}
              onClick={() => setAuthMode('sculk')}
            >
              Sculk Account
            </button>
          </div>

          {authMode === 'passport' && (
            <form className="auth-form" onSubmit={submitPassport}>
              <div className="form-toggle">
                <button
                  type="button"
                  className={`toggle-btn ${!isRegister ? 'active' : ''}`}
                  onClick={() => setIsRegister(false)}
                >
                  Вход
                </button>
                <button
                  type="button"
                  className={`toggle-btn ${isRegister ? 'active' : ''}`}
                  onClick={() => setIsRegister(true)}
                >
                  Регистрация
                </button>
              </div>

              <div className="form-fields">
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Username"
                  required
                />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Пароль"
                  required
                />
                {isRegister && (
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Ваше имя"
                    required
                  />
                )}
              </div>

              <button type="submit" className="btn-submit" disabled={loading}>
                {loading ? 'Обработка...' : isRegister ? 'Создать профиль' : 'Войти'}
              </button>
            </form>
          )}

          {authMode === 'sculk' && (
            <div className="auth-sculk">
              <div className="sculk-info">
                <p>Нажмите кнопку ниже для входа через Sculk Account</p>
              </div>
              <button type="button" className="btn-sculk" onClick={startSculkOAuth}>
                <span className="btn-icon">⚡</span>
                <span className="btn-text">Войти через Sculk Account</span>
              </button>
            </div>
          )}
        </div>
      )}

      {message && <div className="auth-message success">{message}</div>}
      {authError && (
        <HttpErrorPage
          status={authError.status}
          title="Ошибка авторизации"
          message={authError.message}
          onRetry={() => setAuthError(null)}
        />
      )}
    </section>
  );
}

export default AuthPage;
