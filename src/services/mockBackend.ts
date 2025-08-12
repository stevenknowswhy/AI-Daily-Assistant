/**
 * Mock Backend Service for Development
 * Provides mock data when backend is not available
 */

import { CalendarEvent, Email, PhoneCallResponse, Bill } from './dashboardApi';

export class MockBackendService {
  private delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  async fetchCalendarEvents(timeRange: '24h' | '7d' | '30d' = '24h'): Promise<CalendarEvent[]> {
    await this.delay(1000); // Simulate network delay

    const mockEvents: CalendarEvent[] = [
      {
        id: '1',
        summary: 'Team Standup Meeting',
        description: 'Daily team sync and planning session',
        start: {
          dateTime: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(), // 2 hours from now
          timeZone: 'America/Los_Angeles'
        },
        end: {
          dateTime: new Date(Date.now() + 2.5 * 60 * 60 * 1000).toISOString(),
          timeZone: 'America/Los_Angeles'
        },
        location: 'Conference Room A',
        attendees: [
          { email: 'john@company.com', displayName: 'John Doe', responseStatus: 'accepted' },
          { email: 'jane@company.com', displayName: 'Jane Smith', responseStatus: 'tentative' }
        ],
        status: 'confirmed'
      },
      {
        id: '2',
        summary: 'Client Presentation',
        description: 'Quarterly review presentation for key client',
        start: {
          dateTime: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(), // 4 hours from now
          timeZone: 'America/Los_Angeles'
        },
        end: {
          dateTime: new Date(Date.now() + 5 * 60 * 60 * 1000).toISOString(),
          timeZone: 'America/Los_Angeles'
        },
        location: 'Zoom Meeting',
        status: 'confirmed'
      },
      {
        id: '3',
        summary: 'Lunch with Sarah',
        start: {
          dateTime: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString(), // 6 hours from now
          timeZone: 'America/Los_Angeles'
        },
        end: {
          dateTime: new Date(Date.now() + 7 * 60 * 60 * 1000).toISOString(),
          timeZone: 'America/Los_Angeles'
        },
        location: 'Downtown Cafe',
        status: 'confirmed'
      }
    ];

    // Filter based on time range
    const now = new Date();
    const endTime = new Date();

    switch (timeRange) {
      case '24h':
        endTime.setDate(now.getDate() + 1);
        break;
      case '7d':
        endTime.setDate(now.getDate() + 7);
        break;
      case '30d':
        endTime.setDate(now.getDate() + 30);
        break;
    }

    return mockEvents.filter(event =>
      new Date(event.start.dateTime) >= now &&
      new Date(event.start.dateTime) <= endTime
    );
  }

  async fetchEmails(maxResults: number = 10): Promise<Email[]> {
    await this.delay(800); // Simulate network delay

    const mockEmails: Email[] = [
      {
        id: '1',
        threadId: 'thread-1',
        subject: 'Project Update: Q4 Planning',
        from: 'manager@company.com',
        to: ['you@company.com'],
        date: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
        snippet: 'Hi team, I wanted to share the latest updates on our Q4 planning initiative...',
        isUnread: true,
        labels: ['INBOX', 'IMPORTANT']
      },
      {
        id: '2',
        threadId: 'thread-2',
        subject: 'Meeting Reminder: Client Call Tomorrow',
        from: 'calendar@company.com',
        to: ['you@company.com'],
        date: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(), // 4 hours ago
        snippet: 'This is a reminder that you have a client call scheduled for tomorrow at 2:00 PM...',
        isUnread: true,
        labels: ['INBOX']
      },
      {
        id: '3',
        threadId: 'thread-3',
        subject: 'Weekly Newsletter: Tech Updates',
        from: 'newsletter@techcompany.com',
        to: ['you@company.com'],
        date: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(), // 6 hours ago
        snippet: 'This week in tech: AI advancements, new frameworks, and industry insights...',
        isUnread: false,
        labels: ['INBOX', 'NEWSLETTERS']
      },
      {
        id: '4',
        threadId: 'thread-4',
        subject: 'Invoice #12345 - Payment Due',
        from: 'billing@service.com',
        to: ['you@company.com'],
        date: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(), // 8 hours ago
        snippet: 'Your invoice #12345 for $299.99 is due on January 15th. Please review and process payment...',
        isUnread: true,
        labels: ['INBOX', 'FINANCE']
      },
      {
        id: '5',
        threadId: 'thread-5',
        subject: 'Welcome to AI Daily Assistant!',
        from: 'noreply@aidailyassistant.com',
        to: ['you@company.com'],
        date: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(), // 12 hours ago
        snippet: 'Welcome to your new AI Daily Assistant! Here\'s how to get started with your personalized experience...',
        isUnread: false,
        labels: ['INBOX']
      }
    ];

    return mockEmails.slice(0, maxResults);
  }

  async createCalendarEvent(eventData: Partial<CalendarEvent>): Promise<CalendarEvent> {
    await this.delay(1200); // Simulate network delay

    const newEvent: CalendarEvent = {
      id: Date.now().toString(),
      summary: eventData.summary || 'New Event',
      description: eventData.description || '',
      start: eventData.start || {
        dateTime: new Date().toISOString(),
        timeZone: 'America/Los_Angeles'
      },
      end: eventData.end || {
        dateTime: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // 1 hour later
        timeZone: 'America/Los_Angeles'
      },
      location: eventData.location || '',
      status: 'confirmed'
    };

    return newEvent;
  }

  async initiatePhoneCall(_to: string, _message?: string): Promise<PhoneCallResponse> {
    await this.delay(2000); // Simulate call initiation delay

    // Mock successful call initiation
    return {
      success: true,
      callSid: `CA${Date.now()}mock`,
    };
  }

  async fetchBills(): Promise<Bill[]> {
    await this.delay(800); // Simulate network delay

    const mockBills: Bill[] = [
      {
        id: 'bill-1',
        name: 'Netflix Subscription',
        amount: 15.99,
        dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days from now
        frequency: 'monthly',
        category: 'entertainment',
        type: 'subscription'
      },
      {
        id: 'bill-2',
        name: 'Electric Bill',
        amount: 125.50,
        dueDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(), // 10 days from now
        frequency: 'monthly',
        category: 'utilities',
        type: 'bill'
      },
      {
        id: 'bill-3',
        name: 'Spotify Premium',
        amount: 9.99,
        dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days from now
        frequency: 'monthly',
        category: 'entertainment',
        type: 'subscription'
      },
      {
        id: 'bill-4',
        name: 'Internet Service',
        amount: 79.99,
        dueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(), // 15 days from now
        frequency: 'monthly',
        category: 'utilities',
        type: 'bill'
      }
    ];

    console.log('📋 Mock Backend: Returning', mockBills.length, 'bills');
    return mockBills;
  }

  async processVoiceCommand(command: string): Promise<string> {
    await this.delay(1500); // Simulate AI processing delay

    // Mock JARVIS responses based on command
    const lowerCommand = command.toLowerCase();

    if (lowerCommand.includes('calendar') || lowerCommand.includes('schedule')) {
      return "I've checked your calendar. You have 3 events today including a team standup at 10 AM and a client presentation at 2 PM.";
    }

    if (lowerCommand.includes('email') || lowerCommand.includes('mail')) {
      return "You have 4 unread emails. The most recent is from your manager about Q4 planning, and there's an important invoice that needs attention.";
    }

    if (lowerCommand.includes('hello') || lowerCommand.includes('hi')) {
      return "Good day! I'm JARVIS, your AI assistant. I can help you manage your calendar, emails, and daily tasks. What would you like me to do?";
    }

    if (lowerCommand.includes('weather')) {
      return "I don't have access to weather data at the moment, but I can help you with your calendar and emails. Would you like me to check your schedule instead?";
    }

    return "I understand you'd like me to help with that. I can assist with calendar management, email organization, and daily briefings. Could you be more specific about what you need?";
  }
}

export const mockBackend = new MockBackendService();
