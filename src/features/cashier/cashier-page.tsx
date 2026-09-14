import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import './cashier-page.css';

import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';

import {
  zodResolver,
} from '@hookform/resolvers/zod';

import {
  useForm,
} from 'react-hook-form';

import {
  courtsApi,
  playersApi,
  ratesApi,
  type TransactionPlayerInput,
  transactionsApi,
} from '../../api/resources';

import {
  Button,
  Card,
  Modal,
  PageHeader,
  StatusBadge,
} from '../../components/ui';

import {
  formatCurrency,
} from '../../lib/format';

import {
  cashierSchema,
  playerFormSchema,
  type CashierFormValues,
  type PlayerFormValues,
} from '../../schemas/forms';

import type {
  TransactionDetails,
} from '../../types';


// ============================================================
// TYPES
// ============================================================

type PaymentStatus =
  | 'PAID'
  | 'UNPAID';

type SelectedPlayerEntry = {
  playerId: string;
  rateIds: string[];
};


type PaymentListItem = {
  id: string;

  /**
   * The database transaction ID.
   * Used to call mark-paid on the backend.
   */
  transactionId: string;

  playerId: string;

  playerName: string;

  courtId: string;

  courtName: string;

  rateId: string;

  rateName: string;

  rateIds: string[];

  rateNames: string[];

  amount: number;

  paymentMethod:
    | 'CASH'
    | 'GCASH'
    | 'BANK_TRANSFER'
    | 'CARD'
    | 'VENMO';

  status: PaymentStatus;

  date: string;

  createdAt: string;
};


// ============================================================
// PAYMENT METHOD LABELS
// ============================================================

const paymentMethodLabels: Record<
  'CASH' | 'GCASH' | 'BANK_TRANSFER' | 'CARD' | 'VENMO',
  string
> = {
  CASH: 'Cash',
  GCASH: 'GCash',
  BANK_TRANSFER: 'Bank transfer',
  CARD: 'Card',
  VENMO: 'Venmo',
};


// ============================================================
// HELPERS
// ============================================================

const getTodayKey = (): string => {
  const date = new Date();

  const year =
    date.getFullYear();

  const month =
    String(
      date.getMonth() + 1,
    ).padStart(2, '0');

  const day =
    String(
      date.getDate(),
    ).padStart(2, '0');

  return `${year}-${month}-${day}`;
};


const buildIsoDateTime = (
  date: string,
  time: string,
) =>
  new Date(
    `${date}T${time}:00`,
  ).toISOString();


const addHours = (
  isoDateTime: string,
  hours: number,
) => {
  const date =
    new Date(
      isoDateTime,
    );

  date.setHours(
    date.getHours() + hours,
  );

  return date.toISOString();
};


// ============================================================
// COMPONENT
// ============================================================

export function CashierPage() {

  const queryClient =
    useQueryClient();


  // ==========================================================
  // STATE
  // ==========================================================

  const [
    selectedPlayers,
    setSelectedPlayers,
  ] = useState<
    SelectedPlayerEntry[]
  >([]);


  const [
    submitMessage,
    setSubmitMessage,
  ] = useState('');


  const [
    submitError,
    setSubmitError,
  ] = useState('');


  const [
    showQuickAdd,
    setShowQuickAdd,
  ] = useState(false);


  const [
    currentDate,
    setCurrentDate,
  ] = useState(
    getTodayKey(),
  );


  /**
   * When true, the current day's
   * payment grid is hidden.
   *
   * IMPORTANT:
   * This does NOT delete anything
   * from the database.
   */
  const [
    sessionEnded,
    setSessionEnded,
  ] = useState(false);


  const [
    showEndSessionModal,
    setShowEndSessionModal,
  ] = useState(false);


  // ==========================================================
  // EDIT STATE
  // ==========================================================

  const [
    editingId,
    setEditingId,
  ] = useState<string | null>(
    null,
  );


  const [
    editPlayerId,
    setEditPlayerId,
  ] = useState('');


  const [
    editPlayerName,
    setEditPlayerName,
  ] = useState('');


  const [
    editCourtId,
    setEditCourtId,
  ] = useState('');


  const [
    editPaymentMethod,
    setEditPaymentMethod,
  ] = useState<
    'CASH' | 'GCASH' | 'BANK_TRANSFER' | 'CARD' | 'VENMO'
  >('CASH');


  // ==========================================================
  // PAY MODAL STATE
  // ==========================================================

  const [
    payingItem,
    setPayingItem,
  ] = useState<PaymentListItem | null>(
    null,
  );


  const [
    payModalError,
    setPayModalError,
  ] = useState('');


  // ==========================================================
  // IDEMPOTENCY
  // ==========================================================

  const idempotencyKeyRef =
    useRef(
      crypto.randomUUID(),
    );


  // ==========================================================
  // API QUERIES
  // ==========================================================

  const {
    data: courts = [],
    isLoading: courtsLoading,
    isError: courtsErrored,
  } = useQuery({
    queryKey: [
      'courts',
    ],

    queryFn:
      courtsApi.list,
  });


  const {
    data: rates = [],
    isLoading: ratesLoading,
    isError: ratesErrored,
  } = useQuery({
    queryKey: [
      'rates',
    ],

    queryFn:
      ratesApi.list,
  });


  const {
    data: players = [],
    isLoading: playersLoading,
    isError: playersErrored,
  } = useQuery({
    queryKey: [
      'players',
    ],

    queryFn:
      playersApi.list,
  });


  const {
    data: transactions = [],
    isLoading: transactionsLoading,
    isError: transactionsErrored,
  } = useQuery({
    queryKey: [
      'transactions',
    ],

    queryFn:
      transactionsApi.list,

    refetchOnWindowFocus:
      true,

    staleTime:
      0,
  });


  // ==========================================================
  // ACTIVE DATA
  // ==========================================================

  const activeRates =
    useMemo(
      () =>
        rates.filter(
          (rate) =>
            rate.active,
        ),

      [
        rates,
      ],
    );


  const activeCourts =
    courts;

  const quickAddSuggestions =
    useMemo(
      () => {
        const uniquePlayers =
          new Map<
            string,
            typeof players[number]
          >();

        players.forEach(
          (player) => {
            if (!player.active) {
              return;
            }

            const normalizedName =
              player.name
                .trim()
                .toLowerCase();

            if (
              !normalizedName ||
              uniquePlayers.has(
                normalizedName,
              )
            ) {
              return;
            }

            uniquePlayers.set(
              normalizedName,
              player,
            );
          },
        );

        return Array.from(
          uniquePlayers.values(),
        ).sort(
          (
            playerA,
            playerB,
          ) =>
            playerA.name.localeCompare(
              playerB.name,
            ),
        );
      },
      [players],
    );

  // ==========================================================
  // CASHIER FORM
  // ==========================================================

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: {
      errors,
      isSubmitting,
    },
  } = useForm<CashierFormValues>({
    resolver:
      zodResolver(
        cashierSchema,
      ),

    defaultValues: {
      transactionDate:
        getTodayKey(),

      startTime:
        '09:00',

      durationHours:
        '1',

      paymentMethod:
        'CASH',

      courtId:
        '',

      players:
        [],
    },
  });


  // ==========================================================
  // QUICK ADD PLAYER FORM
  // ==========================================================

  const {
    register:
      registerQuickAdd,

    handleSubmit:
      handleQuickAddSubmit,

    reset:
      resetQuickAdd,

    watch:
      watchQuickAdd,

    formState: {
      errors:
        quickAddErrors,

      isSubmitting:
        quickAddSubmitting,
    },
  } =
    useForm<PlayerFormValues>({
      resolver:
        zodResolver(
          playerFormSchema,
        ),

      defaultValues: {
        fullName:
          '',

        phone:
          '',
      },
    });


  // ==========================================================
  // WATCH FORM
  // ==========================================================

  const selectedCourtId =
    watch(
      'courtId',
    );


  const selectedPaymentMethod =
    watch(
      'paymentMethod',
    );


  const selectedTransactionDate =
    watch(
      'transactionDate',
    );


  const selectedStartTime =
    watch(
      'startTime',
    );


  const selectedDurationHours =
    watch(
      'durationHours',
    );

  const quickAddPlayerName =
    watchQuickAdd(
      'fullName',
    );

  const matchedQuickAddPlayer =
    useMemo(
      () => {
        const normalizedName =
          quickAddPlayerName
            ?.trim()
            .toLowerCase() ?? '';

        if (!normalizedName) {
          return null;
        }

        return (
          quickAddSuggestions.find(
            (player) =>
              player.name
                .trim()
                .toLowerCase() ===
              normalizedName,
          ) ?? null
        );
      },
      [
        quickAddPlayerName,
        quickAddSuggestions,
      ],
    );


  // ==========================================================
  // DEFAULT COURT 1
  // ==========================================================

  useEffect(() => {

    if (
      !activeCourts.length
    ) {
      return;
    }


    const courtOne =
      activeCourts.find(
        (court) =>
          court.name
            .trim()
            .toLowerCase() ===
          'court 1',
      );


    const defaultCourt =
      courtOne ??
      activeCourts[0];


    if (
      !defaultCourt
    ) {
      return;
    }


    const currentCourtExists =
      activeCourts.some(
        (court) =>
          court.id ===
          selectedCourtId,
      );


    if (
      !currentCourtExists
    ) {

      setValue(
        'courtId',
        defaultCourt.id,
        {
          shouldValidate:
            true,
        },
      );

    }

  }, [
    activeCourts,
    selectedCourtId,
    setValue,
  ]);


  // ==========================================================
  // FORCE DEFAULT PAYMENT METHOD TO CASH
  // ==========================================================

  useEffect(() => {

    if (
      selectedPaymentMethod !==
      'CASH'
    ) {
      return;
    }

    /**
     * Cash is already the
     * default.
     *
     * Nothing else is needed.
     */

  }, [
    selectedPaymentMethod,
  ]);


  // ==========================================================
  // MIDNIGHT DATE DETECTION
  // ==========================================================

  useEffect(() => {

    const checkDate =
      () => {

        const today =
          getTodayKey();


        if (
          today ===
          currentDate
        ) {
          return;
        }


        /**
         * New day.
         */
        setCurrentDate(
          today,
        );


        /**
         * Start a fresh
         * open-play session.
         */
        setSessionEnded(
          false,
        );


        setEditingId(
          null,
        );


        setSelectedPlayers(
          [],
        );


        setValue(
          'transactionDate',
          today,
          {
            shouldValidate:
              true,
          },
        );


        setValue(
          'players',
          [],
        );


        setValue(
          'paymentMethod',
          'CASH',
        );


        /**
         * Reset court to
         * Court 1.
         */
        const courtOne =
          activeCourts.find(
            (court) =>
              court.name
                .trim()
                .toLowerCase() ===
              'court 1',
          );


        const defaultCourt =
          courtOne ??
          activeCourts[0];


        if (
          defaultCourt
        ) {

          setValue(
            'courtId',
            defaultCourt.id,
            {
              shouldValidate:
                true,
            },
          );

        }


        void queryClient.invalidateQueries(
          {
            queryKey: [
              'transactions',
            ],
          },
        );

      };


    const interval =
      window.setInterval(
        checkDate,
        60_000,
      );


    checkDate();


    return () =>
      window.clearInterval(
        interval,
      );

  }, [
    currentDate,
    queryClient,
    setValue,
    activeCourts,
  ]);


  // ==========================================================
  // SELECTED COURT
  // ==========================================================

  const selectedCourt =
    useMemo(
      () =>
        activeCourts.find(
          (court) =>
            court.id ===
            selectedCourtId,
        ),

      [
        activeCourts,
        selectedCourtId,
      ],
    );


  // ==========================================================
  // RATE HELPERS
  // ==========================================================

  const defaultRateId =
    activeRates[0]?.id ??
    '';


  const rateAmount = (
    rateId: string,
  ) =>
    Number(
      activeRates.find(
        (rate) =>
          rate.id ===
          rateId,
      )?.amount ?? 0,
    );


  // ==========================================================
  // SELECTED PLAYERS
  // ==========================================================

  const addPlayer = (
    playerId: string,
  ) => {

    if (
      selectedPlayers.some(
        (entry) =>
          entry.playerId ===
          playerId,
      )
    ) {
      return;
    }


    const next = [
      ...selectedPlayers,

      {
        playerId,

        rateIds:
          defaultRateId
            ? [defaultRateId]
            : [],
      },
    ];


    setSelectedPlayers(
      next,
    );


    setValue(
      'players',
      next,
      {
        shouldValidate:
          true,
      },
    );

  };


  const removePlayer = (
    playerId: string,
  ) => {

    const next =
      selectedPlayers.filter(
        (entry) =>
          entry.playerId !==
          playerId,
      );


    setSelectedPlayers(
      next,
    );


    setValue(
      'players',
      next,
      {
        shouldValidate:
          true,
      },
    );

  };


  const togglePlayerRate = (
    playerId: string,
    rateId: string,
  ) => {

    const next =
      selectedPlayers.map(
        (entry) =>
          entry.playerId ===
          playerId
            ? {
                ...entry,
                rateIds:
                  entry.rateIds.includes(
                    rateId,
                  )
                    ? entry.rateIds.filter(
                        (
                          selectedRateId,
                        ) =>
                          selectedRateId !==
                          rateId,
                      )
                    : [
                        ...entry.rateIds,
                        rateId,
                      ],
              }
            : entry,
      );


    setSelectedPlayers(
      next,
    );


    setValue(
      'players',
      next,
      {
        shouldValidate:
          true,
      },
    );

  };


  // ==========================================================
  // PREVIEW TOTAL
  // ==========================================================

  const previewTotal =
    selectedPlayers.reduce(
      (
        sum,
        entry,
      ) =>
        sum +
        entry.rateIds.reduce(
          (
            playerTotal,
            rateId,
          ) =>
            playerTotal +
            rateAmount(
              rateId,
            ),
          0,
        ),

      0,
    );

  const toTransactionPlayers = (
    players: SelectedPlayerEntry[],
  ): TransactionPlayerInput[] =>
    players.flatMap(
      (entry) =>
        entry.rateIds.map(
          (rateId) => ({
            playerId:
              entry.playerId,
            rateId,
          }),
        ),
    );


  // ==========================================================
  // ADD TO PAYMENT LIST
  // ==========================================================

  const [
    isAddingToList,
    setIsAddingToList,
  ] = useState(false);


  const addToPaymentList =
    async () => {

      setSubmitError('');

      setSubmitMessage('');


      if (
        !selectedPlayers.length
      ) {

        setSubmitError(
          'Please select at least one player.',
        );

        return;
      }


      if (
        !selectedCourtId
      ) {

        setSubmitError(
          'Please select a court.',
        );

        return;
      }


      const startIso =
        buildIsoDateTime(
          selectedTransactionDate,
          selectedStartTime,
        );


      const endIso =
        addHours(
          startIso,
          Number(
            selectedDurationHours,
          ),
        );


      setIsAddingToList(true);


      try {

        await transactionsApi.create(
          {
            courtId:
              selectedCourtId,

            transactionDate:
              selectedTransactionDate,

            startTime:
              startIso,

            endTime:
              endIso,

            paymentMethod:
              selectedPaymentMethod,

            status:
              'UNPAID',

            players:
              toTransactionPlayers(
                selectedPlayers,
              ),
          },

          crypto.randomUUID(),
        );


        setSubmitMessage(
          `${selectedPlayers.length} ${
            selectedPlayers.length === 1
              ? 'player'
              : 'players'
          } added to the payment list.`,
        );


        setSelectedPlayers(
          [],
        );


        setValue(
          'players',
          [],
        );


        await queryClient.invalidateQueries(
          {
            queryKey: [
              'transactions',
            ],
          },
        );

      } catch (error) {

        setSubmitError(
          error instanceof Error
            ? error.message
            : 'Unable to add players to the payment list.',
        );

      } finally {

        setIsAddingToList(false);

      }

    };


  // ==========================================================
  // TRANSACTION MUTATION
  // ==========================================================

  const {
    mutateAsync:
      submitTransaction,
  } =
    useMutation({

      mutationFn:
        (
          values:
            CashierFormValues,
        ) => {

          const startIso =
            buildIsoDateTime(
              values.transactionDate,
              values.startTime,
            );


          const endIso =
            addHours(
              startIso,
              Number(
                values.durationHours,
              ),
            );


          return transactionsApi.create(
            {
              courtId:
                values.courtId,

              transactionDate:
                values.transactionDate,

              startTime:
                startIso,

              endTime:
                endIso,

              paymentMethod:
                values.paymentMethod,

              players:
                toTransactionPlayers(
                  values.players,
                ),
            },

            idempotencyKeyRef.current,
          );

        },
    });


  // ==========================================================
  // CONFIRM TRANSACTION
  // ==========================================================

  const onSubmit = async (
    values:
      CashierFormValues,
  ) => {

    setSubmitMessage('');

    setSubmitError('');


    try {

      const result =
        await submitTransaction(
          values,
        );


      setSubmitMessage(
        `Transaction ${
          result.transactionCode
        } confirmed. Total ${
          formatCurrency(
            Number(
              result.total,
            ),
          )
        }.`,
      );


      setSelectedPlayers(
        [],
      );


      setValue(
        'players',
        [],
      );


      /**
       * Always generate a new
       * idempotency key after
       * successful transaction.
       */
      idempotencyKeyRef.current =
        crypto.randomUUID();


      /**
       * Refresh from PostgreSQL.
       */
      await queryClient.invalidateQueries(
        {
          queryKey: [
            'transactions',
          ],
        },
      );

    } catch (error) {

      setSubmitError(
        error instanceof Error
          ? error.message
          : 'Unable to complete this transaction.',
      );

    }

  };


  // ==========================================================
  // MARK PAID MUTATION
  // ==========================================================

  const {
    mutateAsync:
      markTransactionPaid,

    isPending:
      isMarkingPaid,
  } =
    useMutation({

      mutationFn:
        (id: string) =>
          transactionsApi.markPaid(
            id,
          ),

      onSuccess:
        async () => {

          await queryClient.invalidateQueries(
            {
              queryKey: [
                'transactions',
              ],
            },
          );

        },

    });


  const confirmPay =
    async () => {

      if (!payingItem) {
        return;
      }

      setPayModalError('');


      try {

        await markTransactionPaid(
          payingItem.transactionId,
        );


        setPayingItem(
          null,
        );


        setSubmitMessage(
          `Payment confirmed for ${payingItem.playerName}.`,
        );

      } catch (error) {

        setPayModalError(
          error instanceof Error
            ? error.message
            : 'Unable to confirm payment.',
        );

      }

    };


  // ==========================================================
  // QUICK ADD PLAYER
  // ==========================================================

  const {
    mutateAsync:
      createPlayer,
  } =
    useMutation({

      mutationFn:
        playersApi.create,

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


  const onQuickAddSubmit =
    async (
      values:
        PlayerFormValues,
    ) => {
      const normalizedName =
        values.fullName
          .trim()
          .toLowerCase();

      const existingPlayer =
        quickAddSuggestions.find(
          (player) =>
            player.name
              .trim()
              .toLowerCase() ===
            normalizedName,
        );

      if (existingPlayer) {
        addPlayer(
          existingPlayer.id,
        );

        resetQuickAdd();

        setShowQuickAdd(
          false,
        );

        setSubmitMessage(
          `"${existingPlayer.name}" selected from saved players.`,
        );

        setSubmitError('');

        return;
      }

      setSubmitError('');

      try {

        const created =
          await createPlayer({
            fullName:
              values.fullName,

            phone:
              values.phone ||
              undefined,
          });


        addPlayer(
          created.id,
        );


        resetQuickAdd();


        setShowQuickAdd(
          false,
        );

      } catch (error) {

        setSubmitError(
          error instanceof Error
            ? error.message
            : 'Unable to create player.',
        );

      }

    };


  // ==========================================================
  // UPDATE PLAYER
  // ==========================================================

  const {
    mutateAsync:
      updatePlayer,
  } =
    useMutation({

      mutationFn:
        ({
          id,
          input,
        }: {
          id: string;

          input: {
            fullName: string;

            phone?: string;
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


          await queryClient.invalidateQueries(
            {
              queryKey: [
                'transactions',
              ],
            },
          );

        },

    });


  // ==========================================================
  // START EDIT
  // ==========================================================

  const startEdit = (
    item: PaymentListItem,
  ) => {

    setEditingId(
      item.id,
    );


    setEditPlayerId(
      item.playerId,
    );


    setEditPlayerName(
      item.playerName,
    );


    setEditCourtId(
      item.courtId,
    );


    setEditPaymentMethod(
      item.paymentMethod,
    );


    setSubmitMessage('');

    setSubmitError('');

  };


  // ==========================================================
  // CANCEL EDIT
  // ==========================================================

  const cancelEdit = () => {

    setEditingId(
      null,
    );

    setEditPlayerId('');

    setEditPlayerName('');

    setEditCourtId('');

    setEditPaymentMethod(
      'CASH',
    );

  };


  // ==========================================================
  // SAVE EDIT
  // ==========================================================

  const saveEdit = async (
    item: PaymentListItem,
  ) => {

    setSubmitError('');

    setSubmitMessage('');


    const typedPlayerName =
      editPlayerName.trim();


    if (
      !typedPlayerName
    ) {

      setSubmitError(
        'Player name is required.',
      );

      return;
    }


    if (
      !editPlayerId
    ) {

      setSubmitError(
        'Unable to identify the player being edited.',
      );

      return;
    }


    try {

      await updatePlayer({
        id:
          editPlayerId,

        input: {
          fullName:
            typedPlayerName,
        },
      });


      setEditingId(
        null,
      );


      setEditPlayerId('');

      setEditPlayerName('');

      setEditCourtId('');

      setEditPaymentMethod(
        'CASH',
      );


      setSubmitMessage(
        `Player "${item.playerName}" was updated successfully.`,
      );


      await queryClient.invalidateQueries(
        {
          queryKey: [
            'transactions',
          ],
        },
      );

    } catch (error) {

      setSubmitError(
        error instanceof Error
          ? error.message
          : 'Unable to save player changes.',
      );

    }

  };


  // ==========================================================
  // TODAY'S TRANSACTIONS
  // ==========================================================

  const todaysTransactions =
    useMemo(
      () => {

        return transactions.filter(
          (
            transaction,
          ) => {

            const transactionDate =
              (
                transaction as TransactionDetails & {
                  transactionDate?: string;
                }
              ).transactionDate;


            if (
              transactionDate
            ) {

              return (
                transactionDate
                  .slice(0, 10) ===
                currentDate
              );

            }


            if (
              transaction.createdAt
            ) {

              return (
                new Date(
                  transaction.createdAt,
                )
                  .toLocaleDateString(
                    'en-CA',
                  ) ===
                currentDate
              );

            }


            return false;

          },
        );

      },
      [
        transactions,
        currentDate,
      ],
    );


  // ==========================================================
  // DATABASE PAYMENT LIST
  // ==========================================================

  const databasePaymentList =
    useMemo<
      PaymentListItem[]
    >(
      () => {

        const result:
          PaymentListItem[] =
          [];


        todaysTransactions.forEach(
          (
            transaction,
          ) => {

            const transactionData =
              transaction as TransactionDetails & {
                transactionDate?: string;

                courtId?: string;

                players?: Array<{
                  playerId: string;

                  playerName: string;

                  amount:
                    | number
                    | string;

                  rateId?: string;

                  rateName?: string;
                }>;
              };


            const transactionPlayers =
              transactionData.players ??
              [];

            const groupedItems =
              new Map<
                string,
                PaymentListItem
              >();


            transactionPlayers.forEach(
              (
                player,
              ) => {

                const playerRate =
                  player.rateId
                    ? activeRates.find(
                        (
                          rate,
                        ) =>
                          rate.id ===
                          player.rateId,
                      )
                    : undefined;


                const amount =
                  Number(
                    player.amount ??
                    0,
                  );


                const transactionStatus =
                  String(
                    transaction.status ??
                    'PAID',
                  ).toUpperCase();


                const status:
                  PaymentStatus =
                  transactionStatus ===
                    'UNPAID' ||
                  transactionStatus ===
                    'PENDING'
                    ? 'UNPAID'
                    : 'PAID';


                const rateId =
                  player.rateId ??
                  playerRate?.id ??
                  '';

                const rateName =
                  player.rateName ??
                  playerRate?.name ??
                  'Rate';

                const itemKey =
                  `${transaction.id}-${player.playerId}`;

                const existing =
                  groupedItems.get(
                    itemKey,
                  );

                if (existing) {
                  existing.amount +=
                    amount;

                  if (
                    rateId &&
                    !existing.rateIds.includes(
                      rateId,
                    )
                  ) {
                    existing.rateIds.push(
                      rateId,
                    );
                  }

                  if (
                    rateName &&
                    !existing.rateNames.includes(
                      rateName,
                    )
                  ) {
                    existing.rateNames.push(
                      rateName,
                    );
                  }

                  return;
                }

                groupedItems.set(
                  itemKey,
                  {
                    id: itemKey,

                    transactionId:
                      transaction.id,

                    playerId:
                      player.playerId,

                    playerName:
                      player.playerName,

                    courtId:
                      transactionData.courtId ??
                      '',

                    courtName:
                      transaction.courtName ??
                      'Unknown court',

                    rateId,

                    rateName,

                    rateIds:
                      rateId
                        ? [rateId]
                        : [],

                    rateNames:
                      rateName
                        ? [rateName]
                        : [],

                    amount,

                    paymentMethod:
                      transaction.paymentMethod as
                        PaymentListItem['paymentMethod'],

                    status,

                    date:
                      transactionData
                        .transactionDate
                        ?.slice(0, 10) ??
                      new Date(
                        transaction.createdAt,
                      )
                        .toLocaleDateString(
                          'en-CA',
                        ),

                    createdAt:
                      transaction.createdAt,
                  },
                );

              },
            );

            result.push(
              ...groupedItems.values(),
            );

          },
        );


        return result;

      },
      [
        todaysTransactions,
        activeRates,
      ],
    );


  // ==========================================================
  // DISPLAY PAYMENT LIST
  // ==========================================================

  /**
   * End Open Play Session only
   * clears the current grid.
   *
   * Database records remain intact.
   */
  const paymentList =
    sessionEnded
      ? []
      : databasePaymentList;


  // ==========================================================
  // END OPEN PLAY SESSION
  // ==========================================================

  const handleEndOpenPlaySession =
    () => {

      if (
        unpaidCount > 0
      ) {

        setSubmitError(
          `Cannot end the session — ${unpaidCount} ${
            unpaidCount === 1
              ? 'player has'
              : 'players have'
          } an unpaid balance. Please collect payment before ending the session.`,
        );

        return;
      }


      if (
        !paymentList.length
      ) {
        setSessionEnded(
          true,
        );

        return;
      }


      setShowEndSessionModal(
        true,
      );

    };


  const confirmEndSession =
    () => {

      setSessionEnded(
        true,
      );


      setEditingId(
        null,
      );


      setSubmitMessage(
        'Open Play Session ended. The grid has been cleared. Database history is preserved.',
      );


      setSubmitError('');


      setShowEndSessionModal(
        false,
      );

    };


  // ==========================================================
  // PAYMENT TOTAL
  // ==========================================================

  const paymentListTotal =
    paymentList.reduce(
      (
        total,
        item,
      ) =>
        total +
        item.amount,

      0,
    );


  const unpaidCount =
    paymentList.filter(
      (item) =>
        item.status ===
        'UNPAID',
    ).length;


  // ==========================================================
  // LOADING / ERROR
  // ==========================================================

  const dataStillLoading =
    courtsLoading ||
    ratesLoading ||
    playersLoading ||
    transactionsLoading;


  const dataErrored =
    courtsErrored ||
    ratesErrored ||
    playersErrored ||
    transactionsErrored;


  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <div className="stack large-gap cashier-page">

      {/* ==================================================
          HEADER
          ================================================== */}

      <PageHeader
        title="Staff"
        subtitle="Fast walk-up checkout"
      />


      {/* ==================================================
          ERROR
          ================================================== */}

      {dataErrored ? (
        <div className="inline-error">
          Could not load courts,
          rates, players, or
          transactions from the
          server. Refresh the page
          or check your connection.
        </div>
      ) : null}


      {/* ==================================================
          LOADING
          ================================================== */}

      {dataStillLoading ? (
        <Card className="loading-shell small-shell">
          Loading checkout data…
        </Card>
      ) : null}


      {!dataStillLoading &&
      !dataErrored ? (
        <>

          {/* ==================================================
              CHECKOUT AREA
              ================================================== */}

          <form
            onSubmit={handleSubmit(
              onSubmit,
            )}
            className="cashier-grid cashier-checkout-grid"
            data-testid="cashier-form"
          >

            {/* ==================================================
                PLAYERS
                ================================================== */}

            <Card className="stack cashier-section-card cashier-players-card">

              <div className="toolbar-row">

                <h3>
                  Players
                </h3>


                <Button
                  type="button"
                  className="btn-ghost btn-small"
                  onClick={() =>
                    setShowQuickAdd(
                      (previous) =>
                        !previous,
                    )
                  }
                >
                  {showQuickAdd
                    ? 'Cancel'
                    : '+ New player'}
                </Button>

              </div>


              {/* QUICK ADD */}

              {showQuickAdd ? (
                <div
                  className="stack cashier-quick-add"
                  data-testid="quick-add-player"
                >

                  <input
                    className="field cashier-player-input"
                    placeholder="Player name"
                    autoComplete="off"
                    list="cashier-player-suggestions"
                    {...registerQuickAdd(
                      'fullName',
                    )}
                  />

                  <datalist id="cashier-player-suggestions">
                    {quickAddSuggestions.map(
                      (player) => (
                        <option
                          key={
                            player.id
                          }
                          value={
                            player.name
                          }
                        />
                      ),
                    )}
                  </datalist>

                  {matchedQuickAddPlayer ? (
                    <small className="muted">
                      Existing player found. Submit to select
                      {' '}
                      <strong>
                        {
                          matchedQuickAddPlayer.name
                        }
                      </strong>
                      {' '}
                      instead of creating a new record.
                    </small>
                  ) : null}


                  {quickAddErrors.fullName ? (
                    <small className="error-text">
                      {
                        quickAddErrors
                          .fullName
                          .message
                      }
                    </small>
                  ) : null}


                  <input
                    className="field cashier-player-input"
                    placeholder="Phone (optional)"
                    autoComplete="off"
                    {...registerQuickAdd(
                      'phone',
                    )}
                  />


                  <Button
                    type="button"
                    className="btn-small"
                    disabled={
                      quickAddSubmitting
                    }
                    onClick={() =>
                      void handleQuickAddSubmit(
                        onQuickAddSubmit,
                      )()
                    }
                  >
                    {quickAddSubmitting
                      ? 'Adding…'
                      : matchedQuickAddPlayer
                        ? 'Select existing player'
                      : 'Add & select player'}
                  </Button>

                </div>
              ) : null}


              {!activeRates.length ? (
                <small className="error-text">
                  No active rates
                  configured — ask an
                  admin to add a rate
                  before checking out.
                </small>
              ) : null}


              <div className="selected-list">

                {selectedPlayers.length ? (

                  selectedPlayers.map(
                    (
                      entry,
                    ) => {

                      const player =
                        players.find(
                          (
                            candidate,
                          ) =>
                            candidate.id ===
                            entry.playerId,
                        );


                      if (!player) {
                        return null;
                      }


                      return (
                        <div
                          key={
                            entry.playerId
                          }
                          className="selected-row"
                        >

                          <span className="selected-player-header">
                            <strong className="selected-player-name">
                              {player.name}
                            </strong>
                          </span>


                          <div className="player-rate-options">
                            {activeRates.map(
                              (
                                rate,
                              ) => (
                                <label
                                  key={
                                    rate.id
                                  }
                                  className={`player-rate-option ${
                                    entry.rateIds.includes(
                                      rate.id,
                                    )
                                      ? 'is-selected'
                                      : ''
                                  }`}
                                >
                                  <input
                                    type="checkbox"
                                    checked={entry.rateIds.includes(
                                      rate.id,
                                    )}
                                    onChange={() =>
                                      togglePlayerRate(
                                        entry.playerId,
                                        rate.id,
                                      )
                                    }
                                  />
                                  <span className="player-rate-label">
                                    <strong>
                                      {
                                        rate.name
                                      }
                                    </strong>
                                    <span>
                                      {formatCurrency(
                                        rate.amount,
                                      )}
                                    </span>
                                  </span>
                                </label>
                              ),
                            )}
                          </div>


                          <button
                            type="button"
                            className="link-btn"
                            onClick={() =>
                              removePlayer(
                                entry.playerId,
                              )
                            }
                          >
                            Remove
                          </button>

                        </div>
                      );

                    },
                  )

                ) : (

                  <p className="muted">
                    No players selected.
                  </p>

                )}

              </div>


              {errors.players ? (
                <small className="error-text">
                  {
                    errors.players
                      .message
                  }
                </small>
              ) : null}

            </Card>


            {/* ==================================================
                SESSION
                ================================================== */}

            <Card className="stack cashier-section-card cashier-session-card">

              <h3>
                Session
              </h3>


              {/* DATE */}

              <div>

                <label htmlFor="transactionDate">
                  Date
                </label>


                <input
                  id="transactionDate"
                  type="date"
                  className="field"
                  value={
                    currentDate
                  }
                  {...register(
                    'transactionDate',
                  )}
                  onChange={(
                    event,
                  ) => {

                    setValue(
                      'transactionDate',
                      event.target.value,
                      {
                        shouldValidate:
                          true,

                        shouldDirty:
                          true,
                      },
                    );

                  }}
                />


                {errors.transactionDate ? (
                  <small className="error-text">
                    {
                      errors
                        .transactionDate
                        .message
                    }
                  </small>
                ) : null}

              </div>


              {/* COURT */}

              <div>

                <label htmlFor="courtId">
                  Court
                </label>


                <select
                  id="courtId"
                  className="field"
                  value={
                    selectedCourtId
                  }
                  {...register(
                    'courtId',
                  )}
                  onChange={(
                    event,
                  ) => {

                    setValue(
                      'courtId',
                      event.target.value,
                      {
                        shouldValidate:
                          true,

                        shouldDirty:
                          true,
                      },
                    );

                  }}
                >

                  <option value="">
                    Select a court
                  </option>


                  {activeCourts.map(
                    (
                      court,
                    ) => (
                      <option
                        key={
                          court.id
                        }
                        value={
                          court.id
                        }
                      >
                        {
                          court.name
                        }
                      </option>
                    ),
                  )}

                </select>


                {errors.courtId ? (
                  <small className="error-text">
                    {
                      errors
                        .courtId
                        .message
                    }
                  </small>
                ) : null}


                {!activeCourts.length ? (
                  <small className="muted">
                    No courts available —
                    ask an admin to add
                    one.
                  </small>
                ) : null}

              </div>


              {/* PAYMENT METHOD */}

              <div>

                <label htmlFor="paymentMethod">
                  Payment method
                </label>


                <select
                  id="paymentMethod"
                  className="field"
                  value={
                    selectedPaymentMethod
                  }
                  {...register(
                    'paymentMethod',
                  )}
                  onChange={(
                    event,
                  ) => {

                    setValue(
                      'paymentMethod',
                      event.target.value as
                        CashierFormValues['paymentMethod'],
                      {
                        shouldValidate:
                          true,

                        shouldDirty:
                          true,
                      },
                    );

                  }}
                >

                  {Object.entries(
                    paymentMethodLabels,
                  ).map(
                    ([
                      value,
                      label,
                    ]) => (
                      <option
                        key={
                          value
                        }
                        value={
                          value
                        }
                      >
                        {label}
                      </option>
                    ),
                  )}

                </select>

              </div>

            </Card>


            {/* ==================================================
                REVIEW
                ================================================== */}

            <Card className="stack cashier-section-card cashier-review-card">

              <h3>
                Review
              </h3>


              <div className="summary-box">

                <span>
                  Estimated total
                </span>


                <strong>
                  {formatCurrency(
                    previewTotal,
                  )}
                </strong>


                <small>
                  Add the selected players
                  to the payment list before
                  confirming the transaction.
                </small>

              </div>


              {selectedCourt ? (
                <p className="muted">
                  Court:{' '}
                  {
                    selectedCourt.name
                  }
                </p>
              ) : null}


              {selectedPlayers.length ? (
                <p className="muted">
                  {selectedPlayers.length}{' '}
                  {selectedPlayers.length === 1
                    ? 'player'
                    : 'players'}{' '}
                  selected
                </p>
              ) : null}


              {submitError ? (
                <div className="inline-error">
                  {submitError}
                </div>
              ) : null}


              {submitMessage ? (
                <div className="inline-success">
                  {submitMessage}
                </div>
              ) : null}


              {/* ==================================================
                  ADD TO PAYMENT LIST
                  ================================================== */}

              <Button
                type="button"
                className="btn-ghost"
                disabled={
                  isAddingToList ||
                  selectedPlayers.length ===
                    0 ||
                  !selectedCourtId ||
                  !activeRates.length
                }
                onClick={() =>
                  void addToPaymentList()
                }
              >
                {isAddingToList
                  ? 'Adding…'
                  : 'Add to Payment List'}
              </Button>


              {/* ==================================================
                  CONFIRM TRANSACTION
                  ================================================== */}

              <Button
                type="submit"
                disabled={
                  isSubmitting ||
                  selectedPlayers.length ===
                    0 ||
                  !activeRates.length
                }
              >
                {isSubmitting
                  ? 'Confirming…'
                  : 'Confirm Transaction'}
              </Button>

            </Card>

          </form>


          {/* ==================================================
              TODAY'S PAYMENT LIST
              ================================================== */}

          <Card className="table-card cashier-payments-card">

            <div className="toolbar-row cashier-payments-toolbar">

              <div>

                <h3>
                  Today's Payment List
                </h3>


                <span className="muted">

                  {paymentList.length}{' '}

                  {paymentList.length === 1
                    ? 'player'
                    : 'players'}

                  {unpaidCount > 0
                    ? ` · ${unpaidCount} unpaid`
                    : ''}

                </span>

              </div>


              <div className="inline-actions">


                {/* ==================================================
                    END OPEN PLAY SESSION
                    ================================================== */}

                <Button
                  type="button"
                  className="btn-danger btn-small"
                  disabled={
                    unpaidCount > 0
                  }
                  title={
                    unpaidCount > 0
                      ? `${unpaidCount} unpaid ${
                          unpaidCount === 1
                            ? 'player'
                            : 'players'
                        } — collect payment first`
                      : undefined
                  }
                  onClick={
                    handleEndOpenPlaySession
                  }
                >
                  End Open Play Session
                </Button>

              </div>

            </div>


            {!paymentList.length ? (

              <div className="empty-state">

                <p className="muted">

                  {sessionEnded
                    ? 'Open Play Session has ended. The grid has been cleared. Database history is preserved.'
                    : 'No players found for today\'s transactions.'}

                </p>


                {sessionEnded ? (
                  <Button
                    type="button"
                    className="btn-small"
                    onClick={() => {

                      setSessionEnded(
                        false,
                      );

                      setSubmitMessage(
                        '',
                      );

                    }}
                  >
                    Start New Open Play Session
                  </Button>
                ) : null}

              </div>

            ) : (

              <div className="table-wrapper cashier-payment-table-wrapper">

                <table className="data-table">

                  <thead>

                    <tr>

                      <th>
                        #
                      </th>

                      <th>
                        Player
                      </th>

                      <th>
                        Court
                      </th>

                      <th>
                        Payment
                      </th>

                      <th>
                        Rates
                      </th>

                      <th>
                        Amount
                      </th>

                      <th>
                        Status
                      </th>

                      <th>
                        Action
                      </th>

                    </tr>

                  </thead>


                  <tbody>

                    {paymentList.map(
                      (
                        item,
                        index,
                      ) => {

                        const isEditing =
                          editingId ===
                          item.id;


                        if (
                          isEditing
                        ) {

                          return (
                            <tr
                              key={
                                item.id
                              }
                            >

                              <td>
                                {index + 1}
                              </td>


                              {/* PLAYER */}

                              <td>

                                <input
                                  type="text"
                                  className="field"
                                  value={
                                    editPlayerName
                                  }
                                  onChange={(
                                    event,
                                  ) =>
                                    setEditPlayerName(
                                      event.target.value,
                                    )
                                  }
                                  placeholder="Enter player name"
                                  autoComplete="off"
                                  autoCorrect="off"
                                  autoCapitalize="words"
                                  spellCheck={
                                    false
                                  }
                                />

                              </td>


                              {/* COURT */}

                              <td>

                                <select
                                  className="field"
                                  value={
                                    editCourtId
                                  }
                                  onChange={(
                                    event,
                                  ) =>
                                    setEditCourtId(
                                      event.target.value,
                                    )
                                  }
                                >

                                  {activeCourts.map(
                                    (
                                      court,
                                    ) => (
                                      <option
                                        key={
                                          court.id
                                        }
                                        value={
                                          court.id
                                        }
                                      >
                                        {
                                          court.name
                                        }
                                      </option>
                                    ),
                                  )}

                                </select>

                              </td>


                              {/* PAYMENT */}

                              <td>

                                <select
                                  className="field"
                                  value={
                                    editPaymentMethod
                                  }
                                  onChange={(
                                    event,
                                  ) =>
                                    setEditPaymentMethod(
                                      event
                                        .target
                                        .value as
                                        CashierFormValues['paymentMethod'],
                                    )
                                  }
                                >

                                  {Object.entries(
                                    paymentMethodLabels,
                                  ).map(
                                    ([
                                      value,
                                      label,
                                    ]) => (
                                      <option
                                        key={
                                          value
                                        }
                                        value={
                                          value
                                        }
                                      >
                                        {
                                          label
                                        }
                                      </option>
                                    ),
                                  )}

                                </select>

                              </td>


                              {/* RATE */}

                              <td>

                                <span className="muted">
                                  {item.rateNames.join(
                                    ', ',
                                  )}
                                </span>

                              </td>


                              {/* STATUS */}

                              <td>

                               <StatusBadge
                                 status={
                                   item.status
                                 }
                               />

                              </td>


                              {/* ACTION */}

                              <td>

                                <div className="inline-actions">

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
                                    className="link-btn"
                                    onClick={
                                      cancelEdit
                                    }
                                  >
                                    Cancel
                                  </button>

                                </div>

                              </td>

                            </tr>
                          );

                        }


                        return (
                          <tr
                            key={
                              item.id
                            }
                          >

                            <td>
                              {index + 1}
                            </td>


                            <td>

                              <strong>
                                {
                                  item.playerName
                                }
                              </strong>

                            </td>


                            <td>
                              {
                                item.courtName
                              }
                            </td>


                            <td>
                              {
                                paymentMethodLabels[
                                  item.paymentMethod
                                ] ??
                                item.paymentMethod
                              }
                            </td>


                            <td>

                              <span className="muted">
                                {item.rateNames.join(
                                  ', ',
                                )}
                              </span>

                            </td>


                            <td>

                              <strong>
                                {formatCurrency(
                                  item.amount,
                                )}
                              </strong>

                            </td>


                            <td>

                              <StatusBadge
                                status={
                                  item.status
                                }
                              />

                            </td>


                            <td>

                              <div className="inline-actions">

                                <button
                                  type="button"
                                  className="link-btn"
                                  onClick={() =>
                                    startEdit(
                                      item,
                                    )
                                  }
                                >
                                  Edit
                                </button>


                                {item.status ===
                                'UNPAID' ? (
                                  <Button
                                    type="button"
                                    className="btn-small"
                                    onClick={() => {
                                      setPayModalError(
                                        '',
                                      );

                                      setPayingItem(
                                        item,
                                      );
                                    }}
                                  >
                                    Pay
                                  </Button>
                                ) : null}

                              </div>

                            </td>

                          </tr>
                        );

                      },
                    )}

                  </tbody>


                  {/* TOTAL */}

                  <tfoot>

                    <tr>

                      <td
                        colSpan={7}
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
                            paymentListTotal,
                          )}
                        </strong>

                      </td>

                    </tr>

                  </tfoot>

                </table>

              </div>

            )}

          </Card>

        </>
      ) : null}


      {/* ==================================================
          PAY CONFIRMATION MODAL
          ================================================== */}

      <Modal
        open={payingItem !== null}
        onClose={() =>
          !isMarkingPaid &&
          setPayingItem(null)
        }
        title="Confirm Payment"
      >

        {payingItem ? (
          <>

            <p>
              Confirm payment for{' '}
              <strong>
                {payingItem.playerName}
              </strong>
              ?
            </p>


            <div className="summary-box">

              <span>
                Amount
              </span>

              <strong>
                {formatCurrency(
                  payingItem.amount,
                )}
              </strong>

              <span>
                Court
              </span>

              <span>
                {payingItem.courtName}
              </span>

              <span>
                Payment Method
              </span>

              <span>
                {paymentMethodLabels[
                  payingItem.paymentMethod
                ] ??
                  payingItem.paymentMethod}
              </span>

              <span>
                Rates
              </span>

              <span>
                {payingItem.rateNames.join(
                  ', ',
                )}
              </span>

            </div>


            {payModalError ? (
              <div className="inline-error">
                {payModalError}
              </div>
            ) : null}


            <div className="inline-actions">

              <Button
                type="button"
                disabled={
                  isMarkingPaid
                }
                onClick={() =>
                  void confirmPay()
                }
              >
                {isMarkingPaid
                  ? 'Processing…'
                  : 'Confirm Payment'}
              </Button>


              <button
                type="button"
                className="link-btn"
                disabled={
                  isMarkingPaid
                }
                onClick={() =>
                  setPayingItem(
                    null,
                  )
                }
              >
                Cancel
              </button>

            </div>

          </>
        ) : null}

      </Modal>


      {/* ==================================================
          END SESSION CONFIRMATION MODAL
          ================================================== */}

      <Modal
        open={showEndSessionModal}
        onClose={() =>
          setShowEndSessionModal(
            false,
          )
        }
        title="End Open Play Session?"
      >

        <p>
          This will clear the current grid list only.
          Your transactions will{' '}
          <strong>not</strong>{' '}
          be deleted from the database.
        </p>


        <div className="inline-actions">

          <Button
            type="button"
            className="btn-danger"
            onClick={confirmEndSession}
          >
            End Session
          </Button>


          <button
            type="button"
            className="link-btn"
            onClick={() =>
              setShowEndSessionModal(
                false,
              )
            }
          >
            Cancel
          </button>

        </div>

      </Modal>

    </div>
  );
}