import React from 'react';
import './Header.css';

function Header({ apiOnline }) {
  return (
    <div className="Header">
      <div className="logo">
        <img src="/images/nedos.png" alt="NE-DOS logo" />
        <div>
          <span>NE-DOS Store</span>
          <div className="subtitle">Каталог и установка команд из репозитория</div>
        </div>
      </div>
      <div className="status-panel">
        <span className={apiOnline ? 'status ok' : 'status fail'}>
          {apiOnline ? 'API online' : 'API offline'}
        </span>
        <a className="repo-link" href="https://github.com/PRO100BYTE/ne-dos" target="_blank" rel="noreferrer">
          Репозиторий команд
        </a>
      </div>
    </div>
  );
}

export default Header;
