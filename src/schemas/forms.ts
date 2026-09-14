import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('Enter a valid email address.'),
  password: z.string().min(6, 'Password must be at least 6 characters.'),
});

export type LoginFormValues = z.infer<typeof loginSchema>;

export const paymentMethodSchema = z.enum(['CASH', 'GCASH','BANK_TRANSFER']);

export const transactionPlayerSchema = z.object({
  playerId: z.string().min(1),
  rateIds: z.array(z.string().min(1)).min(1, 'Select at least one rate for this player.'),
});

export const cashierSchema = z.object({
  courtId: z.string().min(1, 'Select a court.'),
  transactionDate: z.string().min(1, 'Choose a date.'),
  startTime: z.string().min(1, 'Choose a start time.'),
  durationHours: z.enum(['1', '2', '3']),
  paymentMethod: paymentMethodSchema,
  players: z.array(transactionPlayerSchema).min(1, 'Add at least one player.'),
});

export type CashierFormValues = z.infer<typeof cashierSchema>;

export const playerFormSchema = z.object({
  fullName: z.string().min(2, 'Enter the player name.').max(200),
  phone: z.string().max(30).optional().or(z.literal('')),
});

export type PlayerFormValues = z.infer<typeof playerFormSchema>;

export const courtFormSchema = z.object({
  name: z.string().min(2, 'Enter a court name.').max(200),
  isActive: z.boolean().optional(),
});

export type CourtFormValues = z.infer<typeof courtFormSchema>;

export const rateFormSchema = z.object({
  name: z.string().min(2, 'Enter a rate name.').max(200),
  amount: z
    .string()
    .min(1, 'Enter an amount.')
    .regex(/^\d+(\.\d{1,2})?$/, 'Use a plain number like 35 or 35.00.'),
  isActive: z.boolean().optional(),
});

export type RateFormValues = z.infer<typeof rateFormSchema>;

export const userFormSchema = z.object({
  email: z.string().email('Enter a valid email address.'),
  password: z.string().min(8, 'Password must be at least 8 characters.').optional().or(z.literal('')),
  firstName: z.string().min(1, 'Enter a first name.').max(100),
  lastName: z.string().min(1, 'Enter a last name.').max(100),
  role: z.enum(['ADMIN', 'CASHIER']),
  isActive: z.boolean().optional(),
});

export type UserFormValues = z.infer<typeof userFormSchema>;

export const expenseCategoryFormSchema = z.object({
  name: z.string().min(2, 'Enter a category name.').max(200),
  isActive: z.boolean().optional(),
});

export type ExpenseCategoryFormValues = z.infer<typeof expenseCategoryFormSchema>;

export const expenseFormSchema = z.object({
  categoryId: z.string().min(1, 'Select a category.'),
  description: z.string().min(2, 'Describe the expense.').max(500),
  amount: z
    .string()
    .min(1, 'Enter an amount.')
    .regex(/^\d+(\.\d{1,2})?$/, 'Use a plain number like 35 or 35.00.'),
  expenseDate: z.string().min(1, 'Choose a date.'),
  paymentMethod: paymentMethodSchema,
  notes: z.string().max(1000).optional().or(z.literal('')),
});

export type ExpenseFormValues = z.infer<typeof expenseFormSchema>;
