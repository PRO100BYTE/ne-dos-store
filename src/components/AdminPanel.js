import React, { useCallback, useEffect, useState } from 'react';
import './AdminPanel.css';

function AdminPanel() {
  const [token, setToken] = useState(localStorage.getItem('nedos-store-admin-token') || '');
  const [overview, setOverview] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [status, setStatus] = useState('pending');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!token) return;
    const headers = { 'x-admin-token': token, 'Content-Type': 'application/json' };
    setLoading(true);
    setError('');
    try {
      localStorage.setItem('nedos-store-admin-token', token);
      const [overviewRes, submissionsRes] = await Promise.all([
        fetch('/api/admin/overview', { headers }),
        fetch(`/api/admin/submissions?status=${status}`, { headers }),
      ]);
      const overviewData = await overviewRes.json();
      const submissionsData = await submissionsRes.json();
      if (!overviewRes.ok) throw new Error(overviewData.message || 'Admin auth failed');
      if (!submissionsRes.ok) throw new Error(submissionsData.message || 'Failed to load submissions');
      setOverview(overviewData);
      setSubmissions(submissionsData.items || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [status, token]);

  useEffect(() => {
    load();
  }, [load]);

  const moderate = async (id, action) => {
    const note = window.prompt('Комментарий модератора:', action === 'reject' ? 'Причина отклонения' : 'Approved');
    try {
      const headers = { 'x-admin-token': token, 'Content-Type': 'application/json' };
      const res = await fetch(`/api/admin/submissions/${id}/${action}`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ moderationNote: note || '' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Moderation failed');
      await load();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <section className="admin-section">
      <div className="admin-head">
        <h2>Админка магазина</h2>
        <p>Модерация новых команд, обзор каталога и управление очередью публикации.</p>
      </div>

      <div className="admin-auth">
        <input value={token} onChange={(e) => setToken(e.target.value)} placeholder="Admin token" />
        <button onClick={load}>Подключиться</button>
      </div>

      {error && <div className="admin-error">{error}</div>}

      {overview && (
        <div className="admin-stats">
          <div className="admin-card"><strong>{overview.commands}</strong><span>команд в каталоге</span></div>
          <div className="admin-card"><strong>{overview.submissions.pending}</strong><span>pending</span></div>
          <div className="admin-card"><strong>{overview.reviews}</strong><span>reviews</span></div>
          <div className="admin-card"><strong>{overview.installs}</strong><span>install events</span></div>
        </div>
      )}

      <div className="admin-toolbar">
        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      {loading && <div className="admin-state">Загрузка админки...</div>}

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
    </section>
  );
}

export default AdminPanel;
