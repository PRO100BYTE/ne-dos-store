import React, { useState } from 'react';
import './SubmissionForm.css';
import HttpErrorPage from './HttpErrorPage';

const initialForm = {
  name: '',
  title: '',
  description: '',
  category: 'community',
  tags: 'community',
  version: '1.0.0',
  scriptBody: `export default class HelloStoreCommand {\n  description() { return 'Sample community command'; }\n  help(term) { term.writeln('Usage: hellostore'); }\n  execute(term) { term.writeln('Hello from NE-DOS Store.'); }\n}\n`,
};

function SubmissionForm({ account, session, onOpenAuth }) {
  const [form, setForm] = useState(initialForm);
  const [result, setResult] = useState(null);
  const [submitHttpError, setSubmitHttpError] = useState(null);
  const [loading, setLoading] = useState(false);

  const update = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const submit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setResult(null);
    setSubmitHttpError(null);
    try {
      if (!session || !account) {
        throw new Error('Сначала авторизуйтесь в .nedos Passport');
      }
      const res = await fetch('/api/submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-nedos-session': session },
        body: JSON.stringify({
          ...form,
          author: account.displayName || account.username,
          tags: form.tags.split(',').map((item) => item.trim()).filter(Boolean),
        }),
      });
      const data = await res.json().catch(() => ({}));
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
        <p>Для публикации требуется авторизованный пользователь .nedos Passport.</p>
      </div>

      {!account ? (
        <div className="submission-auth-box">
          <div className="submit-result fail">Вы не авторизованы.</div>
          <button type="button" className="submission-open-auth" onClick={onOpenAuth}>Открыть страницу авторизации</button>
        </div>
      ) : (
        <>
          <div className="submission-profile">
            <h3>Профиль пользователя</h3>
            <div className="submission-profile-grid">
              <div><strong>Имя:</strong> {account.displayName || '-'}</div>
              <div><strong>Username:</strong> {account.username || '-'}</div>
              <div><strong>Роли:</strong> {(account.roles || []).join(', ') || 'нет'}</div>
            </div>
          </div>

          <form className="submission-form" onSubmit={submit}>
            <div className="submission-grid">
              <input value={form.name} onChange={(e) => update('name', e.target.value)} placeholder="slug / имя команды" required />
              <input value={form.title} onChange={(e) => update('title', e.target.value)} placeholder="Заголовок" />
              <input value={account.displayName || account.username || ''} placeholder="Автор" disabled />
              <input value={form.version} onChange={(e) => update('version', e.target.value)} placeholder="Версия" />
              <input value={form.category} onChange={(e) => update('category', e.target.value)} placeholder="Категория" required />
              <input value={form.tags} onChange={(e) => update('tags', e.target.value)} placeholder="Теги через запятую" />
            </div>
            <textarea value={form.description} onChange={(e) => update('description', e.target.value)} placeholder="Краткое описание команды" required rows={3} />
            <textarea value={form.scriptBody} onChange={(e) => update('scriptBody', e.target.value)} placeholder="JS-код команды" required rows={18} className="code-area" />
            <button type="submit" disabled={loading}>{loading ? 'Отправка...' : 'Отправить на модерацию'}</button>
          </form>
        </>
      )}

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
