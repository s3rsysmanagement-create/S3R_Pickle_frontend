import './courts-page.css';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';

import { courtsApi } from '../../api/resources';
import {
  Button,
  Card,
  EmptyState,
  PageHeader,
} from '../../components/ui';

import {
  courtFormSchema,
  type CourtFormValues,
} from '../../schemas/forms';


export function CourtsPage() {
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
   * Delete confirmation modal state.
   *
   * When deleteCourtId is not null,
   * the confirmation modal is displayed.
   */

  const [deleteCourtId, setDeleteCourtId] =
    useState<string | null>(null);

  const [deleteCourtName, setDeleteCourtName] =
    useState('');


  // =========================================================
  // LOAD COURTS
  // =========================================================

  const {
    data: courts = [],
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['courts'],
    queryFn: courtsApi.list,
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
  } = useForm<CourtFormValues>({
    resolver: zodResolver(courtFormSchema),

    defaultValues: {
      name: '',
      isActive: true,
    },
  });


  // =========================================================
  // CREATE COURT
  // =========================================================

  const {
    mutateAsync: createCourt,
  } = useMutation({
    mutationFn: courtsApi.create,

    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ['courts'],
      });
    },
  });


  // =========================================================
  // UPDATE COURT
  // =========================================================

  const {
    mutateAsync: updateCourt,
  } = useMutation({
    mutationFn: ({
      id,
      input,
    }: {
      id: string;
      input: Partial<CourtFormValues>;
    }) =>
      courtsApi.update(id, input),

    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ['courts'],
      });
    },
  });


  // =========================================================
  // DELETE COURT
  // =========================================================

  const {
    mutateAsync: removeCourt,
    isPending: isDeleting,
  } = useMutation({
    mutationFn: courtsApi.remove,

    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ['courts'],
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
    courtId: string,
    name: string,
    isActive: boolean,
  ) => {
    setEditingId(courtId);

    reset({
      name,
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
      isActive: true,
    });
  };


  // =========================================================
  // SUBMIT COURT
  // =========================================================

  const onSubmit = async (
    values: CourtFormValues,
  ) => {
    setFormError('');

    try {
      const input = {
        name: values.name,
        isActive: values.isActive,
      };

      if (editingId) {
        await updateCourt({
          id: editingId,
          input,
        });
      } else {
        await createCourt(input);
      }

      closeForm();
    } catch (error) {
      setFormError(
        error instanceof Error
          ? error.message
          : 'Unable to save this court.',
      );
    }
  };


  // =========================================================
  // OPEN DELETE CONFIRMATION
  // =========================================================

  const handleDelete = (
    courtId: string,
    courtName: string,
  ) => {
    setDeleteError('');

    setDeleteCourtId(courtId);
    setDeleteCourtName(courtName);
  };


  // =========================================================
  // CLOSE DELETE CONFIRMATION
  // =========================================================

  const cancelDelete = () => {
    if (isDeleting) {
      return;
    }

    setDeleteCourtId(null);
    setDeleteCourtName('');
  };


  // =========================================================
  // CONFIRM DELETE
  // =========================================================

  const confirmDelete = async () => {
    if (!deleteCourtId) {
      return;
    }

    setDeleteError('');

    try {
      await removeCourt(deleteCourtId);

      /*
       * If the court being deleted is currently
       * being edited, close the edit form.
       */

      if (editingId === deleteCourtId) {
        closeForm();
      }

      /*
       * Close confirmation modal.
       */

      setDeleteCourtId(null);
      setDeleteCourtName('');
    } catch (error) {
      /*
       * Keep the modal open if deletion fails.
       *
       * This allows the user to see the backend
       * error message.
       */

      setDeleteError(
        error instanceof Error
          ? error.message
          : 'Unable to remove this court.',
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
        title="Courts"
        subtitle="Manage facility courts"
      />


      {/* =====================================================
          ADD COURT BUTTON
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
            : '+ Add court'}
        </Button>

      </div>


      {/* =====================================================
          COURT FORM
          ===================================================== */}

      {showForm ? (
        <Card className="stack">

          <h3>
            {editingId
              ? 'Edit court'
              : 'New court'}
          </h3>


          <form
            onSubmit={handleSubmit(onSubmit)}
            className="stack"
          >

            {/* NAME */}

            <div>

              <label htmlFor="court-name">
                Name
              </label>

              <input
                id="court-name"
                className="field"
                {...register('name')}
              />

              {errors.name ? (
                <small className="error-text">
                  {errors.name.message}
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


            {/* SAVE BUTTON */}

            <Button
              type="submit"
              disabled={isSubmitting}
            >
              {isSubmitting
                ? 'Saving…'
                : editingId
                  ? 'Save changes'
                  : 'Create court'}
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
            Could not load courts from the server.
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
          DELETE ERROR
          ===================================================== */}

      {deleteError && !deleteCourtId ? (
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
          Loading courts…
        </Card>
      ) : null}


      {/* =====================================================
          COURTS TABLE
          ===================================================== */}

      {!isLoading && !isError ? (

        courts.length ? (

          <Card className="table-card">

            <table className="data-table">

              <thead>

                <tr>

                  <th>
                    Name
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

                {courts.map((court) => (

                  <tr key={court.id}>

                    {/* COURT NAME */}

                    <td>
                      {court.name}
                    </td>


                    {/* STATUS */}

                    <td>

                      {court.isActive ? (

                        <span className="status-badge status-active">
                          Active
                        </span>

                      ) : (

                        <span className="status-badge status-inactive">
                          Inactive
                        </span>

                      )}

                    </td>


                    {/* ACTIONS */}

                    <td>

                      <div className="inline-actions">

                        {/* EDIT */}

                        <Button
                          type="button"
                          className="btn-small"
                          onClick={() =>
                            openEditForm(
                              court.id,
                              court.name,
                              court.isActive,
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
                              court.id,
                              court.name,
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
            title="No courts yet"
            description="Add a court to make it available for checkout."
          />

        )

      ) : null}


      {/* =====================================================
          DELETE CONFIRMATION MODAL
          ===================================================== */}

      {deleteCourtId ? (

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
            aria-labelledby="delete-court-title"
            aria-describedby="delete-court-description"
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

              <h3 id="delete-court-title">
                Remove Court?
              </h3>

              <p id="delete-court-description">
                Are you sure you want to remove{' '}
                <strong>
                  "{deleteCourtName}"
                </strong>
                ?
              </p>

              <p className="delete-modal-warning">
                This action cannot be undone.
              </p>


              {/* BACKEND ERROR */}

              {deleteError ? (
                <div className="delete-modal-error">
                  {deleteError}
                </div>
              ) : null}

            </div>


            {/* ACTION BUTTONS */}

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
                  : 'Remove Court'}
              </Button>

            </div>

          </div>

        </div>

      ) : null}

    </div>
  );
}

