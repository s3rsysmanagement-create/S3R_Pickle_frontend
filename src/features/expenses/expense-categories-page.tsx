import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { expenseCategoriesApi } from '../../api/resources';
import { Button, Card, EmptyState, Modal, PageHeader } from '../../components/ui';
import { useAuth } from '../auth/use-auth';
import { expenseCategoryFormSchema, type ExpenseCategoryFormValues } from '../../schemas/forms';

export function ExpenseCategoriesPage() {
  const { user } = useAuth();
  const canRemoveCategories = user?.role === 'ADMIN';
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formError, setFormError] = useState('');
  const [removeCategoryId, setRemoveCategoryId] = useState<string | null>(null);
  const [removeCategoryName, setRemoveCategoryName] = useState('');
  const [removeError, setRemoveError] = useState('');

  const {
    data: categories = [],
    isLoading,
    isError,
    refetch,
  } = useQuery({ queryKey: ['expense-categories'], queryFn: expenseCategoriesApi.list });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ExpenseCategoryFormValues>({
    resolver: zodResolver(expenseCategoryFormSchema),
    defaultValues: { name: '', isActive: true },
  });

  const { mutateAsync: createCategory } = useMutation({
    mutationFn: expenseCategoriesApi.create,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['expense-categories'] });
    },
  });

  const { mutateAsync: updateCategory } = useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<ExpenseCategoryFormValues> }) =>
      expenseCategoriesApi.update(id, input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['expense-categories'] });
    },
  });

  const {
    mutateAsync: removeCategory,
    isPending: isRemovingCategory,
  } = useMutation({
    mutationFn: expenseCategoriesApi.remove,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['expense-categories'] });
    },
  });

  const openCreateForm = () => {
    setEditingId(null);
    reset({ name: '', isActive: true });
    setFormError('');
    setShowForm(true);
  };

  const openEditForm = (id: string, name: string, isActive: boolean) => {
    setEditingId(id);
    reset({ name, isActive });
    setFormError('');
    setShowForm(true);
  };

  const onSubmit = async (values: ExpenseCategoryFormValues) => {
    setFormError('');
    try {
      if (editingId) {
        await updateCategory({ id: editingId, input: values });
      } else {
        await createCategory(values);
      }
      setShowForm(false);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Unable to save this category.');
    }
  };

  const openRemoveModal = (id: string, name: string) => {
    if (!canRemoveCategories) {
      return;
    }
    setRemoveCategoryId(id);
    setRemoveCategoryName(name);
    setRemoveError('');
  };

  const closeRemoveModal = () => {
    setRemoveCategoryId(null);
    setRemoveCategoryName('');
    setRemoveError('');
  };

  const confirmRemoveCategory = async () => {
    if (!canRemoveCategories || !removeCategoryId) {
      return;
    }

    setRemoveError('');

    try {
      await removeCategory(removeCategoryId);
      closeRemoveModal();
    } catch (error) {
      setRemoveError(error instanceof Error ? error.message : 'Unable to remove this category.');
    }
  };

  return (
    <div className="stack large-gap">
      <PageHeader title="Expense Categories" subtitle="Organize how spending is grouped" />

      <div className="toolbar-row">
        <Button type="button" onClick={openCreateForm}>
          {showForm && !editingId ? 'Cancel' : '+ Add category'}
        </Button>
      </div>

      {showForm ? (
        <Card className="stack">
          <h3>{editingId ? 'Edit category' : 'New category'}</h3>
          <form onSubmit={handleSubmit(onSubmit)} className="stack">
            <div>
              <label htmlFor="category-name">Name</label>
              <input id="category-name" className="field" {...register('name')} />
              {errors.name ? <small className="error-text">{errors.name.message}</small> : null}
            </div>
            <label className="checkbox-row">
              <input type="checkbox" {...register('isActive')} />
              Active
            </label>
            {formError ? <div className="inline-error">{formError}</div> : null}
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving…' : editingId ? 'Save changes' : 'Create category'}
            </Button>
          </form>
        </Card>
      ) : null}

      {isError ? (
        <Card className="stack">
          <div className="inline-error">Could not load expense categories from the server.</div>
          <Button type="button" className="btn-small" onClick={() => void refetch()}>Retry</Button>
        </Card>
      ) : null}

      {isLoading ? <Card className="loading-shell small-shell">Loading categories…</Card> : null}

      {!isLoading && !isError ? (
        categories.length ? (
          <Card className="table-card">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Active</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {categories.map((category) => (
                  <tr key={category.id}>
                    <td>{category.name}</td>
                    <td>{category.isActive ? 'Yes' : 'No'}</td>
                    <td>
                      <div className="inline-actions">
                        <Button
                          type="button"
                          className="btn-small"
                          onClick={() => openEditForm(category.id, category.name, category.isActive)}
                        >
                          Edit
                        </Button>
                        {canRemoveCategories ? (
                          <Button
                            type="button"
                            className="btn-small btn-danger"
                            onClick={() => openRemoveModal(category.id, category.name)}
                          >
                            Remove
                          </Button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        ) : (
          <EmptyState title="No categories yet" description="Add a category so expenses can be grouped." />
        )
      ) : null}

      <Modal
        open={canRemoveCategories && !!removeCategoryId}
        onClose={() => {
          if (!isRemovingCategory) {
            closeRemoveModal();
          }
        }}
        title="Remove expense category?"
      >
        <div className="stack">
          <p>
            Are you sure you want to remove <strong>{removeCategoryName}</strong>?
          </p>
          {removeError ? <div className="inline-error">{removeError}</div> : null}
          <div className="inline-actions">
            <Button type="button" className="btn-ghost" onClick={closeRemoveModal} disabled={isRemovingCategory}>
              Cancel
            </Button>
            <Button
              type="button"
              className="btn-danger"
              onClick={() => void confirmRemoveCategory()}
              disabled={isRemovingCategory}
            >
              {isRemovingCategory ? 'Removing…' : 'Remove'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
