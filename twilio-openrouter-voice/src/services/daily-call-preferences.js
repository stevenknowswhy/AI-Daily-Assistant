/**
 * Daily Call Preferences Service
 * =============================
 * 
 * Manages user preferences for daily call functionality including
 * phone numbers, call times, and no-answer actions
 */

import { createClient } from '@supabase/supabase-js';
import { logger } from '../utils/logger.js';

export class DailyCallPreferencesService {
  constructor() {
    this.supabase = null;
    this.initializeSupabase();
  }

  /**
   * Initialize Supabase client
   */
  initializeSupabase() {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      logger.error('Supabase configuration missing for DailyCallPreferencesService');
      return;
    }

    this.supabase = createClient(supabaseUrl, supabaseKey);
    logger.info('DailyCallPreferencesService initialized with Supabase');
  }

  /**
   * Get user's daily call preferences
   */
  async getUserPreferences(userId) {
    try {
      if (!this.supabase) {
        throw new Error('Supabase not initialized');
      }

      const { data, error } = await this.supabase
        .from('daily_call_preferences')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        throw error;
      }

      logger.info('Retrieved daily call preferences', { userId, hasPreferences: !!data });
      return data;
    } catch (error) {
      logger.error('Failed to get user preferences', { userId, error: error.message });
      throw error;
    }
  }

  /**
   * Create or update user's daily call preferences
   */
  async saveUserPreferences(userId, preferences) {
    try {
      if (!this.supabase) {
        throw new Error('Supabase not initialized');
      }

      const {
        phoneNumber,
        callTime = '08:00:00',
        timezone = 'America/Los_Angeles',
        noAnswerAction = 'text_briefing',
        retryCount = 1,
        isActive = true
      } = preferences;

      // Validate required fields
      if (!phoneNumber) {
        throw new Error('Phone number is required');
      }

      // Validate no answer action
      const validActions = ['text_briefing', 'email_briefing', 'retry_call'];
      if (!validActions.includes(noAnswerAction)) {
        throw new Error('Invalid no answer action');
      }

      // Validate retry count
      if (retryCount < 1 || retryCount > 3) {
        throw new Error('Retry count must be between 1 and 3');
      }

      const preferenceData = {
        user_id: userId,
        phone_number: phoneNumber,
        call_time: callTime,
        timezone: timezone,
        no_answer_action: noAnswerAction,
        retry_count: retryCount,
        is_active: isActive
      };

      const { data, error } = await this.supabase
        .from('daily_call_preferences')
        .upsert(preferenceData, { onConflict: 'user_id' })
        .select()
        .single();

      if (error) {
        throw error;
      }

      logger.info('Saved daily call preferences', { userId, phoneNumber });
      return data;
    } catch (error) {
      logger.error('Failed to save user preferences', { userId, error: error.message });
      throw error;
    }
  }

  /**
   * Delete user's daily call preferences
   */
  async deleteUserPreferences(userId) {
    try {
      if (!this.supabase) {
        throw new Error('Supabase not initialized');
      }

      const { error } = await this.supabase
        .from('daily_call_preferences')
        .delete()
        .eq('user_id', userId);

      if (error) {
        throw error;
      }

      logger.info('Deleted daily call preferences', { userId });
      return { success: true };
    } catch (error) {
      logger.error('Failed to delete user preferences', { userId, error: error.message });
      throw error;
    }
  }

  /**
   * Get all active users for daily call scheduling
   */
  async getActiveUsers() {
    try {
      if (!this.supabase) {
        throw new Error('Supabase not initialized');
      }

      const { data, error } = await this.supabase
        .from('daily_call_preferences')
        .select('*')
        .eq('is_active', true);

      if (error) {
        throw error;
      }

      logger.info('Retrieved active users for daily calls', { count: data?.length || 0 });
      return data || [];
    } catch (error) {
      logger.error('Failed to get active users', { error: error.message });
      throw error;
    }
  }

  /**
   * Update user's phone number only
   */
  async updatePhoneNumber(userId, phoneNumber) {
    try {
      if (!this.supabase) {
        throw new Error('Supabase not initialized');
      }

      if (!phoneNumber) {
        throw new Error('Phone number is required');
      }

      const { data, error } = await this.supabase
        .from('daily_call_preferences')
        .update({ phone_number: phoneNumber })
        .eq('user_id', userId)
        .select()
        .single();

      if (error) {
        throw error;
      }

      logger.info('Updated phone number', { userId, phoneNumber });
      return data;
    } catch (error) {
      logger.error('Failed to update phone number', { userId, error: error.message });
      throw error;
    }
  }

  /**
   * Toggle active status
   */
  async toggleActiveStatus(userId, isActive) {
    try {
      if (!this.supabase) {
        throw new Error('Supabase not initialized');
      }

      const { data, error } = await this.supabase
        .from('daily_call_preferences')
        .update({ is_active: isActive })
        .eq('user_id', userId)
        .select()
        .single();

      if (error) {
        throw error;
      }

      logger.info('Toggled active status', { userId, isActive });
      return data;
    } catch (error) {
      logger.error('Failed to toggle active status', { userId, error: error.message });
      throw error;
    }
  }
}
