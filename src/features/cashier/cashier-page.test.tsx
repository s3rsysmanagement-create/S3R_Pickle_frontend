import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';

import * as resources from '../../api/resources';
import { CashierPage } from './cashier-page';

vi.mock('../../api/resources', () => ({
  courtsApi: { list: vi.fn() },
  ratesApi: { list: vi.fn() },
  playersApi: { list: vi.fn(), create: vi.fn(), update: vi.fn() },
  transactionsApi: { list: vi.fn(), create: vi.fn(), update: vi.fn(), markPaid: vi.fn() },
}));

describe('CashierPage', () => {
  it('submits a cashier transaction with the backend-shaped payload', async () => {
    const user = userEvent.setup();

    vi.mocked(resources.courtsApi.list).mockResolvedValue([
      { id: 'court-1', name: 'Court 1', indoor: true, surface: 'Hardcourt', rate: 35, isActive: true },
    ]);
    vi.mocked(resources.ratesApi.list).mockResolvedValue([
      { id: 'rate-1', name: 'Regular', description: 'REGULAR', amount: 100, active: true },
    ]);
    vi.mocked(resources.playersApi.list).mockResolvedValue([
      { id: 'player-1', name: 'Ana Lopez', fullName: 'Ana Lopez', phone: '(555) 300-1234', active: true, isActive: true },
      { id: 'player-2', name: 'Daniel Tran', fullName: 'Daniel Tran', phone: '(555) 200-5555', active: true, isActive: true },
    ]);
    vi.mocked(resources.transactionsApi.list).mockResolvedValue([]);
    vi.mocked(resources.transactionsApi.create).mockResolvedValue({
      id: 'txn_123',
      transactionCode: 'TXN-20260101-0001',
      cashierId: 'cashier-1',
      courtId: 'court-1',
      transactionDate: '2026-01-01',
      startTime: '2026-01-01T09:00:00.000Z',
      endTime: '2026-01-01T10:00:00.000Z',
      total: '100.00',
      paymentMethod: 'CASH',
      status: 'COMPLETED',
      createdAt: '2026-01-01T09:00:00.000Z',
    });

    render(
      <QueryClientProvider client={new QueryClient()}>
        <MemoryRouter>
          <CashierPage />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    const playerButton = await screen.findByRole('button', { name: /ana lopez/i });
    await user.click(playerButton);
    await user.selectOptions(screen.getByLabelText('Court'), 'court-1');
    await user.selectOptions(screen.getByLabelText('Payment method'), 'CASH');
    await user.click(screen.getByTestId('cashier-submit'));

    await waitFor(() => {
      expect(resources.transactionsApi.create).toHaveBeenCalledWith(
        expect.objectContaining({
          courtId: 'court-1',
          paymentMethod: 'CASH',
          players: [{ playerId: 'player-1', rateId: 'rate-1' }],
        }),
        expect.any(String),
      );
    });
  });

  it('allows editing the payment-list rates and saves them to the transaction payload', async () => {
    const user = userEvent.setup();

    vi.mocked(resources.courtsApi.list).mockResolvedValue([
      { id: 'court-1', name: 'Court 1', indoor: true, surface: 'Hardcourt', rate: 35, isActive: true },
    ]);
    vi.mocked(resources.ratesApi.list).mockResolvedValue([
      { id: 'rate-1', name: 'Open Play', description: 'OPEN_PLAY', amount: 100, active: true },
      { id: 'rate-2', name: 'Paddle Rental', description: 'PADDLE', amount: 50, active: true },
    ]);
    vi.mocked(resources.playersApi.list).mockResolvedValue([
      { id: 'player-1', name: 'Ana Lopez', fullName: 'Ana Lopez', phone: '(555) 300-1234', active: true, isActive: true },
    ]);

    const transaction = {
      id: 'txn-1',
      transactionCode: 'TXN-20260101-0002',
      transactionDate: '2026-01-01',
      startTime: '2026-01-01T09:00:00.000Z',
      endTime: '2026-01-01T10:00:00.000Z',
      createdAt: '2026-01-01T09:00:00.000Z',
      cashierName: 'Front Cashier',
      courtName: 'Court 1',
      courtId: 'court-1',
      status: 'UNPAID' as const,
      paymentMethod: 'CASH' as const,
      total: '100.00',
      playerCount: 1,
      players: [
        {
          playerId: 'player-1',
          playerName: 'Ana Lopez',
          amount: '100.00',
          rateId: 'rate-1',
          rateName: 'Open Play',
        },
      ],
    };

    vi.mocked(resources.transactionsApi.list).mockResolvedValue([
      transaction,
    ]);
    vi.mocked(resources.transactionsApi.update).mockResolvedValue({
      ...transaction,
      total: '150.00',
      players: [
        ...transaction.players,
        {
          playerId: 'player-1',
          playerName: 'Ana Lopez',
          amount: '50.00',
          rateId: 'rate-2',
          rateName: 'Paddle Rental',
        },
      ],
    });

    render(
      <QueryClientProvider client={new QueryClient()}>
        <MemoryRouter>
          <CashierPage />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    await user.click(await screen.findByRole('button', { name: 'Edit' }));
    await user.click(screen.getByLabelText(/Paddle Rental/i));
    await user.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      expect(resources.transactionsApi.update).toHaveBeenCalledWith(
        'txn-1',
        expect.objectContaining({
          courtId: 'court-1',
          paymentMethod: 'CASH',
          status: 'UNPAID',
          players: [
            { playerId: 'player-1', rateId: 'rate-1' },
            { playerId: 'player-1', rateId: 'rate-2' },
          ],
        }),
      );
    });
  });
});
