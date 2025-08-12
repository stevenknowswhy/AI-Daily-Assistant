/**
 * MSW Request Handlers
 * ===================
 * 
 * Mock Service Worker handlers for intercepting HTTP requests during tests.
 * This eliminates flaky network-dependent tests and improves test reliability.
 */

import { http, HttpResponse } from 'msw';

// Mock data
const mockCalendarEvents = [
  {
    id: 'event-1',
    summary: 'Team Meeting',
    description: 'Weekly team sync',
    start: { dateTime: '2025-01-13T10:00:00Z', timeZone: 'America/Los_Angeles' },
    end: { dateTime: '2025-01-13T11:00:00Z', timeZone: 'America/Los_Angeles' },
    location: 'Conference Room A',
    attendees: [
      { email: 'john@example.com', displayName: 'John Doe', responseStatus: 'accepted' }
    ],
    status: 'confirmed',
    htmlLink: 'https://calendar.google.com/event?eid=event-1'
  },
  {
    id: 'event-2',
    summary: 'Project Review',
    description: 'Quarterly project review',
    start: { dateTime: '2025-01-13T14:00:00Z', timeZone: 'America/Los_Angeles' },
    end: { dateTime: '2025-01-13T15:30:00Z', timeZone: 'America/Los_Angeles' },
    status: 'confirmed'
  }
];

const mockEmails = [
  {
    id: 'email-1',
    threadId: 'thread-1',
    subject: 'Important Project Update',
    from: 'manager@company.com',
    to: ['user@company.com'],
    date: '2025-01-13T09:00:00Z',
    snippet: 'Please review the latest project updates...',
    isUnread: true,
    labels: ['INBOX', 'IMPORTANT'],
    body: 'Full email body content here...'
  },
  {
    id: 'email-2',
    threadId: 'thread-2',
    subject: 'Meeting Reminder',
    from: 'calendar@company.com',
    to: ['user@company.com'],
    date: '2025-01-13T08:30:00Z',
    snippet: 'Reminder: Team meeting at 10 AM...',
    isUnread: false,
    labels: ['INBOX'],
    body: 'Meeting reminder content...'
  }
];

const mockBills = [
  {
    id: 'bill-1',
    name: 'Netflix Subscription',
    amount: 15.99,
    dueDate: '2025-01-15',
    frequency: 'monthly',
    category: 'Entertainment',
    type: 'subscription' as const
  },
  {
    id: 'bill-2',
    name: 'Electric Bill',
    amount: 120.50,
    dueDate: '2025-01-20',
    frequency: 'monthly',
    category: 'Utilities',
    type: 'bill' as const
  }
];

const mockDailyCallPreferences = {
  id: 'pref-1',
  userId: 'user_314M04o2MAC2IWgqNsdMK9AT7Kw',
  preferences: {
    enabled: true,
    time: '09:00',
    timezone: 'America/Los_Angeles',
    phoneNumber: '+1 (555) 123-4567',
    voice: 'alloy' as const,
    includeCalendar: true,
    includeEmails: true,
    includeBills: true,
    weekdays: [true, true, true, true, true, false, false]
  },
  createdAt: '2025-01-01T00:00:00Z',
  updatedAt: '2025-01-13T00:00:00Z'
};

export const handlers = [
  // Dashboard API - Health Check
  http.get('*/health', () => {
    return HttpResponse.json({ status: 'ok', timestamp: new Date().toISOString() });
  }),

  // Dashboard API - Auth Status
  http.get('*/test/auth-status', () => {
    return HttpResponse.json({
      success: true,
      authentication: {
        calendar: true,
        gmail: true
      }
    });
  }),

  // Google Calendar API - Auth URL
  http.get('*/test/calendar/auth', () => {
    return HttpResponse.json({
      success: true,
      authUrl: 'https://accounts.google.com/oauth/authorize?mock=true'
    });
  }),

  // Gmail API - Auth URL
  http.get('*/test/gmail/auth', () => {
    return HttpResponse.json({
      success: true,
      authUrl: 'https://accounts.google.com/oauth/authorize?mock=true'
    });
  }),

  // Calendar Voice Command
  http.post('*/test/calendar/voice', () => {
    return HttpResponse.json({
      success: true,
      calendarResult: {
        events: mockCalendarEvents,
        response: `You have ${mockCalendarEvents.length} events today: ${mockCalendarEvents.map(e => e.summary).join(', ')}`
      }
    });
  }),

  // Gmail Voice Command
  http.post('*/test/gmail/voice', () => {
    return HttpResponse.json({
      success: true,
      gmailResult: {
        emails: mockEmails,
        response: `You have ${mockEmails.filter(e => e.isUnread).length} unread emails`
      }
    });
  }),

  // Gmail Messages API
  http.get('*/test/gmail/messages', ({ request }) => {
    const url = new URL(request.url);
    const maxResults = parseInt(url.searchParams.get('maxResults') || '10');

    return HttpResponse.json({
      success: true,
      messages: mockEmails.slice(0, maxResults),
      timestamp: new Date().toISOString()
    });
  }),

  // Calendar Events API (direct endpoint)
  http.get('*/test/calendar/events', ({ request }) => {
    const url = new URL(request.url);
    const maxResults = parseInt(url.searchParams.get('maxResults') || '10');

    return HttpResponse.json({
      success: true,
      events: mockCalendarEvents.slice(0, maxResults),
      timestamp: new Date().toISOString()
    });
  }),

  // Daily Summary Voice Command
  http.post('*/test/daily-summary/voice', () => {
    return HttpResponse.json({
      success: true,
      dailySummaryResult: {
        response: 'Good morning! You have 2 events today, 1 unread email, and 2 upcoming bills. Your day looks manageable with the team meeting at 10 AM being your main focus.'
      }
    });
  }),

  // Bills API - Get Bills
  http.get('*/api/bills/:userId', ({ params }) => {
    return HttpResponse.json(mockBills);
  }),

  // Bills API - Authentication
  http.post('*/test/bills/authenticate', () => {
    return HttpResponse.json({
      success: true,
      authenticated: true
    });
  }),

  // Bills API - Status
  http.get('*/test/bills/status', () => {
    return HttpResponse.json({
      success: true,
      authenticated: true
    });
  }),

  // Daily Call Preferences API (new TanStack Query format)
  http.get('*/api/daily-call/preferences/:userId', ({ params }) => {
    return HttpResponse.json(mockDailyCallPreferences);
  }),

  http.put('*/api/daily-call/preferences/:userId', async ({ request, params }) => {
    const body = await request.json() as any;
    const updatedPreferences = {
      ...mockDailyCallPreferences,
      preferences: { ...mockDailyCallPreferences.preferences, ...body.preferences },
      updatedAt: new Date().toISOString()
    };
    return HttpResponse.json(updatedPreferences);
  }),

  // Daily Call Preferences API (legacy format for existing service)
  // This handler matches any GET request to the preferences endpoint, including query parameters
  http.get('*/api/daily-call-preferences/:userId', ({ params, request }) => {
    const url = new URL(request.url);
    console.log('MSW: Handling daily call preferences request:', url.pathname, 'with params:', Object.fromEntries(url.searchParams));

    return HttpResponse.json({
      success: true,
      preferences: {
        phone_number: mockDailyCallPreferences.preferences.phoneNumber,
        call_time: mockDailyCallPreferences.preferences.time,
        timezone: mockDailyCallPreferences.preferences.timezone,
        voice: mockDailyCallPreferences.preferences.voice,
        include_calendar: mockDailyCallPreferences.preferences.includeCalendar,
        include_emails: mockDailyCallPreferences.preferences.includeEmails,
        include_bills: mockDailyCallPreferences.preferences.includeBills,
        is_active: mockDailyCallPreferences.preferences.enabled,
        weekdays: mockDailyCallPreferences.preferences.weekdays
      }
    });
  }),

  http.post('*/api/daily-call-preferences/:userId', async ({ request, params }) => {
    const body = await request.json() as any;
    return HttpResponse.json({
      success: true,
      message: 'Preferences saved successfully'
    });
  }),

  // Daily Call Test
  http.post('*/api/daily-call/test/:userId', () => {
    return HttpResponse.json({
      success: true,
      callSid: 'mock-call-sid-123'
    });
  }),

  // JARVIS API - General Processing
  http.post('*/api/jarvis/process', async ({ request }) => {
    const body = await request.json() as any;
    const message = body.message?.toLowerCase() || '';
    
    if (message.includes('calendar')) {
      return HttpResponse.json({
        success: true,
        toolResults: [{
          functionName: 'get_calendar_events',
          result: { success: true, events: mockCalendarEvents }
        }],
        text: `You have ${mockCalendarEvents.length} events today`
      });
    }
    
    if (message.includes('email')) {
      return HttpResponse.json({
        success: true,
        toolResults: [{
          functionName: 'get_recent_emails',
          result: { success: true, emails: mockEmails }
        }],
        text: `You have ${mockEmails.filter(e => e.isUnread).length} unread emails`
      });
    }
    
    return HttpResponse.json({
      success: true,
      text: 'I understand your request and I\'m here to help!'
    });
  }),

  // OpenRouter LLM API (for voice processing)
  http.post('https://openrouter.ai/api/v1/chat/completions', () => {
    return HttpResponse.json({
      choices: [{
        message: {
          content: 'This is a mock response from the AI assistant.'
        }
      }]
    });
  }),

  // Twilio Voice Webhook (for phone calls)
  http.post('*/webhook/voice', () => {
    return HttpResponse.text(`<?xml version="1.0" encoding="UTF-8"?>
      <Response>
        <Say voice="alice">Hello! This is your AI Daily Assistant calling with your daily briefing.</Say>
      </Response>`);
  }),

  // Fallback for unhandled requests
  http.all('*', ({ request }) => {
    console.warn(`Unhandled ${request.method} request to ${request.url}`);
    return HttpResponse.json(
      { error: 'Not found', message: 'This endpoint is not mocked' },
      { status: 404 }
    );
  })
];
