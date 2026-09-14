import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Navigate, useNavigate } from 'react-router-dom';

import { Button, Card, PageHeader } from '../../components/ui';
import { loginSchema, type LoginFormValues } from '../../schemas/forms';
import { useAuth } from './use-auth';

export function LoginPage() {
  const navigate = useNavigate();
  const { login, user } = useAuth();
  const [submitError, setSubmitError] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: 'admin@pickleball.local',
      password: 'Password123!',
    },
  });

  if (user) {
    return <Navigate to={user.role === 'ADMIN' ? '/dashboard' : '/cashier'} replace />;
  }

  const onSubmit = async (values: LoginFormValues) => {
    setSubmitError('');

    try {
      const currentUser = await login(values.email, values.password);
      navigate(currentUser.role === 'ADMIN' ? '/dashboard' : '/cashier', { replace: true });
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Login failed. Please try again.');
    }
  };

  return (
    <main className="auth-shell">
      <div className="auth-content">
        <div className="auth-page-header">
          <PageHeader title="S3R Dinkers" />
        </div>
        <Card className="auth-card">
          <form onSubmit={handleSubmit(onSubmit)} className="stack" data-testid="login-form">
            <div>
              <label htmlFor="email">Email</label>
              <input id="email" className="field" aria-invalid={Boolean(errors.email)} {...register('email')} />
              {errors.email ? <small className="error-text">{errors.email.message}</small> : null}
            </div>

            <div>
              <label htmlFor="password">Password</label>
              <input id="password" type="password" className="field" aria-invalid={Boolean(errors.password)} {...register('password')} />
              {errors.password ? <small className="error-text">{errors.password.message}</small> : null}
            </div>

            {submitError ? <div className="inline-error">{submitError}</div> : null}

            <Button type="submit" disabled={isSubmitting} data-testid="login-submit">
              {isSubmitting ? 'Signing in…' : 'Sign in'}
            </Button>
          </form>
        </Card>
      </div>
    </main>
  );
}
