import React, { useState } from 'react';
import './SubmissionForm.css';

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
  const [form, setForm] = useState(initialForm);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const update = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const submit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch('/api/submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          tags: form.tags.split(',').map((item) => item.trim()).filter(Boolean),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Не удалось отправить команду');
      setResult({ ok: true, data });
      setForm(initialForm);
    } catch (error) {
      setResult({ ok: false, message: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="submission-section">
      <div className="submission-head">
        <h2>Публикация community-команды</h2>
        <p>Команда попадёт в очередь модерации. После одобрения она станет доступна для установки через магазин.</p>
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

      {result && !result.ok && <div className="submit-result fail">{result.message}</div>}
    </section>
  );
}

export default SubmissionForm;
