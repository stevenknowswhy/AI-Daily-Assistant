export type BillFrequency = 'monthly' | 'yearly' | 'weekly' | 'one-time';
export type BillType = 'bill' | 'subscription';
export type ReminderPreference = 'no-reminder' | 'on-due-date' | '1-day' | '2-days' | '3-days';

export interface Bill {
  id: string;
  name: string;
  amount: number;
  dueDate: string; // ISO date string
  frequency: BillFrequency;
  category: string;
  type: BillType;
  reminderPreference?: ReminderPreference;
}

