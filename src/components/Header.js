import React, { useEffect, useMemo, useRef, useState } from 'react';
import './Header.css';

function Header({
  apiOnline,
  view,
  onNavigate,
  onOpenStatus,
  account,
  canAccessAdmin,
  onOpenAuth,
  onOpenProfile,
  onOpenAdmin,
  onLogout,
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const userLabel = useMemo(() => (account ? (account.displayName || account.username || 'User') : 'Войти'), [account]);

  useEffect(() => {
    const onDocClick = (event) => {
      if (!menuRef.current || menuRef.current.contains(event.target)) return;
      setMenuOpen(false);
    };
    const onEscape = (event) => {
      if (event.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onEscape);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onEscape);
    };
  }, []);

  const openAuth = () => {
    setMenuOpen(false);
    onOpenAuth();
  };

  const openProfile = () => {
    setMenuOpen(false);
    onOpenProfile();
  };

  const openAdmin = () => {
    setMenuOpen(false);
    onOpenAdmin();
  };

  const logout = () => {
    setMenuOpen(false);
    onLogout();
  };

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
        <div className="user-menu" ref={menuRef}>
          <button
            type="button"
            className="user-btn"
            onClick={() => setMenuOpen((prev) => !prev)}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            title={account ? 'Открыть меню пользователя' : 'Открыть меню входа'}
          >
            <span className="user-avatar">{userLabel.slice(0, 1).toUpperCase()}</span>
            <span>{userLabel}</span>
            <span className="user-caret">▾</span>
          </button>
          {menuOpen && (
            <div className="user-dropdown" role="menu">
              {!account && (
                <button type="button" className="dropdown-item" onClick={openAuth} role="menuitem">Войти / Регистрация</button>
              )}
              {account && (
                <>
                  <button type="button" className="dropdown-item" onClick={openProfile} role="menuitem">Профиль</button>
                  {canAccessAdmin && <button type="button" className="dropdown-item" onClick={openAdmin} role="menuitem">Админ-панель</button>}
                  <button type="button" className="dropdown-item danger" onClick={logout} role="menuitem">Выйти</button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Header;
