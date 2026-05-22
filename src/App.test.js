import { render, screen, waitFor } from '@testing-library/react';
import App from './App';

test('renders store title', async () => {
  global.fetch = jest.fn((url) => {
    if (String(url).includes('/api/health')) {
      return Promise.resolve({ ok: true, json: async () => ({ status: 'ok' }) });
    }
    if (String(url).includes('/api/meta')) {
      return Promise.resolve({
        ok: true,
        json: async () => ({ categories: ['online'], tags: ['api'], count: 1 }),
      });
    }
    return Promise.resolve({
      ok: true,
      json: async () => ({ total: 1, items: [] }),
    });
  });

  render(<App />);
  const searchInput = screen.getByPlaceholderText(/Поиск команд/i);
  expect(searchInput).toBeInTheDocument();

  await waitFor(() => {
    expect(global.fetch).toHaveBeenCalled();
  });
});
