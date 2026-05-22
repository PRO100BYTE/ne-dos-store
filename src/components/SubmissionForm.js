import React, { useCallback, useEffect, useState } from 'react';
import './SubmissionForm.css';
import HttpErrorPage from './HttpErrorPage';

const initialForm = {
  name: '',
  title: '',
  description: '',
  author: '',
  category: 'community',
  tags: 'community',
  version: '1.0.0',
  scriptBody: `export default class HelloStoreCommand {\n  description() { return 'Sample community command'; }\n  help(term) { term.writeln('Usage: hellostore'); }\n  execute(term) { term.writeln('Hello from NE-DOS Store.'); }\n}\n`,
};

function SubmissionForm() {
  const [loginMode, setLoginMode] = useState('passport');
  const [passportUsername, setPassportUsername] = useState('');
  const [passportPassword, setPassportPassword] = useState('');
  const [sculkMode, setSculkMode] = useState('token');
  const [sculkValue, setSculkValue] = useState('');
  const [sculkConfig, setSculkConfig] = useState(null);
  const [authError, setAuthError] = useState('');
  const [authHttpError, setAuthHttpError] = useState(null);
  const [linkingInfo, setLinkingInfo] = useState(null);
  const [linkUsername, setLinkUsername] = useState('');
  const [linkPassword, setLinkPassword] = useState('');
  const [registerUsername, setRegisterUsername] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [registerDisplayName, setRegisterDisplayName] = useState('');
  const [session, setSession] = useState(localStorage.getItem('nedos-store-passport-session') || '');
  const [account, setAccount] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('nedos-store-passport-account') || 'null');
    } catch {
      return null;
    }
  });
  const [form, setForm] = useState(initialForm);
  const [result, setResult] = useState(null);
  const [submitHttpError, setSubmitHttpError] = useState(null);
  const [loading, setLoading] = useState(false);

  const update = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const saveSession = useCallback((nextSession, nextAccount) => {
    setSession(nextSession);
    setAccount(nextAccount || null);
    localStorage.setItem('nedos-store-passport-session', nextSession);
    localStorage.setItem('nedos-store-passport-account', JSON.stringify(nextAccount || null));
  }, []);

  const logout = useCallback(() => {
    setSession('');
    setAccount(null);
    setAuthError('');
    setAuthHttpError(null);
    setLinkingInfo(null);
    localStorage.removeItem('nedos-store-passport-session');
    localStorage.removeItem('nedos-store-passport-account');
  }, []);

  useEffect(() => {
    fetch('/api/auth/sculk/config')
      .then((res) => res.json())
      .then((data) => setSculkConfig(data))
      .catch(() => setSculkConfig(null));
  }, []);

  const loginWithPassport = useCallback(async () => {
    setAuthError('');
    setLinkingInfo(null);
    const res = await fetch('/api/auth/passport/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: passportUsername, password: passportPassword }),
    });
    const data = await res.json();
    if (!res.ok) {
      const err = new Error(data.message || 'Не удалось войти в .nedos Passport');
      err.httpStatus = res.status;
      throw err;
    }
    saveSession(data.session, data.account);
  }, [passportPassword, passportUsername, saveSession]);

  const loginWithSculk = useCallback(async () => {
    setAuthError('');
    setAuthHttpError(null);
    setLinkingInfo(null);
    const body = { mode: sculkMode, [sculkMode === 'token' ? 'token' : 'code']: sculkValue };
    const res = await fetch('/api/auth/sculk/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (res.status === 409 && data.code === 'SCULK_NOT_LINKED') {
      setLinkingInfo(data.sculkIdentity || null);
      throw new Error(data.message || 'Sculk ID не связан');
    }
    if (!res.ok) {
      const err = new Error(data.message || 'Ошибка входа через Sculk ID');
      err.httpStatus = res.status;
      throw err;
    }
    saveSession(data.session, data.account);
  }, [saveSession, sculkMode, sculkValue]);

  const linkExistingAccount = useCallback(async () => {
    if (!linkingInfo?.id) return;
    const res = await fetch('/api/auth/passport/link-existing', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: linkUsername,
        password: linkPassword,
        linkedSculkId: linkingInfo.id,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      const err = new Error(data.message || 'Не удалось привязать аккаунт');
      err.httpStatus = res.status;
      throw err;
    }
    setAuthError('');
    setLinkingInfo(null);
    saveSession(data.session, data.account);
  }, [linkPassword, linkUsername, linkingInfo, saveSession]);

  const registerAndLink = useCallback(async () => {
    if (!linkingInfo?.id) return;
    const res = await fetch('/api/auth/passport/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: registerUsername,
        password: registerPassword,
        displayName: registerDisplayName,
        linkedSculkId: linkingInfo.id,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      const err = new Error(data.message || 'Не удалось зарегистрировать .nedos Passport');
      err.httpStatus = res.status;
      throw err;
    }
    setAuthError('');
    setLinkingInfo(null);
    saveSession(data.session, data.account);
  }, [linkingInfo, registerDisplayName, registerPassword, registerUsername, saveSession]);

  const performLogin = useCallback(async () => {
    try {
      if (loginMode === 'passport') {
        await loginWithPassport();
      } else {
        await loginWithSculk();
      }
    } catch (error) {
      setAuthError(error.message);
      setAuthHttpError({ status: error.httpStatus || 500, message: error.message });
    }
  }, [loginMode, loginWithPassport, loginWithSculk]);

  const submit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setResult(null);
    setSubmitHttpError(null);
    try {
      if (!session) {
        throw new Error('Для загрузки команды нужен вход в .nedos Passport');
      }
      const res = await fetch('/api/submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-nedos-session': session },
        body: JSON.stringify({
          ...form,
          tags: form.tags.split(',').map((item) => item.trim()).filter(Boolean),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        const err = new Error(data.message || 'Не удалось отправить команду');
        err.httpStatus = res.status;
        throw err;
      }
      setResult({ ok: true, data });
      setForm(initialForm);
    } catch (error) {
      setResult({ ok: false, message: error.message });
      setSubmitHttpError({ status: error.httpStatus || 500, message: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="submission-section">
      <div className="submission-head">
        <h2>Публикация community-команды</h2>
        <p>Требуется учетная запись .nedos Passport. Можно войти через локальный Passport или Sculk ID (если аккаунты связаны).</p>
      </div>

      <div className="submission-auth-box">
        <div className="submission-auth-row">
          <select value={loginMode} onChange={(e) => setLoginMode(e.target.value)}>
            <option value="passport">.nedos Passport</option>
            <option value="sculk">Sculk ID</option>
          </select>

          {loginMode === 'passport' && (
            <>
              <input value={passportUsername} onChange={(e) => setPassportUsername(e.target.value)} placeholder="Passport username" />
              <input type="password" value={passportPassword} onChange={(e) => setPassportPassword(e.target.value)} placeholder="Passport password" />
            </>
          )}

          {loginMode === 'sculk' && (
            <>
              <select value={sculkMode} onChange={(e) => setSculkMode(e.target.value)}>
                <option value="token">Sculk token</option>
                <option value="code">Grant code</option>
              </select>
              <input value={sculkValue} onChange={(e) => setSculkValue(e.target.value)} placeholder={sculkMode === 'token' ? 'Sculk access token' : 'Authorization code'} />
            </>
          )}

          <button type="button" onClick={performLogin}>Войти</button>
          <button type="button" onClick={logout}>Выйти</button>
        </div>

        {sculkConfig?.authorizeUrl && (
          <div className="submission-auth-hint">
            Authorize: <a href={sculkConfig.authorizeUrl} target="_blank" rel="noreferrer">{sculkConfig.authorizeUrl}</a>
          </div>
        )}

        {sculkConfig?.callbackUrl && (
          <div className="submission-auth-hint">Callback URL: {sculkConfig.callbackUrl}</div>
        )}

        {account && (
          <div className="submit-result ok">Выполнен вход: {account.displayName || account.username}. Роли: {(account.roles || []).join(', ')}</div>
        )}

        {authError && !authHttpError && <div className="submit-result fail">{authError}</div>}

        {authHttpError && (
          <HttpErrorPage
            status={authHttpError.status}
            title="Ошибка авторизации"
            message={authHttpError.message}
            onRetry={performLogin}
          />
        )}

        {linkingInfo && (
          <div className="submission-linking">
            <p>
              Sculk ID <strong>{linkingInfo.id}</strong> не связан с .nedos Passport. Укажите существующую учетную запись NE-DOS или зарегистрируйте новую.
            </p>
            <div className="submission-linking-grid">
              <input value={linkUsername} onChange={(e) => setLinkUsername(e.target.value)} placeholder="Существующий username" />
              <input type="password" value={linkPassword} onChange={(e) => setLinkPassword(e.target.value)} placeholder="Пароль" />
              <button type="button" onClick={linkExistingAccount}>Связать существующий аккаунт</button>

              <input value={registerUsername} onChange={(e) => setRegisterUsername(e.target.value)} placeholder="Новый username" />
              <input type="password" value={registerPassword} onChange={(e) => setRegisterPassword(e.target.value)} placeholder="Новый пароль" />
              <input value={registerDisplayName} onChange={(e) => setRegisterDisplayName(e.target.value)} placeholder="Display name" />
              <button type="button" onClick={registerAndLink}>Зарегистрировать и связать</button>
            </div>
          </div>
        )}
      </div>

      <form className="submission-form" onSubmit={submit}>
        <div className="submission-grid">
          <input value={form.name} onChange={(e) => update('name', e.target.value)} placeholder="slug / имя команды" required />
          <input value={form.title} onChange={(e) => update('title', e.target.value)} placeholder="Заголовок" />
          <input value={form.author} onChange={(e) => update('author', e.target.value)} placeholder="Автор" required />
          <input value={form.version} onChange={(e) => update('version', e.target.value)} placeholder="Версия" />
          <input value={form.category} onChange={(e) => update('category', e.target.value)} placeholder="Категория" required />
          <input value={form.tags} onChange={(e) => update('tags', e.target.value)} placeholder="Теги через запятую" />
        </div>
        <textarea value={form.description} onChange={(e) => update('description', e.target.value)} placeholder="Краткое описание команды" required rows={3} />
        <textarea value={form.scriptBody} onChange={(e) => update('scriptBody', e.target.value)} placeholder="JS-код команды" required rows={18} className="code-area" />
        <button type="submit" disabled={loading}>{loading ? 'Отправка...' : 'Отправить на модерацию'}</button>
      </form>

      {result?.ok && (
        <div className="submit-result ok">
          Отправлено. Статус: pending. SHA-256: <code>{result.data.sha256}</code>
        </div>
      )}

      {result && !result.ok && !submitHttpError && <div className="submit-result fail">{result.message}</div>}

      {submitHttpError && (
        <HttpErrorPage
          status={submitHttpError.status}
          title="Ошибка отправки команды"
          message={submitHttpError.message}
          onRetry={() => setSubmitHttpError(null)}
        />
      )}
    </section>
  );
}

export default SubmissionForm;
