/**
 * Daily Briefing Service
 * =====================
 * 
 * Aggregates calendar events, emails, and bills/subscriptions into a comprehensive
 * daily briefing using LLM analysis for natural, conversational delivery.
 */

import { logger } from '../utils/logger.js';
import { BillManagementService } from './bill-management.js';
import { GoogleCalendarService } from './google-calendar.js';
import { GoogleGmailService } from './google-gmail.js';
import { OpenRouterService } from './openrouter.js';

class DailyBriefingService {
  constructor(calendarService = null, gmailService = null, openRouterService = null, billService = null) {
    // Initialize services (lazy loading for flexibility)
    this.calendar = calendarService;
    this.gmail = gmailService;
    this.openRouter = openRouterService;
    this.billService = billService || new BillManagementService();

    logger.info('DailyBriefingService initialized', {
      hasCalendar: !!this.calendar,
      hasGmail: !!this.gmail,
      hasOpenRouter: !!this.openRouter,
      hasBillService: !!this.billService
    });
  }

  /**
   * Initialize services if not provided
   */
  async initializeServices() {
    try {
      if (!this.calendar) {
        this.calendar = new GoogleCalendarService();
        await this.calendar.initialize();
      }

      if (!this.gmail) {
        this.gmail = new GoogleGmailService();
        await this.gmail.initialize();
      }

      if (!this.openRouter) {
        this.openRouter = new OpenRouterService();
      }

      logger.info('All briefing services initialized successfully');
    } catch (error) {
      logger.error('Error initializing briefing services', {
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  /**
   * Generate comprehensive daily briefing
   */
  async generateDailyBriefing(userId, callSid = null) {
    try {
      logger.info('Starting daily briefing generation', {
        userId,
        callSid
      });

      // Check if briefing already completed today
      const isCompleted = await this.billService.isBriefingCompletedToday(userId);
      if (isCompleted) {
        logger.info('Daily briefing already completed today', { userId });
        return {
          response: "You've already received your daily briefing today. Would you like me to give you an updated summary?",
          alreadyCompleted: true
        };
      }

      // Initialize services if needed
      await this.initializeServices();

      // Get user preferences
      const preferences = await this.billService.getUserBriefingPreferences(userId);

      // Gather all data in parallel
      const [calendarData, emailData, billsData] = await Promise.allSettled([
        preferences.include_calendar ? this.getCalendarData(userId) : Promise.resolve(null),
        preferences.include_emails ? this.getEmailData(userId, preferences) : Promise.resolve(null),
        preferences.include_bills ? this.getMockBillsData(userId, preferences) : Promise.resolve(null)
      ]);

      // Process results and handle errors gracefully
      const briefingData = {
        calendar: calendarData.status === 'fulfilled' ? calendarData.value : null,
        emails: emailData.status === 'fulfilled' ? emailData.value : null,
        bills: billsData.status === 'fulfilled' ? billsData.value : null,
        errors: []
      };

      // Log any errors but continue with available data
      [calendarData, emailData, billsData].forEach((result, index) => {
        if (result.status === 'rejected') {
          const source = ['calendar', 'emails', 'bills'][index];
          logger.error(`Error fetching ${source} data for briefing`, {
            userId,
            error: result.reason?.message
          });
          briefingData.errors.push(source);
        }
      });

      // Generate LLM-based briefing
      const briefingResponse = await this.generateLLMBriefing(userId, briefingData, callSid);

      // Save briefing status
      await this.billService.createBriefingStatus(userId, {
        is_completed: true,
        completion_timestamp: new Date().toISOString(),
        briefing_content: briefingData,
        email_count: briefingData.emails?.length || 0,
        calendar_events_count: briefingData.calendar?.length || 0,
        bills_due_count: briefingData.bills?.length || 0,
        delivery_method: 'voice',
        call_sid: callSid
      });

      logger.info('Daily briefing generated successfully', {
        userId,
        callSid,
        responseLength: briefingResponse.length,
        hasCalendar: !!briefingData.calendar,
        hasEmails: !!briefingData.emails,
        hasBills: !!briefingData.bills
      });

      return {
        response: briefingResponse,
        alreadyCompleted: false,
        data: briefingData
      };

    } catch (error) {
      logger.error('Error generating daily briefing', {
        userId,
        callSid,
        error: error.message,
        stack: error.stack
      });

      return {
        response: "I'm having trouble generating your daily briefing right now. Please try again in a few minutes.",
        alreadyCompleted: false,
        error: error.message
      };
    }
  }

  /**
   * Get today's calendar events
   */
  async getCalendarData(userId) {
    try {
      const today = new Date();
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

      const events = await this.calendar.listEvents({
        timeMin: startOfDay.toISOString(),
        timeMax: endOfDay.toISOString(),
        maxResults: 10,
        singleEvents: true,
        orderBy: 'startTime'
      });

      logger.info('Retrieved calendar data for briefing', {
        userId,
        eventCount: events.length
      });

      return events.map(event => ({
        summary: event.summary || 'No title',
        start: event.start?.dateTime || event.start?.date,
        end: event.end?.dateTime || event.end?.date,
        location: event.location,
        description: event.description
      }));
    } catch (error) {
      logger.error('Error fetching calendar data', {
        userId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get recent emails for briefing with LLM-based filtering
   */
  async getEmailData(userId, preferences) {
    try {
      const maxResults = Math.min(preferences.max_emails_to_mention || 10, 20); // Get more for filtering
      const query = preferences.only_important_emails ?
        'is:important (is:unread OR newer_than:1d)' :
        'is:unread OR newer_than:1d';

      const emails = await this.gmail.listMessages(maxResults, query);

      logger.info('Retrieved raw email data for briefing', {
        userId,
        emailCount: emails.length,
        onlyImportant: preferences.only_important_emails
      });

      if (emails.length === 0) {
        return [];
      }

      // Use LLM to filter important emails if available
      const filteredEmails = await this.filterImportantEmails(emails, preferences);

      logger.info('Filtered emails for briefing', {
        userId,
        originalCount: emails.length,
        filteredCount: filteredEmails.length
      });

      return filteredEmails.map(email => ({
        subject: email.subject || 'No subject',
        from: email.from || 'Unknown sender',
        senderName: this.extractSenderName(email.from || ''),
        timestamp: email.date || 'Unknown time',
        isUnread: email.isUnread || false,
        isImportant: email.isImportant || false,
        snippet: email.snippet || ''
      }));
    } catch (error) {
      logger.error('Error fetching email data', {
        userId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Filter emails for importance using LLM classification
   */
  async filterImportantEmails(emails, preferences) {
    try {
      if (!this.openRouter) {
        // Fallback to rule-based filtering
        return this.filterImportantEmailsRuleBased(emails, preferences);
      }

      // Prepare email summaries for LLM analysis
      const emailSummaries = emails.map(email => ({
        id: email.id,
        from: email.from || '',
        subject: email.subject || '',
        snippet: (email.snippet || '').substring(0, 200),
        isUnread: email.isUnread || false,
        isImportant: email.isImportant || false
      }));

      const prompt = `Analyze these emails and identify which ones are important for a daily briefing.
Focus on:
- Personal/business communications (not promotional)
- Time-sensitive matters
- Important updates or notifications
- Emails requiring action or response

Exclude:
- Marketing/promotional emails
- Newsletters
- Social media notifications
- Automated system emails (unless critical)

Return only the email IDs (comma-separated) that should be included in the daily briefing.

Emails:
${emailSummaries.map(email =>
  `ID: ${email.id}
From: ${email.from}
Subject: ${email.subject}
Snippet: ${email.snippet}
Unread: ${email.isUnread}
---`
).join('\n')}

Important email IDs:`;

      const messages = [{ role: 'user', content: prompt }];
      const response = await this.openRouter.generateResponse(messages);

      if (response && response.text) {
        const importantIds = response.text
          .split(',')
          .map(id => id.trim())
          .filter(id => id.length > 0);

        const filteredEmails = emails.filter(email => importantIds.includes(email.id));

        // Limit to max requested emails
        const maxEmails = preferences.max_emails_to_mention || 5;
        return filteredEmails.slice(0, maxEmails);
      }

      // Fallback to rule-based filtering
      return this.filterImportantEmailsRuleBased(emails, preferences);

    } catch (error) {
      logger.error('Error in LLM email filtering', {
        error: error.message
      });
      return this.filterImportantEmailsRuleBased(emails, preferences);
    }
  }

  /**
   * Rule-based email filtering (fallback method)
   */
  filterImportantEmailsRuleBased(emails, preferences) {
    const maxEmails = preferences.max_emails_to_mention || 5;

    // Filter out obvious promotional emails
    const filtered = emails.filter(email => {
      const subject = (email.subject || '').toLowerCase();
      const from = (email.from || '').toLowerCase();
      const snippet = (email.snippet || '').toLowerCase();

      // Exclude promotional indicators
      const isPromotional =
        subject.includes('unsubscribe') ||
        subject.includes('sale') ||
        subject.includes('offer') ||
        subject.includes('discount') ||
        from.includes('noreply') ||
        from.includes('no-reply') ||
        snippet.includes('unsubscribe');

      return !isPromotional;
    });

    // Prioritize unread and important emails
    const sorted = filtered.sort((a, b) => {
      if (a.isImportant && !b.isImportant) return -1;
      if (!a.isImportant && b.isImportant) return 1;
      if (a.isUnread && !b.isUnread) return -1;
      if (!a.isUnread && b.isUnread) return 1;
      return 0;
    });

    return sorted.slice(0, maxEmails);
  }

  /**
   * Get bills due soon for briefing (respects individual reminder preferences)
   */
  async getBillsData(userId, preferences) {
    try {
      // Get all active bills for the user
      const allBills = await this.billService.getUserBills(userId);

      // Filter bills based on individual reminder preferences
      const today = new Date();
      const billsToInclude = [];

      for (const bill of allBills) {
        const dueDate = new Date(bill.due_date);
        const daysUntilDue = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));

        // Get individual reminder preference (default to 1 if not set)
        const reminderDays = bill.reminder_days_before || 1;

        // Skip bills with no reminder preference (reminder_days_before = 0)
        if (reminderDays === 0) {
          continue;
        }

        // Include bill if we're within the reminder window
        // (due today or within the specified reminder days)
        if (daysUntilDue >= 0 && daysUntilDue <= reminderDays) {
          billsToInclude.push({
            ...bill,
            daysUntilDue
          });
        }
      }

      logger.info('Retrieved bills data for briefing with individual preferences', {
        userId,
        totalBills: allBills.length,
        billsToInclude: billsToInclude.length,
        billDetails: billsToInclude.map(b => ({
          name: b.name,
          daysUntilDue: b.daysUntilDue,
          reminderDays: b.reminder_days_before
        }))
      });

      return billsToInclude;
    } catch (error) {
      logger.error('Error fetching bills data', {
        userId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get mock bills data for testing (when database isn't ready)
   */
  async getMockBillsData(userId, preferences) {
    try {
      // Mock bills data for testing with individual reminder preferences
      const mockBills = [
        {
          id: 'mock-1',
          name: 'Electric Bill',
          amount: 120.00,
          due_date: '2025-08-08',
          daysUntilDue: 2,
          category: 'utilities',
          auto_pay: false,
          reminder_days_before: 3 // 3 days reminder
        },
        {
          id: 'mock-2',
          name: 'Netflix Subscription',
          amount: 15.99,
          due_date: '2025-08-15',
          daysUntilDue: 9,
          category: 'entertainment',
          auto_pay: true,
          reminder_days_before: 1 // 1 day reminder
        },
        {
          id: 'mock-3',
          name: 'Car Insurance',
          amount: 89.50,
          due_date: '2025-08-07',
          daysUntilDue: 1,
          category: 'insurance',
          auto_pay: false,
          reminder_days_before: 2 // 2 days reminder
        },
        {
          id: 'mock-4',
          name: 'Phone Bill',
          amount: 65.00,
          due_date: '2025-08-12',
          daysUntilDue: 6,
          category: 'utilities',
          auto_pay: true,
          reminder_days_before: 0 // No reminder
        }
      ];

      // Filter bills based on individual reminder preferences
      const billsToInclude = mockBills.filter(bill => {
        const reminderDays = bill.reminder_days_before || 1;

        // Skip bills with no reminder preference
        if (reminderDays === 0) {
          return false;
        }

        // Include bill if we're within the reminder window
        return bill.daysUntilDue >= 0 && bill.daysUntilDue <= reminderDays;
      });

      logger.info('Retrieved mock bills data for briefing with individual preferences', {
        userId,
        totalBills: mockBills.length,
        billsToInclude: billsToInclude.length,
        billDetails: billsToInclude.map(b => ({
          name: b.name,
          daysUntilDue: b.daysUntilDue,
          reminderDays: b.reminder_days_before
        }))
      });

      return billsToInclude;
    } catch (error) {
      logger.error('Error creating mock bills data', {
        userId,
        error: error.message
      });
      return [];
    }
  }

  /**
   * Extract sender name from email address
   */
  extractSenderName(from) {
    if (!from) return '';

    // Handle "Name <email>" format
    const nameMatch = from.match(/^"?([^"<]+)"?\s*<.*>$/);
    if (nameMatch) {
      return nameMatch[1].trim();
    }

    // Handle "email@domain.com" format
    const emailMatch = from.match(/^([^@]+)@/);
    if (emailMatch) {
      return emailMatch[1].trim();
    }

    return from.trim();
  }

  /**
   * Generate LLM-based daily briefing
   */
  async generateLLMBriefing(userId, briefingData, callSid) {
    try {
      const currentTime = new Date().toLocaleString('en-US', {
        timeZone: 'America/Los_Angeles',
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });

      // Check if this is a dashboard briefing request
      const isDashboardBriefing = callSid === 'dashboard-briefing';

      const messages = isDashboardBriefing
        ? this.createDashboardBriefingMessages(currentTime, briefingData)
        : this.createBriefingMessages(currentTime, briefingData);

      // Use longer response for dashboard briefings
      const originalMaxTokens = this.openRouter.maxTokens;
      if (isDashboardBriefing) {
        this.openRouter.maxTokens = 500; // Longer response for dashboard
      }

      // Generate briefing using LLM
      const llmResponse = await this.openRouter.generateResponseWithTools(messages, [], callSid);

      // Restore original max tokens
      this.openRouter.maxTokens = originalMaxTokens;

      if (!llmResponse.success) {
        throw new Error('LLM briefing generation failed');
      }

      return llmResponse.text;
    } catch (error) {
      logger.error('Error generating LLM briefing', {
        userId,
        callSid,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Create messages for dashboard LLM briefing (more detailed)
   */
  createDashboardBriefingMessages(currentTime, briefingData) {
    const systemPrompt = `You are an AI assistant providing a comprehensive daily briefing.
    Create a well-structured, informative summary that includes:

    1. A warm greeting with the current time
    2. Calendar overview (past 24 hours and upcoming today)
    3. Email summary (recent important messages)
    4. Financial reminders (bills due soon)
    5. Actionable insights and recommendations

    Format the response in a conversational, helpful tone. Use emojis sparingly but effectively.
    Keep it comprehensive but readable - aim for 3-4 paragraphs.`;

    const userPrompt = `Current time: ${currentTime}

CALENDAR EVENTS:
${briefingData.calendar && briefingData.calendar.length > 0
  ? briefingData.calendar.map(event =>
      `• ${event.summary || 'Untitled Event'} - ${this.formatEventTime(event)}`
    ).join('\n')
  : '• No calendar events found'}

RECENT EMAILS:
${briefingData.emails && briefingData.emails.length > 0
  ? briefingData.emails.slice(0, 10).map(email =>
      `• From: ${email.from || 'Unknown'} - Subject: ${email.subject || 'No Subject'}`
    ).join('\n')
  : '• No recent emails found'}

BILLS DUE SOON:
${briefingData.bills && briefingData.bills.length > 0
  ? briefingData.bills.map(bill =>
      `• ${bill.name} - $${bill.amount} due ${this.formatDate(bill.due_date || bill.dueDate)}`
    ).join('\n')
  : '• No bills due soon'}

Please provide a comprehensive daily briefing based on this information.`;

    return [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ];
  }

  /**
   * Create messages for LLM briefing generation
   */
  createBriefingMessages(currentTime, briefingData) {
    const { calendar, emails, bills, errors } = briefingData;

    let briefingContent = `Current time: ${currentTime}\n\n`;

    // Calendar section
    if (calendar && calendar.length > 0) {
      briefingContent += `📅 TODAY'S CALENDAR EVENTS:\n`;
      calendar.forEach((event, index) => {
        const startTime = event.start ? new Date(event.start).toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        }) : 'All day';
        briefingContent += `${index + 1}. ${event.summary} at ${startTime}`;
        if (event.location) briefingContent += ` (${event.location})`;
        briefingContent += '\n';
      });
      briefingContent += '\n';
    } else {
      briefingContent += `📅 CALENDAR: No events scheduled for today\n\n`;
    }

    // Email section
    if (emails && emails.length > 0) {
      briefingContent += `📧 RECENT EMAILS (${emails.length} total):\n`;
      emails.slice(0, 5).forEach((email, index) => {
        briefingContent += `${index + 1}. From: ${email.senderName} - "${email.subject}"`;
        if (email.isUnread) briefingContent += ' (Unread)';
        if (email.isImportant) briefingContent += ' (Important)';
        briefingContent += '\n';
      });
      briefingContent += '\n';
    } else {
      briefingContent += `📧 EMAILS: No recent emails to review\n\n`;
    }

    // Bills section
    if (bills && bills.length > 0) {
      briefingContent += `💳 BILLS & SUBSCRIPTIONS DUE SOON:\n`;
      bills.forEach((bill, index) => {
        const dueText = bill.daysUntilDue === 0 ? 'DUE TODAY' :
                       bill.daysUntilDue === 1 ? 'Due tomorrow' :
                       `Due in ${bill.daysUntilDue} days`;
        briefingContent += `${index + 1}. ${bill.name} - $${bill.amount} (${dueText})`;
        if (bill.auto_pay) briefingContent += ' [Auto-pay enabled]';
        briefingContent += '\n';
      });
      briefingContent += '\n';
    } else {
      briefingContent += `💳 BILLS: No bills due in the next few days\n\n`;
    }

    // Error section (if any)
    if (errors && errors.length > 0) {
      briefingContent += `⚠️ Note: Some data couldn't be retrieved (${errors.join(', ')})\n\n`;
    }

    const systemPrompt = `You are an intelligent daily briefing assistant. You're delivering a morning briefing over the phone, so keep it:
- Conversational and friendly (like a personal assistant)
- Concise but informative (2-3 minutes when spoken)
- Well-organized (calendar first, then emails, then bills)
- Actionable (mention what needs attention)
- Natural for voice delivery (avoid lists, use flowing speech)

The user's daily briefing data is provided below. Create a natural, spoken briefing that covers:
1. Today's calendar events (time-sensitive items first)
2. Important emails that need attention
3. Bills and subscriptions due soon
4. Any urgent items that need immediate action

Keep the tone professional but warm, like a trusted assistant giving a morning update.

${briefingContent}

Instructions:
- Start with a friendly greeting and today's date
- Prioritize time-sensitive items (events starting soon, bills due today)
- For emails, focus on important/unread ones and mention sender names
- For bills, emphasize due dates and amounts
- End with asking if they need more details about anything
- Keep it conversational and suitable for voice delivery`;

    return [
      {
        role: 'system',
        content: systemPrompt
      },
      {
        role: 'user',
        content: 'Please give me my daily briefing for today.'
      }
    ];
  }

  /**
   * Process voice command for daily briefing
   */
  async processBriefingCommand(userMessage, userId, callSid) {
    try {
      const lowerMessage = userMessage.toLowerCase();

      // Check if this is a briefing request
      const briefingPatterns = [
        /daily briefing/i,
        /morning briefing/i,
        /daily summary/i,
        /what.*today/i,
        /schedule.*today/i,
        /bills.*due/i,
        /what.*happening.*today/i,
        /morning update/i,
        /daily update/i
      ];

      const isBriefingRequest = briefingPatterns.some(pattern => pattern.test(lowerMessage));

      if (isBriefingRequest) {
        logger.info('Processing daily briefing request', {
          userId,
          callSid,
          message: userMessage.substring(0, 100)
        });

        return await this.generateDailyBriefing(userId, callSid);
      }

      return null; // Not a briefing request
    } catch (error) {
      logger.error('Error processing briefing command', {
        userId,
        callSid,
        error: error.message,
        stack: error.stack
      });

      return {
        response: "I'm having trouble generating your briefing right now. Please try again.",
        error: error.message
      };
    }
  }

  /**
   * Format date for briefing
   */
  formatDate(dateString) {
    try {
      if (!dateString) return 'Unknown';
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    } catch (error) {
      logger.error('Error formatting date', {
        error: error.message,
        dateString: dateString
      });
      return 'Unknown';
    }
  }

  /**
   * Format event time for briefing
   */
  formatEventTime(event) {
    try {
      if (event.start?.dateTime) {
        const startTime = new Date(event.start.dateTime);
        const endTime = event.end?.dateTime ? new Date(event.end.dateTime) : null;

        const timeStr = startTime.toLocaleString('en-US', {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        });

        if (endTime) {
          const endTimeStr = endTime.toLocaleString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
          });
          return `${timeStr} - ${endTimeStr}`;
        }

        return timeStr;
      } else if (event.start?.date) {
        const date = new Date(event.start.date);
        return date.toLocaleDateString('en-US', {
          weekday: 'short',
          month: 'short',
          day: 'numeric'
        }) + ' (All day)';
      }

      return 'Time TBD';
    } catch (error) {
      return 'Time TBD';
    }
  }
}

export { DailyBriefingService };
