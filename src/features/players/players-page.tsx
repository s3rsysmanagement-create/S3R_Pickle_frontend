import './players-page.css';

import { useMemo, useState } from 'react';
import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';

import {
  playersApi,
  ratesApi,
  transactionsApi,
} from '../../api/resources';

import {
  Button,
  Card,
  EmptyState,
  Modal,
  PageHeader,
} from '../../components/ui';
import { useAuth } from '../auth/use-auth';

import {
  formatCurrency,
} from '../../lib/format';

type PaymentMethod =
  | 'CASH'
  | 'GCASH'
  | 'BANK_TRANSFER'
  | 'CARD'
  | 'VENMO';

type PaymentStatus =
  | 'PAID'
  | 'UNPAID'
  | 'CANCELLED';

type PlayerHistoryItem = {
  id: string;
  transactionId: string;
  playerId: string;
  playerName: string;
  courtId?: string;
  courtName: string;
  rateId?: string;
  rateName?: string;
  amount: number;
  paymentMethod: PaymentMethod;
  status: PaymentStatus;
  date: string;
  createdAt: string;
  transactionCode?: string;
};

type HistoryGroup = {
  date: string;
  items: PlayerHistoryItem[];
  playerCount: number;
};

type PlayerHistoryItemOverride =
  Partial<
    Pick<
      PlayerHistoryItem,
      | 'playerName'
      | 'courtName'
      | 'paymentMethod'
      | 'rateName'
      | 'amount'
      | 'status'
    >
  >;

const paymentMethodLabels: Record<
  PaymentMethod,
  string
> = {
  CASH: 'Cash',
  GCASH: 'GCash',
  BANK_TRANSFER: 'Bank transfer',
  CARD: 'Card',
  VENMO: 'Venmo',
};

const DAYS_PER_PAGE = 10;

/* ============================================================
   DATE HELPERS
   ============================================================ */

const toDateKey = (
  value: unknown,
): string => {
  if (!value) {
    return '';
  }

  const text = String(value);

  if (
    /^\d{4}-\d{2}-\d{2}$/.test(text)
  ) {
    return text;
  }

  const date = new Date(text);

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return '';
  }

  const year = date.getFullYear();

  const month = String(
    date.getMonth() + 1,
  ).padStart(2, '0');

  const day = String(
    date.getDate(),
  ).padStart(2, '0');

  return `${year}-${month}-${day}`;
};

const formatHistoryDate = (
  date: string,
): string => {
  const parsed = new Date(
    `${date}T00:00:00`,
  );

  if (
    Number.isNaN(
      parsed.getTime(),
    )
  ) {
    return date;
  }

  return parsed.toLocaleDateString(
    'en-US',
    {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    },
  );
};

/* ============================================================
   SAFE OBJECT VALUE
   ============================================================ */

const getValue = (
  object: unknown,
  keys: string[],
): unknown => {
  if (
    !object ||
    typeof object !== 'object'
  ) {
    return undefined;
  }

  const record =
    object as Record<
      string,
      unknown
    >;

  for (const key of keys) {
    if (
      record[key] !== undefined
    ) {
      return record[key];
    }
  }

  return undefined;
};

/* ============================================================
   NORMALIZE TRANSACTIONS
   ============================================================ */

const normalizeTransactions = (
  response: unknown,
): PlayerHistoryItem[] => {
  const mergeRateNames = (
    existingRateName?: string,
    nextRateName?: string,
  ): string | undefined => {
    const normalizedExisting =
      existingRateName?.trim() ?? '';
    const normalizedNext =
      nextRateName?.trim() ?? '';

    if (!normalizedExisting) {
      return normalizedNext || undefined;
    }

    if (!normalizedNext) {
      return normalizedExisting;
    }

    const names = normalizedExisting
      .split(',')
      .map((name) => name.trim())
      .filter(Boolean);

    if (!names.includes(normalizedNext)) {
      names.push(normalizedNext);
    }

    return names.join(', ');
  };

  let transactions: unknown[] = [];

  if (
    Array.isArray(response)
  ) {
    transactions = response;
  } else {
    const data = getValue(
      response,
      [
        'data',
        'transactions',
        'items',
        'results',
      ],
    );

    if (
      Array.isArray(data)
    ) {
      transactions = data;
    }
  }

  const result: PlayerHistoryItem[] =
    [];
  const rowIndexById = new Map<
    string,
    number
  >();

  transactions.forEach(
    (transaction) => {
      const transactionRecord =
        transaction as Record<
          string,
          unknown
        >;

      const transactionDate =
        toDateKey(
          getValue(
            transaction,
            [
              'transactionDate',
              'date',
              'createdAt',
            ],
          ),
        );

      const createdAt = String(
        getValue(
          transaction,
          [
            'createdAt',
            'transactionDate',
            'date',
          ],
        ) ??
          new Date().toISOString(),
      );

      const transactionId =
        String(
          getValue(
            transaction,
            [
              'id',
              'transactionId',
            ],
          ) ??
            crypto.randomUUID(),
        );

      const transactionCode =
        getValue(
          transaction,
          [
            'transactionCode',
            'code',
          ],
        );

      const paymentMethod =
        String(
          getValue(
            transaction,
            [
              'paymentMethod',
              'payment_method',
            ],
          ) ?? 'CASH',
        ) as PaymentMethod;

      const players =
        getValue(
          transaction,
          [
            'players',
            'transactionPlayers',
          ],
        );

      /*
       * Transaction contains
       * multiple players.
       */
      if (
        Array.isArray(players)
      ) {
        players.forEach(
          (
            playerEntry,
            playerIndex,
          ) => {
            const playerRecord =
              playerEntry as Record<
                string,
                unknown
              >;

            const player =
              getValue(
                playerRecord,
                ['player'],
              );

            const playerObject =
              player &&
              typeof player ===
                'object'
                ? player
                : undefined;

            const playerId =
              String(
                getValue(
                  playerRecord,
                  [
                    'playerId',
                    'player_id',
                    'id',
                  ],
                ) ??
                  getValue(
                    playerObject,
                    ['id'],
                  ) ??
                  '',
              );

            const playerName =
              String(
                getValue(
                  playerRecord,
                  [
                    'playerName',
                    'fullName',
                    'name',
                  ],
                ) ??
                  getValue(
                    playerObject,
                    [
                      'name',
                      'fullName',
                    ],
                  ) ??
                  'Unknown player',
              );

            const court =
              getValue(
                playerRecord,
                ['court'],
              );

            const courtObject =
              court &&
              typeof court ===
                'object'
                ? court
                : undefined;

            const courtName =
              String(
                getValue(
                  playerRecord,
                  ['courtName'],
                ) ??
                  getValue(
                    courtObject,
                    ['name'],
                  ) ??
                  getValue(
                    transactionRecord,
                    ['courtName'],
                  ) ??
                  '—',
              );

            const rate =
              getValue(
                playerRecord,
                ['rate'],
              );

            const rateObject =
              rate &&
              typeof rate ===
                'object'
                ? rate
                : undefined;

            const rateId =
              getValue(
                playerRecord,
                [
                  'rateId',
                  'rate_id',
                ],
              );

            const rateName =
              getValue(
                playerRecord,
                ['rateName'],
              ) ??
              getValue(
                rateObject,
                ['name'],
              );

            const amount =
              Number(
                getValue(
                  playerRecord,
                  [
                    'amount',
                    'total',
                  ],
                ) ??
                  getValue(
                    rateObject,
                    ['amount'],
                  ) ??
                  0,
              );

            const status =
              String(
                getValue(
                  playerRecord,
                  [
                    'status',
                    'paymentStatus',
                  ],
                ) ??
                  getValue(
                    transactionRecord,
                    [
                      'status',
                      'paymentStatus',
                    ],
                  ) ??
                  'PAID',
              ).toUpperCase() as PaymentStatus;

            const rowId = `${transactionId}-${playerId || playerIndex}`;
            const existingIndex =
              rowIndexById.get(
                rowId,
              );

            if (
              existingIndex !==
              undefined
            ) {
              const existingItem =
                result[
                  existingIndex
                ];

              existingItem.amount +=
                amount;
              existingItem.rateName =
                mergeRateNames(
                  existingItem.rateName,
                  rateName
                    ? String(
                        rateName,
                      )
                    : undefined,
                );

              return;
            }

            rowIndexById.set(
              rowId,
              result.length,
            );

            result.push({
              id: rowId,
              transactionId,
              playerId,
              playerName,
              courtId:
                String(
                  getValue(
                    playerRecord,
                    [
                      'courtId',
                      'court_id',
                    ],
                  ) ?? '',
                ) || undefined,
              courtName,
              rateId:
                rateId
                  ? String(rateId)
                  : undefined,
              rateName:
                rateName
                  ? String(rateName)
                  : undefined,
              amount,
              paymentMethod,
              status,
              date:
                transactionDate,
              createdAt,
              transactionCode:
                transactionCode
                  ? String(
                      transactionCode,
                    )
                  : undefined,
            });
          },
        );

        return;
      }

      /*
       * Fallback:
       * one player directly on
       * each transaction.
       */
      const playerId =
        String(
          getValue(
            transaction,
            [
              'playerId',
              'player_id',
            ],
          ) ?? '',
        );

      const playerName =
        String(
          getValue(
            transaction,
            [
              'playerName',
              'fullName',
              'player',
            ],
          ) ??
            'Unknown player',
        );

      const courtName =
        String(
          getValue(
            transaction,
            [
              'courtName',
              'court',
            ],
          ) ?? '—',
        );

      const amount =
        Number(
          getValue(
            transaction,
            [
              'amount',
              'total',
            ],
          ) ?? 0,
        );

      result.push({
        id: transactionId,
        transactionId,

        playerId,

        playerName,

        courtName,

        amount,

        paymentMethod,

        status:
          String(
            getValue(
              transaction,
              [
                'status',
                'paymentStatus',
              ],
            ) ?? 'PAID',
          ).toUpperCase() as PaymentStatus,

        date:
          transactionDate,

        createdAt,

        transactionCode:
          transactionCode
            ? String(
                transactionCode,
              )
            : undefined,
      });
    },
  );

  return result;
};

/* ============================================================
   COMPONENT
   ============================================================ */

export function PlayersPage() {
  const { user } = useAuth();
  const canRemovePlayers =
    user?.role === 'ADMIN';
  const queryClient =
    useQueryClient();

  /* ==========================================================
     STATE
     ========================================================== */

  const [
    selectedDate,
    setSelectedDate,
  ] = useState('');

  const [
    search,
    setSearch,
  ] = useState('');

  const [
    editingId,
    setEditingId,
  ] = useState<
    string | null
  >(null);

  const [
    editPlayerName,
    setEditPlayerName,
  ] = useState('');

  const [
    editCourtName,
    setEditCourtName,
  ] = useState('');

  const [
    editPaymentMethod,
    setEditPaymentMethod,
  ] = useState<PaymentMethod>(
    'CASH',
  );

  const [
    editRateIds,
    setEditRateIds,
  ] = useState<string[]>([]);

  const [
    editAmount,
    setEditAmount,
  ] = useState('');

  const [
    editStatus,
    setEditStatus,
  ] = useState<PaymentStatus>(
    'PAID',
  );

  const [
    historyOverrides,
    setHistoryOverrides,
  ] = useState<
    Record<
      string,
      PlayerHistoryItemOverride
    >
  >({});

  const [
    formError,
    setFormError,
  ] = useState('');

  const [
    successMessage,
    setSuccessMessage,
  ] = useState('');
  const [
    removePlayerId,
    setRemovePlayerId,
  ] = useState<string | null>(
    null,
  );
  const [
    removePlayerName,
    setRemovePlayerName,
  ] = useState('');
  const [
    removeError,
    setRemoveError,
  ] = useState('');

  const [
    currentPage,
    setCurrentPage,
  ] = useState(1);

  /*
   * =========================================================
   * VIEWED DAY
   * =========================================================
   *
   * Stores the date currently opened by the View button.
   *
   * Example:
   *
   * viewedDate = "2026-08-28"
   *
   * Only the matching date group will display its
   * player details.
   */

  const [
    viewedDate,
    setViewedDate,
  ] = useState<string | null>(
    null,
  );

  /* ==========================================================
     PLAYERS
     ========================================================== */

  const {
    isLoading: playersLoading,
  } = useQuery({
    queryKey: [
      'players',
      'all',
    ],
    queryFn:
      playersApi.list,
  });

  const {
    data: rates = [],
    isLoading: ratesLoading,
  } = useQuery({
    queryKey: [
      'rates',
      'all',
    ],
    queryFn: ratesApi.list,
  });

  /* ==========================================================
     TRANSACTIONS
     ========================================================== */

  const {
    data: transactionResponse,
    isLoading:
      transactionsLoading,
    isError:
      transactionsError,
    refetch:
      refetchTransactions,
  } = useQuery({
    queryKey: [
      'transactions',
      'player-history',
    ],
    queryFn:
      transactionsApi.list,
  });

  /* ==========================================================
     NORMALIZED HISTORY
     ========================================================== */

  const history =
    useMemo(
      () =>
        normalizeTransactions(
          transactionResponse,
        ),
      [
        transactionResponse,
      ],
    );

  const activeRates = useMemo(
    () =>
      rates.filter(
        (rate) => rate.active,
      ),
    [rates],
  );

  const rateNameById = useMemo(
    () =>
      new Map(
        activeRates.map((rate) => [
          rate.id,
          rate.name,
        ]),
      ),
    [activeRates],
  );

  const rateAmountById = useMemo(
    () =>
      new Map(
        activeRates.map((rate) => [
          rate.id,
          Number(rate.amount),
        ]),
      ),
    [activeRates],
  );

  const calculateAmountFromRateIds = (
    selectedRateIds: string[],
  ) =>
    selectedRateIds.reduce(
      (total, rateId) =>
        total +
        (rateAmountById.get(
          rateId,
        ) ?? 0),
      0,
    );

  const effectiveHistory =
    useMemo(
      () =>
        history.map((item) => ({
          ...item,
          ...historyOverrides[item.id],
        })),
      [
        history,
        historyOverrides,
      ],
    );

  /* ==========================================================
     GROUP HISTORY BY DATE
     ========================================================== */

  const historyGroups =
    useMemo<HistoryGroup[]>(
      () => {
        const grouped =
          new Map<
            string,
            PlayerHistoryItem[]
          >();

        effectiveHistory.forEach(
          (item) => {
            if (!item.date) {
              return;
            }

            const existing =
              grouped.get(
                item.date,
              ) ?? [];

            existing.push(item);

            grouped.set(
              item.date,
              existing,
            );
          },
        );

        return Array.from(
          grouped.entries(),
        )
          .map(
            ([
              date,
              items,
            ]) => ({
              date,
              items:
                items.sort(
                  (a, b) =>
                    new Date(
                      b.createdAt,
                    ).getTime() -
                    new Date(
                      a.createdAt,
                    ).getTime(),
                ),
              playerCount:
                items.length,
            }),
          )
          .sort(
            (a, b) =>
              b.date.localeCompare(
                a.date,
              ),
          );
      },
      [effectiveHistory],
    );

  /* ==========================================================
     FILTER BY DATE + SEARCH
     ========================================================== */

  const filteredGroups =
    useMemo(() => {
      const query =
        search
          .trim()
          .toLowerCase();

      return historyGroups
        .map((group) => {
          if (
            selectedDate &&
            group.date !==
              selectedDate
          ) {
            return null;
          }

          const items =
            query
              ? group.items.filter(
                  (item) =>
                    item.playerName
                      .toLowerCase()
                      .includes(
                        query,
                      ) ||
                    item.courtName
                      .toLowerCase()
                      .includes(
                        query,
                      ) ||
                    paymentMethodLabels[
                      item
                        .paymentMethod
                    ]
                      .toLowerCase()
                      .includes(
                        query,
                      ),
                )
              : group.items;

          if (
            query &&
            !items.length
          ) {
            return null;
          }

          return {
            ...group,
            items,
            playerCount:
              items.length,
          };
        })
        .filter(
          (
            group,
          ): group is HistoryGroup =>
            group !== null,
        );
    }, [
      historyGroups,
      selectedDate,
      search,
    ]);

  /* ==========================================================
     PAGINATION
     ========================================================== */

  const totalPages =
    Math.max(
      1,
      Math.ceil(
        filteredGroups.length /
          DAYS_PER_PAGE,
      ),
    );

  const safeCurrentPage =
    Math.min(
      currentPage,
      totalPages,
    );

  const paginatedGroups =
    useMemo(() => {
      const start =
        (safeCurrentPage - 1) *
        DAYS_PER_PAGE;

      return filteredGroups.slice(
        start,
        start + DAYS_PER_PAGE,
      );
    }, [
      filteredGroups,
      safeCurrentPage,
    ]);

  const pageStart =
    filteredGroups.length
      ? (safeCurrentPage - 1) *
          DAYS_PER_PAGE +
        1
      : 0;

  const pageEnd =
    Math.min(
      safeCurrentPage *
        DAYS_PER_PAGE,
      filteredGroups.length,
    );

  /* ==========================================================
     UPDATE PLAYER
     ========================================================== */

  const {
    mutateAsync:
      updatePlayer,
  } = useMutation({
    mutationFn: ({
      id,
      input,
    }: {
      id: string;
      input: {
        fullName: string;
      };
    }) =>
      playersApi.update(
        id,
        input,
      ),

    onSuccess:
      async () => {
        await queryClient.invalidateQueries(
          {
            queryKey: [
              'players',
            ],
          },
        );
      },
  });

  const {
    mutateAsync:
      removePlayerRecord,
    isPending:
      isRemovingPlayer,
  } = useMutation({
    mutationFn:
      playersApi.remove,

    onSuccess:
      async () => {
        await queryClient.invalidateQueries(
          {
            queryKey: [
              'players',
            ],
          },
        );
        await queryClient.invalidateQueries(
          {
            queryKey: [
              'transactions',
            ],
          },
        );
      },
  });

  /* ==========================================================
     EDIT
     ========================================================== */

  const startEdit = (
    item: PlayerHistoryItem,
  ) => {
    setEditingId(
      item.id,
    );

    setEditPlayerName(
      item.playerName,
    );

    setEditCourtName(
      item.courtName,
    );

    setEditPaymentMethod(
      item.paymentMethod,
    );

    const rowRateNames = (
      item.rateName ?? ''
    )
      .split(',')
      .map((name) => name.trim())
      .filter(Boolean);

    const matchedRateIds =
      activeRates
        .filter((rate) =>
          rowRateNames.includes(
            rate.name,
          ),
        )
        .map((rate) => rate.id);

    const fallbackRateIds =
      item.rateId &&
      rateNameById.has(item.rateId)
        ? [item.rateId]
        : [];

    const selectedRateIds =
      matchedRateIds.length
        ? matchedRateIds
        : fallbackRateIds;

    setEditRateIds(
      selectedRateIds,
    );

    const computedAmount =
      calculateAmountFromRateIds(
        selectedRateIds,
      );

    setEditAmount(
      computedAmount > 0
        ? computedAmount.toFixed(2)
        : Number.isFinite(item.amount)
          ? item.amount.toFixed(2)
          : '0.00',
    );

    setEditStatus(
      item.status,
    );

    setFormError('');
    setSuccessMessage('');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditPlayerName('');
    setEditCourtName('');
    setEditPaymentMethod('CASH');
    setEditRateIds([]);
    setEditAmount('');
    setEditStatus('PAID');
    setFormError('');
  };

  const handleRateToggle = (
    rateId: string,
    checked: boolean,
  ) => {
    setEditRateIds(
      (currentIds) => {
        const nextIds = checked
          ? currentIds.includes(
                rateId,
              )
            ? currentIds
            : [
                ...currentIds,
                rateId,
              ]
          : currentIds.filter(
              (id) =>
                id !== rateId,
            );

        const totalAmount =
          calculateAmountFromRateIds(
            nextIds,
          );

        setEditAmount(
          totalAmount.toFixed(2),
        );

        return nextIds;
      },
    );
  };

  const saveEdit = async (
    item: PlayerHistoryItem,
  ) => {
    setFormError('');
    setSuccessMessage('');

    const playerName =
      editPlayerName.trim();
    const courtName =
      editCourtName.trim();
    const amount = Number(
      editAmount,
    );

    if (
      editRateIds.length === 0
    ) {
      setFormError(
        'Select at least one rate.',
      );

      return;
    }

    const rateName =
      editRateIds
        .map(
          (rateId) =>
            rateNameById.get(
              rateId,
            ),
        )
        .filter(
          (
            name,
          ): name is string =>
            Boolean(name),
        )
        .join(', ');

    if (!playerName) {
      setFormError(
        'Player name is required.',
      );

      return;
    }

    if (
      !Number.isFinite(amount) ||
      amount < 0
    ) {
      setFormError(
        'Amount must be a valid non-negative number.',
      );

      return;
    }

    try {
      if (item.playerId) {
        await updatePlayer({
          id: item.playerId,

          input: {
            fullName:
              playerName,
          },
        });
      }

      if (
        item.transactionId &&
        item.playerId
      ) {
        await transactionsApi.updatePlayerRates(
          item.transactionId,
          item.playerId,
          editRateIds,
        );
      }

      setHistoryOverrides(
        (current) => ({
          ...current,
          [item.id]: {
            playerName,
            courtName:
              courtName || '—',
            paymentMethod:
              editPaymentMethod,
            rateName:
              rateName || undefined,
            amount,
            status: editStatus,
          },
        }),
      );

      await refetchTransactions();

      setEditingId(null);
      setEditPlayerName('');
      setEditCourtName('');
      setEditPaymentMethod(
        'CASH',
      );
      setEditRateIds([]);
      setEditAmount('');
      setEditStatus('PAID');

      setSuccessMessage(
        'Row updated successfully.',
      );
    } catch (error) {
      setFormError(
        error instanceof Error
          ? error.message
          : 'Unable to update player name.',
      );
    }
  };

  const openRemoveModal = (
    playerId: string,
    playerName: string,
  ) => {
    if (!canRemovePlayers) {
      return;
    }
    setRemovePlayerId(playerId);
    setRemovePlayerName(playerName);
    setRemoveError('');
  };

  const closeRemoveModal = () => {
    setRemovePlayerId(null);
    setRemovePlayerName('');
    setRemoveError('');
  };

  const confirmRemovePlayer =
    async () => {
      if (
        !canRemovePlayers ||
        !removePlayerId
      ) {
        return;
      }

      setRemoveError('');

      try {
        await removePlayerRecord(
          removePlayerId,
        );
        closeRemoveModal();
      } catch (error) {
        setRemoveError(
          error instanceof Error
            ? error.message
            : 'Unable to remove this player.',
        );
      }
    };

  /* ==========================================================
     VIEW / HIDE DAY
     ========================================================== */

  const handleToggleDay = (
    dateKey: string,
  ) => {
    setViewedDate(
      (currentDate) =>
        currentDate === dateKey
          ? null
          : dateKey,
    );
  };

  /* ==========================================================
     FILTER HANDLERS
     ========================================================== */

  const handleDateChange = (
    value: string,
  ) => {
    setSelectedDate(value);
    setCurrentPage(1);
    setEditingId(null);

    /*
     * Reset currently opened day when
     * the date filter changes.
     */
    setViewedDate(null);
  };

  const clearFilters = () => {
    setSelectedDate('');
    setSearch('');
    setCurrentPage(1);
    setEditingId(null);
    setViewedDate(null);
  };

  /* ==========================================================
     PAGINATION
     ========================================================== */

  const previousPage = () => {
    setCurrentPage(
      (page) =>
        Math.max(
          1,
          page - 1,
        ),
    );

    /*
     * Close the opened day when
     * changing pages.
     */
    setViewedDate(null);
  };

  const nextPage = () => {
    setCurrentPage(
      (page) =>
        Math.min(
          totalPages,
          page + 1,
        ),
    );

    /*
     * Close the opened day when
     * changing pages.
     */
    setViewedDate(null);
  };

  /* ==========================================================
     LOADING
     ========================================================== */

  const isLoading =
    playersLoading ||
    transactionsLoading;

  /* ==========================================================
     RENDER
     ========================================================== */

  return (
    <div className="stack large-gap players-page">

      {/* ====================================================
          HEADER
          ==================================================== */}

      <PageHeader
        title="Player History"
        subtitle="View and manage player payment history by date"
      />

      {/* ====================================================
          FILTER BAR
          ==================================================== */}

      <Card className="players-filter-card">

        <div className="players-filter-controls">

          <div className="players-filter-field">

            <label htmlFor="players-date-filter">
              Date
            </label>

            <input
              id="players-date-filter"
              type="date"
              className="field"
              value={
                selectedDate
              }
              onChange={(event) =>
                handleDateChange(
                  event.target.value,
                )
              }
            />

          </div>

          {(selectedDate ||
            search) && (
            <Button
              type="button"
              className="btn-small players-clear-button"
              onClick={
                clearFilters
              }
            >
              Clear filters
            </Button>
          )}

        </div>

      </Card>

      {/* ====================================================
          ERROR
          ==================================================== */}

      {transactionsError ? (
        <Card className="players-error-card">

          <div className="inline-error">
            Could not load player
            history from the
            server.
          </div>

          <Button
            type="button"
            className="btn-small"
            onClick={() =>
              void refetchTransactions()
            }
          >
            Retry
          </Button>

        </Card>
      ) : null}

      {/* ====================================================
          SUCCESS
          ==================================================== */}

      {successMessage ? (
        <div className="inline-success">
          {successMessage}
        </div>
      ) : null}

      {/* ====================================================
          FORM ERROR
          ==================================================== */}

      {formError ? (
        <div className="inline-error">
          {formError}
        </div>
      ) : null}

      {/* ====================================================
          LOADING
          ==================================================== */}

      {isLoading ? (
        <Card className="players-loading">
          Loading player history…
        </Card>
      ) : null}

      {/* ====================================================
          HISTORY
          ==================================================== */}

      {!isLoading &&
      !transactionsError ? (
        paginatedGroups.length ? (

          <div className="players-history-list">

            {paginatedGroups.map(
              (group) => {

                const dailyTotal =
                  group.items.reduce(
                    (
                      total,
                      item,
                    ) =>
                      total +
                      item.amount,
                    0,
                  );

                const isDayViewed =
                  viewedDate ===
                  group.date;

                return (
                  <Card
                    key={
                      group.date
                    }
                    className="players-day-card"
                  >

                    {/* ======================================
                        DAY HEADER
                        ====================================== */}

                    <div className="players-day-header">

                      <div>
                        <h2>
                          {formatHistoryDate(
                            group.date,
                          )}
                        </h2>

                        <p>
                          {group.playerCount}{' '}
                          {group.playerCount ===
                          1
                            ? 'player'
                            : 'players'}
                        </p>
                      </div>

                      {/* ====================================
                          DAY HEADER ACTIONS
                          ==================================== */}

                      <div className="players-day-header-actions">

                        <Button
                          type="button"
                          className="btn-small"
                          onClick={() =>
                            handleToggleDay(
                              group.date,
                            )
                          }
                        >
                          {isDayViewed
                            ? 'Hide'
                            : 'View'}
                        </Button>

                      </div>

                    </div>

                    {/* ======================================
                        GRID
                        ====================================== */}

                    {isDayViewed ? (

                      <div className="players-grid">

                        <div className="players-grid-header">

                          <div>
                            #
                          </div>

                          <div>
                            PLAYER
                          </div>

                          <div>
                            COURT
                          </div>

                          <div>
                            PAYMENT
                          </div>

                          <div>
                            RATE
                          </div>

                          <div className="players-grid-amount">
                            AMOUNT
                          </div>

                          <div>
                            STATUS
                          </div>

                          <div className="players-grid-action">
                            ACTION
                          </div>

                        </div>

                        {group.items.map(
                          (
                            item,
                            index,
                          ) => {

                            const isEditing =
                              editingId ===
                              item.id;

                            return (
                              <div
                                key={
                                  item.id
                                }
                                className={`players-grid-row ${
                                  isEditing
                                    ? 'is-editing'
                                    : ''
                                }`}
                              >

                                {/* NUMBER */}

                                <div className="players-index">
                                  {index +
                                    1}
                                </div>

                                {/* PLAYER */}

                                <div className="players-player-cell">

                                  {isEditing ? (

                                    <input
                                      type="text"
                                      className="field players-edit-input"
                                      value={
                                        editPlayerName
                                      }
                                      onChange={(
                                        event,
                                      ) =>
                                        setEditPlayerName(
                                          event
                                            .target
                                            .value,
                                        )
                                      }
                                      autoComplete="off"
                                      autoCorrect="off"
                                      autoCapitalize="words"
                                      spellCheck={
                                        false
                                      }
                                      placeholder="Enter player name"
                                    />

                                  ) : (

                                    <>

                                      <strong>
                                        {
                                          item.playerName
                                        }
                                      </strong>

                                    </>

                                  )}

                                </div>

                                {/* COURT */}

                                <div className="players-court-cell">
                                  {isEditing ? (
                                    <input
                                      type="text"
                                      className="field players-edit-input"
                                      value={
                                        editCourtName
                                      }
                                      onChange={(
                                        event,
                                      ) =>
                                        setEditCourtName(
                                          event
                                            .target
                                            .value,
                                        )
                                      }
                                      autoComplete="off"
                                      placeholder="Enter court"
                                    />
                                  ) : (
                                    item.courtName
                                  )}
                                </div>

                                {/* PAYMENT */}

                                <div>
                                  {isEditing ? (
                                    <select
                                      className="field players-edit-input"
                                      value={
                                        editPaymentMethod
                                      }
                                      onChange={(
                                        event,
                                      ) =>
                                        setEditPaymentMethod(
                                          event
                                            .target
                                            .value as PaymentMethod,
                                        )
                                      }
                                    >
                                      <option value="CASH">
                                        Cash
                                      </option>
                                      <option value="GCASH">
                                        GCash
                                      </option>
                                      <option value="BANK_TRANSFER">
                                        Bank transfer
                                      </option>
                                      <option value="CARD">
                                        Card
                                      </option>
                                      <option value="VENMO">
                                        Venmo
                                      </option>
                                    </select>
                                  ) : (
                                    <span className="players-payment-badge">
                                      {
                                        paymentMethodLabels[
                                          item.paymentMethod
                                        ]
                                      }
                                    </span>
                                  )}
                                </div>

                                {/* RATE */}

                                <div className="players-rate-cell">
                                  {isEditing ? (
                                    <div className="players-rate-options">
                                      {ratesLoading ? (
                                        <span className="players-rate-loading">
                                          Loading rates...
                                        </span>
                                      ) : activeRates.length ? (
                                        activeRates.map(
                                          (rate) => (
                                            <label
                                              key={
                                                rate.id
                                              }
                                              className="players-rate-option"
                                            >
                                              <input
                                                type="checkbox"
                                                checked={editRateIds.includes(
                                                  rate.id,
                                                )}
                                                onChange={(
                                                  event,
                                                ) =>
                                                  handleRateToggle(
                                                    rate.id,
                                                    event
                                                      .target
                                                      .checked,
                                                  )
                                                }
                                              />
                                              <span>
                                                {rate.name}
                                              </span>
                                            </label>
                                          ),
                                        )
                                      ) : (
                                        <span className="players-rate-loading">
                                          No active rates.
                                        </span>
                                      )}
                                    </div>
                                  ) : (
                                    item.rateName ||
                                    '—'
                                  )}
                                </div>

                                {/* AMOUNT */}

                                <div className="players-amount-cell">
                                  {isEditing ? (
                                    <input
                                      type="number"
                                      min="0"
                                      step="0.01"
                                      className="field players-edit-input"
                                      value={
                                        editAmount
                                      }
                                      onChange={(
                                        event,
                                      ) =>
                                        setEditAmount(
                                          event
                                            .target
                                            .value,
                                        )
                                      }
                                      placeholder="0.00"
                                    />
                                  ) : (
                                    formatCurrency(
                                      item.amount,
                                    )
                                  )}
                                </div>

                                {/* STATUS */}

                                <div>
                                  {isEditing ? (
                                    <select
                                      className="field players-edit-input"
                                      value={
                                        editStatus
                                      }
                                      onChange={(
                                        event,
                                      ) =>
                                        setEditStatus(
                                          event
                                            .target
                                            .value as PaymentStatus,
                                        )
                                      }
                                    >
                                      <option value="PAID">
                                        PAID
                                      </option>
                                      <option value="UNPAID">
                                        UNPAID
                                      </option>
                                      <option value="CANCELLED">
                                        CANCELLED
                                      </option>
                                    </select>
                                  ) : (
                                    <span
                                      className={
                                        item.status ===
                                        'PAID'
                                          ? 'players-status players-status-paid'
                                          : item.status ===
                                              'CANCELLED'
                                            ? 'players-status players-status-cancelled'
                                            : 'players-status players-status-unpaid'
                                      }
                                    >
                                      {
                                        item.status
                                      }
                                    </span>
                                  )}
                                </div>

                                {/* ACTION */}

                                <div className="players-action-cell">

                                  {isEditing ? (

                                    <div className="players-edit-actions">

                                      <Button
                                        type="button"
                                        className="btn-small"
                                        onClick={() =>
                                          void saveEdit(
                                            item,
                                          )
                                        }
                                      >
                                        Save
                                      </Button>

                                      <button
                                        type="button"
                                        className="players-cancel-button"
                                        onClick={
                                          cancelEdit
                                        }
                                      >
                                        Cancel
                                      </button>

                                    </div>

                                  ) : (

                                    <div className="players-edit-actions">
                                      <Button
                                        type="button"
                                        className="btn-small"
                                        onClick={() =>
                                          startEdit(
                                            item,
                                          )
                                        }
                                      >
                                        Edit
                                      </Button>
                                      {canRemovePlayers ? (
                                        <Button
                                          type="button"
                                          className="btn-small btn-danger"
                                          onClick={() =>
                                            openRemoveModal(
                                              item.playerId,
                                              item.playerName,
                                            )
                                          }
                                        >
                                          Remove
                                        </Button>
                                      ) : null}
                                    </div>

                                  )}

                                </div>

                              </div>
                            );
                          },
                        )}

                      </div>

                    ) : null}

                    {/* ======================================
                        DAY FOOTER
                        ====================================== */}

                    <div className="players-day-footer">

                      <span>
                        Daily Total
                      </span>

                      <strong>
                        {formatCurrency(
                          dailyTotal,
                        )}
                      </strong>

                    </div>

                  </Card>
                );
              },
            )}

          </div>

        ) : (

          <EmptyState
            title={
              selectedDate
                ? 'No players for this date'
                : search
                  ? 'No matching players'
                  : 'No player history'
            }
            description={
              selectedDate
                ? 'Try selecting another date or clear the date filter.'
                : search
                  ? 'Try another player name, court, or payment method.'
                  : 'There are no player payment records available yet.'
            }
          />

        )

      ) : null}

      {/* ====================================================
          PAGINATION
          ==================================================== */}

      {!isLoading &&
      !transactionsError &&
      filteredGroups.length ? (

        <Card className="players-pagination-card">

          <div className="players-pagination-info">

            Showing{' '}

            <strong>
              {pageStart}
            </strong>

            {' – '}

            <strong>
              {pageEnd}
            </strong>

            {' of '}

            <strong>
              {filteredGroups.length}
            </strong>

            {' '}

            {filteredGroups.length ===
            1
              ? 'day'
              : 'days'}

          </div>

          <div className="players-pagination">

            <Button
              type="button"
              className="players-pagination-button"
              disabled={
                safeCurrentPage ===
                1
              }
              onClick={
                previousPage
              }
            >
              Previous
            </Button>

            <span className="players-page-number">

              Page{' '}

              <strong>
                {safeCurrentPage}
              </strong>

              {' of '}

              <strong>
                {totalPages}
              </strong>

            </span>

            <Button
              type="button"
              className="players-pagination-button"
              disabled={
                safeCurrentPage ===
                totalPages
              }
              onClick={
                nextPage
              }
            >
              Next
            </Button>

          </div>

        </Card>

      ) : null}

      <Modal
        open={
          canRemovePlayers &&
          !!removePlayerId
        }
        onClose={() => {
          if (!isRemovingPlayer) {
            closeRemoveModal();
          }
        }}
        title="Remove player?"
      >
        <div className="stack">
          <p>
            Are you sure you want to remove{' '}
            <strong>
              {removePlayerName}
            </strong>
            ? This will delete the player and related transaction records.
          </p>
          {removeError ? (
            <div className="inline-error">
              {removeError}
            </div>
          ) : null}
          <div className="inline-actions">
            <Button
              type="button"
              className="btn-ghost"
              onClick={closeRemoveModal}
              disabled={isRemovingPlayer}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="btn-danger"
              onClick={() =>
                void confirmRemovePlayer()
              }
              disabled={isRemovingPlayer}
            >
              {isRemovingPlayer
                ? 'Removing…'
                : 'Remove'}
            </Button>
          </div>
        </div>
      </Modal>

    </div>
  );
}
