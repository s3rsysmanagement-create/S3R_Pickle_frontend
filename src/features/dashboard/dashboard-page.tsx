import { useQuery } from '@tanstack/react-query';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { dashboardApi } from '../../api/resources';
import { Button, Card, PageHeader, StatCard } from '../../components/ui';

const fallbackStats = [
  { label: 'Players Today', value: '0', delta: 'No check-ins yet', tone: 'neutral' as const },
  { label: 'Revenue Today', value: '₱0.00', delta: 'Awaiting sales', tone: 'positive' as const },
  { label: 'Transactions Today', value: '0', delta: 'No activity', tone: 'neutral' as const },
  { label: 'Expenses Today', value: '₱0.00', delta: 'No expenses posted', tone: 'warning' as const },
  { label: 'Net Revenue', value: '₱0.00', delta: 'Ready for settlement', tone: 'positive' as const },
];

export function DashboardPage() {
  const {
    data,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['dashboard', 'overview'],
    queryFn: () => dashboardApi.overview('daily'),
  });

  const pieColors = ['#22c55e', '#38bdf8', '#f59e0b', '#a78bfa'];

  const stats = data?.stats?.length ? data.stats : fallbackStats;
  const revenueTrend = data?.revenueTrend ?? [];
  const paymentBreakdown = data?.paymentBreakdown ?? [];
  const courtUsage = data?.courtUsage ?? [];
  const cashierSummary = data?.cashierSummary ?? [];

  return (
    <div className="stack large-gap">
      <PageHeader title="Dashboard" subtitle="Live operational snapshot" />

      {isError ? (
        <Card className="stack">
          <div className="inline-error">Could not load dashboard data from the server.</div>
          <Button type="button" className="btn-small" onClick={() => void refetch()}>Retry</Button>
        </Card>
      ) : null}

      {isLoading ? <Card className="loading-shell small-shell">Loading dashboard…</Card> : null}

      {!isLoading && !isError ? (
        <>
          <div className="kpi-grid">
            {stats.map((stat) => (
              <StatCard
                key={stat.label}
                label={stat.label}
                value={stat.value}
                delta={stat.delta}
                tone={stat.tone}
              />
            ))}
          </div>

          <div className="chart-grid">
            <Card>
              <h3>Revenue trend</h3>
              <div className="chart-wrap">
                {revenueTrend.length ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={revenueTrend}>
                      <defs>
                        <linearGradient id="revenueFill" x1="0" x2="0" y1="0" y2="1">
                          <stop offset="5%" stopColor="#14b8a6" stopOpacity={0.7} />
                          <stop offset="95%" stopColor="#14b8a6" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Area type="monotone" dataKey="value" stroke="#14b8a6" fill="url(#revenueFill)" />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="chart-empty">No revenue trend yet.</div>
                )}
              </div>
            </Card>

            <Card>
              <h3>Payment methods</h3>
              <div className="chart-wrap">
                {paymentBreakdown.length ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={paymentBreakdown} dataKey="value" nameKey="name" innerRadius={32} outerRadius={70} paddingAngle={3}>
                        {paymentBreakdown.map((entry, index) => (
                          <Cell key={entry.name} fill={pieColors[index % pieColors.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="chart-empty">No payment mix available.</div>
                )}
              </div>
            </Card>
          </div>

          <div className="chart-grid">
            <Card>
              <h3>Court usage</h3>
              <div className="chart-wrap">
                {courtUsage.length ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={courtUsage}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="value" radius={[10, 10, 0, 0]} fill="#6366f1" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="chart-empty">No court usage data yet.</div>
                )}
              </div>
            </Card>

            <Card>
              <h3>Staff summary</h3>
              <div className="chart-wrap">
                {cashierSummary.length ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={cashierSummary} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis dataKey="name" type="category" width={80} />
                      <Tooltip />
                      <Bar dataKey="value" fill="#06b6d4" radius={[0, 10, 10, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="chart-empty">No staff data yet.</div>
                )}
              </div>
            </Card>
          </div>
        </>
      ) : null}
    </div>
  );
}
