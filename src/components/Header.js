import React from 'react';
import './Header.css';

function Header({ apiOnline, view, onNavigate }) {
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
        <div className="nav-buttons">
          <button className={view === 'catalog' ? 'nav-btn active' : 'nav-btn'} onClick={() => onNavigate('catalog')}>Каталог</button>
          <button className={view === 'submit' ? 'nav-btn active' : 'nav-btn'} onClick={() => onNavigate('submit')}>Публикация</button>
          <button className={view === 'admin' ? 'nav-btn active' : 'nav-btn'} onClick={() => onNavigate('admin')}>Админка</button>
        </div>
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
