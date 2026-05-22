import React, { useEffect, useState } from 'react';
import './App.css';
import Header from './components/Header';
import CommandList from './components/CommandList';
import SubmissionForm from './components/SubmissionForm';
import AdminPanel from './components/AdminPanel';

function App() {
  const [apiOnline, setApiOnline] = useState(false);
  const [view, setView] = useState('catalog');

  useEffect(() => {
    let mounted = true;
    fetch('/api/health')
      .then((res) => res.ok ? res.json() : Promise.reject(new Error('API unavailable')))
      .then(() => { if (mounted) setApiOnline(true); })
      .catch(() => { if (mounted) setApiOnline(false); });
    return () => { mounted = false; };
  }, []);

  return (
    <div className="App">
      <Header apiOnline={apiOnline} view={view} onNavigate={setView} />
      {view === 'catalog' && <CommandList />}
      {view === 'submit' && <SubmissionForm />}
      {view === 'admin' && <AdminPanel />}
      <footer className="footer">
        <img src="/images/team.png" alt="PRO100BYTE logo" />
        <span>© 2026 NE-DOS Store by PRO100BYTE Team</span>
      </footer>
    </div>
  );
}

export default App;
