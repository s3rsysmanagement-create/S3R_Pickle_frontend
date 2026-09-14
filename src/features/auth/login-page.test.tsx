import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';

import * as api from '../../lib/api';
import { AuthProvider } from './auth-context';
import { LoginPage } from './login-page';

vi.mock('../../lib/api', () => ({
  authApi: {
    login: vi.fn(),
    logout: vi.fn(),
    me: vi.fn(),
  },
}));

describe('LoginPage', () => {
  it('submits the login form with credentials and requests auth', async () => {
    const user = userEvent.setup();
    const loginMock = vi.mocked(api.authApi.login);

    loginMock.mockResolvedValue({
      user: { id: '1', email: 'admin@pickleball.local', role: 'ADMIN' },
      token: 'jwt-token',
    });

    render(
      <QueryClientProvider client={new QueryClient()}>
        <MemoryRouter>
          <AuthProvider>
            <LoginPage />
          </AuthProvider>
        </MemoryRouter>
      </QueryClientProvider>,
    );

    await user.clear(screen.getByLabelText('Email'));
    await user.type(screen.getByLabelText('Email'), 'admin@pickleball.local');
    await user.clear(screen.getByLabelText('Password'));
    await user.type(screen.getByLabelText('Password'), 'Password123!');
    await user.click(screen.getByTestId('login-submit'));

    await waitFor(() => {
      expect(loginMock).toHaveBeenCalledWith('admin@pickleball.local', 'Password123!');
    });
  });
});
