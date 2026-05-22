import React, { useEffect, useState } from 'react';
import './App.css';
import Header from './components/Header';
import CommandList from './components/CommandList';
import SubmissionForm from './components/SubmissionForm';
import AdminPanel from './components/AdminPanel';
import HttpErrorPage from './components/HttpErrorPage';

function App() {
  const [apiOnline, setApiOnline] = useState(false);
  const [apiError, setApiError] = useState(null);
  const [view, setView] = useState('catalog');

  useEffect(() => {
    let mounted = true;
    fetch('/api/health')
      .then(async (res) => {
        if (res.ok) return res.json();
        const body = await res.json().catch(() => ({}));
        const err = new Error(body.message || 'API unavailable');
        err.httpStatus = res.status;
        throw err;
      })
      .then(() => {
        if (!mounted) return;
        setApiOnline(true);
        setApiError(null);
      })
      .catch((err) => {
        if (!mounted) return;
        setApiOnline(false);
        setApiError({ status: err.httpStatus || 503, message: err.message || 'API unavailable' });
      });
    return () => { mounted = false; };
  }, []);

  return (
    <div className="App">
      <Header apiOnline={apiOnline} view={view} onNavigate={setView} />
      {apiError ? (
        <HttpErrorPage
          status={apiError.status}
          title="NE-DOS Store API недоступен"
          message={apiError.message}
          onRetry={() => window.location.reload()}
        />
      ) : (
        <>
          {view === 'catalog' && <CommandList />}
          {view === 'submit' && <SubmissionForm />}
          {view === 'admin' && <AdminPanel />}
        </>
      )}
      <footer className="footer">
        <img src="/images/team.png" alt="PRO100BYTE logo" />
        <span>© 2026 NE-DOS Store by PRO100BYTE Team</span>
      </footer>
    </div>
  );
}

export default App;
