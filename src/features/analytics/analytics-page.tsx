import './analytics-page.css';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { analyticsApi } from '../../api/resources';
import {
  Button,
  Card,
  PageHeader,
  StatCard,
} from '../../components/ui';

import type { DashboardStat } from '../../types';

/* =========================================================
   TYPES
   ========================================================= */

type AnalyticsPeriod = 'daily' | 'monthly' | 'yearly';

type RevenueData = {
  name: string;
  value: number;
  sortKey?: string;
};

type PaymentSummaryData = {
  name: string;
  value: number;
};

/* =========================================================
   FALLBACK DATA
   ========================================================= */

const fallbackStats: DashboardStat[] = [
  {
    label: 'Peak Court',
    value: 'N/A',
    tone: 'positive',
  },
  {
    label: 'Active Staff',
    value: '0',
    tone: 'neutral',
  },
];

/* =========================================================
   PERIOD OPTIONS
   ========================================================= */

const periodOptions: {
  value: AnalyticsPeriod;
  label: string;
}[] = [
  {
    value: 'daily',
    label: 'Daily',
  },
  {
    value: 'monthly',
    label: 'Monthly',
  },
  {
    value: 'yearly',
    label: 'Yearly',
  },
];

/* =========================================================
   PAYMENT COLORS
   ========================================================= */

const pieColors = [
  '#8b5cf6',
  '#14b8a6',
  '#f59e0b',
  '#ef4444',
];

/* =========================================================
   PAYMENT ORDER
   ========================================================= */

const paymentOrder = [
  'CASH',
  'GCASH',
  'BANK_TRANSFER',
  'CARD',
];

/* =========================================================
   ANALYTICS PAGE
   ========================================================= */

export function AnalyticsPage() {
  const [period, setPeriod] =
    useState<AnalyticsPeriod>('daily');

  /* =========================================================
     QUERY
     ========================================================= */

  const {
    data,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['analytics', 'overview', period],

    queryFn: () =>
      analyticsApi.overview(period),
  });

  /* =========================================================
     DATA
     ========================================================= */

  const stats =
    data?.stats?.length
      ? data.stats
      : fallbackStats;

  /*
   * Sort revenue data chronologically.
   *
   * The backend already returns sortKey.
   * The fallback Date.parse() keeps this compatible
   * with an older API response that may not have sortKey yet.
   */

  const revenueByPeriod: RevenueData[] = [
    ...(data?.revenueByPeriod ?? []),
  ].sort((a, b) => {
    if (a.sortKey && b.sortKey) {
      return a.sortKey.localeCompare(b.sortKey);
    }

    return getDateSortValue(a.name) -
      getDateSortValue(b.name);
  });

  /*
   * Normalize and sort payment summary on the frontend too.
   *
   * This protects the UI if the API returns:
   * cash
   * Cash
   * gcash
   * Gcash
   * etc.
   */

  const paymentSummary: PaymentSummaryData[] = [
    ...(data?.paymentSummary ?? []),
  ]
    .map((entry) => ({
      name: String(entry.name ?? '')
        .trim()
        .toUpperCase(),

      value: Number(entry.value ?? 0),
    }))
    .sort((a, b) => {
      const indexA =
        paymentOrder.indexOf(a.name);

      const indexB =
        paymentOrder.indexOf(b.name);

      /*
       * Known payment methods first.
       * Unknown methods go to the end.
       */

      const safeA =
        indexA === -1
          ? paymentOrder.length
          : indexA;

      const safeB =
        indexB === -1
          ? paymentOrder.length
          : indexB;

      return safeA - safeB;
    });

  /* =========================================================
     RENDER
     ========================================================= */

  return (
    <div className="stack large-gap">

      {/* =====================================================
          PAGE HEADER
          ===================================================== */}

      <PageHeader
        title="Analytics"
        subtitle="Operational performance"
      />

      {/* =====================================================
          PERIOD SELECTOR
          ===================================================== */}

      <Card className="analytics-filter-card">
        <div className="analytics-filter-content">

          <div>
            <h3>View Period</h3>

            <p>
              Display analytics data by day, month, or year.
            </p>
          </div>

          <div className="analytics-period-selector">
            {periodOptions.map((option) => (
              <Button
                key={option.value}
                type="button"
                className={
                  period === option.value
                    ? 'analytics-period-btn active'
                    : 'analytics-period-btn'
                }
                onClick={() =>
                  setPeriod(option.value)
                }
              >
                {option.label}
              </Button>
            ))}
          </div>

        </div>
      </Card>

      {/* =====================================================
          ERROR
          ===================================================== */}

      {isError ? (
        <Card className="stack">

          <div className="inline-error">
            Could not load analytics data from
            the server.
          </div>

          <Button
            type="button"
            className="btn-small"
            onClick={() => void refetch()}
          >
            Retry
          </Button>

        </Card>
      ) : null}

      {/* =====================================================
          LOADING
          ===================================================== */}

      {isLoading ? (
        <Card className="loading-shell small-shell">
          Loading analytics…
        </Card>
      ) : null}

      {/* =====================================================
          CONTENT
          ===================================================== */}

      {!isLoading && !isError ? (
        <>

          {/* =================================================
              KPI CARDS
              ================================================= */}

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

          {/* =================================================
              CHARTS
              ================================================= */}

          <div className="chart-grid">

            {/* ===============================================
                REVENUE CHART
                =============================================== */}

            <Card>

              <div className="chart-header">

                <div>

                  <h3>
                    Revenue by{' '}
                    {getPeriodLabel(period)}
                  </h3>

                  <p className="chart-subtitle">
                    Revenue performance grouped by{' '}
                    {period}.
                  </p>

                </div>

              </div>

              <div className="chart-wrap">

                {revenueByPeriod.length ? (
                  <ResponsiveContainer
                    width="100%"
                    height="100%"
                  >

                    <BarChart
                      data={revenueByPeriod}
                      margin={{
                        top: 10,
                        right: 20,
                        left: 10,
                        bottom: 10,
                      }}
                    >

                      <CartesianGrid
                        strokeDasharray="3 3"
                      />

                      <XAxis
                        dataKey="name"
                      />

                      <YAxis />

                      <Tooltip
                        formatter={(value) => [
                          `₱${Number(
                            value,
                          ).toLocaleString(
                            'en-PH',
                            {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            },
                          )}`,
                          'Revenue',
                        ]}
                      />

                      <Bar
                        dataKey="value"
                        fill="#22c55e"
                        radius={[
                          8,
                          8,
                          0,
                          0,
                        ]}
                      />

                    </BarChart>

                  </ResponsiveContainer>
                ) : (
                  <div className="chart-empty">
                    No revenue data available
                    for this period.
                  </div>
                )}

              </div>

            </Card>

            {/* ===============================================
                PAYMENT SUMMARY
                =============================================== */}

            <Card>

              <div className="chart-header">

                <div>

                  <h3>
                    Payment summary
                  </h3>

                  <p className="chart-subtitle">
                    Payment methods for the
                    selected period.
                  </p>

                </div>

              </div>

              <div className="chart-wrap">

                {paymentSummary.length ? (
                  <ResponsiveContainer
                    width="100%"
                    height="100%"
                  >

                    <PieChart>

                      <Pie
                        data={paymentSummary}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={45}
                        outerRadius={85}
                        paddingAngle={2}
                      >

                        {paymentSummary.map(
                          (entry, index) => (
                            <Cell
                              key={`${entry.name}-${index}`}
                              fill={
                                pieColors[
                                  index %
                                    pieColors.length
                                ]
                              }
                            />
                          ),
                        )}

                      </Pie>

                      <Tooltip
                        formatter={(value, _name, props) => {
                          const paymentName =
                            props?.payload
                              ?.name ??
                            'Amount';

                          return [
                            `₱${Number(
                              value,
                            ).toLocaleString(
                              'en-PH',
                              {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              },
                            )}`,
                            paymentName,
                          ];
                        }}
                      />

                      <Legend
                        verticalAlign="bottom"
                        height={36}
                        formatter={(value) =>
                          value.toUpperCase()
                        }
                      />

                    </PieChart>

                  </ResponsiveContainer>
                ) : (
                  <div className="chart-empty">
                    No payment summary available.
                  </div>
                )}

              </div>

            </Card>

          </div>

        </>
      ) : null}

    </div>
  );
}

/* =========================================================
   PERIOD LABEL
   ========================================================= */

function getPeriodLabel(
  period: AnalyticsPeriod,
): string {
  switch (period) {
    case 'daily':
      return 'Day';

    case 'monthly':
      return 'Month';

    case 'yearly':
      return 'Year';

    default:
      return 'Period';
  }
}

/* =========================================================
   DATE SORT HELPER
   ========================================================= */

function getDateSortValue(
  label: string,
): number {
  /*
   * Examples:
   *
   * "Aug 31"
   * "Aug 2026"
   * "2026"
   *
   * Date.parse handles the first two.
   * Number handles yearly labels.
   */

  const numericYear = Number(label);

  if (
    Number.isFinite(numericYear) &&
    label.trim().length === 4
  ) {
    return new Date(
      numericYear,
      0,
      1,
    ).getTime();
  }

  const parsed = Date.parse(label);

  if (Number.isFinite(parsed)) {
    return parsed;
  }

  return 0;
}