/**
 * Dashboard API Service
 * Connects frontend dashboard to existing backend services
 */

import { mockBackend } from './mockBackend';
// Removed googleApiDirect import to avoid CSP violations

export interface CalendarEvent {
  id: string;
  summary: string;
  description?: string;
  start: {
    dateTime: string;
    timeZone?: string;
  };
  end: {
    dateTime: string;
    timeZone?: string;
  };
  location?: string;
  attendees?: Array<{
    email: string;
    displayName?: string;
    responseStatus?: string;
  }>;
  status?: string;
  htmlLink?: string;
}

export interface Email {
  id: string;
  threadId: string;
  subject: string;
  from: string;
  to: string[];
  date: string;
  snippet: string;
  isUnread: boolean;
  labels: string[];
  body?: string;
}

export interface Bill {
  id: string;
  name: string;
  amount: number;
  dueDate: string;
  frequency: string;
  category: string;
  type: 'bill' | 'subscription';
}

export interface PhoneCallRequest {
  to: string;
  message?: string;
  voice?: string;
}

export interface PhoneCallResponse {
  success: boolean;
  callSid?: string;
  error?: string;
}

export interface DashboardData {
  calendar: CalendarEvent[];
  emails: Email[];
  bills: Bill[];
  stats: {
    eventsToday: number;
    unreadEmails: number;
    totalEvents: number;
    totalEmails: number;
    totalBills: number;
    upcomingBills: number;
  };
}

class DashboardApiService {
  // private useMockData: boolean = false;
  private baseUrl: string;
  private authCheckFailures: number = 0;
  private lastAuthCheck: number = 0;
  private authCheckCooldown: number = 5000; // 5 seconds between auth checks
  private maxFailures: number = 3; // Circuit breaker threshold

  // Caching and rate limiting
  private cache = new Map<string, { data: any; timestamp: number }>();
  private pendingRequests = new Map<string, Promise<any>>();
  private readonly CACHE_DURATION = 2 * 60 * 1000; // 2 minutes for dashboard data
  private rateLimitRetryDelay = 1000; // Start with 1 second
  private lastRequestTime = 0;
  private readonly MIN_REQUEST_INTERVAL = 500; // Minimum 500ms between requests

  constructor() {
    this.baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3005';
  }

  /**
   * Check if cached data is still valid
   */
  private isCacheValid(timestamp: number): boolean {
    return Date.now() - timestamp < this.CACHE_DURATION;
  }

  /**
   * Throttle requests to prevent rate limiting
   */
  private async throttleRequest(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;

    if (timeSinceLastRequest < this.MIN_REQUEST_INTERVAL) {
      const delay = this.MIN_REQUEST_INTERVAL - timeSinceLastRequest;
      await new Promise(resolve => setTimeout(resolve, delay));
    }

    this.lastRequestTime = Date.now();
  }

  /**
   * Handle rate limiting with exponential backoff
   */
  private async handleRateLimit(): Promise<void> {
    console.warn(`⏰ Rate limited, waiting ${this.rateLimitRetryDelay}ms before retry`);
    await new Promise(resolve => setTimeout(resolve, this.rateLimitRetryDelay));
    this.rateLimitRetryDelay = Math.min(this.rateLimitRetryDelay * 2, 30000); // Max 30 seconds
  }

  private async checkBackendHealth(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(8000) // Increased to 8 second timeout
      });
      return response.ok;
    } catch (error) {
      console.warn('Backend not available, using mock data:', error);
      return false;
    }
  }

  /**
   * Check if backend is authenticated with Google services
   */
  async checkBackendAuthentication(): Promise<{ authenticated: boolean; calendar: boolean; gmail: boolean }> {
    // Circuit breaker: if too many failures, don't make requests for a while
    const now = Date.now();
    if (this.authCheckFailures >= this.maxFailures) {
      if (now - this.lastAuthCheck < this.authCheckCooldown * this.authCheckFailures) {
        console.log('🚫 Auth check circuit breaker active - too many failures');
        return { authenticated: false, calendar: false, gmail: false };
      } else {
        // Reset after cooldown period
        this.authCheckFailures = 0;
      }
    }

    // Rate limiting: don't check too frequently
    if (now - this.lastAuthCheck < this.authCheckCooldown) {
      console.log('🚫 Auth check rate limited - too frequent');
      return { authenticated: false, calendar: false, gmail: false };
    }

    this.lastAuthCheck = now;

    try {
      // Use the new test auth-status endpoint (no validation middleware)
      const response = await fetch(`${this.baseUrl}/test/auth-status`, {
        method: 'GET',
        signal: AbortSignal.timeout(10000) // Increased to 10 second timeout
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();

      if (result.success && result.authentication) {
        // Handle null values properly - null means not authenticated
        const calendarAuth = result.authentication.calendar === true;
        const gmailAuth = result.authentication.gmail === true;

        // Reset failure count on success
        this.authCheckFailures = 0;

        return {
          authenticated: calendarAuth || gmailAuth,
          calendar: calendarAuth,
          gmail: gmailAuth
        };
      }

      return { authenticated: false, calendar: false, gmail: false };
    } catch (error) {
      this.authCheckFailures++;
      console.log(`Backend authentication check failed (${this.authCheckFailures}/${this.maxFailures}):`, error);
      return { authenticated: false, calendar: false, gmail: false };
    }
  }

  /**
   * Get Google Calendar OAuth URL (same pattern as working test interface)
   */
  async getCalendarAuthUrl(): Promise<{ success: boolean; authUrl?: string; error?: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/test/calendar/auth`, {
        method: 'GET',
        signal: AbortSignal.timeout(10000) // Increased timeout
      });

      const result = await response.json();

      if (result.success && result.authUrl) {
        return { success: true, authUrl: result.authUrl };
      }

      return { success: false, error: result.error || 'Failed to get calendar auth URL' };
    } catch (error) {
      console.error('Failed to get calendar auth URL:', error);
      const message = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: message };
    }
  }

  /**
   * Get Gmail OAuth URL (same pattern as working test interface)
   */
  async getGmailAuthUrl(): Promise<{ success: boolean; authUrl?: string; error?: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/test/gmail/auth`, {
        method: 'GET',
        signal: AbortSignal.timeout(10000) // Increased timeout
      });

      const result = await response.json();

      if (result.success && result.authUrl) {
        return { success: true, authUrl: result.authUrl };
      }

      return { success: false, error: result.error || 'Failed to get Gmail auth URL' };
    } catch (error) {
      console.error('Failed to get Gmail auth URL:', error);
      const message = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: message };
    }
  }

  /**
   * Fetch calendar events using verified working endpoints with fallbacks
   */
  async fetchCalendarEvents(timeRange: '24h' | '7d' | '30d' = '24h'): Promise<CalendarEvent[]> {
    // Skip direct Google API to avoid CSP violations - use backend only
    console.log('Using backend Google Calendar API to avoid CSP violations...');

    // Check if backend is available
    const backendAvailable = await this.checkBackendHealth();

    if (!backendAvailable) {
      console.log('Using mock calendar data - backend not available');
      return await mockBackend.fetchCalendarEvents(timeRange);
    }

    try {
      // Use the verified working calendar endpoint
      const message = this.getCalendarMessage(timeRange);
      console.log('Using verified calendar voice endpoint:', message);

      const response = await fetch(`${this.baseUrl}/test/calendar/voice`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: message,
          userId: 'dashboard-user'
        })
      });

      const result = await response.json();

      if (result.success && result.calendarResult && result.calendarResult.events) {
        console.log('✅ Using verified calendar voice endpoint data');
        return result.calendarResult.events;
      }

      // Fallback to JARVIS API if voice endpoint doesn't work
      console.log('Voice endpoint failed, trying JARVIS API...');
      const jarvisResponse = await fetch(`${this.baseUrl}/api/jarvis/process`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: message,
          userId: 'dashboard-user'
        })
      });

      const jarvisResult = await jarvisResponse.json();

      if (jarvisResult.success && jarvisResult.toolResults) {
        const calendarResult = jarvisResult.toolResults.find((r: any) => r.functionName === 'get_calendar_events');
        if (calendarResult && calendarResult.result.success) {
          console.log('✅ Using JARVIS API calendar data');
          return calendarResult.result.events || [];
        }
      }

      // Fallback to mock data if both APIs don't return expected format
      console.log('Both APIs failed, using mock calendar data');
      return await mockBackend.fetchCalendarEvents(timeRange);
    } catch (error) {
      console.error('Failed to fetch calendar events, using mock data:', error);
      return await mockBackend.fetchCalendarEvents(timeRange);
    }
  }

  /**
   * Fetch emails using verified working endpoints with fallbacks
   */
  async fetchEmails(maxResults: number = 10): Promise<Email[]> {
    // Skip direct Google API to avoid CSP violations - use backend only
    console.log('Using backend Gmail API to avoid CSP violations...');

    // Check if backend is available
    const backendAvailable = await this.checkBackendHealth();

    if (!backendAvailable) {
      console.log('Using mock email data - backend not available');
      return await mockBackend.fetchEmails(maxResults);
    }

    try {
      // Use the Gmail messages endpoint that returns real email data in the correct format
      console.log('📧 Using Gmail messages endpoint for real email data...');

      const response = await fetch(`${this.baseUrl}/test/gmail/messages?maxResults=${maxResults}&query=newer_than:1d`, {
        method: 'GET',
        signal: AbortSignal.timeout(10000)
      });

      if (!response.ok) {
        throw new Error(`Gmail API error: ${response.status}`);
      }

      const result = await response.json();
      console.log('📧 Gmail messages API response:', {
        success: result.success,
        messageCount: result.messages?.length || 0,
        timestamp: result.timestamp
      });

      if (result.success && result.messages && Array.isArray(result.messages)) {
        console.log('✅ Using real Gmail data:', result.messages.length, 'emails');
        return result.messages.map((email: any) => ({
          id: email.id || Math.random().toString(),
          threadId: email.threadId || email.id || Math.random().toString(),
          subject: email.subject || 'No Subject',
          from: email.from || 'Unknown Sender',
          to: Array.isArray(email.to) ? email.to : [email.to || 'Unknown'],
          date: email.receivedTime || email.date || new Date().toISOString(),
          snippet: email.snippet || email.body?.plainText?.substring(0, 100) || 'No preview available',
          isUnread: email.isUnread || false,
          labels: email.labels || [],
          body: email.body?.plainText || email.body?.htmlContent || ''
        }));
      } else {
        console.log('📧 Gmail messages API returned unexpected format');
        throw new Error('Gmail API returned unexpected format');
      }

      // Fallback to JARVIS API if voice endpoint doesn't work
      console.log('Voice endpoint failed, trying JARVIS API...');
      const jarvisResponse = await fetch(`${this.baseUrl}/api/jarvis/process`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: 'get_recent_emails',
          userId: 'dashboard-user'
        })
      });

      const jarvisResult = await jarvisResponse.json();

      if (jarvisResult.success && jarvisResult.toolResults) {
        const emailResult = jarvisResult.toolResults.find((r: any) => r.functionName === 'get_recent_emails');
        if (emailResult && emailResult.result.success) {
          console.log('✅ Using JARVIS API email data');
          return emailResult.result.emails || [];
        }
      }

      // Fallback to mock data if both APIs don't return expected format
      console.log('Both APIs failed, using mock email data');
      return await mockBackend.fetchEmails(maxResults);
    } catch (error) {
      console.error('Failed to fetch emails, using mock data:', error);
      return await mockBackend.fetchEmails(maxResults);
    }
  }

  /**
   * Fetch bills from Supabase backend with caching
   */
  async fetchBills(): Promise<Bill[]> {
    const cacheKey = 'bills_data';

    // Check cache first
    const cached = this.cache.get(cacheKey);
    if (cached && this.isCacheValid(cached.timestamp)) {
      console.log('🚀 Using cached bills data');
      return cached.data;
    }

    console.log('💰 Fetching bills from backend...');

    // Check if backend is available
    const backendAvailable = await this.checkBackendHealth();

    if (!backendAvailable) {
      console.log('Using mock bills data - backend not available');
      const mockData = await mockBackend.fetchBills();
      // Cache mock data briefly
      this.cache.set(cacheKey, { data: mockData, timestamp: Date.now() });
      return mockData;
    }

    try {
      await this.throttleRequest();

      const response = await fetch(`${this.baseUrl}/api/bills/dashboard-user`, {
        method: 'GET',
        signal: AbortSignal.timeout(10000)
      });

      if (!response.ok) {
        if (response.status === 429) {
          await this.handleRateLimit();
          // Return cached data if available during rate limit
          if (cached) {
            console.log('🔄 Rate limited, using cached bills data');
            return cached.data;
          }
        }
        throw new Error(`Bills API error: ${response.status} ${response.statusText}`);
      }

      const billsData = await response.json();
      console.log('💰 Bills API response:', {
        success: true,
        billCount: billsData?.length || 0
      });

      if (Array.isArray(billsData)) {
        console.log('✅ Using real bills data:', billsData.length, 'bills');
        const processedBills = billsData.map((bill: any) => ({
          id: bill.id || Math.random().toString(),
          name: bill.name || 'Unknown Bill',
          amount: bill.amount || 0,
          dueDate: bill.due_date || bill.dueDate || new Date().toISOString(),
          frequency: (bill.recurrence_type || bill.frequency || 'monthly') as 'monthly' | 'yearly' | 'weekly' | 'one-time',
          category: bill.category || 'other',
          type: (bill.category === 'entertainment' ? 'subscription' : 'bill') as 'bill' | 'subscription'
        }));

        // Cache successful results
        this.cache.set(cacheKey, { data: processedBills, timestamp: Date.now() });
        this.rateLimitRetryDelay = 1000; // Reset retry delay on success

        return processedBills;
      } else {
        console.log('💰 Bills API returned unexpected format');
        throw new Error('Bills API returned unexpected format');
      }
    } catch (error) {
      console.error('Failed to fetch bills, using mock data:', error);
      const mockData = await mockBackend.fetchBills();
      // Cache mock data briefly during errors
      this.cache.set(cacheKey, { data: mockData, timestamp: Date.now() });
      return mockData;
    }
  }

  /**
   * Create calendar event
   */
  async createCalendarEvent(eventData: Partial<CalendarEvent>): Promise<CalendarEvent> {
    try {
      const response = await fetch(`${this.baseUrl}/api/jarvis/process`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: `Create a calendar event: ${eventData.summary} on ${eventData.start?.dateTime}`,
          userId: 'dashboard-user'
        })
      });

      const result = await response.json();

      if (result.success && result.toolResults) {
        const createResult = result.toolResults.find((r: any) => r.functionName === 'create_calendar_event');
        if (createResult && createResult.result.success) {
          return createResult.result.event;
        }
      }

      throw new Error('Failed to create calendar event');
    } catch (error) {
      console.error('Failed to create calendar event:', error);
      throw error;
    }
  }

  /**
   * Initiate phone call with fallback to mock
   */
  async initiatePhoneCall(phoneCallData: PhoneCallRequest): Promise<PhoneCallResponse> {
    // Check if backend is available
    const backendAvailable = await this.checkBackendHealth();

    if (!backendAvailable) {
      console.log('Using mock phone call - backend not available');
      return await mockBackend.initiatePhoneCall(phoneCallData.to, phoneCallData.message);
    }

    try {
      const response = await fetch(`${this.baseUrl}/api/twilio/calls`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(phoneCallData)
      });

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Failed to initiate phone call, using mock:', error);
      return await mockBackend.initiatePhoneCall(phoneCallData.to, phoneCallData.message);
    }
  }

  /**
   * Get comprehensive daily summary using verified working endpoint
   */
  async getDailySummary(): Promise<string> {
    // Check if backend is available
    const backendAvailable = await this.checkBackendHealth();

    if (!backendAvailable) {
      console.log('Using mock daily summary - backend not available');
      return await mockBackend.processVoiceCommand('Give me my daily summary');
    }

    try {
      console.log('Fetching comprehensive daily summary...');

      const response = await fetch(`${this.baseUrl}/test/daily-summary/voice`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: 'Give me my daily summary',
          userId: 'dashboard-user'
        })
      });

      const result = await response.json();

      if (result.success && result.dailySummaryResult) {
        console.log('✅ Using verified daily summary endpoint');
        return result.dailySummaryResult.response || 'Daily summary generated successfully';
      }

      throw new Error(result.error || 'Failed to generate daily summary');
    } catch (error) {
      console.error('Failed to fetch daily summary, using mock:', error);
      return await mockBackend.processVoiceCommand('Give me my daily summary');
    }
  }

  /**
   * Get comprehensive dashboard data with caching
   */
  async getDashboardData(): Promise<DashboardData> {
    const cacheKey = 'dashboard_data';

    // Check cache first
    const cached = this.cache.get(cacheKey);
    if (cached && this.isCacheValid(cached.timestamp)) {
      console.log('🚀 Using cached dashboard data');
      return cached.data;
    }

    // Check for pending request to avoid duplicate calls
    const pending = this.pendingRequests.get(cacheKey);
    if (pending) {
      console.log('⏳ Waiting for pending dashboard data request');
      return pending;
    }

    // Create new request
    const requestPromise = this.fetchDashboardData();
    this.pendingRequests.set(cacheKey, requestPromise);

    try {
      const result = await requestPromise;

      // Cache successful results
      this.cache.set(cacheKey, { data: result, timestamp: Date.now() });

      return result;
    } finally {
      this.pendingRequests.delete(cacheKey);
    }
  }

  /**
   * Internal method to fetch dashboard data
   */
  private async fetchDashboardData(): Promise<DashboardData> {
    try {
      console.log('📊 Fetching comprehensive dashboard data...');

      // Throttle requests to prevent rate limiting
      await this.throttleRequest();

      const [calendar, emails, bills] = await Promise.all([
        this.fetchCalendarEvents('24h'),
        this.fetchEmails(10),
        this.fetchBills()
      ]);

      console.log('📊 Dashboard data fetched:', {
        calendar: calendar.length,
        emails: emails.length,
        bills: bills.length
      });

      // Reset retry delay on success
      this.rateLimitRetryDelay = 1000;

      // Calculate upcoming bills (due within 7 days)
      const now = new Date();
      const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      const upcomingBills = bills.filter(bill => {
        const dueDate = new Date(bill.dueDate);
        return dueDate >= now && dueDate <= sevenDaysFromNow;
      }).length;

      const stats = {
        eventsToday: calendar.length,
        unreadEmails: emails.filter(e => e.isUnread).length,
        totalEvents: calendar.length,
        totalEmails: emails.length,
        totalBills: bills.length,
        upcomingBills
      };

      return {
        calendar,
        emails,
        bills,
        stats
      };
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
      throw error;
    }
  }

  /**
   * Process JARVIS voice command with comprehensive daily summary support
   */
  async processVoiceCommand(command: string): Promise<string> {
    // Check if backend is available
    const backendAvailable = await this.checkBackendHealth();

    if (!backendAvailable) {
      console.log('Using mock voice processing - backend not available');
      return await mockBackend.processVoiceCommand(command);
    }

    try {
      // Determine the best endpoint based on command type
      const lowerCommand = command.toLowerCase();
      let endpoint = '/api/chatterbox/process'; // Default endpoint

      // Use specific verified endpoints for better performance and reliability
      if (this.isCalendarCommand(lowerCommand)) {
        endpoint = '/test/calendar/voice';
      } else if (this.isEmailCommand(lowerCommand)) {
        endpoint = '/test/gmail/voice';
      } else if (this.isDailySummaryCommand(lowerCommand)) {
        endpoint = '/test/daily-summary/voice';
      }

      console.log(`Processing voice command via ${endpoint}:`, command);

      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: command,
          userId: 'dashboard-user'
        })
      });

      const result = await response.json();

      if (result.success) {
        // Extract response based on endpoint type
        if (endpoint === '/test/calendar/voice' && result.calendarResult) {
          return result.calendarResult.response || 'Calendar command processed successfully';
        } else if (endpoint === '/test/gmail/voice' && result.gmailResult) {
          return result.gmailResult.response || 'Email command processed successfully';
        } else if (endpoint === '/test/daily-summary/voice' && result.dailySummaryResult) {
          return result.dailySummaryResult.response || 'Daily summary generated successfully';
        } else if (result.text) {
          return result.text;
        } else {
          return 'Command processed successfully';
        }
      }

      throw new Error(result.error || 'Failed to process voice command');
    } catch (error) {
      console.error('Failed to process voice command, using mock:', error);
      return await mockBackend.processVoiceCommand(command);
    }
  }

  /**
   * Check if command is calendar-related
   */
  private isCalendarCommand(command: string): boolean {
    const calendarPatterns = [
      /calendar/i,
      /schedule/i,
      /meeting/i,
      /appointment/i,
      /event/i,
      /what.*today/i,
      /what.*tomorrow/i,
      /what.*this week/i,
      /when.*meeting/i,
      /free.*time/i
    ];
    return calendarPatterns.some(pattern => pattern.test(command));
  }

  /**
   * Check if command is email-related
   */
  private isEmailCommand(command: string): boolean {
    const emailPatterns = [
      /email/i,
      /inbox/i,
      /message/i,
      /mail/i,
      /unread/i,
      /important.*email/i,
      /recent.*email/i,
      /check.*email/i,
      /new.*message/i
    ];
    return emailPatterns.some(pattern => pattern.test(command));
  }

  /**
   * Check if command is daily summary-related
   */
  private isDailySummaryCommand(command: string): boolean {
    const summaryPatterns = [
      /daily summary/i,
      /daily briefing/i,
      /morning briefing/i,
      /tell me.*day/i,
      /what.*happening.*today/i,
      /morning update/i,
      /daily update/i,
      /give me.*summary/i,
      /what.*need.*know/i,
      /bills.*due/i,
      /schedule.*email/i,
      /overview.*day/i
    ];
    return summaryPatterns.some(pattern => pattern.test(command));
  }

  private getCalendarMessage(timeRange: string): string {
    switch (timeRange) {
      case '24h':
        return "What's on my calendar today?";
      case '7d':
        return "What's on my calendar this week?";
      case '30d':
        return "What's on my calendar this month?";
      default:
        return "What's on my calendar today?";
    }
  }

  /**
   * Authenticate with Google Calendar (same pattern as test interface)
   */
  async authenticateCalendar(): Promise<void> {
    const authResult = await this.getCalendarAuthUrl();

    if (authResult.success && authResult.authUrl) {
      console.log('🔗 Redirecting to Google Calendar OAuth...');
      // Redirect to Google OAuth URL (same pattern as test interface)
      window.location.href = authResult.authUrl;
    } else {
      throw new Error(authResult.error || 'Failed to get Calendar OAuth URL');
    }
  }

  /**
   * Authenticate with Gmail (same pattern as test interface)
   */
  async authenticateGmail(): Promise<void> {
    const authResult = await this.getGmailAuthUrl();

    if (authResult.success && authResult.authUrl) {
      console.log('🔗 Redirecting to Gmail OAuth...');
      // Redirect to Google OAuth URL (same pattern as test interface)
      window.location.href = authResult.authUrl;
    } else {
      throw new Error(authResult.error || 'Failed to get Gmail OAuth URL');
    }
  }
}

// Export singleton instance
export const dashboardApi = new DashboardApiService();
export default dashboardApi;
