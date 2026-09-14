import type { ButtonHTMLAttributes, HTMLAttributes, InputHTMLAttributes, SelectHTMLAttributes } from 'react';

export function Button({ className = '', ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={`btn ${className}`.trim()}
      {...props}
    />
  );
}

export function Card({ className = '', ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={`card ${className}`.trim()} {...props} />;
}

export function PageHeader({
  title,
  subtitle,
  eyebrow = 'Operations',
}: {
  title: string;
  subtitle?: string;
  eyebrow?: string;
}) {
  return (
    <header className="page-header">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
      </div>
      {subtitle ? <p className="muted">{subtitle}</p> : null}
    </header>
  );
}

export function StatCard({
  label,
  value,
  delta,
  tone = 'neutral',
}: {
  label: string;
  value: string;
  delta?: string;
  tone?: 'positive' | 'neutral' | 'warning';
}) {
  return (
    <Card className="stat-card">
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
      {delta ? <div className={`stat-delta tone-${tone}`}>{delta}</div> : null}
    </Card>
  );
}

export function Input({ className = '', ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={`field ${className}`.trim()} {...props} />;
}

export function Select({ className = '', children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={`field ${className}`.trim()} {...props}>
      {children}
    </select>
  );
}

export function Badge({
  children,
  tone = 'neutral',
}: {
  children: React.ReactNode;
  tone?: 'neutral' | 'positive' | 'warning';
}) {
  return (
    <span className={`badge badge-${tone}`}>
      {children}
    </span>
  );
}

export function StatusBadge({
  status,
}: {
  status: string;
}) {
  const normalized = status.toUpperCase();
  const cls =
    normalized === 'PAID' || normalized === 'COMPLETED'
      ? 'status-paid'
      : normalized === 'CANCELLED'
        ? 'status-cancelled'
        : 'status-unpaid';

  return <span className={cls}>{status}</span>;
}

export function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <Card className="empty-state">
      <h3>{title}</h3>
      <p>{description}</p>
    </Card>
  );
}

export function Modal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  if (!open) return null;

  return (
    <div
      className="modal-overlay"
      onClick={onClose}
    >
      <div
        className="modal-box"
        onClick={(e) => e.stopPropagation()}
      >
        <h3>{title}</h3>
        {children}
      </div>
    </div>
  );
}
