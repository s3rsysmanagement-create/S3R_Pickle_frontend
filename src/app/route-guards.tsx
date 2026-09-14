import { Navigate } from 'react-router-dom';

import { useAuth } from '../features/auth/use-auth';

export function RootRedirect() {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <Navigate to={user.role === 'ADMIN' ? '/dashboard' : '/cashier'} replace />;
}

export function ProtectedRoute({ allowedRoles, children }: { allowedRoles: Array<'ADMIN' | 'CASHIER'>; children: React.ReactNode }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <div className="loading-shell">Checking access…</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!allowedRoles.includes(user.role)) {
    return (
      <div className="loading-shell">
        <div className="card limited-card">
          <h2>Access denied</h2>
          <p>You do not have permission to access this area.</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
