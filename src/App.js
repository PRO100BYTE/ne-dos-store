import React, { useEffect, useState } from 'react';
import './App.css';
import Header from './components/Header';
import CommandList from './components/CommandList';
import SubmissionForm from './components/SubmissionForm';
import AdminPanel from './components/AdminPanel';
import HttpErrorPage from './components/HttpErrorPage';
import ApiStatusPage from './components/ApiStatusPage';
import AuthPage from './components/AuthPage';

function App() {
  const [apiOnline, setApiOnline] = useState(false);
  const [apiError, setApiError] = useState(null);
  const [view, setView] = useState(() => {
    const path = window.location.pathname.toLowerCase();
    if (path.startsWith('/auth')) return 'auth';
    if (path.startsWith('/status')) return 'status';
    if (path.startsWith('/admin')) return 'admin';
    return 'catalog';
  });
  const [session, setSession] = useState(localStorage.getItem('nedos-store-passport-session') || '');
  const [account, setAccount] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('nedos-store-passport-account') || 'null');
    } catch {
      return null;
    }
  });

  const navigate = (nextView) => {
    setView(nextView);
    const nextPath = nextView === 'status'
      ? '/status'
      : nextView === 'auth'
        ? '/auth'
        : nextView === 'admin'
          ? '/admin'
          : '/';
    if (window.location.pathname !== nextPath) {
      window.history.replaceState({}, '', nextPath);
    }
  };

  const saveSession = (nextSession, nextAccount) => {
    setSession(nextSession);
    setAccount(nextAccount || null);
    localStorage.setItem('nedos-store-passport-session', nextSession);
    localStorage.setItem('nedos-store-passport-account', JSON.stringify(nextAccount || null));
  };

  const logout = () => {
    setSession('');
    setAccount(null);
    localStorage.removeItem('nedos-store-passport-session');
    localStorage.removeItem('nedos-store-passport-account');
    if (view === 'admin') navigate('catalog');
  };

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

  useEffect(() => {
    if (!session) return;
    fetch('/api/auth/session', {
      headers: { 'x-nedos-session': session },
    })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.message || 'Session invalid');
        return data;
      })
      .then((data) => {
        setAccount(data.account || null);
      })
      .catch(() => {
        logout();
      });
  }, [session]);

  return (
    <div className="App">
      <Header
        apiOnline={apiOnline}
        view={view}
        onNavigate={navigate}
        onOpenStatus={() => navigate('status')}
        account={account}
        onOpenAuth={() => navigate('auth')}
        onLogout={logout}
      />
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
          {view === 'submit' && <SubmissionForm account={account} session={session} onOpenAuth={() => navigate('auth')} />}
          {view === 'status' && <ApiStatusPage />}
          {view === 'auth' && <AuthPage onAuthSuccess={saveSession} account={account} onLogout={logout} />}
          {view === 'admin' && <AdminPanel account={account} session={session} onOpenAuth={() => navigate('auth')} onGoHome={() => navigate('catalog')} onLogout={logout} />}
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
