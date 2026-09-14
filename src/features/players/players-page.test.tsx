import {
  QueryClient,
  QueryClientProvider,
} from '@tanstack/react-query';
import {
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, vi } from 'vitest';

import * as resources from '../../api/resources';
import { PlayersPage } from './players-page';
import { useAuth } from '../auth/use-auth';

vi.mock('../../api/resources', () => ({
  playersApi: {
    list: vi.fn(),
    update: vi.fn(),
    create: vi.fn(),
    remove: vi.fn(),
  },
  transactionsApi: {
    list: vi.fn(),
    updatePlayerRates: vi.fn(),
  },
  ratesApi: {
    list: vi.fn(),
  },
}));
vi.mock('../auth/use-auth', () => ({
  useAuth: vi.fn(),
}));

const renderPage = () =>
  render(
    <QueryClientProvider
      client={new QueryClient()}
    >
      <MemoryRouter>
        <PlayersPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );

describe('PlayersPage', () => {
  beforeEach(() => {
    vi.mocked(useAuth).mockReturnValue({
      user: {
        id: 'admin-1',
        email: 'admin@pickle.local',
        role: 'ADMIN',
      },
      token: 'token',
      isLoading: false,
      isAuthenticated: true,
      login: vi.fn(),
      logout: vi.fn(),
      setUser: vi.fn(),
    });
  });

  it('merges repeated same-player rows into one row with combined rates', async () => {
    vi.mocked(resources.playersApi.list).mockResolvedValue([
      {
        id: 'player-1',
        name: 'Sample',
        fullName: 'Sample',
        phone: '0917-123-0000',
        active: true,
        isActive: true,
      },
    ]);

    vi.mocked(resources.transactionsApi.list).mockResolvedValue([
      {
        id: 'txn-1',
        transactionDate: '2026-09-02',
        createdAt: '2026-09-02T00:10:00.000Z',
        cashierName: 'Front Cashier',
        courtName: 'Court 1',
        paymentMethod: 'CASH',
        status: 'PAID',
        total: 230,
        playerCount: 1,
        players: [
          {
            playerId: 'player-1',
            playerName: 'Sample',
            rateId: 'rate-1',
            rateName: 'Paddle Rental',
            amount: 50,
          },
          {
            playerId: 'player-1',
            playerName: 'Sample',
            rateId: 'rate-2',
            rateName: 'Ball Rental',
            amount: 30,
          },
          {
            playerId: 'player-1',
            playerName: 'Sample',
            rateId: 'rate-3',
            rateName: 'Open Play',
            amount: 150,
          },
        ],
      },
    ]);
    vi.mocked(resources.ratesApi.list).mockResolvedValue([
      {
        id: 'rate-1',
        name: 'Paddle Rental',
        description: 'PR',
        amount: 50,
        active: true,
      },
      {
        id: 'rate-2',
        name: 'Ball Rental',
        description: 'BR',
        amount: 30,
        active: true,
      },
      {
        id: 'rate-3',
        name: 'Open Play',
        description: 'OP',
        amount: 150,
        active: true,
      },
    ]);

    renderPage();

    await userEvent.click(
      await screen.findByRole(
        'button',
        { name: 'View' },
      ),
    );

    expect(
      screen.getAllByText('Sample')
        .length,
    ).toBe(1);
    expect(
      screen.getByText(
        'Paddle Rental, Ball Rental, Open Play',
      ),
    ).toBeInTheDocument();
    expect(
      screen.getAllByText(
        '₱230.00',
      ).length,
    ).toBeGreaterThan(0);
  });

  it('shows editable history columns including RATE', async () => {
    vi.mocked(resources.playersApi.list).mockResolvedValue([
      {
        id: 'player-1',
        name: 'Maria Cruz',
        fullName: 'Maria Cruz',
        phone: '0917-111-2222',
        active: true,
        isActive: true,
      },
    ]);
    vi.mocked(resources.transactionsApi.list).mockResolvedValue([
      {
        id: 'txn-1',
        transactionDate: '2026-09-01',
        createdAt: '2026-09-01T09:00:00.000Z',
        cashierName: 'Cashier One',
        courtName: 'Court A',
        paymentMethod: 'CASH',
        status: 'PAID',
        total: 150,
        playerCount: 1,
        players: [
          {
            playerId: 'player-1',
            playerName: 'Maria Cruz',
            rateId: 'rate-1',
            rateName: 'Open Play',
            amount: 150,
          },
        ],
      },
    ]);
    vi.mocked(resources.ratesApi.list).mockResolvedValue([
      {
        id: 'rate-1',
        name: 'Open Play',
        description: 'OP',
        amount: 150,
        active: true,
      },
    ]);

    renderPage();

    await userEvent.click(
      await screen.findByRole(
        'button',
        { name: 'View' },
      ),
    );

    expect(
      await screen.findByText(
        'PLAYER',
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        'COURT',
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        'PAYMENT',
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        'RATE',
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        'AMOUNT',
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        'STATUS',
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        'ACTION',
      ),
    ).toBeInTheDocument();
  });

  it('edits visible row columns and saves', async () => {
    const user = userEvent.setup();

    vi.mocked(resources.playersApi.list).mockResolvedValue([
      {
        id: 'player-1',
        name: 'Ana Lopez',
        fullName: 'Ana Lopez',
        phone: '0917-123-4567',
        active: true,
        isActive: true,
      },
    ]);
    vi.mocked(resources.transactionsApi.list).mockResolvedValue([
      {
        id: 'txn-1',
        transactionDate: '2026-09-01',
        createdAt: '2026-09-01T09:00:00.000Z',
        cashierName: 'Cashier One',
        courtName: 'Court A',
        paymentMethod: 'CASH',
        status: 'PAID',
        total: 150,
        playerCount: 1,
        players: [
          {
            playerId: 'player-1',
            playerName: 'Ana Lopez',
            rateId: 'rate-old',
            rateName: 'Open Play',
            amount: 150,
          },
        ],
      },
    ]);
    vi.mocked(resources.ratesApi.list).mockResolvedValue([
      {
        id: 'rate-old',
        name: 'Open Play',
        description: 'OP',
        amount: 150,
        active: true,
      },
      {
        id: 'rate-1',
        name: 'Premium',
        description: 'PRM',
        amount: 200,
        active: true,
      },
    ]);
    vi.mocked(resources.playersApi.update).mockResolvedValue({
      id: 'player-1',
      name: 'Ana Santos',
      fullName: 'Ana Santos',
      active: true,
      isActive: true,
    });

    renderPage();

    await user.click(
      await screen.findByRole(
        'button',
        { name: 'View' },
      ),
    );

    await user.click(
      screen.getByRole(
        'button',
        { name: 'Edit' },
      ),
    );

    const nameInput =
      screen.getByPlaceholderText(
        'Enter player name',
      );
    const courtInput =
      screen.getByPlaceholderText(
        'Enter court',
      );
    const amountInput =
      screen.getByPlaceholderText(
        '0.00',
      );
    const selects =
      screen.getAllByRole(
        'combobox',
      );
    const paymentSelect =
      selects[0];
    const statusSelect =
      selects[1];

    await user.clear(nameInput);
    await user.type(
      nameInput,
      'Ana Santos',
    );

    await user.clear(courtInput);
    await user.type(
      courtInput,
      'Court B',
    );

    const openPlayCheckbox =
      screen.getByRole(
        'checkbox',
        { name: 'Open Play' },
      );
    const premiumCheckbox =
      screen.getByRole(
        'checkbox',
        { name: 'Premium' },
      );

    await user.click(
      openPlayCheckbox,
    );
    await user.click(
      premiumCheckbox,
    );

    await user.clear(amountInput);
    await user.type(
      amountInput,
      '200',
    );

    await user.selectOptions(
      paymentSelect,
      'GCASH',
    );
    await user.selectOptions(
      statusSelect,
      'UNPAID',
    );
    await user.click(
      screen.getByRole(
        'button',
        { name: 'Save' },
      ),
    );

    await waitFor(() => {
      expect(
        resources.playersApi.update,
      ).toHaveBeenCalledWith(
        'player-1',
        {
          fullName: 'Ana Santos',
        },
      );
    });
    await waitFor(() => {
      expect(
        resources.transactionsApi.updatePlayerRates,
      ).toHaveBeenCalledWith(
        'txn-1',
        'player-1',
        ['rate-1'],
      );
    });

    expect(
      await screen.findByText(
        'Court B',
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        'GCash',
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        'Premium',
      ),
    ).toBeInTheDocument();
    expect(
      screen.getAllByText(
        '₱200.00',
      ).length,
    ).toBeGreaterThan(0);
    expect(
      screen.getByText(
        'UNPAID',
      ),
    ).toBeInTheDocument();
  });
});
