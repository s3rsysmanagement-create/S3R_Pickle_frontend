import { isRouteErrorResponse, useRouteError } from 'react-router-dom';

export function AppErrorBoundary() {
  const error = useRouteError();

  const message = isRouteErrorResponse(error)
    ? error.statusText || 'Something went wrong.'
    : error instanceof Error
      ? error.message
      : 'Something went wrong.';

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        padding: '2rem',
        background: '#0f172a',
        color: '#e2e8f0',
      }}
    >
      <div
        style={{
          maxWidth: '520px',
          width: '100%',
          background: '#111827',
          border: '1px solid rgba(148, 163, 184, 0.2)',
          borderRadius: '16px',
          padding: '2rem',
          boxShadow: '0 20px 45px rgba(15, 23, 42, 0.35)',
        }}
      >
        <p style={{ margin: 0, color: '#a78bfa', textTransform: 'uppercase', letterSpacing: '0.12em', fontSize: 12 }}>
          Something went wrong
        </p>
        <h2 style={{ margin: '0.75rem 0 0.5rem', fontSize: '2rem' }}>We hit an unexpected error</h2>
        <p style={{ margin: 0, color: '#cbd5e1', lineHeight: 1.6 }}>{message}</p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          style={{
            marginTop: '1.5rem',
            border: 'none',
            borderRadius: '10px',
            background: '#8b5cf6',
            color: '#fff',
            padding: '0.75rem 1rem',
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          Reload page
        </button>
      </div>
    </div>
  );
}
