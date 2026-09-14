import './expense-page.css';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';

import {
  expenseCategoriesApi,
  expensesApi,
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
import {
  expenseFormSchema,
  type ExpenseFormValues,
} from '../../schemas/forms';

const paymentMethodLabels: Record<
  ExpenseFormValues['paymentMethod'],
  string
> = {
  CASH: 'Cash',
  GCASH: 'GCash',
  BANK_TRANSFER: 'Bank transfer',
};

const getToday = () => {
  const now = new Date();

  return `${now.getFullYear()}-${String(
    now.getMonth() + 1,
  ).padStart(2, '0')}-${String(
    now.getDate(),
  ).padStart(2, '0')}`;
};

const getCurrentMonth = () => {
  return getToday().slice(0, 7);
};

const getExpenseDate = (value: string) => {
  const date = new Date(value);

  return `${date.getFullYear()}-${String(
    date.getMonth() + 1,
  ).padStart(2, '0')}-${String(
    date.getDate(),
  ).padStart(2, '0')}`;
};

const getExpenseMonth = (value: string) => {
  return getExpenseDate(value).slice(0, 7);
};

const formatMonth = (month: string) => {
  const [year, monthNumber] = month.split('-');

  const date = new Date(
    Number(year),
    Number(monthNumber) - 1,
    1,
  );

  return date.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });
};

const formatShortDate = (value: string) => {
  const date = new Date(value);

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
};

export function ExpensesPage() {
  const { user } = useAuth();
  const canRemoveExpenses =
    user?.role === 'ADMIN';
  const queryClient = useQueryClient();

  const [selectedMonth, setSelectedMonth] =
    useState(getCurrentMonth());

  const [currentPage, setCurrentPage] =
    useState(1);

  const [showForm, setShowForm] =
    useState(false);

  const [editingId, setEditingId] =
    useState<string | null>(null);

  const [formError, setFormError] =
    useState('');
  const [removeExpenseId, setRemoveExpenseId] =
    useState<string | null>(null);
  const [removeExpenseTitle, setRemoveExpenseTitle] =
    useState('');
  const [removeError, setRemoveError] =
    useState('');

  /*
   * ================================
   * EXPENSES QUERY
   * ================================
   */

  const {
    data: expenses = [],
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['expenses'],
    queryFn: expensesApi.list,
  });

  /*
   * ================================
   * CATEGORIES QUERY
   * ================================
   */

  const {
    data: categories = [],
  } = useQuery({
    queryKey: ['expense-categories'],
    queryFn: expenseCategoriesApi.list,
  });

  /*
   * ================================
   * FORM
   * ================================
   */

  const {
    register,
    handleSubmit,
    reset,
    formState: {
      errors,
      isSubmitting,
    },
  } = useForm<ExpenseFormValues>({
    resolver: zodResolver(
      expenseFormSchema,
    ),

    defaultValues: {
      categoryId: '',
      description: '',
      amount: '',
      expenseDate: getToday(),
      paymentMethod: 'CASH',
      notes: '',
    },
  });

  /*
   * ================================
   * CREATE EXPENSE
   * ================================
   */

  const {
    mutateAsync: createExpense,
  } = useMutation({
    mutationFn: expensesApi.create,

    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ['expenses'],
      });
    },
  });

  /*
   * ================================
   * UPDATE EXPENSE
   * ================================
   */

  const {
    mutateAsync: updateExpense,
  } = useMutation({
    mutationFn: ({
      id,
      input,
    }: {
      id: string;
      input: Partial<ExpenseFormValues>;
    }) =>
      expensesApi.update(
        id,
        input,
      ),

    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ['expenses'],
      });
    },
  });

  const {
    mutateAsync: removeExpense,
    isPending: isRemovingExpense,
  } = useMutation({
    mutationFn: expensesApi.remove,
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ['expenses'],
      });
    },
  });

  /*
   * ================================
   * AVAILABLE MONTHS
   * ================================
   *
   * Build the list directly from
   * backend expense records.
   */

  const availableMonths = useMemo(() => {
    const months = new Set<string>();

    expenses.forEach((expense) => {
      months.add(
        getExpenseMonth(
          expense.createdAt,
        ),
      );
    });

    /*
     * Always keep the current month
     * available.
     */

    months.add(getCurrentMonth());

    return Array.from(months).sort(
      (a, b) =>
        b.localeCompare(a),
    );
  }, [expenses]);

  /*
   * ================================
   * DATE FILTER
   * ================================
   */

  const handleDateFilter = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const value = event.target.value;

    if (!value) {
      setSelectedMonth(
        getCurrentMonth(),
      );
      setCurrentPage(1);
      return;
    }

    setSelectedMonth(value);

    /*
     * Find where the selected month
     * is located in the pagination.
     */

    const monthIndex =
      availableMonths.indexOf(value);

    if (monthIndex >= 0) {
      setCurrentPage(
        monthIndex + 1,
      );
    }
  };

  /*
   * ================================
   * MONTH PAGINATION
   * ================================
   *
   * One month per page.
   */

  const totalPages =
    availableMonths.length || 1;

  /*
   * Keep page within valid range.
   */

  const safePage = Math.min(
    currentPage,
    totalPages,
  );

  /*
   * Month shown on the current page.
   */

  const pageMonth =
    availableMonths[
      safePage - 1
    ] ?? selectedMonth;

  /*
   * ================================
   * MONTH EXPENSES
   * ================================
   */

  const monthlyExpenses = useMemo(() => {
    return expenses
      .filter(
        (expense) =>
          getExpenseMonth(
            expense.createdAt,
          ) === pageMonth,
      )
      .sort(
        (a, b) =>
          new Date(
            b.createdAt,
          ).getTime() -
          new Date(
            a.createdAt,
          ).getTime(),
      );
  }, [
    expenses,
    pageMonth,
  ]);

  /*
   * ================================
   * MONTHLY TOTAL
   * ================================
   */

  const monthlyTotal = useMemo(() => {
    return monthlyExpenses.reduce(
      (total, expense) =>
        total +
        Number(expense.amount),
      0,
    );
  }, [monthlyExpenses]);

  /*
   * ================================
   * CREATE FORM
   * ================================
   */

  const openCreateForm = () => {
    setEditingId(null);

    reset({
      categoryId:
        categories[0]?.id ?? '',

      description: '',

      amount: '',

      expenseDate:
        getToday(),

      paymentMethod: 'CASH',

      notes: '',
    });

    setFormError('');
    setShowForm(true);
  };

  /*
   * ================================
   * EDIT FORM
   * ================================
   */

  const openEditForm = (
    expense: (typeof expenses)[number],
  ) => {
    setEditingId(
      expense.id,
    );

    const matchingCategory =
      categories.find(
        (category) =>
          category.name ===
          expense.category,
      );

    reset({
      categoryId:
        matchingCategory?.id ??
        categories[0]?.id ??
        '',

      description:
        expense.title,

      amount:
        Number(
          expense.amount,
        ).toFixed(2),

      expenseDate:
        getExpenseDate(
          expense.createdAt,
        ),

      paymentMethod:
        expense.paymentMethod,

      notes: '',
    });

    setFormError('');
    setShowForm(true);
  };

  /*
   * ================================
   * CLOSE FORM
   * ================================
   */

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
    setFormError('');
  };

  const openRemoveModal = (
    id: string,
    title: string,
  ) => {
    if (!canRemoveExpenses) {
      return;
    }
    setRemoveExpenseId(id);
    setRemoveExpenseTitle(title);
    setRemoveError('');
  };

  const closeRemoveModal = () => {
    setRemoveExpenseId(null);
    setRemoveExpenseTitle('');
    setRemoveError('');
  };

  const confirmRemoveExpense =
    async () => {
      if (
        !canRemoveExpenses ||
        !removeExpenseId
      ) {
        return;
      }

      setRemoveError('');

      try {
        await removeExpense(
          removeExpenseId,
        );
        closeRemoveModal();
      } catch (error) {
        setRemoveError(
          error instanceof Error
            ? error.message
            : 'Unable to remove this expense.',
        );
      }
    };

  /*
   * ================================
   * SUBMIT
   * ================================
   */

  const onSubmit = async (
    values: ExpenseFormValues,
  ) => {
    setFormError('');

    const input = {
      ...values,
      notes:
        values.notes || undefined,
    };

    try {
      if (editingId) {
        await updateExpense({
          id: editingId,
          input,
        });
      } else {
        await createExpense(
          input,
        );
      }

      closeForm();
    } catch (error) {
      setFormError(
        error instanceof Error
          ? error.message
          : 'Unable to save this expense.',
      );
    }
  };

  /*
   * ================================
   * PREVIOUS
   * ================================
   */

  const handlePrevious = () => {
    if (safePage <= 1) {
      return;
    }

    const nextPage =
      safePage - 1;

    setCurrentPage(
      nextPage,
    );

    const nextMonth =
      availableMonths[
        nextPage - 1
      ];

    if (nextMonth) {
      setSelectedMonth(
        nextMonth,
      );
    }
  };

  /*
   * ================================
   * NEXT
   * ================================
   */

  const handleNext = () => {
    if (
      safePage >=
      totalPages
    ) {
      return;
    }

    const nextPage =
      safePage + 1;

    setCurrentPage(
      nextPage,
    );

    const nextMonth =
      availableMonths[
        nextPage - 1
      ];

    if (nextMonth) {
      setSelectedMonth(
        nextMonth,
      );
    }
  };

  /*
   * ================================
   * RENDER
   * ================================
   */

  return (
    <div className="stack large-gap">

      {/* =====================================
          PAGE HEADER
          ===================================== */}

      <PageHeader
        title="Expenses"
        subtitle="Track operating costs and monthly spending"
      />

      {/* =====================================
          FILTER CARD
          ===================================== */}

      <Card className="expenses-filter-card">

        <div className="expenses-filter-left">

          <div className="expenses-filter-field">

            <label
              htmlFor="expense-date-filter"
            >
              Date
            </label>

            <input
              id="expense-date-filter"
              type="month"
              value={selectedMonth}
              onChange={
                handleDateFilter
              }
              className="field expenses-date-input"
            />

          </div>

        </div>

        <Button
          type="button"
          onClick={
            showForm &&
            !editingId
              ? closeForm
              : openCreateForm
          }
        >
          {showForm &&
          !editingId
            ? 'Cancel'
            : 'Add expense'}
        </Button>

      </Card>

      {/* =====================================
          CREATE / EDIT FORM
          ===================================== */}

      {showForm ? (
        <Card className="stack expenses-form-card">

          <div>
            <h3>
              {editingId
                ? 'Edit expense'
                : 'New expense'}
            </h3>

            <p className="expenses-form-subtitle">
              {editingId
                ? 'Update the expense information below.'
                : 'Enter the details for the new expense.'}
            </p>
          </div>

          {!categories.length ? (
            <div className="inline-error">
              No expense categories exist yet.
              Create one on the Expense
              Categories page first.
            </div>
          ) : (
            <form
              onSubmit={handleSubmit(
                onSubmit,
              )}
              className="stack"
            >

              {/* CATEGORY */}

              <div>
                <label
                  htmlFor="expense-category"
                >
                  Category
                </label>

                <select
                  id="expense-category"
                  className="field"
                  {...register(
                    'categoryId',
                  )}
                >
                  {categories.map(
                    (category) => (
                      <option
                        key={
                          category.id
                        }
                        value={
                          category.id
                        }
                      >
                        {
                          category.name
                        }
                      </option>
                    ),
                  )}
                </select>

                {errors.categoryId ? (
                  <small className="error-text">
                    {
                      errors
                        .categoryId
                        .message
                    }
                  </small>
                ) : null}
              </div>

              {/* DESCRIPTION */}

              <div>
                <label
                  htmlFor="expense-description"
                >
                  Description
                </label>

                <input
                  id="expense-description"
                  className="field"
                  placeholder="Electricity"
                  {...register(
                    'description',
                  )}
                />

                {errors.description ? (
                  <small className="error-text">
                    {
                      errors
                        .description
                        .message
                    }
                  </small>
                ) : null}
              </div>

              {/* AMOUNT */}

              <div>
                <label
                  htmlFor="expense-amount"
                >
                  Amount (₱)
                </label>

                <input
                  id="expense-amount"
                  type="number"
                  step="0.01"
                  min="0"
                  className="field"
                  placeholder="2500.00"
                  {...register(
                    'amount',
                  )}
                />

                {errors.amount ? (
                  <small className="error-text">
                    {
                      errors
                        .amount
                        .message
                    }
                  </small>
                ) : null}
              </div>

              {/* DATE */}

              <div>
                <label
                  htmlFor="expense-date"
                >
                  Date
                </label>

                <input
                  id="expense-date"
                  type="date"
                  className="field"
                  {...register(
                    'expenseDate',
                  )}
                />

                {errors.expenseDate ? (
                  <small className="error-text">
                    {
                      errors
                        .expenseDate
                        .message
                    }
                  </small>
                ) : null}
              </div>

              {/* PAYMENT METHOD */}

              <div>
                <label
                  htmlFor="expense-paymentMethod"
                >
                  Payment method
                </label>

                <select
                  id="expense-paymentMethod"
                  className="field"
                  {...register(
                    'paymentMethod',
                  )}
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

              {/* NOTES */}

              <div>
                <label
                  htmlFor="expense-notes"
                >
                  Notes (optional)
                </label>

                <textarea
                  id="expense-notes"
                  className="field textarea"
                  {...register(
                    'notes',
                  )}
                />
              </div>

              {/* ERROR */}

              {formError ? (
                <div className="inline-error">
                  {formError}
                </div>
              ) : null}

              {/* BUTTON */}

              <div className="expenses-form-actions">

                <Button
                  type="submit"
                  disabled={
                    isSubmitting
                  }
                >
                  {isSubmitting
                    ? 'Saving…'
                    : editingId
                      ? 'Save changes'
                      : 'Create expense'}
                </Button>

                <Button
                  type="button"
                  className="btn-secondary"
                  onClick={
                    closeForm
                  }
                >
                  Cancel
                </Button>

              </div>

            </form>
          )}

        </Card>
      ) : null}

      {/* =====================================
          ERROR
          ===================================== */}

      {isError ? (
        <Card className="stack">

          <div className="inline-error">
            Could not load expenses
            from the server.
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
      ) : null}

      {/* =====================================
          LOADING
          ===================================== */}

      {isLoading ? (
        <Card className="loading-shell small-shell">
          Loading expenses…
        </Card>
      ) : null}

      {/* =====================================
          MONTHLY EXPENSE CARD
          ===================================== */}

      {!isLoading &&
      !isError ? (
        <Card className="expenses-month-card">

          {/* MONTH HEADER */}

          <div className="expenses-month-header">

            <div>
              <h2>
                {formatMonth(
                  pageMonth,
                )}
              </h2>

              <p>
                {
                  monthlyExpenses.length
                }{' '}
                {monthlyExpenses.length ===
                1
                  ? 'expense'
                  : 'expenses'}
              </p>
            </div>

            <div className="expenses-month-total">
              {formatCurrency(
                monthlyTotal,
              )}
            </div>

          </div>

          {/* =================================
              EXPENSE GRID
              ================================= */}

          {monthlyExpenses.length ? (
            <>

              <div className="expenses-grid">

                {/* HEADER */}

                <div className="expenses-grid-header">

                  <div>
                    Date
                  </div>

                  <div>
                    Description
                  </div>

                  <div className="expenses-grid-amount">
                    Amount
                  </div>

                  <div className="expenses-grid-action">
                    Action
                  </div>

                </div>

                {/* ROWS */}

                {monthlyExpenses.map(
                  (expense) => (
                    <div
                      className="expenses-grid-row"
                      key={
                        expense.id
                      }
                    >

                      <div className="expenses-date">
                        {formatShortDate(
                          expense.createdAt,
                        )}
                      </div>

                      <div className="expenses-description">
                        <span className="expenses-description-title">
                          {
                            expense.title
                          }
                        </span>

                        <span className="expenses-description-category">
                          {
                            expense.category
                          }
                        </span>
                      </div>

                      <div className="expenses-amount">
                        {formatCurrency(
                          expense.amount,
                        )}
                      </div>

                      <div className="expenses-action">
                        <div className="inline-actions">
                          <Button
                            type="button"
                            className="btn-small"
                            onClick={() =>
                              openEditForm(
                                expense,
                              )
                            }
                          >
                            Edit
                          </Button>
                          {canRemoveExpenses ? (
                            <Button
                              type="button"
                              className="btn-small btn-danger"
                              onClick={() =>
                                openRemoveModal(
                                  expense.id,
                                  expense.title,
                                )
                              }
                            >
                              Remove
                            </Button>
                          ) : null}
                        </div>
                      </div>

                    </div>
                  ),
                )}

              </div>

              {/* =================================
                  MONTHLY TOTAL
                  ================================= */}

              <div className="expenses-month-footer">

                <span>
                  Monthly Total
                </span>

                <strong>
                  {formatCurrency(
                    monthlyTotal,
                  )}
                </strong>

              </div>

            </>
          ) : (
            <div className="expenses-empty-month">

              <EmptyState
                title={`No expenses for ${formatMonth(
                  pageMonth,
                )}`}
                description="Create an expense entry to begin tracking spending for this month."
              />

            </div>
          )}

        </Card>
      ) : null}

      {/* =====================================
          PAGINATION
          ===================================== */}

      {!isLoading &&
      !isError ? (
        <Card className="expenses-pagination-card">

          <div className="expenses-pagination-info">
            Showing{' '}
            {monthlyExpenses.length
              ? '1'
              : '0'}{' '}
            month
            {monthlyExpenses.length !==
            1
              ? 's'
              : ''}{' '}
            of{' '}
            {availableMonths.length}
          </div>

          <div className="expenses-pagination">

            <Button
              type="button"
              className="expenses-pagination-button btn-secondary"
              disabled={
                safePage <= 1
              }
              onClick={
                handlePrevious
              }
            >
              Previous
            </Button>

            <div className="expenses-page-number">
              Page{' '}
              <strong>
                {safePage}
              </strong>{' '}
              of{' '}
              <strong>
                {totalPages}
              </strong>
            </div>

            <Button
              type="button"
              className="expenses-pagination-button btn-secondary"
              disabled={
                safePage >=
                totalPages
              }
              onClick={
                handleNext
              }
            >
              Next
            </Button>

          </div>

        </Card>
      ) : null}

      <Modal
        open={
          canRemoveExpenses &&
          !!removeExpenseId
        }
        onClose={() => {
          if (!isRemovingExpense) {
            closeRemoveModal();
          }
        }}
        title="Remove expense?"
      >
        <div className="stack">
          <p>
            Are you sure you want to remove{' '}
            <strong>
              {removeExpenseTitle}
            </strong>
            ?
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
              disabled={isRemovingExpense}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="btn-danger"
              onClick={() =>
                void confirmRemoveExpense()
              }
              disabled={isRemovingExpense}
            >
              {isRemovingExpense
                ? 'Removing…'
                : 'Remove'}
            </Button>
          </div>
        </div>
      </Modal>

    </div>
  );
}