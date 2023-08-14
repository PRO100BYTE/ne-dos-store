import React from 'react';
import './Header.css';

function Header() {
  return (
    <div className="Header">
      <div className="logo">
        <img src="/images/nedos.png" alt="NE-DOS logo" />
        <span>NE-DOS Store</span>
      </div>
      <div className="login">
        <button>
          <i className="fas fa-sign-in-alt"></i>
          Войти с помощью XorekID
        </button>
      </div>
    </div>
  );
}

export default Header;
