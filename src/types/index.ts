// ============================================================
// ROLES
// ============================================================

export type Role =
  | 'ADMIN'
  | 'CASHIER';


// ============================================================
// PAYMENT METHODS
// ============================================================

export type PaymentMethod =
  | 'CASH'
  | 'GCASH'
  | 'BANK_TRANSFER'


// ============================================================
// TRANSACTION STATUS
// ============================================================

export type TransactionStatus =
  | 'COMPLETED'
  | 'UNPAID';


// ============================================================
// AUTH
// ============================================================

/**
 * The identity returned by the JWT-backed auth endpoints
 * (login/me).
 */
export interface AuthUser {
  id: string;

  email: string;

  role: Role;
}


// ============================================================
// API
// ============================================================

export interface ApiError {
  code: string;

  message: string;

  details?: Record<string, unknown> | string;
}


export interface ApiEnvelope<T> {
  success: boolean;

  data?: T;

  error?: ApiError;
}


// ============================================================
// DASHBOARD
// ============================================================

export interface DashboardStat {
  label: string;

  value: string;

  delta?: string;

  tone?: 'positive' | 'neutral' | 'warning';
}


export interface ChartPoint {
  name: string;

  value: number;

  sortKey?: string;
}


export interface DashboardOverview {
  stats: DashboardStat[];

  revenueTrend: ChartPoint[];

  revenueByPeriod: ChartPoint[];

  paymentBreakdown: ChartPoint[];

  paymentSummary: ChartPoint[];

  courtUsage: ChartPoint[];

  courtAnalytics: ChartPoint[];

  cashierSummary: ChartPoint[];

  cashierAnalytics: ChartPoint[];

  playerAnalytics: ChartPoint[];
}


// ============================================================
// PLAYERS
// ============================================================

/**
 * GET /players
 *
 * Backend-normalized player shape.
 */
export interface Player {
  id: string;

  name: string;

  fullName: string;

  phone?: string;

  rate?: string;

  rateName?: string;

  rateId?: string;

  active: boolean;

  isActive: boolean;
}


/**
 * POST /players and PUT /players/:id
 *
 * Raw player record shape.
 */
export interface PlayerRecord {
  id: string;

  name: string;

  fullName: string;

  phone?: string | null;

  active: boolean;

  isActive: boolean;

  rate?: string | null;

  rateName?: string;

  rateId?: string | null;

  createdAt?: string;

  updatedAt?: string;
}


// ============================================================
// COURTS
// ============================================================

/**
 * GET /courts
 *
 * Backend-normalized court shape.
 */
export interface Court {
  id: string;

  name: string;

  indoor: boolean;

  surface: string;

  rate: number;

  isActive: boolean;
}


/**
 * POST /courts and PUT /courts/:id
 *
 * Raw court record shape.
 */
export interface CourtRecord {
  id: string;

  name: string;

  code: string;

  isActive: boolean;

  createdAt: string;

  updatedAt: string;
}


// ============================================================
// RATES
// ============================================================

/**
 * GET /rates
 *
 * Backend-normalized rate shape.
 */
export interface RateCard {
  id: string;

  name: string;

  description: string;

  amount: number;

  active: boolean;
}


/**
 * POST /rates and PUT /rates/:id
 *
 * Raw rate record shape.
 */
export interface RateRecord {
  id: string;

  name: string;

  code: string;

  amount: string | number;

  isActive: boolean;

  createdAt: string;

  updatedAt: string;
}


// ============================================================
// USERS
// ============================================================

/**
 * GET /users
 * POST /users
 * PUT /users/:id
 */
export interface ManagedUser {
  id: string;

  email: string;

  firstName: string;

  lastName: string;

  roleId: string;

  isActive: boolean;

  createdAt: string;

  updatedAt: string;

  role: {
    name: Role;
  };
}


// ============================================================
// EXPENSES
// ============================================================

/**
 * GET /expenses
 *
 * Backend-normalized expense shape.
 */
export interface Expense {
  id: string;

  title: string;

  category: string;

  amount: number;

  paymentMethod: PaymentMethod;

  createdAt: string;
}


/**
 * POST /expenses and PUT /expenses/:id
 *
 * Raw expense record shape.
 */
export interface ExpenseRecord {
  id: string;

  categoryId: string;

  description: string;

  amount: string | number;

  expenseDate: string;

  paymentMethod: PaymentMethod;

  notes: string | null;

  createdAt: string;

  category?: {
    id: string;
    name: string;
  };
}


// ============================================================
// EXPENSE CATEGORIES
// ============================================================

export interface ExpenseCategory {
  id: string;

  name: string;

  isActive: boolean;

  createdAt: string;

  updatedAt: string;
}


// ============================================================
// TRANSACTIONS
// ============================================================

/**
 * Individual player/payment inside a transaction.
 *
 * Example:
 *
 * {
 *   playerId: "123",
 *   playerName: "Juan Dela Cruz",
 *   amount: 200
 * }
 */
export interface TransactionPlayer {
  playerId: string;

  playerName: string;

  amount: string | number;

  /**
   * Rate ID for this player's fee.
   * Optional — not always returned by the backend.
   */
  rateId?: string;

  /**
   * Rate name label.
   * Optional — not always returned by the backend.
   */
  rateName?: string;
}


export interface TransactionPlayerInput {
  playerId: string;

  rateId: string;
}


/**
 * POST /transactions
 *
 * Flat transaction response returned after
 * creating a transaction.
 */
export interface TransactionCreateResponse {
  id: string;

  transactionCode: string;

  cashierId: string;

  courtId: string;

  transactionDate: string;

  startTime: string;

  endTime: string;

  total: string;

  paymentMethod: PaymentMethod;

  status: TransactionStatus;

  createdAt: string;
}


export interface CreateTransactionInput {
  courtId: string;

  transactionDate: string;

  startTime: string;

  endTime: string;

  paymentMethod: PaymentMethod;

  status?: 'COMPLETED' | 'UNPAID';

  players: TransactionPlayerInput[];
}


/**
 * GET /transactions
 * GET /transactions/:id
 *
 * Backend-normalized transaction shape.
 *
 * Each transaction can contain multiple players.
 */
export interface TransactionDetails {
  /**
   * Transaction database ID.
   */
  id: string;


  /**
   * Human-readable transaction code.
   *
   * Example:
   *
   * TXN-20260826-1234
   */
  transactionCode?: string;


  /**
   * Actual business date of the transaction.
   *
   * IMPORTANT:
   * Use this field for daily reports and date filters.
   */
  transactionDate: string;


  /**
   * Transaction start time.
   */
  startTime?: string;


  /**
   * Transaction end time.
   */
  endTime?: string;


  /**
   * When the transaction database record
   * was created.
   */
  createdAt: string;


  /**
   * Cashier/staff who processed the transaction.
   */
  cashierName: string;


  /**
   * Court used by the transaction.
   */
  courtName: string;


  /**
   * Transaction status.
   *
   * Backend may return COMPLETED,
   * while the normalized list may use PAID.
   */
  status:
    | 'PAID'
    | 'CANCELLED'
    | TransactionStatus;


  /**
   * Payment method used.
   */
  paymentMethod: PaymentMethod;


  /**
   * Total transaction amount.
   */
  total: string | number;


  /**
   * Number of players included
   * in this transaction.
   */
  playerCount: number;


  /**
   * Individual players and their
   * corresponding payment amounts.
   */
  players: TransactionPlayer[];
}