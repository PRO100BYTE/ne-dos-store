import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import ProfilePage from './ProfilePage';

test('changes password from profile page', async () => {
  const onAuthSuccess = jest.fn();
  const onOpenAuth = jest.fn();

  const fetchMock = jest
    .fn()
    .mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        account: { id: 'u1', username: 'john', displayName: 'John Doe', roles: ['uploader'] },
        session: { token: 's1' },
      }),
    })
    .mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        message: 'Пароль обновлен',
        account: { id: 'u1', username: 'john', displayName: 'John Doe', roles: ['uploader'] },
        session: 'new-session-token',
      }),
    });

  global.fetch = fetchMock;

  render(
    <ProfilePage
      account={{ id: 'u1', username: 'john', displayName: 'John Doe', roles: ['uploader'] }}
      session="session-token"
      onAuthSuccess={onAuthSuccess}
      onOpenAuth={onOpenAuth}
    />
  );

  await waitFor(() => {
    expect(fetchMock).toHaveBeenCalledWith('/api/auth/profile', {
      headers: { 'x-nedos-session': 'session-token' },
    });
  });

  fireEvent.change(screen.getByLabelText('Текущий пароль'), {
    target: { value: 'CiPassword123' },
  });
  fireEvent.change(screen.getByLabelText('Новый пароль'), {
    target: { value: 'CiPassword456' },
  });
  fireEvent.change(screen.getByLabelText('Повторите новый пароль'), {
    target: { value: 'CiPassword456' },
  });

  fireEvent.click(screen.getByRole('button', { name: 'Сменить пароль' }));

  await waitFor(() => {
    expect(fetchMock).toHaveBeenCalledWith('/api/auth/profile/password', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-nedos-session': 'session-token',
      },
      body: JSON.stringify({ currentPassword: 'CiPassword123', newPassword: 'CiPassword456' }),
    });
  });

  await waitFor(() => {
    expect(onAuthSuccess).toHaveBeenCalledWith(
      'new-session-token',
      expect.objectContaining({ username: 'john' })
    );
  });

  expect(screen.getByText('Пароль обновлен')).toBeInTheDocument();
});
