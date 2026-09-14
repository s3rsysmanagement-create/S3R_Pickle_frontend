import './courts-page.css';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';

import { ratesApi } from '../../api/resources';
import {
  Button,
  Card,
  EmptyState,
  PageHeader,
} from '../../components/ui';

import { formatCurrency } from '../../lib/format';

import {
  rateFormSchema,
  type RateFormValues,
} from '../../schemas/forms';


export function RatesPage() {
  const queryClient = useQueryClient();


  // =========================================================
  // PAGE STATE
  // =========================================================

  const [showForm, setShowForm] = useState(false);

  const [editingId, setEditingId] =
    useState<string | null>(null);

  const [formError, setFormError] =
    useState('');

  const [deleteError, setDeleteError] =
    useState('');

  /*
   * Delete confirmation modal
   */

  const [deleteRateId, setDeleteRateId] =
    useState<string | null>(null);

  const [deleteRateName, setDeleteRateName] =
    useState('');


  // =========================================================
  // LOAD RATES
  // =========================================================

  const {
    data: rates = [],
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['rates'],
    queryFn: ratesApi.list,
  });


  // =========================================================
  // FORM
  // =========================================================

  const {
    register,
    handleSubmit,
    reset,
    formState: {
      errors,
      isSubmitting,
    },
  } = useForm<RateFormValues>({
    resolver: zodResolver(rateFormSchema),

    defaultValues: {
      name: '',
      amount: '',
      isActive: true,
    },
  });


  // =========================================================
  // CREATE RATE
  // =========================================================

  const {
    mutateAsync: createRate,
  } = useMutation({
    mutationFn: ratesApi.create,

    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ['rates'],
      });
    },
  });


  // =========================================================
  // UPDATE RATE
  // =========================================================

  const {
    mutateAsync: updateRate,
  } = useMutation({
    mutationFn: ({
      id,
      input,
    }: {
      id: string;
      input: Partial<RateFormValues>;
    }) =>
      ratesApi.update(id, input),

    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ['rates'],
      });
    },
  });


  // =========================================================
  // DELETE RATE
  // =========================================================

  const {
    mutateAsync: removeRate,
    isPending: isDeleting,
  } = useMutation({
    mutationFn: ratesApi.remove,

    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ['rates'],
      });
    },
  });


  // =========================================================
  // OPEN CREATE FORM
  // =========================================================

  const openCreateForm = () => {
    setEditingId(null);

    reset({
      name: '',
      amount: '',
      isActive: true,
    });

    setFormError('');
    setDeleteError('');

    setShowForm(true);
  };


  // =========================================================
  // OPEN EDIT FORM
  // =========================================================

  const openEditForm = (
    rateId: string,
    name: string,
    amount: number,
    isActive: boolean,
  ) => {
    setEditingId(rateId);

    reset({
      name,
      amount: amount.toFixed(2),
      isActive,
    });

    setFormError('');
    setDeleteError('');

    setShowForm(true);
  };


  // =========================================================
  // CLOSE FORM
  // =========================================================

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
    setFormError('');

    reset({
      name: '',
      amount: '',
      isActive: true,
    });
  };


  // =========================================================
  // SUBMIT RATE
  // =========================================================

  const onSubmit = async (
    values: RateFormValues,
  ) => {
    setFormError('');

    try {
      if (editingId) {
        await updateRate({
          id: editingId,
          input: values,
        });
      } else {
        await createRate(values);
      }

      closeForm();
    } catch (error) {
      setFormError(
        error instanceof Error
          ? error.message
          : 'Unable to save this rate.',
      );
    }
  };


  // =========================================================
  // OPEN DELETE MODAL
  // =========================================================

  const handleDelete = (
    rateId: string,
    rateName: string,
  ) => {
    setDeleteError('');

    setDeleteRateId(rateId);
    setDeleteRateName(rateName);
  };


  // =========================================================
  // CANCEL DELETE
  // =========================================================

  const cancelDelete = () => {
    if (isDeleting) {
      return;
    }

    setDeleteRateId(null);
    setDeleteRateName('');
    setDeleteError('');
  };


  // =========================================================
  // CONFIRM DELETE
  // =========================================================

  const confirmDelete = async () => {
    if (!deleteRateId) {
      return;
    }

    setDeleteError('');

    try {
      await removeRate(deleteRateId);

      /*
       * If the rate being deleted is currently
       * being edited, close the edit form.
       */

      if (editingId === deleteRateId) {
        closeForm();
      }

      /*
       * Close delete modal.
       */

      setDeleteRateId(null);
      setDeleteRateName('');
    } catch (error) {
      /*
       * Keep the modal open so the user can
       * see the error returned by the backend.
       */

      setDeleteError(
        error instanceof Error
          ? error.message
          : 'Unable to remove this rate.',
      );
    }
  };


  // =========================================================
  // RENDER
  // =========================================================

  return (
    <div className="stack large-gap">


      {/* =====================================================
          PAGE HEADER
          ===================================================== */}

      <PageHeader
        title="Rates"
        subtitle="Manage pricing used at checkout"
      />


      {/* =====================================================
          ADD RATE BUTTON
          ===================================================== */}

      <div className="toolbar-row">

        <Button
          type="button"
          onClick={() => {
            if (showForm && !editingId) {
              closeForm();
            } else {
              openCreateForm();
            }
          }}
        >
          {showForm && !editingId
            ? 'Cancel'
            : '+ Add rate'}
        </Button>

      </div>


      {/* =====================================================
          RATE FORM
          ===================================================== */}

      {showForm ? (
        <Card className="stack">

          <h3>
            {editingId
              ? 'Edit rate'
              : 'New rate'}
          </h3>


          <form
            onSubmit={handleSubmit(onSubmit)}
            className="stack"
          >

            {/* RATE NAME */}

            <div>

              <label htmlFor="rate-name">
                Name
              </label>

              <input
                id="rate-name"
                className="field"
                {...register('name')}
              />

              {errors.name ? (
                <small className="error-text">
                  {errors.name.message}
                </small>
              ) : null}

            </div>


            {/* AMOUNT */}

            <div>

              <label htmlFor="rate-amount">
                Amount (₱)
              </label>

              <input
                id="rate-amount"
                className="field"
                placeholder="35.00"
                {...register('amount')}
              />

              {errors.amount ? (
                <small className="error-text">
                  {errors.amount.message}
                </small>
              ) : null}

            </div>


            {/* ACTIVE */}

            <label className="checkbox-row">

              <input
                type="checkbox"
                {...register('isActive')}
              />

              Active

            </label>


            {/* FORM ERROR */}

            {formError ? (
              <div className="inline-error">
                {formError}
              </div>
            ) : null}


            {/* SAVE */}

            <Button
              type="submit"
              disabled={isSubmitting}
            >
              {isSubmitting
                ? 'Saving…'
                : editingId
                  ? 'Save changes'
                  : 'Create rate'}
            </Button>

          </form>

        </Card>
      ) : null}


      {/* =====================================================
          LOAD ERROR
          ===================================================== */}

      {isError ? (
        <Card className="stack">

          <div className="inline-error">
            Could not load rates from the server.
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
          DELETE ERROR OUTSIDE MODAL
          ===================================================== */}

      {deleteError && !deleteRateId ? (
        <Card className="stack">

          <div className="inline-error">
            {deleteError}
          </div>

          <Button
            type="button"
            className="btn-small"
            onClick={() => setDeleteError('')}
          >
            Dismiss
          </Button>

        </Card>
      ) : null}


      {/* =====================================================
          LOADING
          ===================================================== */}

      {isLoading ? (
        <Card className="loading-shell small-shell">
          Loading rates…
        </Card>
      ) : null}


      {/* =====================================================
          RATES TABLE
          ===================================================== */}

      {!isLoading && !isError ? (

        rates.length ? (

          <Card className="table-card">

            <table className="data-table">

              <thead>

                <tr>

                  <th>
                    Name
                  </th>

                  <th>
                    Code
                  </th>

                  <th>
                    Amount
                  </th>

                  <th>
                    Active
                  </th>

                  <th>
                    Action
                  </th>

                </tr>

              </thead>


              <tbody>

                {rates.map((rate) => (

                  <tr key={rate.id}>

                    {/* NAME */}

                    <td>
                      {rate.name}
                    </td>


                    {/* CODE */}

                    <td>
                      {rate.description}
                    </td>


                    {/* AMOUNT */}

                    <td>
                      {formatCurrency(rate.amount)}
                    </td>


                    {/* ACTIVE */}

                    <td>
                      {rate.active
                        ? 'Yes'
                        : 'No'}
                    </td>


                    {/* ACTION */}

                    <td>

                      <div className="inline-actions">

                        {/* EDIT */}

                        <Button
                          type="button"
                          className="btn-small"
                          onClick={() =>
                            openEditForm(
                              rate.id,
                              rate.name,
                              rate.amount,
                              rate.active,
                            )
                          }
                          disabled={isDeleting}
                        >
                          Edit
                        </Button>


                        {/* REMOVE */}

                        <Button
                          type="button"
                          className="btn-small btn-danger"
                          onClick={() =>
                            handleDelete(
                              rate.id,
                              rate.name,
                            )
                          }
                          disabled={isDeleting}
                        >
                          Remove
                        </Button>

                      </div>

                    </td>

                  </tr>

                ))}

              </tbody>

            </table>

          </Card>

        ) : (

          <EmptyState
            title="No rates yet"
            description="Add a rate so staff can charge players at checkout."
          />

        )

      ) : null}


      {/* =====================================================
          DELETE CONFIRMATION MODAL
          ===================================================== */}

      {deleteRateId ? (

        <div
          className="modal-overlay"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              cancelDelete();
            }
          }}
        >

          <div
            className="delete-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-rate-title"
            aria-describedby="delete-rate-description"
          >

            {/* WARNING ICON */}

            <div
              className="delete-modal-icon"
              aria-hidden="true"
            >
              <span>!</span>
            </div>


            {/* CONTENT */}

            <div className="delete-modal-content">

              <h3 id="delete-rate-title">
                Remove Rate?
              </h3>

              <p id="delete-rate-description">
                Are you sure you want to remove{' '}
                <strong>
                  "{deleteRateName}"
                </strong>
                ?
              </p>

              <p className="delete-modal-warning">
                This action cannot be undone.
              </p>


              {/* DELETE ERROR */}

              {deleteError ? (
                <div className="delete-modal-error">
                  {deleteError}
                </div>
              ) : null}

            </div>


            {/* ACTIONS */}

            <div className="delete-modal-actions">

              <Button
                type="button"
                className="btn-cancel"
                onClick={cancelDelete}
                disabled={isDeleting}
              >
                Cancel
              </Button>


              <Button
                type="button"
                className="btn-danger"
                onClick={() => void confirmDelete()}
                disabled={isDeleting}
              >
                {isDeleting
                  ? 'Removing…'
                  : 'Remove Rate'}
              </Button>

            </div>

          </div>

        </div>

      ) : null}

    </div>
  );
}
