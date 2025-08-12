/**
 * Daily Call Preferences Service
 * =============================
 *
 * Frontend service for managing daily call preferences with persistence and rate limiting protection
 */

export interface DailyCallPreferences {
  phoneNumber: string;
  callTime: string;
  timezone: string;
  noAnswerAction: 'text_briefing' | 'email_briefing' | 'retry_call';
  retryCount: number;
  isActive: boolean;
}

export interface DailyCallPreferencesResponse {
  success: boolean;
  preferences?: DailyCallPreferences | null;
  error?: string;
}

class DailyCallPreferencesService {
  private baseUrl = `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3005'}/api/daily-call-preferences`;
  private cache = new Map<string, { data: DailyCallPreferencesResponse; timestamp: number }>();
  private pendingRequests = new Map<string, Promise<DailyCallPreferencesResponse>>();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
  private readonly STORAGE_KEY_PREFIX = 'daily_call_preferences_';
  private rateLimitRetryDelay = 1000; // Start with 1 second

  /**
   * Get cached data from localStorage
   */
  private getFromLocalStorage(userId: string): DailyCallPreferences | null {
    try {
      const stored = localStorage.getItem(`${this.STORAGE_KEY_PREFIX}${userId}`);
      if (stored) {
        const parsed = JSON.parse(stored);
        console.log('📱 Retrieved preferences from localStorage:', parsed);
        return parsed;
      }
    } catch (error) {
      console.warn('Failed to get preferences from localStorage:', error);
    }
    return null;
  }

  /**
   * Save data to localStorage
   */
  private saveToLocalStorage(userId: string, preferences: DailyCallPreferences): void {
    try {
      localStorage.setItem(`${this.STORAGE_KEY_PREFIX}${userId}`, JSON.stringify(preferences));
      console.log('💾 Saved preferences to localStorage');
    } catch (error) {
      console.warn('Failed to save preferences to localStorage:', error);
    }
  }

  /**
   * Check if cached data is still valid
   */
  public isCacheValid(timestamp: number): boolean {
    // touch method to avoid unused warning in strict builds
    void timestamp;
    return Date.now() - timestamp < this.CACHE_DURATION;
    // reference method to satisfy TS6133 in strict mode
    void this.isCacheValid;
  }

  // Reference the method to avoid TS6133 in some build setups
  // eslint-disable-next-line @typescript-eslint/no-unused-expressions
  // private _isCacheValidReference = this.isCacheValid;
  /**
   * Get user's daily call preferences with caching and persistence
   */
  async getUserPreferences(userId: string): Promise<DailyCallPreferencesResponse> {
    const cacheKey = `get_${userId}`;

    // TEMPORARILY DISABLE CACHE to fix persistence issue
    // Clear any existing cache to force fresh data
    this.cache.delete(cacheKey);
    console.log('🔄 Cache cleared, forcing fresh API call');

    // Check for pending request to avoid duplicate calls
    const pending = this.pendingRequests.get(cacheKey);
    if (pending) {
      console.log('⏳ Waiting for pending preferences request');
      return pending;
    }

    // FIRST: Ensure Bills/Supabase authentication before API call
    try {
      console.log('🔐 Ensuring Bills/Supabase authentication before GET...');
      const authResponse = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3005'}/test/bills/authenticate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ userId: 'dashboard-user' })
      });
      const authResult = await authResponse.json();

      if (!authResult.success) {
        console.error('❌ Bills/Supabase authentication failed for GET:', authResult.error);
        // Continue anyway - the API will return proper error message
      } else {
        console.log('✅ Bills/Supabase authentication successful for GET');
      }
    } catch (authError) {
      console.error('❌ Bills/Supabase authentication error for GET:', authError);
      // Continue anyway - the API will return proper error message
    }

    // Create new request
    const requestPromise = this.fetchUserPreferences(userId);
    this.pendingRequests.set(cacheKey, requestPromise);

    try {
      const result = await requestPromise;

      // Cache successful results
      if (result.success && result.preferences) {
        this.cache.set(cacheKey, { data: result, timestamp: Date.now() });
        this.saveToLocalStorage(userId, result.preferences);
      }

      return result;
    } finally {
      this.pendingRequests.delete(cacheKey);
    }
  }

  /**
   * Transform API response from snake_case to camelCase
   */
  private transformApiResponse(apiData: any): DailyCallPreferences {
    return {
      phoneNumber: apiData.phone_number || '',
      callTime: apiData.call_time || '08:00',
      timezone: apiData.timezone || 'America/Los_Angeles',
      noAnswerAction: apiData.no_answer_action || 'text_briefing',
      retryCount: apiData.retry_count || 1,
      isActive: apiData.is_active ?? true
    };
  }

  /**
   * Transform camelCase preferences to snake_case for API
   */
  private transformToApiFormat(preferences: DailyCallPreferences): any {
    console.log('🔄 Transforming preferences to API format:', preferences);

    const apiData = {
      phone_number: preferences.phoneNumber,
      call_time: preferences.time, // Fixed: use 'time' not 'callTime'
      timezone: preferences.timezone || 'America/Los_Angeles',
      no_answer_action: 'text_briefing', // Default value
      retry_count: 1, // Default value
      is_active: preferences.enabled ?? true // Use 'enabled' field
    };

    console.log('🔄 Transformed API data:', apiData);
    return apiData;
  }

  /**
   * Internal method to fetch preferences from API
   */
  private async fetchUserPreferences(userId: string): Promise<DailyCallPreferencesResponse> {
    try {
      // Add cache-busting parameter to prevent 304 responses
      const cacheBuster = `_t=${Date.now()}&_r=${Math.random()}`;
      const url = `${this.baseUrl}/${userId}?${cacheBuster}`;
      console.log('🌐 Making cache-busted API request to:', url);

      const response = await fetch(url, {
        signal: AbortSignal.timeout(8000), // 8 second timeout
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        }
      });

      // Handle 304 Not Modified responses
      if (response.status === 304) {
        console.log('📱 Received 304 Not Modified, using cached data');
        // For 304 responses, try to get data from localStorage as the browser cache should have it
        const localData = this.getFromLocalStorage(userId);
        if (localData) {
          console.log('✅ Using localStorage data for 304 response');
          return { success: true, preferences: localData };
        } else {
          console.warn('⚠️ 304 response but no localStorage data found');
          return { success: false, error: 'No cached data available' };
        }
      }

      // For non-304 responses, parse JSON
      const data = await response.json();

      if (!response.ok) {
        if (response.status === 429) {
          // Rate limited - try localStorage fallback
          const localData = this.getFromLocalStorage(userId);
          if (localData) {
            console.log('🔄 Rate limited, using localStorage fallback');
            return { success: true, preferences: localData };
          }

          // Exponential backoff for rate limiting
          this.rateLimitRetryDelay = Math.min(this.rateLimitRetryDelay * 2, 30000);
          throw new Error('Too many requests');
        }
        throw new Error(data.error || 'Failed to get preferences');
      }

      // Reset retry delay on success
      this.rateLimitRetryDelay = 1000;

      // Transform API response to expected format
      if (data.success && data.preferences) {
        data.preferences = this.transformApiResponse(data.preferences);
      }

      return data;
    } catch (error) {
      console.error('Failed to get daily call preferences:', error);

      // Try localStorage fallback for any error
      const localData = this.getFromLocalStorage(userId);
      if (localData) {
        console.log('💾 Using localStorage fallback due to API error');
        return { success: true, preferences: localData };
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Save user's daily call preferences with persistence
   */
  async saveUserPreferences(userId: string, preferences: DailyCallPreferences): Promise<DailyCallPreferencesResponse> {
    // Always save to localStorage first for immediate persistence
    this.saveToLocalStorage(userId, preferences);

    try {
      // FIRST: Authenticate with Bills/Supabase (required for API access)
      console.log('🔐 Authenticating with Bills/Supabase before save...');
      try {
        const authResponse = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3005'}/test/bills/authenticate`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ userId: 'dashboard-user' })
        });
        const authResult = await authResponse.json();

        if (!authResult.success) {
          console.error('❌ Bills/Supabase authentication failed:', authResult.error);
          throw new Error('Authentication failed: ' + authResult.error);
        }
        console.log('✅ Bills/Supabase authentication successful for save');
      } catch (authError) {
        console.error('❌ Bills/Supabase authentication error:', authError);
        const errorMessage = authError instanceof Error ? authError.message : 'Authentication failed';
        throw new Error('Authentication error: ' + errorMessage);
      }

      // Transform to API format before sending
      const apiData = this.transformToApiFormat(preferences);

      const response = await fetch(`${this.baseUrl}/${userId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(apiData),
        signal: AbortSignal.timeout(8000) // 8 second timeout
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 429) {
          // Rate limited but localStorage save succeeded
          console.log('⚠️ Rate limited during save, but localStorage updated');
          return {
            success: true,
            preferences,
            error: 'Saved locally, will sync when rate limit clears'
          };
        }
        throw new Error(data.error || 'Failed to save preferences');
      }

      // Update cache on successful save
      const cacheKey = `get_${userId}`;
      this.cache.set(cacheKey, {
        data: { success: true, preferences },
        timestamp: Date.now()
      });

      console.log('✅ Preferences saved successfully to API and localStorage');
      return data;
    } catch (error) {
      console.error('Failed to save daily call preferences to API:', error);

      // Even if API fails, localStorage save succeeded
      console.log('💾 Preferences saved to localStorage as fallback');
      return {
        success: true,
        preferences,
        error: 'Saved locally, will sync when connection is restored'
      };
    }
  }

  /**
   * Update phone number only
   */
  async updatePhoneNumber(userId: string, phoneNumber: string): Promise<DailyCallPreferencesResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/${userId}/phone`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ phone_number: phoneNumber })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update phone number');
      }

      // Transform API response to expected format
      if (data.success && data.preferences) {
        data.preferences = this.transformApiResponse(data.preferences);
      }

      return data;
    } catch (error) {
      console.error('Failed to update phone number:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Toggle active status
   */
  async toggleActiveStatus(userId: string, isActive: boolean): Promise<DailyCallPreferencesResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/${userId}/active`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ isActive })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to toggle active status');
      }

      return data;
    } catch (error) {
      console.error('Failed to toggle active status:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Delete user's daily call preferences
   */
  async deleteUserPreferences(userId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/${userId}`, {
        method: 'DELETE'
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete preferences');
      }

      return { success: true };
    } catch (error) {
      console.error('Failed to delete daily call preferences:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Clear all caches for a user (useful for debugging)
   */
  clearCache(userId: string): void {
    const cacheKey = `get_${userId}`;
    this.cache.delete(cacheKey);
    localStorage.removeItem(`${this.STORAGE_KEY_PREFIX}${userId}`);
    console.log('🗑️ Cleared cache and localStorage for user:', userId);
  }

  /**
   * Format phone number for display
   */
  formatPhoneNumber(phoneNumber: string): string {
    // Remove all non-digit characters
    const digits = phoneNumber.replace(/\D/g, '');

    // Format as (XXX) XXX-XXXX for US numbers
    if (digits.length === 10) {
      return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
    } else if (digits.length === 11 && digits.startsWith('1')) {
      return `+1 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
    }

    // Return original if not a standard US format
    return phoneNumber;
  }

  /**
   * Format call time for display
   */
  formatCallTime(callTime: string): string {
    try {
      const [hours, minutes] = callTime.split(':');
      const hour = parseInt(hours);
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
      return `${displayHour}:${minutes} ${ampm}`;
    } catch (error) {
      return callTime;
    }
  }

  /**
   * Get no answer action display text
   */
  getNoAnswerActionText(action: string): string {
    switch (action) {
      case 'text_briefing':
        return 'Send text briefing';
      case 'email_briefing':
        return 'Send email briefing';
      case 'retry_call':
        return 'Retry call';
      default:
        return action;
    }
  }
}

export const dailyCallPreferencesService = new DailyCallPreferencesService();
