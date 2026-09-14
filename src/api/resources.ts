import { requestApi } from '../lib/api';

import type {
  Court,
  CourtRecord,
  CreateTransactionInput,
  Expense,
  ExpenseCategory,
  ExpenseRecord,
  ManagedUser,
  Player,
  PlayerRecord,
  RateCard,
  RateRecord,
  TransactionCreateResponse,
  TransactionDetails,
  DashboardOverview,
} from '../types';


// ============================================================
// COURTS
// ============================================================

export interface CourtInput {
  name: string;

  /*
   * Code is optional.
   *
   * The backend automatically generates the code
   * when creating or renaming a court.
   */
  code?: string;

  isActive?: boolean;
}


export const courtsApi = {

  /* ----------------------------------------------------------
     GET ALL COURTS
     ---------------------------------------------------------- */

  list: () =>
    requestApi<Court[]>({
      method: 'GET',
      url: '/courts',
    }),


  /* ----------------------------------------------------------
     CREATE COURT
     ---------------------------------------------------------- */

  create: (
    input: CourtInput,
  ) =>
    requestApi<CourtRecord>({
      method: 'POST',
      url: '/courts',
      data: input,
    }),


  /* ----------------------------------------------------------
     UPDATE COURT
     ---------------------------------------------------------- */

  update: (
    id: string,
    input: Partial<CourtInput>,
  ) =>
    requestApi<CourtRecord>({
      method: 'PUT',
      url: `/courts/${id}`,
      data: input,
    }),


  /* ----------------------------------------------------------
     DELETE / REMOVE COURT
     ---------------------------------------------------------- */

  remove: (
    id: string,
  ) =>
    requestApi<{
      message: string;
    }>({
      method: 'DELETE',
      url: `/courts/${id}`,
    }),
};


// ============================================================
// RATES
// ============================================================

export interface RateInput {
  name: string;

  code?: string;

  amount: string;

  isActive?: boolean;
}


export const ratesApi = {

  /* ----------------------------------------------------------
     GET ALL RATES
     ---------------------------------------------------------- */

  list: () =>
    requestApi<RateCard[]>({
      method: 'GET',
      url: '/rates',
    }),


  /* ----------------------------------------------------------
     CREATE RATE
     ---------------------------------------------------------- */

  create: (
    input: RateInput,
  ) =>
    requestApi<RateRecord>({
      method: 'POST',
      url: '/rates',
      data: input,
    }),


  /* ----------------------------------------------------------
     UPDATE RATE
     ---------------------------------------------------------- */

  update: (
    id: string,
    input: Partial<RateInput>,
  ) =>
    requestApi<RateRecord>({
      method: 'PUT',
      url: `/rates/${id}`,
      data: input,
    }),


  /* ----------------------------------------------------------
     DELETE / REMOVE RATE
     ---------------------------------------------------------- */

  remove: (
    id: string,
  ) =>
    requestApi<{
      message: string;
    }>({
      method: 'DELETE',
      url: `/rates/${id}`,
    }),
};


// ============================================================
// USERS
// ============================================================

export interface UserInput {
  email: string;

  password: string;

  firstName: string;

  lastName: string;

  role:
    | 'ADMIN'
    | 'CASHIER';

  isActive?: boolean;
}


export type UpdateUserInput =
  Partial<
    Omit<UserInput, 'password'>
  > & {
    /**
     * Optional — only sent when
     * the admin sets a new password.
     */
    password?: string;
  };


export const usersApi = {

  /* ----------------------------------------------------------
     GET ALL USERS
     ---------------------------------------------------------- */

  list: () =>
    requestApi<ManagedUser[]>({
      method: 'GET',
      url: '/users',
    }),


  /* ----------------------------------------------------------
     CREATE USER
     ---------------------------------------------------------- */

  create: (
    input: UserInput,
  ) =>
    requestApi<ManagedUser>({
      method: 'POST',
      url: '/users',
      data: input,
    }),


  /* ----------------------------------------------------------
     UPDATE USER
     ---------------------------------------------------------- */

  update: (
    id: string,
    input: UpdateUserInput,
  ) =>
    requestApi<ManagedUser>({
      method: 'PUT',
      url: `/users/${id}`,
      data: input,
    }),


  /* ----------------------------------------------------------
     DELETE / REMOVE USER
     ---------------------------------------------------------- */

  remove: (
    id: string,
  ) =>
    requestApi<{
      message: string;
    }>({
      method: 'DELETE',
      url: `/users/${id}`,
    }),
};


// ============================================================
// PLAYERS
// ============================================================

export interface PlayerInput {
  name: string;

  fullName?: string;

  phone?: string | null;

  active?: boolean;

  isActive?: boolean;

  rate?: string | null;

  rateId?: string | null;
}

export type UpdatePlayerInput =
  Partial<
    Omit<PlayerInput, 'name'>
  > & {
    name?: string;
  };

const normalizePlayer = (
  player: Player,
): Player => {
  const normalizedName =
    player.name?.trim() ||
    player.fullName?.trim() ||
    '';

  const isActive =
    player.isActive ??
    player.active ??
    true;

  return {
    ...player,
    name: normalizedName,
    fullName:
      player.fullName?.trim() ||
      normalizedName,
    active: isActive,
    isActive,
  };
};

export const playersApi = {

  /* ----------------------------------------------------------
     GET ALL PLAYERS
     ---------------------------------------------------------- */

  list: async () => {
    const players =
      await requestApi<Player[]>({
        method: 'GET',
        url: '/players',
      });

    return players.map(
      normalizePlayer,
    );
  },


  /* ----------------------------------------------------------
     GET SINGLE PLAYER
     ---------------------------------------------------------- */

  get: async (
    id: string,
  ) => {
    const player =
      await requestApi<Player>({
        method: 'GET',
        url: `/players/${id}`,
      });

    return normalizePlayer(
      player,
    );
  },


  /* ----------------------------------------------------------
     CREATE PLAYER
     ---------------------------------------------------------- */

  create: (
    input: PlayerInput,
  ) =>
    requestApi<PlayerRecord>({
      method: 'POST',
      url: '/players',
      data: input,
    }),


  /* ----------------------------------------------------------
     UPDATE PLAYER
     ---------------------------------------------------------- */

  update: (
    id: string,
    input: UpdatePlayerInput,
  ) =>
    requestApi<PlayerRecord>({
      method: 'PUT',
      url: `/players/${id}`,
      data: input,
    }),


  /* ----------------------------------------------------------
     DELETE / REMOVE PLAYER
     ---------------------------------------------------------- */

  remove: (
    id: string,
  ) =>
    requestApi<{
      message: string;
    }>({
      method: 'DELETE',
      url: `/players/${id}`,
    }),
};


// ============================================================
// EXPENSE CATEGORIES
// ============================================================

export interface ExpenseCategoryInput {
  name: string;

  isActive?: boolean;
}


export const expenseCategoriesApi = {

  /* ----------------------------------------------------------
     GET ALL EXPENSE CATEGORIES
     ---------------------------------------------------------- */

  list: () =>
    requestApi<ExpenseCategory[]>({
      method: 'GET',
      url: '/expense-categories',
    }),


  /* ----------------------------------------------------------
     CREATE EXPENSE CATEGORY
     ---------------------------------------------------------- */

  create: (
    input: ExpenseCategoryInput,
  ) =>
    requestApi<ExpenseCategory>({
      method: 'POST',
      url: '/expense-categories',
      data: input,
    }),


  /* ----------------------------------------------------------
     UPDATE EXPENSE CATEGORY
     ---------------------------------------------------------- */

  update: (
    id: string,
    input: Partial<ExpenseCategoryInput>,
  ) =>
    requestApi<ExpenseCategory>({
      method: 'PUT',
      url: `/expense-categories/${id}`,
      data: input,
    }),

  remove: (
    id: string,
  ) =>
    requestApi<{
      deleted: boolean;
    }>({
      method: 'DELETE',
      url: `/expense-categories/${id}`,
    }),
};


// ============================================================
// EXPENSES
// ============================================================

export interface ExpenseInput {
  categoryId: string;

  description: string;

  amount: string;

  expenseDate: string;

  paymentMethod:
    | 'CASH'
    | 'GCASH'
    | 'CARD'
    | 'BANK_TRANSFER'
    | 'VENMO';

  notes?: string;
}


export const expensesApi = {

  /* ----------------------------------------------------------
     GET ALL EXPENSES
     ---------------------------------------------------------- */

  list: () =>
    requestApi<Expense[]>({
      method: 'GET',
      url: '/expenses',
    }),


  /* ----------------------------------------------------------
     CREATE EXPENSE
     ---------------------------------------------------------- */

  create: (
    input: ExpenseInput,
  ) =>
    requestApi<ExpenseRecord>({
      method: 'POST',
      url: '/expenses',
      data: input,
    }),


  /* ----------------------------------------------------------
     UPDATE EXPENSE
     ---------------------------------------------------------- */

  update: (
    id: string,
    input: Partial<ExpenseInput>,
  ) =>
    requestApi<ExpenseRecord>({
      method: 'PUT',
      url: `/expenses/${id}`,
      data: input,
    }),


  /* ----------------------------------------------------------
     DELETE / REMOVE EXPENSE
     ---------------------------------------------------------- */

  remove: (
    id: string,
  ) =>
    requestApi<{
      message: string;
    }>({
      method: 'DELETE',
      url: `/expenses/${id}`,
    }),
};


// ============================================================
// TRANSACTIONS
// ============================================================

export interface TransactionPlayerInput {
  playerId: string;

  rateId: string;
}


export interface CreateTransactionInput {
  courtId: string;

  transactionDate: string;

  startTime: string;

  endTime: string;

  paymentMethod:
    | 'CASH'
    | 'GCASH'
    | 'CARD'
    | 'BANK_TRANSFER'
    | 'VENMO';

  /**
   * Optional status override.
   *
   * Defaults to 'COMPLETED' when omitted.
   * Pass 'UNPAID' to create a pending/unpaid transaction
   * that can be marked paid later.
   */
  status?: 'COMPLETED' | 'UNPAID';

  players: TransactionPlayerInput[];
}


export const transactionsApi = {

  /* ----------------------------------------------------------
     GET ALL TRANSACTIONS
     ---------------------------------------------------------- */

  list: () =>
    requestApi<TransactionDetails[]>({
      method: 'GET',
      url: '/transactions',
    }),


  /* ----------------------------------------------------------
     GET SINGLE TRANSACTION
     ---------------------------------------------------------- */

  get: (
    id: string,
  ) =>
    requestApi<TransactionDetails>({
      method: 'GET',
      url: `/transactions/${id}`,
    }),


  /* ----------------------------------------------------------
     CREATE TRANSACTION
     ---------------------------------------------------------- */

  create: (
    input: CreateTransactionInput,
    idempotencyKey: string,
  ) =>
    requestApi<TransactionCreateResponse>({
      method: 'POST',
      url: '/transactions',
      data: input,

      headers: {
        'Idempotency-Key':
          idempotencyKey,
      },
    }),


  /* ----------------------------------------------------------
     UPDATE TRANSACTION
     ---------------------------------------------------------- */

  update: (
    id: string,
    input: CreateTransactionInput,
  ) =>
    requestApi<TransactionDetails>({
      method: 'PUT',
      url: `/transactions/${id}`,
      data: input,
    }),


  /* ----------------------------------------------------------
     MARK TRANSACTION AS PAID
     ---------------------------------------------------------- */

  markPaid: (
    id: string,
  ) =>
    requestApi<TransactionDetails>({
      method: 'PATCH',
      url: `/transactions/${id}/mark-paid`,
    }),

  updatePlayerRates: (
    transactionId: string,
    playerId: string,
    rateIds: string[],
  ) =>
    requestApi<TransactionDetails>({
      method: 'PATCH',
      url: `/transactions/${transactionId}/players/${playerId}/rates`,
      data: { rateIds },
    }),


  /* ----------------------------------------------------------
     CANCEL TRANSACTION
     ---------------------------------------------------------- */

  cancel: (
    id: string,
  ) =>
    requestApi<TransactionDetails>({
      method: 'POST',
      url: `/transactions/${id}/cancel`,
    }),
};


// ============================================================
// DASHBOARD
// ============================================================

export const dashboardApi = {

  /*
   * Dashboard overview.
   *
   * Defaults to daily.
   */

  overview: (
    period:
      | 'daily'
      | 'monthly'
      | 'yearly' = 'daily',
  ) =>
    requestApi<DashboardOverview>({
      method: 'GET',
      url: '/analytics/overview',
      params: {
        period,
      },
    }),
};


// ============================================================
// ANALYTICS
// ============================================================

export type AnalyticsPeriod =
  | 'daily'
  | 'monthly'
  | 'yearly';


export const analyticsApi = {

  /*
   * Get analytics based on selected period.
   *
   * DAILY:
   * Shows data grouped by day.
   *
   * MONTHLY:
   * Shows data grouped by month.
   *
   * YEARLY:
   * Shows data grouped by year.
   */

  overview: (
    period: AnalyticsPeriod = 'daily',
  ) =>
    requestApi<DashboardOverview>({
      method: 'GET',
      url: '/analytics/overview',
      params: {
        period,
      },
    }),
};