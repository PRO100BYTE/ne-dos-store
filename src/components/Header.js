import React from 'react';
import './Header.css';

function Header({ apiOnline, view, onNavigate, onOpenStatus, account, onOpenAuth, onLogout }) {
  return (
    <div className="Header">
      <button
        type="button"
        className="logo-link"
        onClick={() => onNavigate('catalog')}
        title="На главную страницу"
      >
        <img src="/images/nedos.png" alt="NE-DOS logo" />
        <div>
          <span>NE-DOS Store</span>
          <div className="subtitle">Каталог и установка команд из репозитория</div>
        </div>
      </button>
      <div className="status-panel">
        <div className="nav-buttons">
          <button className={view === 'catalog' ? 'nav-btn active' : 'nav-btn'} onClick={() => onNavigate('catalog')}>Каталог</button>
          <button className={view === 'submit' ? 'nav-btn active' : 'nav-btn'} onClick={() => onNavigate('submit')}>Публикация</button>
        </div>
        <span className={apiOnline ? 'status ok' : 'status fail'}>
          <button type="button" className="status-link" onClick={onOpenStatus}>
            {apiOnline ? 'API online' : 'API offline'}
          </button>
        </span>
        <div className="user-menu">
          <button type="button" className="user-btn" onClick={onOpenAuth}>
            {account ? (account.displayName || account.username || 'User') : 'Войти'}
          </button>
          {account && (
            <button type="button" className="user-logout" onClick={onLogout}>Выйти</button>
          )}
        </div>
      </div>
    </div>
  );
}

export default Header;
