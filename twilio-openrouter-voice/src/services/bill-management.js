/**
 * Bill Management Service
 * ======================
 * 
 * Manages user bills and subscriptions with due date tracking,
 * recurrence patterns, and integration with daily briefing system.
 */

import { createClient } from '@supabase/supabase-js';
import { logger } from '../utils/logger.js';

class BillManagementService {
  constructor() {
    // Initialize Supabase client
    this.supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY
    );

    logger.info('BillManagementService initialized', {
      supabaseUrl: process.env.SUPABASE_URL?.substring(0, 30) + '...',
      hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY
    });
  }

  /**
   * Convert reminder preference to days before
   */
  convertReminderPreferenceToDays(reminderPreference) {
    const mapping = {
      'no-reminder': 0,
      'on-due-date': 0,
      '1-day': 1,
      '2-days': 2,
      '3-days': 3
    };
    return mapping[reminderPreference] || 1;
  }

  /**
   * Convert days before to reminder preference
   */
  convertDaysToReminderPreference(reminderDaysBefore) {
    const mapping = {
      0: 'on-due-date',
      1: '1-day',
      2: '2-days',
      3: '3-days'
    };
    return mapping[reminderDaysBefore] || '1-day';
  }

  /**
   * Add a new bill or subscription
   */
  async addBill(userId, billData) {
    try {
      const {
        name,
        amount,
        dueDate,
        recurrenceType = 'monthly',
        recurrenceInterval = 1,
        category = 'other',
        description = '',
        reminderDaysBefore = 3,
        reminderPreference,
        autoPay = false
      } = billData;

      // Convert reminderPreference to reminderDaysBefore if provided
      const finalReminderDays = reminderPreference !== undefined
        ? this.convertReminderPreferenceToDays(reminderPreference)
        : reminderDaysBefore;

      logger.info('Bill reminder days calculation', {
        reminderPreference,
        reminderDaysBefore,
        finalReminderDays,
        userId,
        billName: name
      });

      const { data, error } = await this.supabase
        .from('user_bills_subscriptions')
        .insert({
          user_id: userId,
          name,
          amount,
          due_date: dueDate,
          recurrence_type: recurrenceType,
          recurrence_interval: recurrenceInterval,
          category,
          description,
          reminder_days_before: finalReminderDays,
          auto_pay: autoPay
        })
        .select()
        .single();

      if (error) {
        logger.error('Error adding bill', {
          userId,
          error: error.message,
          billName: name
        });
        throw error;
      }

      logger.info('Bill added successfully', {
        userId,
        billId: data.id,
        billName: name,
        dueDate,
        amount
      });

      return data;
    } catch (error) {
      logger.error('Failed to add bill', {
        userId,
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  /**
   * Get bills due within specified days
   */
  async getBillsDueSoon(userId, daysAhead = 7) {
    try {
      const today = new Date().toISOString().split('T')[0];
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + daysAhead);
      const futureDateStr = futureDate.toISOString().split('T')[0];

      const { data, error } = await this.supabase
        .from('user_bills_subscriptions')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)
        .gte('due_date', today)
        .lte('due_date', futureDateStr)
        .order('due_date', { ascending: true });

      if (error) {
        logger.error('Error fetching bills due soon', {
          userId,
          error: error.message,
          daysAhead
        });
        throw error;
      }

      // Calculate days until due for each bill
      const billsWithDaysUntilDue = data.map(bill => ({
        ...bill,
        daysUntilDue: Math.ceil((new Date(bill.due_date) - new Date()) / (1000 * 60 * 60 * 24))
      }));

      logger.info('Retrieved bills due soon', {
        userId,
        billCount: data.length,
        daysAhead
      });

      return billsWithDaysUntilDue;
    } catch (error) {
      logger.error('Failed to get bills due soon', {
        userId,
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  /**
   * Get all active bills for a user
   */
  async getUserBills(userId) {
    try {
      const { data, error } = await this.supabase
        .from('user_bills_subscriptions')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)
        .order('due_date', { ascending: true });

      if (error) {
        logger.error('Error fetching user bills', {
          userId,
          error: error.message
        });
        throw error;
      }

      logger.info('Retrieved user bills', {
        userId,
        billCount: data.length
      });

      // Convert database format to frontend format
      return data.map(bill => ({
        ...bill,
        reminderPreference: this.convertDaysToReminderPreference(bill.reminder_days_before || 1)
      }));
    } catch (error) {
      logger.error('Failed to get user bills', {
        userId,
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  /**
   * Update an existing bill or subscription
   */
  async updateBill(billId, billData) {
    try {
      const {
        name,
        amount,
        dueDate,
        recurrenceType = 'monthly',
        recurrenceInterval = 1,
        category = 'other',
        description = '',
        reminderDaysBefore = 3,
        reminderPreference,
        autoPay = false
      } = billData;

      // Convert reminderPreference to reminderDaysBefore if provided
      const finalReminderDays = reminderPreference !== undefined
        ? this.convertReminderPreferenceToDays(reminderPreference)
        : reminderDaysBefore;

      const { data, error } = await this.supabase
        .from('user_bills_subscriptions')
        .update({
          name,
          amount,
          due_date: dueDate,
          recurrence_type: recurrenceType,
          recurrence_interval: recurrenceInterval,
          category,
          description,
          reminder_days_before: finalReminderDays,
          auto_pay: autoPay,
          updated_at: new Date().toISOString()
        })
        .eq('id', billId)
        .eq('is_active', true)
        .select()
        .single();

      if (error) {
        logger.error('Error updating bill', {
          billId,
          error: error.message,
          billName: name
        });
        throw error;
      }

      logger.info('Bill updated successfully', {
        billId,
        billName: name,
        dueDate,
        amount
      });

      return data;
    } catch (error) {
      logger.error('Failed to update bill', {
        billId,
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  /**
   * Delete a bill or subscription
   */
  async deleteBill(billId) {
    try {
      const { data, error } = await this.supabase
        .from('user_bills_subscriptions')
        .update({
          is_active: false,
          updated_at: new Date().toISOString()
        })
        .eq('id', billId)
        .select()
        .single();

      if (error) {
        logger.error('Error deleting bill', {
          billId,
          error: error.message
        });
        throw error;
      }

      logger.info('Bill deleted successfully', {
        billId,
        billName: data.name
      });

      return data;
    } catch (error) {
      logger.error('Failed to delete bill', {
        billId,
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  /**
   * Mark a bill as paid and calculate next due date
   */
  async markBillPaid(billId, paymentDate = null) {
    try {
      const paymentDateStr = paymentDate || new Date().toISOString().split('T')[0];

      // Get the current bill
      const { data: bill, error: fetchError } = await this.supabase
        .from('user_bills_subscriptions')
        .select('*')
        .eq('id', billId)
        .eq('is_active', true)
        .single();

      if (fetchError || !bill) {
        throw new Error(`Bill not found: ${billId}`);
      }

      // Calculate next due date
      const nextDueDate = this.calculateNextDueDate(
        bill.due_date,
        bill.recurrence_type,
        bill.recurrence_interval
      );

      let updateData;
      if (nextDueDate) {
        // Recurring bill - update due date
        updateData = {
          due_date: nextDueDate,
          updated_at: new Date().toISOString()
        };
      } else {
        // One-time bill - deactivate
        updateData = {
          is_active: false,
          updated_at: new Date().toISOString()
        };
      }

      const { data, error } = await this.supabase
        .from('user_bills_subscriptions')
        .update(updateData)
        .eq('id', billId)
        .select()
        .single();

      if (error) {
        logger.error('Error marking bill as paid', {
          billId,
          error: error.message
        });
        throw error;
      }

      logger.info('Bill marked as paid', {
        billId,
        billName: bill.name,
        oldDueDate: bill.due_date,
        newDueDate: nextDueDate,
        isRecurring: !!nextDueDate
      });

      return data;
    } catch (error) {
      logger.error('Failed to mark bill as paid', {
        billId,
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  /**
   * Calculate next due date based on recurrence pattern
   */
  calculateNextDueDate(currentDueDate, recurrenceType, recurrenceInterval = 1) {
    const current = new Date(currentDueDate);
    
    switch (recurrenceType) {
      case 'daily':
        current.setDate(current.getDate() + recurrenceInterval);
        break;
      case 'weekly':
        current.setDate(current.getDate() + (7 * recurrenceInterval));
        break;
      case 'monthly':
        current.setMonth(current.getMonth() + recurrenceInterval);
        break;
      case 'quarterly':
        current.setMonth(current.getMonth() + (3 * recurrenceInterval));
        break;
      case 'yearly':
        current.setFullYear(current.getFullYear() + recurrenceInterval);
        break;
      case 'one-time':
        return null; // One-time bills don't recur
      default:
        throw new Error(`Invalid recurrence type: ${recurrenceType}`);
    }

    return current.toISOString().split('T')[0];
  }

  /**
   * Get user briefing preferences
   */
  async getUserBriefingPreferences(userId) {
    try {
      const { data, error } = await this.supabase
        .from('user_briefing_preferences')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        logger.error('Error fetching briefing preferences', {
          userId,
          error: error.message
        });

        // If table doesn't exist, fall back to defaults
        if (error.code === '42P01') { // Table doesn't exist
          logger.info('Preferences table not found, using defaults', { userId });
          return this.getDefaultPreferences(userId);
        }
        throw error;
      }

      // Return default preferences if none exist
      const preferences = data || this.getDefaultPreferences(userId);

      logger.info('Retrieved briefing preferences', {
        userId,
        hasCustomPreferences: !!data
      });

      return preferences;
    } catch (error) {
      logger.error('Failed to get briefing preferences', {
        userId,
        error: error.message,
        stack: error.stack
      });

      // Fall back to defaults on any error
      return this.getDefaultPreferences(userId);
    }
  }

  /**
   * Get default briefing preferences
   */
  getDefaultPreferences(userId) {
    return {
      user_id: userId,
      preferred_time: '08:00:00',
      timezone: 'America/Los_Angeles',
      include_emails: true,
      include_calendar: true,
      include_bills: true,
      max_emails_to_mention: 5,
      only_important_emails: false,
      bill_reminder_days: 3,
      is_active: true
    };
  }

  /**
   * Update user briefing preferences
   */
  async updateBriefingPreferences(userId, preferences) {
    try {
      const { data, error } = await this.supabase
        .from('user_briefing_preferences')
        .upsert({
          user_id: userId,
          ...preferences,
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        logger.error('Error updating briefing preferences', {
          userId,
          error: error.message
        });
        throw error;
      }

      logger.info('Briefing preferences updated', {
        userId,
        preferences: Object.keys(preferences)
      });

      return data;
    } catch (error) {
      logger.error('Failed to update briefing preferences', {
        userId,
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  /**
   * Create or update daily briefing status
   */
  async createBriefingStatus(userId, briefingData) {
    try {
      const today = new Date().toISOString().split('T')[0];

      const { data, error } = await this.supabase
        .from('daily_briefing_status')
        .upsert({
          user_id: userId,
          briefing_date: today,
          ...briefingData,
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        logger.error('Error creating briefing status', {
          userId,
          error: error.message,
          errorCode: error.code
        });

        // If table doesn't exist, log but don't fail
        if (error.code === '42P01') { // Table doesn't exist
          logger.info('Briefing status table not found, skipping status save', { userId });
          return { mock: true, user_id: userId, briefing_date: today };
        }
        throw error;
      }

      logger.info('Briefing status created/updated', {
        userId,
        briefingDate: today,
        isCompleted: briefingData.is_completed
      });

      return data;
    } catch (error) {
      logger.error('Failed to create briefing status', {
        userId,
        error: error.message,
        stack: error.stack
      });

      // Return mock data to prevent system failure
      logger.info('Returning mock briefing status to prevent failure', { userId });
      return { mock: true, user_id: userId, briefing_date: new Date().toISOString().split('T')[0] };
    }
  }

  /**
   * Check if daily briefing was already completed today
   */
  async isBriefingCompletedToday(userId) {
    try {
      const today = new Date().toISOString().split('T')[0];

      const { data, error } = await this.supabase
        .from('daily_briefing_status')
        .select('is_completed, completion_timestamp')
        .eq('user_id', userId)
        .eq('briefing_date', today)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        logger.error('Error checking briefing status', {
          userId,
          error: error.message
        });
        // If table doesn't exist, fall back to mock mode
        if (error.code === '42P01') { // Table doesn't exist
          logger.info('Briefing status table not found, using mock mode', { userId });
          return false;
        }
        throw error;
      }

      const isCompleted = data?.is_completed || false;
      logger.info('Briefing status checked', {
        userId,
        isCompleted,
        completionTime: data?.completion_timestamp
      });

      return isCompleted;
    } catch (error) {
      logger.error('Failed to check briefing status', {
        userId,
        error: error.message,
        stack: error.stack
      });
      return false; // Default to not completed on error
    }
  }
}

export { BillManagementService };
