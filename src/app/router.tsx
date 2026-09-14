import { createBrowserRouter, Navigate } from 'react-router-dom';

import { LoginPage } from '../features/auth/login-page';
import { AnalyticsPage } from '../features/analytics/analytics-page';
import { CashierPage } from '../features/cashier/cashier-page';
import { DashboardPage } from '../features/dashboard/dashboard-page';
import { ExpenseCategoriesPage } from '../features/expenses/expense-categories-page';
import { ExpensesPage } from '../features/expenses/expenses-page';
import { CourtsPage } from '../features/management/courts-page';
import { ManagementPage } from '../features/management/management-page';
import { RatesPage } from '../features/management/rates-page';
import { UsersPage } from '../features/management/users-page';
import { PlayersPage } from '../features/players/players-page';
import { TransactionDetailPage } from '../features/transactions/transaction-detail-page';
import { TransactionsPage } from '../features/transactions/transactions-page';
import { ProtectedRoute, RootRedirect } from './route-guards';
import { AppLayout } from './layouts/app-shell';
import { AppErrorBoundary } from './error-boundary';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <RootRedirect />,
  },
  {
    path: '/login',
    element: <LoginPage />,
    errorElement: <AppErrorBoundary />,
  },
  {
    path: '/',
    element: <AppLayout />,
    errorElement: <AppErrorBoundary />,
    children: [
      {
        path: 'dashboard',
        element: (
          <ProtectedRoute allowedRoles={['ADMIN']}>
            <DashboardPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'transactions',
        element: (
          <ProtectedRoute allowedRoles={['ADMIN', 'CASHIER']}>
            <TransactionsPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'transactions/:id',
        element: (
          <ProtectedRoute allowedRoles={['ADMIN', 'CASHIER']}>
            <TransactionDetailPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'cashier',
        element: (
          <ProtectedRoute allowedRoles={['CASHIER']}>
            <CashierPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'players',
        element: (
          <ProtectedRoute allowedRoles={['ADMIN', 'CASHIER']}>
            <PlayersPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'management',
        element: (
          <ProtectedRoute allowedRoles={['ADMIN']}>
            <ManagementPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'courts',
        element: (
          <ProtectedRoute allowedRoles={['ADMIN']}>
            <CourtsPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'rates',
        element: (
          <ProtectedRoute allowedRoles={['ADMIN']}>
            <RatesPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'users',
        element: (
          <ProtectedRoute allowedRoles={['ADMIN']}>
            <UsersPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'expenses',
        element: (
          <ProtectedRoute allowedRoles={['ADMIN']}>
            <ExpensesPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'expenses/categories',
        element: (
          <ProtectedRoute allowedRoles={['ADMIN']}>
            <ExpenseCategoriesPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'analytics',
        element: (
          <ProtectedRoute allowedRoles={['ADMIN']}>
            <AnalyticsPage />
          </ProtectedRoute>
        ),
      },
      {
        path: '*',
        element: <Navigate to="/dashboard" replace />,
      },
    ],
  },
]);