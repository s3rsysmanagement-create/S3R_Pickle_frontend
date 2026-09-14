import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useParams } from 'react-router-dom';

import { transactionsApi } from '../../api/resources';
import { Button, Card, EmptyState, PageHeader } from '../../components/ui';
import { useAuth } from '../auth/use-auth';
import { formatCurrency, formatDateTime } from '../../lib/format';

export function TransactionDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const {
    data: transaction,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['transaction', id],
    queryFn: () => transactionsApi.get(id ?? ''),
    enabled: !!id,
  });

  const { mutateAsync: cancel, isPending } = useMutation({
    mutationFn: () => transactionsApi.cancel(id ?? ''),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['transaction', id] });
      await queryClient.invalidateQueries({ queryKey: ['transactions'] });
    },
  });

  if (isLoading) {
    return <Card className="loading-shell small-shell">Loading transaction…</Card>;
  }

  if (isError || !transaction) {
    return (
      <EmptyState
        title="Transaction not found"
        description="The requested transaction could not be loaded. It may not exist or you may not have access."
      />
    );
  }

  const canCancel = user?.role === 'ADMIN' && transaction.status !== 'CANCELLED';

  const handleCancel = async () => {
    if (!window.confirm('Cancel this transaction? This cannot be undone.')) {
      return;
    }

    try {
      await cancel();
    } catch {
      // Error surfaced implicitly by the mutation state; nothing else to do here.
    }
  };

  return (
    <div className="stack large-gap">
      <PageHeader title={`Transaction ${transaction.id.slice(0, 8)}`} subtitle="Authorized view" />

      <div className="toolbar-row">
        <Link to="/transactions" className="action-link">
          <Button type="button" className="btn-ghost">Back to list</Button>
        </Link>
        {canCancel ? (
          <Button type="button" className="btn-danger" onClick={() => void handleCancel()} disabled={isPending}>
            {isPending ? 'Cancelling…' : 'Cancel transaction'}
          </Button>
        ) : null}
      </div>

      <Card className="detail-grid">
        <div>
          <span className="label">Status</span>
          <strong>{transaction.status}</strong>
        </div>
        <div>
          <span className="label">Court</span>
          <strong>{transaction.courtName}</strong>
        </div>
        <div>
          <span className="label">Staff</span>
          <strong>{transaction.cashierName}</strong>
        </div>
        <div>
          <span className="label">Payment</span>
          <strong>{transaction.paymentMethod}</strong>
        </div>
        <div>
          <span className="label">Players</span>
          <strong>{transaction.playerCount}</strong>
        </div>
        <div>
          <span className="label">Total</span>
          <strong>{formatCurrency(Number(transaction.total))}</strong>
        </div>
        <div>
          <span className="label">Created</span>
          <strong>{formatDateTime(transaction.createdAt)}</strong>
        </div>
      </Card>

      <Button type="button" className="btn-ghost" onClick={() => navigate(-1)}>
        Go back
      </Button>
    </div>
  );
}
