import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { usersApi } from '../../api/resources';
import { Button, Card, EmptyState, PageHeader } from '../../components/ui';
import { userFormSchema, type UserFormValues } from '../../schemas/forms';

export function UsersPage() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formError, setFormError] = useState('');

  const { data: users = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['users'],
    queryFn: usersApi.list,
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<UserFormValues>({
    resolver: zodResolver(userFormSchema),
    defaultValues: { email: '', password: '', firstName: '', lastName: '', role: 'CASHIER', isActive: true },
  });

  const { mutateAsync: createUser } = useMutation({
    mutationFn: usersApi.create,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });

  const { mutateAsync: updateUser } = useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<UserFormValues> }) => usersApi.update(id, input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });

  const openCreateForm = () => {
    setEditingId(null);
    reset({ email: '', password: '', firstName: '', lastName: '', role: 'CASHIER', isActive: true });
    setFormError('');
    setShowForm(true);
  };

  const openEditForm = (id: string, values: Omit<UserFormValues, 'password'>) => {
    setEditingId(id);
    reset({ ...values, password: '' });
    setFormError('');
    setShowForm(true);
  };

  const onSubmit = async (values: UserFormValues) => {
    setFormError('');
    try {
      if (editingId) {
        const { password, ...rest } = values;
        await updateUser({
          id: editingId,
          input: {
            ...rest,
            ...(password ? { password } : {}),
          },
        });
      } else {
        if (!values.password) {
          setFormError('Password is required to create a new user.');
          return;
        }
        await createUser({ ...values, password: values.password });
      }
      setShowForm(false);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Unable to save this user.');
    }
  };

  return (
    <div className="stack large-gap">
      <PageHeader title="Users" subtitle="Manage admin and staff accounts" />

      <div className="toolbar-row">
        <Button type="button" onClick={openCreateForm}>
          {showForm && !editingId ? 'Cancel' : '+ Add user'}
        </Button>
      </div>

      {showForm ? (
        <Card className="stack">
          <h3>{editingId ? 'Edit user' : 'New user'}</h3>
          <form onSubmit={handleSubmit(onSubmit)} className="stack">
            <div>
              <label htmlFor="user-email">Email</label>
              <input id="user-email" className="field" {...register('email')} />
              {errors.email ? <small className="error-text">{errors.email.message}</small> : null}
            </div>
            <div>
              <label htmlFor="user-password">{editingId ? 'New password (optional)' : 'Password'}</label>
              <input id="user-password" type="password" className="field" {...register('password')} />
              {errors.password ? <small className="error-text">{errors.password.message}</small> : null}
              {editingId ? <small className="muted">Leave blank to keep the current password.</small> : null}
            </div>
            <div>
              <label htmlFor="user-firstName">First name</label>
              <input id="user-firstName" className="field" {...register('firstName')} />
              {errors.firstName ? <small className="error-text">{errors.firstName.message}</small> : null}
            </div>
            <div>
              <label htmlFor="user-lastName">Last name</label>
              <input id="user-lastName" className="field" {...register('lastName')} />
              {errors.lastName ? <small className="error-text">{errors.lastName.message}</small> : null}
            </div>
            <div>
              <label htmlFor="user-role">Role</label>
              <select id="user-role" className="field" {...register('role')}>
                <option value="ADMIN">Admin</option>
                <option value="CASHIER">Staff</option>
              </select>
            </div>
            <label className="checkbox-row">
              <input type="checkbox" {...register('isActive')} />
              Active
            </label>
            {formError ? <div className="inline-error">{formError}</div> : null}
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving…' : editingId ? 'Save changes' : 'Create user'}
            </Button>
          </form>
        </Card>
      ) : null}

      {isError ? (
        <Card className="stack">
          <div className="inline-error">Could not load users from the server.</div>
          <Button type="button" className="btn-small" onClick={() => void refetch()}>Retry</Button>
        </Card>
      ) : null}

      {isLoading ? <Card className="loading-shell small-shell">Loading users…</Card> : null}

      {!isLoading && !isError ? (
        users.length ? (
          <Card className="table-card">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Active</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {users.map((managedUser) => (
                  <tr key={managedUser.id}>
                    <td>{managedUser.firstName} {managedUser.lastName}</td>
                    <td>{managedUser.email}</td>
                    <td>{managedUser.role.name === 'ADMIN' ? 'Admin' : 'Staff'}</td>
                    <td>{managedUser.isActive ? 'Yes' : 'No'}</td>
                    <td>
                      <Button
                        type="button"
                        className="btn-small"
                        onClick={() =>
                          openEditForm(managedUser.id, {
                            email: managedUser.email,
                            firstName: managedUser.firstName,
                            lastName: managedUser.lastName,
                            role: managedUser.role.name,
                            isActive: managedUser.isActive,
                          })
                        }
                      >
                        Edit
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        ) : (
          <EmptyState title="No users yet" description="Add an admin or staff account to get started." />
        )
      ) : null}
    </div>
  );
}
