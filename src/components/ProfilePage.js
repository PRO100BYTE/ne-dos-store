import React, { useEffect, useState } from 'react';
import './ProfilePage.css';
import HttpErrorPage from './HttpErrorPage';

function ProfilePage({ account, session, onAuthSuccess, onOpenAuth }) {
  const [displayName, setDisplayName] = useState(account?.displayName || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newPasswordConfirm, setNewPasswordConfirm] = useState('');
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [message, setMessage] = useState('');
  const [httpError, setHttpError] = useState(null);

  useEffect(() => {
    setDisplayName(account?.displayName || '');
  }, [account]);

  useEffect(() => {
    if (!session) return;
    let mounted = true;

    const loadProfile = async () => {
      setLoadingProfile(true);
      setHttpError(null);
      try {
        const res = await fetch('/api/auth/profile', {
          headers: { 'x-nedos-session': session },
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          const err = new Error(data.message || 'Не удалось загрузить профиль');
          err.httpStatus = res.status;
          throw err;
        }
        if (!mounted) return;
        setDisplayName(data.account?.displayName || '');
      } catch (err) {
        if (!mounted) return;
        setHttpError({ status: err.httpStatus || 500, message: err.message || 'Не удалось загрузить профиль' });
      } finally {
        if (mounted) setLoadingProfile(false);
      }
    };

    loadProfile();
    return () => {
      mounted = false;
    };
  }, [session]);

  if (!session || !account) {
    return (
      <section className="profile-page">
        <div className="profile-card">
          <h2>Профиль недоступен</h2>
          <p>Для просмотра и редактирования профиля нужно войти в аккаунт.</p>
          <button type="button" onClick={onOpenAuth}>Перейти ко входу</button>
        </div>
      </section>
    );
  }

  const saveProfile = async (e) => {
    e.preventDefault();
    setHttpError(null);
    setMessage('');
    setSavingProfile(true);
    try {
      const res = await fetch('/api/auth/profile', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-nedos-session': session,
        },
        body: JSON.stringify({ displayName }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const err = new Error(data.message || 'Не удалось обновить профиль');
        err.httpStatus = res.status;
        throw err;
      }
      onAuthSuccess(data.session || session, data.account || account);
      setMessage('Профиль обновлен');
    } catch (err) {
      setHttpError({ status: err.httpStatus || 500, message: err.message || 'Не удалось обновить профиль' });
    } finally {
      setSavingProfile(false);
    }
  };

  const savePassword = async (e) => {
    e.preventDefault();
    setHttpError(null);
    setMessage('');

    if (!currentPassword || !newPassword || !newPasswordConfirm) {
      setHttpError({ status: 400, message: 'Заполните все поля пароля' });
      return;
    }

    if (newPassword !== newPasswordConfirm) {
      setHttpError({ status: 400, message: 'Новые пароли не совпадают' });
      return;
    }

    setSavingPassword(true);
    try {
      const res = await fetch('/api/auth/profile/password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-nedos-session': session,
        },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const err = new Error(data.message || 'Не удалось изменить пароль');
        err.httpStatus = res.status;
        throw err;
      }
      onAuthSuccess(data.session || session, data.account || account);
      setCurrentPassword('');
      setNewPassword('');
      setNewPasswordConfirm('');
      setMessage(data.message || 'Пароль обновлен');
    } catch (err) {
      setHttpError({ status: err.httpStatus || 500, message: err.message || 'Не удалось изменить пароль' });
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <section className="profile-page">
      <div className="profile-card">
        <h2>Профиль пользователя</h2>
        <p className="profile-subtitle">Редактируйте отображаемое имя и пароль .nedos Passport.</p>

        {loadingProfile && <div className="profile-state">Загрузка профиля...</div>}

        <form className="profile-form" onSubmit={saveProfile}>
          <label htmlFor="displayName">Display name</label>
          <input
            id="displayName"
            type="text"
            value={displayName}
            maxLength={80}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Как вас показывать в магазине"
          />
          <button type="submit" disabled={savingProfile}>{savingProfile ? 'Сохранение...' : 'Сохранить профиль'}</button>
        </form>

        <form className="profile-form" onSubmit={savePassword}>
          <h3>Смена пароля</h3>
          <label htmlFor="currentPassword">Текущий пароль</label>
          <input
            id="currentPassword"
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            placeholder="Введите текущий пароль"
          />
          <label htmlFor="newPassword">Новый пароль</label>
          <input
            id="newPassword"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="Минимум 8 символов, a-z, A-Z, 0-9"
          />
          <label htmlFor="newPasswordConfirm">Повторите новый пароль</label>
          <input
            id="newPasswordConfirm"
            type="password"
            value={newPasswordConfirm}
            onChange={(e) => setNewPasswordConfirm(e.target.value)}
            placeholder="Повторите новый пароль"
          />
          <button type="submit" disabled={savingPassword}>{savingPassword ? 'Обновление...' : 'Сменить пароль'}</button>
        </form>

        {message && <div className="profile-message">{message}</div>}
      </div>
      {httpError && (
        <HttpErrorPage
          status={httpError.status}
          title="Ошибка профиля"
          message={httpError.message}
          onRetry={() => setHttpError(null)}
        />
      )}
    </section>
  );
}

export default ProfilePage;
