import { render, screen, waitFor } from '@testing-library/react';
import App from './App';

jest.mock('./components/CommandList', () => () => <div>catalog stub</div>);
jest.mock('./components/SubmissionForm', () => () => <div>submission stub</div>);
jest.mock('./components/AdminPanel', () => () => <div>admin stub</div>);

test('renders store title', async () => {
  global.fetch = jest.fn((url) => {
    if (String(url).includes('/api/health')) {
      return Promise.resolve({ ok: true, json: async () => ({ status: 'ok' }) });
    }
    return Promise.resolve({ ok: true, json: async () => ({}) });
  });

  render(<App />);
  expect(screen.getByText(/catalog stub/i)).toBeInTheDocument();

  await waitFor(() => {
    expect(screen.getByText(/API online/i)).toBeInTheDocument();
  });
});
