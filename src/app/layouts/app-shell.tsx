import { NavLink, Navigate, Outlet } from 'react-router-dom';

import { useAuth } from '../../features/auth/use-auth';

const navByRole = {
  ADMIN: [
    // { to: '/dashboard', label: 'Dashboard' },
    { to: '/transactions', label: 'Transactions' },
    { to: '/players', label: 'Players' },
    { to: '/courts', label: 'Courts' },
    { to: '/rates', label: 'Rates' },
    { to: '/users', label: 'Users' },
    { to: '/expenses', label: 'Expenses' },
    { to: '/expenses/categories', label: 'Expense Categories' },
    { to: '/analytics', label: 'Analytics' },
  ],
  CASHIER: [
    { to: '/cashier', label: 'Staff' },
    { to: '/transactions', label: 'My Transactions' },
    { to: '/players', label: 'Players' },
  ],
} as const;

export function AppLayout() {
  const { user, logout, isLoading } = useAuth();

  if (isLoading) {
    return <div className="loading-shell">Loading workspace…</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const items = navByRole[user.role] ?? navByRole.CASHIER;

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand-block">
          <div className="brand-mark">P</div>
          <div>
            <strong>S3R Pickleball</strong>
            <small>Management</small>
          </div>
        </div>

        <nav className="sidebar-nav">
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="user-panel">
          <span>{user.email}</span>
          <small>{user.role === 'ADMIN' ? 'Admin' : 'Staff'}</small>
          <button type="button" className="btn btn-ghost" onClick={() => void logout()}>
            Logout
          </button>
        </div>
      </aside>

      <main className="workspace">
        <Outlet />
      </main>
    </div>
  );
}
