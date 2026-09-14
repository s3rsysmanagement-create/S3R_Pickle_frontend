import { useEffect, useMemo, useState } from 'react';
import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';

import {
  playersApi,
  transactionsApi,
} from '../../api/resources';

import {
  Button,
  Card,
  EmptyState,
  Modal,
  PageHeader,
} from '../../components/ui';

import {
  formatCurrency,
  formatDateTime,
} from '../../lib/format';
import { useAuth } from '../auth/use-auth';

import type {
  TransactionDetails,
} from '../../types';


/*
 * ============================================================
 * CONSTANTS
 * ============================================================
 */

const DAYS_PER_PAGE = 10;


/*
 * ============================================================
 * HELPERS
 * ============================================================
 */

/**
 * Convert an ISO date into YYYY-MM-DD.
 *
 * Used for the date filter and daily grouping.
 */
const getDateKey = (
  dateString: string,
): string => {
  const date = new Date(dateString);

  const year = date.getFullYear();

  const month = String(
    date.getMonth() + 1,
  ).padStart(2, '0');

  const day = String(
    date.getDate(),
  ).padStart(2, '0');

  return `${year}-${month}-${day}`;
};


/**
 * Format YYYY-MM-DD into a readable date.
 */
const formatDay = (
  dateString: string,
): string => {
  const date = new Date(
    `${dateString}T00:00:00`,
  );

  return date.toLocaleDateString(
    undefined,
    {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    },
  );
};


/*
 * ============================================================
 * COMPONENT
 * ============================================================
 */

export function TransactionsPage() {
  const queryClient =
    useQueryClient();
  const { user } = useAuth();
  const canRemovePlayers =
    user?.role === 'ADMIN';

  /*
   * ==========================================================
   * FILTER STATE
   * ==========================================================
   */

  /*
   * Search player/court/staff/payment method.
   */
  const [search, setSearch] = useState('');


  /*
   * Selected date.
   *
   * Empty = all dates.
   */
  const [
    selectedDate,
    setSelectedDate,
  ] = useState('');


  /*
   * Status filter.
   */
  const [
    statusFilter,
    setStatusFilter,
  ] = useState<
    'all' | 'PAID' | 'UNPAID'
  >('all');


  /*
   * ==========================================================
   * PAGINATION STATE
   * ==========================================================
   */

  /*
   * Current page of daily groups.
   *
   * 10 days are displayed per page.
   */
  const [
    currentPage,
    setCurrentPage,
  ] = useState(1);


  /*
   * ==========================================================
   * EXPANDED DAY STATE
   * ==========================================================
   */

  /*
   * Stores the date key of the currently
   * expanded day.
   *
   * Example:
   *
   * "2026-08-26"
   *
   * null = all days collapsed.
   */
  const [
    expandedDate,
    setExpandedDate,
  ] = useState<string | null>(
    null,
  );

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


  /*
   * ==========================================================
   * REMOVE PLAYER
   * ==========================================================
   */

  const {
    mutateAsync:
      removePlayerRecord,
    isPending:
      isRemovingPlayer,
  } = useMutation({
    mutationFn: playersApi.remove,

    onSuccess: async () => {
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


  /*
   * ==========================================================
   * GET TRANSACTIONS
   * ==========================================================
   */

  const {
    data: transactions = [],
    isLoading,
    isError,
    refetch,
  } = useQuery<TransactionDetails[]>({
    queryKey: ['transactions'],

    queryFn: transactionsApi.list,
  });


  /*
   * ==========================================================
   * FILTER TRANSACTIONS
   * ==========================================================
   */

  const filteredTransactions = useMemo(
    () => {

      const normalizedSearch =
        search
          .trim()
          .toLowerCase();

      return transactions.filter(
        (transaction) => {

          /*
           * --------------------------------------------------
           * DATE
           * --------------------------------------------------
           */

          const transactionDate =
            getDateKey(
              transaction.createdAt,
            );

          const matchesDate =
            !selectedDate ||
            transactionDate ===
            selectedDate;


          /*
           * --------------------------------------------------
           * STATUS
           * --------------------------------------------------
           */

          const matchesStatus =
            statusFilter === 'all' ||
            transaction.status ===
            statusFilter;


          /*
           * --------------------------------------------------
           * TRANSACTION SEARCH
           * --------------------------------------------------
           */

          const transactionHaystack =
            [
              transaction.id,
              transaction.courtName,
              transaction.cashierName,
              transaction.paymentMethod,
            ]
              .join(' ')
              .toLowerCase();


          /*
           * --------------------------------------------------
           * PLAYER SEARCH
           * --------------------------------------------------
           */

          const playerMatches =
            transaction.players.some(
              (player) =>
                player.playerName
                  .toLowerCase()
                  .includes(
                    normalizedSearch,
                  ),
            );


          /*
           * --------------------------------------------------
           * FINAL SEARCH RESULT
           * --------------------------------------------------
           */

          const matchesSearch =
            !normalizedSearch ||
            transactionHaystack.includes(
              normalizedSearch,
            ) ||
            playerMatches;


          return (
            matchesDate &&
            matchesStatus &&
            matchesSearch
          );
        },
      );
    },
    [
      transactions,
      selectedDate,
      statusFilter,
      search,
    ],
  );


  /*
   * ==========================================================
   * CREATE DAILY PLAYER GROUPS
   * ==========================================================
   */

  const dailyGroups = useMemo(
    () => {

      type DailyPlayer = {
        transactionId: string;
        createdAt: string;
        playerId: string;
        playerName: string;
        courtName: string;
        cashierName: string;
        paymentMethod: string;
        status:
        | 'PAID'
        | 'UNPAID'
        | 'CANCELLED'
        | 'COMPLETED';
        amount: number;
        rateNames: string[];
      };


      const groups =
        new Map<
          string,
          DailyPlayer[]
        >();


      /*
       * Convert transactions into
       * player-level daily rows.
       */
      filteredTransactions.forEach(
        (transaction) => {

          const dateKey =
            getDateKey(
              transaction.createdAt,
            );


          if (!groups.has(dateKey)) {
            groups.set(
              dateKey,
              [],
            );
          }


          const group =
            groups.get(dateKey)!;


          transaction.players.forEach(
            (player) => {
              const existing =
                group.find(
                  (
                    entry,
                  ) =>
                    entry.transactionId ===
                      transaction.id &&
                    entry.playerId ===
                      player.playerId,
                );

              const rateLabel =
                player.rateName?.trim() ||
                'Rate';

              if (existing) {
                existing.amount +=
                  Number(
                    player.amount,
                  );

                if (
                  !existing.rateNames.includes(
                    rateLabel,
                  )
                ) {
                  existing.rateNames.push(
                    rateLabel,
                  );
                }

                return;
              }

              group.push({

                transactionId:
                  transaction.id,

                createdAt:
                  transaction.createdAt,

                playerId:
                  player.playerId,

                playerName:
                  player.playerName,

                courtName:
                  transaction.courtName,

                cashierName:
                  transaction.cashierName,

                paymentMethod:
                  transaction.paymentMethod,

                status:
                  transaction.status,

                amount:
                  Number(
                    player.amount,
                  ),

                rateNames: [
                  rateLabel,
                ],

              });

            },
          );
        },
      );


      /*
       * Sort newest dates first.
       */
      return Array.from(
        groups.entries(),
      ).sort(
        (
          [dateA],
          [dateB],
        ) =>
          dateB.localeCompare(
            dateA,
          ),
      );

    },
    [filteredTransactions],
  );


  /*
   * ==========================================================
   * PAGINATION
   * ==========================================================
   */

  const totalPages =
    Math.max(
      1,
      Math.ceil(
        dailyGroups.length /
        DAYS_PER_PAGE,
      ),
    );


  /*
   * Only render the 10 daily groups
   * for the current page.
   */
  const paginatedDailyGroups =
    useMemo(
      () => {

        const startIndex =
          (currentPage - 1) *
          DAYS_PER_PAGE;

        const endIndex =
          startIndex +
          DAYS_PER_PAGE;

        return dailyGroups.slice(
          startIndex,
          endIndex,
        );

      },
      [
        dailyGroups,
        currentPage,
      ],
    );


  /*
   * ==========================================================
   * RESET PAGINATION WHEN FILTERS CHANGE
   * ==========================================================
   *
   * This prevents situations such as:
   *
   * Page 5
   *   ↓
   * User searches "Jon"
   *   ↓
   * Only 1 page exists
   *
   * We automatically return to page 1.
   */

  useEffect(
    () => {

      setCurrentPage(1);

      setExpandedDate(null);

    },
    [
      search,
      selectedDate,
      statusFilter,
    ],
  );


  /*
   * ==========================================================
   * KEEP PAGE VALID
   * ==========================================================
   */

  useEffect(
    () => {

      if (
        currentPage >
        totalPages
      ) {
        setCurrentPage(
          totalPages,
        );
      }

    },
    [
      currentPage,
      totalPages,
    ],
  );


  /*
   * ==========================================================
   * PAGE NAVIGATION
   * ==========================================================
   */

  const handlePreviousPage =
    () => {

      setExpandedDate(null);

      setCurrentPage(
        (page) =>
          Math.max(
            1,
            page - 1,
          ),
      );

    };


  const handleNextPage =
    () => {

      setExpandedDate(null);

      setCurrentPage(
        (page) =>
          Math.min(
            totalPages,
            page + 1,
          ),
      );

    };


  /*
   * ==========================================================
   * EXPAND / COLLAPSE
   * ==========================================================
   */

  const handleToggleDay =
    (
      dateKey: string,
    ) => {

      setExpandedDate(
        (current) =>
          current === dateKey
            ? null
            : dateKey,
      );

    };


  /*
   * ==========================================================
   * CLEAR FILTERS
   * ==========================================================
   */

  const handleClearFilters =
    () => {

      setSearch('');

      setSelectedDate('');

      setStatusFilter(
        'all',
      );

      setCurrentPage(1);

      setExpandedDate(null);

    };


  const openRemoveModal =
    (
      playerId: string,
      playerName: string,
    ) => {
      if (!canRemovePlayers) {
        return;
      }

      setRemovePlayerId(
        playerId,
      );
      setRemovePlayerName(
        playerName,
      );
      setRemoveError('');
    };


  const closeRemoveModal =
    () => {
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


  /*
   * ==========================================================
   * RENDER
   * ==========================================================
   */

  return (
    <div className="stack large-gap">

      {/* ==================================================
          HEADER
          ================================================== */}

      <PageHeader
        title="Transactions History"
        subtitle="View player payments grouped by day"
      />


      {/* ==================================================
          FILTERS
          ================================================== */}

      <Card className="filter-row">

        {/* DATE */}

        <div className="filter-field">

          <label
            htmlFor="transaction-date"
          >
            Date
          </label>

          <input
            id="transaction-date"
            type="date"
            value={selectedDate}
            onChange={(event) =>
              setSelectedDate(
                event.target.value,
              )
            }
            className="field"
          />

        </div>


        {/* STATUS

        <div className="filter-field">

          <label
            htmlFor="transaction-status"
          >
            Status
          </label>

          <select
            id="transaction-status"
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(
                event.target.value as
                | 'all'
                | 'PAID'
                | 'CANCELLED',
              )
            }
            className="field"
          >

            <option value="all">
              All statuses
            </option>

            <option value="PAID">
              Paid
            </option>

            <option value="CANCELLED">
              Cancelled
            </option>

          </select>

        </div>
 */}

        {/* CLEAR FILTERS */}

        {(search ||
          selectedDate ||
          statusFilter !== 'all') && (

            <Button
              type="button"
              className="btn-ghost"
              onClick={
                handleClearFilters
              }
            >
              Clear filters
            </Button>

          )}

      </Card>


      {/* ==================================================
          ERROR
          ================================================== */}

      {isError && (

        <Card className="stack">

          <div className="inline-error">
            Could not load player
            payments from the server.
          </div>

          <Button
            type="button"
            className="btn-small"
            onClick={() =>
              void refetch()
            }
          >
            Retry
          </Button>

        </Card>

      )}


      {/* ==================================================
          LOADING
          ================================================== */}

      {isLoading && (

        <Card className="loading-shell small-shell">
          Loading player payments…
        </Card>

      )}


      {/* ==================================================
          DAILY PAYMENT GRID
          ================================================== */}

      {!isLoading &&
        !isError &&
        paginatedDailyGroups.length > 0 && (

          <div className="stack large-gap">

            {paginatedDailyGroups.map(
              (
                [dateKey, players],
              ) => {

                /*
                 * Calculate daily total.
                 */
                const dayTotal =
                  players.reduce(
                    (
                      total,
                      player,
                    ) =>
                      total +
                      player.amount,
                    0,
                  );


                /*
                 * Is this day expanded?
                 */
                const isExpanded =
                  expandedDate ===
                  dateKey;


                return (

                  <Card
                    key={dateKey}
                    className="table-card"
                  >

                    {/* ==================================================
                        COLLAPSED DAILY SUMMARY
                        ================================================== */}

                    {!isExpanded && (

                      <div
                        className="toolbar-row"
                        style={{
                          alignItems:
                            'center',
                          gap: '24px',
                        }}
                      >

                        {/* DATE */}

                        <div
                          style={{
                            flex: 1,
                            minWidth: 0,
                          }}
                        >

                          <h2
                            style={{
                              marginBottom:
                                '4px',
                            }}
                          >
                            {formatDay(
                              dateKey,
                            )}
                          </h2>

                          <span className="muted-text">

                            {players.length}{' '}

                            player
                            {players.length !==
                              1
                              ? 's'
                              : ''}

                          </span>

                        </div>


                        {/* TOTAL */}

                        <strong
                          style={{
                            whiteSpace:
                              'nowrap',
                          }}
                        >
                          {formatCurrency(
                            dayTotal,
                          )}
                        </strong>


                        {/* VIEW */}

                        <Button
                          type="button"
                          className="btn-small"
                          onClick={() =>
                            handleToggleDay(
                              dateKey,
                            )
                          }
                        >
                          View
                        </Button>

                      </div>

                    )}


                    {/* ==================================================
                        EXPANDED DAILY TABLE
                        ================================================== */}

                    {isExpanded && (

                      <>

                        {/* DAY HEADER */}

                        <div className="toolbar-row">

                          <div>

                            <h2>
                              {formatDay(
                                dateKey,
                              )}
                            </h2>

                            <span className="muted-text">

                              {players.length}{' '}

                              player
                              {players.length !==
                                1
                                ? 's'
                                : ''}

                            </span>

                          </div>


                          <div
                            style={{
                              display:
                                'flex',
                              alignItems:
                                'center',
                              gap: '16px',
                            }}
                          >

                            <strong>
                              {formatCurrency(
                                dayTotal,
                              )}
                            </strong>

                            <Button
                              type="button"
                              className="btn-ghost"
                              onClick={() =>
                                handleToggleDay(
                                  dateKey,
                                )
                              }
                            >
                              Close
                            </Button>

                          </div>

                        </div>


                        {/* PLAYER TABLE */}

                        <div className="table-wrapper">

                          <table className="data-table">

                            <thead>

                              <tr>

                                <th>
                                  #
                                </th>

                                <th>
                                  Time
                                </th>

                                <th>
                                  Player
                                </th>

                                <th>
                                  Court
                                </th>

                                <th>
                                  Staff
                                </th>

                                <th>
                                  Payment
                                </th>

                                <th>
                                  Status
                                </th>

                                <th>
                                  Rates
                                </th>

                                <th>
                                  Amount
                                </th>

                               {canRemovePlayers ? (
                                 <th>
                                   Action
                                 </th>
                               ) : null}

                              </tr>

                            </thead>


                            <tbody>

                              {players.map(
                                (
                                  player,
                                  index,
                                ) => (

                                  <tr
                                    key={`${player.transactionId}-${player.playerId}-${index}`}
                                  >

                                    <td>
                                      {index + 1}
                                    </td>


                                    <td>
                                      {formatDateTime(
                                        player.createdAt,
                                      )}
                                    </td>


                                    <td>

                                      <strong>
                                        {
                                          player.playerName
                                        }
                                      </strong>

                                    </td>


                                    <td>
                                      {
                                        player.courtName
                                      }
                                    </td>


                                    <td>
                                      {
                                        player.cashierName
                                      }
                                    </td>


                                    <td>
                                      {
                                        player.paymentMethod
                                      }
                                    </td>


                                    <td>

                                      <span
                                        className={
                                          player.status ===
                                            'UNPAID'
                                            ? 'status-unpaid'
                                            : 'status-paid'
                                        }
                                      >
                                        {
                                          player.status
                                        }
                                      </span>

                                    </td>


                                    <td>
                                      <span className="muted">
                                        {player.rateNames.join(
                                          ', ',
                                        )}
                                      </span>
                                    </td>


                                    <td>

                                      <strong>

                                        {formatCurrency(
                                          player.amount,
                                        )}

                                      </strong>

                                    </td>


                                    {canRemovePlayers ? (
                                      <td>
                                        <div className="inline-actions">
                                          <Button
                                            type="button"
                                            className="btn-small btn-danger"
                                            onClick={() =>
                                              openRemoveModal(
                                                player.playerId,
                                                player.playerName,
                                              )
                                            }
                                            disabled={isRemovingPlayer}
                                          >
                                            Remove
                                          </Button>
                                        </div>
                                      </td>
                                    ) : null}

                                  </tr>

                                ),
                              )}

                            </tbody>


                            {/* DAILY TOTAL */}

                            <tfoot>

                              <tr>

                                <td
                                  colSpan={
                                    canRemovePlayers
                                      ? 9
                                      : 8
                                  }
                                  style={{
                                    textAlign:
                                      'right',
                                  }}
                                >

                                  <strong>
                                    Daily Total
                                  </strong>

                                </td>


                                <td>

                                  <strong>

                                    {formatCurrency(
                                      dayTotal,
                                    )}

                                  </strong>

                                </td>

                              </tr>

                            </tfoot>

                          </table>

                        </div>

                      </>

                    )}

                  </Card>

                );
              },
            )}

          </div>

        )}


      {/* ==================================================
          PAGINATION
          ================================================== */}

      {!isLoading &&
        !isError &&
        dailyGroups.length > 0 && (

          <Card>

            <div
              className="toolbar-row"
              style={{
                alignItems:
                  'center',
              }}
            >

              {/* PAGE INFORMATION */}

              <span className="muted-text">

                Showing{' '}

                {(
                  (currentPage - 1) *
                  DAYS_PER_PAGE
                ) + 1}

                {' – '}

                {Math.min(
                  currentPage *
                  DAYS_PER_PAGE,
                  dailyGroups.length,
                )}

                {' '}of{' '}

                {dailyGroups.length}

                {' '}days

              </span>


              {/* PAGINATION CONTROLS */}

              <div
                style={{
                  display:
                    'flex',
                  alignItems:
                    'center',
                  gap: '8px',
                }}
              >

                <Button
                  type="button"
                  className="btn-ghost"
                  disabled={
                    currentPage === 1
                  }
                  onClick={
                    handlePreviousPage
                  }
                >
                  Previous
                </Button>


                <span
                  style={{
                    minWidth:
                      '90px',
                    textAlign:
                      'center',
                    fontWeight:
                      600,
                  }}
                >
                  Page{' '}
                  {currentPage}{' '}
                  of{' '}
                  {totalPages}
                </span>


                <Button
                  type="button"
                  className="btn-ghost"
                  disabled={
                    currentPage ===
                    totalPages
                  }
                  onClick={
                    handleNextPage
                  }
                >
                  Next
                </Button>

              </div>

            </div>

          </Card>

        )}


      {/* ==================================================
          EMPTY
          ================================================== */}

      {!isLoading &&
        !isError &&
        dailyGroups.length === 0 && (

          <EmptyState
            title="No player payments found"
            description={
              selectedDate
                ? `There are no player payments for ${formatDay(
                  selectedDate,
                )}.`
                : 'Update your search or date filter to find player payments.'
            }
          />

        )}


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
            ? This will delete the player and any associated transaction records.
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