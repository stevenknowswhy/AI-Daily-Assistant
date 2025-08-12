import { z } from 'zod';

// Bill frequency options
export const billFrequencyOptions = [
  'weekly',
  'monthly', 
  'quarterly',
  'yearly',
  'one-time'
] as const;

// Bill type options
export const billTypeOptions = [
  'bill',
  'subscription',
  'loan',
  'insurance',
  'utility',
  'rent',
  'other'
] as const;

// Reminder preference options
export const reminderPreferenceOptions = [
  '1-day',
  '3-days',
  '1-week',
  '2-weeks',
  'none'
] as const;

// Bill category options
export const billCategoryOptions = [
  'utilities',
  'housing',
  'transportation',
  'food',
  'healthcare',
  'entertainment',
  'insurance',
  'debt',
  'savings',
  'other'
] as const;

/**
 * Schema for creating/updating bills and subscriptions
 */
export const billSchema = z.object({
  name: z.string()
    .min(1, 'Bill name is required')
    .max(100, 'Bill name must be less than 100 characters')
    .trim(),
  
  amount: z.number()
    .positive('Amount must be greater than 0')
    .max(999999.99, 'Amount must be less than $1,000,000')
    .multipleOf(0.01, 'Amount must have at most 2 decimal places'),
  
  dueDate: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Due date must be in YYYY-MM-DD format')
    .refine((date) => {
      const parsedDate = new Date(date);
      return !isNaN(parsedDate.getTime());
    }, 'Invalid date format'),
  
  frequency: z.enum(billFrequencyOptions).default('monthly'),
  
  type: z.enum(billTypeOptions).default('bill'),
  
  category: z.enum(billCategoryOptions).default('other'),
  
  reminderPreference: z.enum(reminderPreferenceOptions).default('1-day'),
  
  description: z.string()
    .max(500, 'Description must be less than 500 characters')
    .optional(),
  
  isActive: z.boolean().default(true),
  
  // Auto-pay settings
  isAutoPay: z.boolean().default(false),
  autoPayAccount: z.string().optional(),
  
  // Notification preferences
  emailReminders: z.boolean().default(true),
  smsReminders: z.boolean().default(false),
});

/**
 * Schema for updating bills (all fields optional except ID)
 */
export const updateBillSchema = billSchema.partial().extend({
  id: z.string().min(1, 'Bill ID is required for updates'),
});

/**
 * Schema for bill filtering and search
 */
export const billFilterSchema = z.object({
  type: z.enum(billTypeOptions).optional(),
  category: z.enum(billCategoryOptions).optional(),
  frequency: z.enum(billFrequencyOptions).optional(),
  isActive: z.boolean().optional(),
  dueDateFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  dueDateTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  amountMin: z.number().positive().optional(),
  amountMax: z.number().positive().optional(),
  search: z.string().max(100).optional(),
});

/**
 * Schema for bill dashboard summary
 */
export const billSummarySchema = z.object({
  totalMonthlyAmount: z.number(),
  upcomingBillsCount: z.number(),
  overdueBillsCount: z.number(),
  totalYearlyAmount: z.number(),
  categoryBreakdown: z.record(z.enum(billCategoryOptions), z.number()),
});

// TypeScript types inferred from schemas
export type Bill = z.infer<typeof billSchema>;
export type UpdateBill = z.infer<typeof updateBillSchema>;
export type BillFilter = z.infer<typeof billFilterSchema>;
export type BillSummary = z.infer<typeof billSummarySchema>;

// Validation helpers
export const validateAmount = (amount: string): boolean => {
  const num = parseFloat(amount);
  return !isNaN(num) && num > 0 && num <= 999999.99;
};

export const validateDueDate = (date: string): boolean => {
  const parsedDate = new Date(date);
  return !isNaN(parsedDate.getTime()) && parsedDate >= new Date();
};

export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
};

export const calculateNextDueDate = (currentDueDate: string, frequency: typeof billFrequencyOptions[number]): string => {
  const date = new Date(currentDueDate);
  
  switch (frequency) {
    case 'weekly':
      date.setDate(date.getDate() + 7);
      break;
    case 'monthly':
      date.setMonth(date.getMonth() + 1);
      break;
    case 'quarterly':
      date.setMonth(date.getMonth() + 3);
      break;
    case 'yearly':
      date.setFullYear(date.getFullYear() + 1);
      break;
    case 'one-time':
      return currentDueDate; // No next due date for one-time bills
  }
  
  return date.toISOString().split('T')[0];
};
