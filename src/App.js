import React from 'react';
import './App.css';
import Header from './components/Header';
import CommandList from './components/CommandList';

function App() {
  return (
    <div className="App">
      <Header />
      <CommandList />
      <footer className="footer">
        <img src="/images/team.png" alt="PRO100BYTE logo" />
        <span>© 2023 NE-DOS Store by PRO100BYTE Team</span>
      </footer>
    </div>
  );
}

export default App;
