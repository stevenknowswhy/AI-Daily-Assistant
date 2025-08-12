/**
 * Chatterbox Unified Service
 * ==========================
 *
 * Central orchestration service that provides a single, consistent API interface
 * for all Chatterbox functionality including calendar, email, and bill management.
 * Serves both phone and web interfaces with enhanced LLM integration.
 */

import { logger } from '../utils/logger.js';
import { GoogleCalendarService } from './google-calendar.js';
import { GoogleGmailService } from './google-gmail.js';
import { BillManagementService } from './bill-management.js';
import { OpenRouterService } from './openrouter.js';
import { DailyBriefingService } from './daily-briefing.js';

export class ChatterboxUnifiedService {
  constructor() {
    // Initialize all service dependencies
    this.calendarService = new GoogleCalendarService();
    this.gmailService = new GoogleGmailService();
    this.billService = new BillManagementService();
    this.openRouterService = new OpenRouterService();
    this.dailyBriefingService = new DailyBriefingService();

    // Default user ID for operations (can be overridden)
    this.defaultUserId = process.env.DEFAULT_USER_ID || '+14158552745';

    logger.info('Chatterbox Unified Service initialized', {
      servicesLoaded: ['calendar', 'gmail', 'bills', 'openrouter', 'dailyBriefing']
    });
  }

  /**
   * Process natural language request with comprehensive tool calling
   */
  async processRequest(userMessage, conversationContext = [], callSid = null, userId = null) {
    try {
      const effectiveUserId = userId || this.defaultUserId;
      
      logger.info('Processing JARVIS request', {
        callSid,
        userId: effectiveUserId,
        messageLength: userMessage.length,
        contextLength: conversationContext.length
      });

      // Prepare enhanced system prompt with tool capabilities
      const systemPrompt = this.buildEnhancedSystemPrompt();
      
      // Define available tools for the LLM
      const availableTools = this.getAvailableTools();
      
      // Prepare messages with system prompt and context
      const messages = [
        { role: 'system', content: systemPrompt },
        ...conversationContext.slice(-10), // Keep last 10 exchanges
        { role: 'user', content: userMessage }
      ];

      // Generate response with tool calling capabilities
      const response = await this.openRouterService.generateResponseWithTools(
        messages,
        availableTools,
        callSid
      );

      // Process any tool calls
      if (response.toolCalls && response.toolCalls.length > 0) {
        const toolResults = await this.executeToolCalls(response.toolCalls, effectiveUserId, callSid);
        
        // Generate final response incorporating tool results
        const finalResponse = await this.generateFinalResponse(
          messages,
          response,
          toolResults,
          callSid
        );
        
        return {
          success: true,
          text: finalResponse.text,
          toolCalls: response.toolCalls,
          toolResults: toolResults,
          model: response.model,
          usage: response.usage
        };
      }

      // No tool calls needed, return direct response
      return {
        success: true,
        text: response.text || "I'm here to help. What would you like me to do?",
        toolCalls: [],
        toolResults: [],
        model: response.model,
        usage: response.usage
      };

    } catch (error) {
      logger.error('Chatterbox request processing failed', {
        callSid,
        userId,
        error: error.message,
        stack: error.stack
      });

      return {
        success: false,
        text: "I apologize, but I'm experiencing some technical difficulties. Please try again in a moment.",
        error: error.message
      };
    }
  }

  /**
   * Build enhanced system prompt with tool capabilities
   */
  buildEnhancedSystemPrompt() {
    return `You are an advanced AI assistant with a sophisticated, witty, and slightly sarcastic personality while being incredibly helpful and efficient.

You have access to the following capabilities:
- Google Calendar: View, create, update, and manage calendar events
- Gmail: Read emails, compose replies, manage inbox
- Bill Management: Track bills, subscriptions, and payment reminders
- Daily Briefing: Provide comprehensive summaries of calendar, email, and financial information

Key personality traits:
- Sophisticated and refined speech patterns
- Witty and occasionally sarcastic, but always helpful
- Efficient and direct in communication
- Knowledgeable and confident
- Slightly formal but approachable

For voice conversations, keep responses:
- Concise (under 150 words)
- Natural and conversational
- Clear and easy to understand when spoken aloud
- Free of complex formatting or symbols

When users ask about their schedule, emails, or bills, use the appropriate tools to provide accurate, real-time information. Always confirm actions before executing them, especially for creating events or sending emails.

Current context: You are assisting via ${process.env.INTERFACE_TYPE || 'phone'} interface and have full access to calendar, email, and bill management systems.`;
  }

  /**
   * Define available tools for LLM function calling
   */
  getAvailableTools() {
    return [
      {
        type: "function",
        function: {
          name: "get_calendar_events",
          description: "Retrieve calendar events for a specific date range or today",
          parameters: {
            type: "object",
            properties: {
              timeframe: {
                type: "string",
                enum: ["today", "tomorrow", "this_week", "next_week", "custom"],
                description: "The timeframe to retrieve events for"
              },
              maxResults: {
                type: "number",
                description: "Maximum number of events to retrieve (default: 10)",
                default: 10
              },
              customStartDate: {
                type: "string",
                description: "Custom start date in ISO format (required if timeframe is 'custom')"
              },
              customEndDate: {
                type: "string",
                description: "Custom end date in ISO format (required if timeframe is 'custom')"
              }
            },
            required: ["timeframe"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "create_calendar_event",
          description: "Create a new calendar event",
          parameters: {
            type: "object",
            properties: {
              title: {
                type: "string",
                description: "Event title/summary"
              },
              description: {
                type: "string",
                description: "Event description (optional)"
              },
              startDateTime: {
                type: "string",
                description: "Start date and time in ISO format"
              },
              endDateTime: {
                type: "string",
                description: "End date and time in ISO format"
              },
              attendees: {
                type: "array",
                items: { type: "string" },
                description: "List of attendee email addresses"
              },
              location: {
                type: "string",
                description: "Event location (optional)"
              }
            },
            required: ["title", "startDateTime", "endDateTime"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "get_recent_emails",
          description: "Retrieve recent emails from Gmail",
          parameters: {
            type: "object",
            properties: {
              maxResults: {
                type: "number",
                description: "Maximum number of emails to retrieve (default: 10)",
                default: 10
              },
              query: {
                type: "string",
                description: "Gmail search query (optional, e.g., 'is:unread', 'from:example@email.com')"
              }
            }
          }
        }
      },
      {
        type: "function",
        function: {
          name: "get_bills_due_soon",
          description: "Get bills and subscriptions due within specified days",
          parameters: {
            type: "object",
            properties: {
              daysAhead: {
                type: "number",
                description: "Number of days ahead to check for due bills (default: 7)",
                default: 7
              }
            }
          }
        }
      },
      {
        type: "function",
        function: {
          name: "get_daily_briefing",
          description: "Generate a comprehensive daily briefing with calendar, email, and bill information",
          parameters: {
            type: "object",
            properties: {
              includeCalendar: {
                type: "boolean",
                description: "Include calendar events in briefing (default: true)",
                default: true
              },
              includeEmails: {
                type: "boolean",
                description: "Include email summary in briefing (default: true)",
                default: true
              },
              includeBills: {
                type: "boolean",
                description: "Include bill reminders in briefing (default: true)",
                default: true
              }
            }
          }
        }
      }
    ];
  }

  /**
   * Execute tool calls and return results
   */
  async executeToolCalls(toolCalls, userId, callSid) {
    const results = [];

    for (const toolCall of toolCalls) {
      try {
        const { function: func } = toolCall;
        const args = JSON.parse(func.arguments);

        logger.info('Executing tool call', {
          callSid,
          toolName: func.name,
          arguments: args
        });

        let result;
        switch (func.name) {
          case 'get_calendar_events':
            result = await this.handleGetCalendarEvents(args, userId);
            break;
          case 'create_calendar_event':
            result = await this.handleCreateCalendarEvent(args, userId);
            break;
          case 'get_recent_emails':
            result = await this.handleGetRecentEmails(args, userId);
            break;
          case 'get_bills_due_soon':
            result = await this.handleGetBillsDueSoon(args, userId);
            break;
          case 'get_daily_briefing':
            result = await this.handleGetDailyBriefing(args, userId);
            break;
          default:
            result = { error: `Unknown tool: ${func.name}` };
        }

        results.push({
          toolCallId: toolCall.id,
          functionName: func.name,
          result: result
        });

      } catch (error) {
        logger.error('Tool call execution failed', {
          callSid,
          toolCallId: toolCall.id,
          functionName: toolCall.function?.name,
          error: error.message
        });

        results.push({
          toolCallId: toolCall.id,
          functionName: toolCall.function?.name,
          result: { error: error.message }
        });
      }
    }

    return results;
  }

  /**
   * Handle calendar events retrieval
   */
  async handleGetCalendarEvents(args, userId) {
    try {
      const { timeframe, maxResults = 10, customStartDate, customEndDate } = args;

      let timeMin, timeMax, filterToday = false;
      const now = new Date();

      switch (timeframe) {
        case 'today':
          filterToday = true;
          break;
        case 'tomorrow':
          const tomorrow = new Date(now);
          tomorrow.setDate(tomorrow.getDate() + 1);
          timeMin = new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate(), 0, 0, 0).toISOString();
          timeMax = new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate(), 23, 59, 59).toISOString();
          break;
        case 'this_week':
          const startOfWeek = new Date(now);
          startOfWeek.setDate(now.getDate() - now.getDay());
          const endOfWeek = new Date(startOfWeek);
          endOfWeek.setDate(startOfWeek.getDate() + 6);
          timeMin = startOfWeek.toISOString();
          timeMax = endOfWeek.toISOString();
          break;
        case 'next_week':
          const nextWeekStart = new Date(now);
          nextWeekStart.setDate(now.getDate() + (7 - now.getDay()));
          const nextWeekEnd = new Date(nextWeekStart);
          nextWeekEnd.setDate(nextWeekStart.getDate() + 6);
          timeMin = nextWeekStart.toISOString();
          timeMax = nextWeekEnd.toISOString();
          break;
        case 'custom':
          timeMin = customStartDate;
          timeMax = customEndDate;
          break;
        default:
          timeMin = now.toISOString();
      }

      const events = await this.calendarService.listEvents(maxResults, timeMin, timeMax, filterToday);

      return {
        success: true,
        events: events.map(event => ({
          id: event.id,
          title: event.summary,
          description: event.description,
          start: event.start?.dateTime || event.start?.date,
          end: event.end?.dateTime || event.end?.date,
          location: event.location,
          attendees: event.attendees?.map(a => a.email) || []
        })),
        count: events.length,
        timeframe: timeframe
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Handle calendar event creation
   */
  async handleCreateCalendarEvent(args, userId) {
    try {
      const eventData = {
        title: args.title,
        description: args.description || '',
        startDateTime: args.startDateTime,
        endDateTime: args.endDateTime,
        attendees: args.attendees || [],
        location: args.location || ''
      };

      const createdEvent = await this.calendarService.createEvent(eventData);

      return {
        success: true,
        event: {
          id: createdEvent.id,
          title: createdEvent.summary,
          start: createdEvent.start?.dateTime || createdEvent.start?.date,
          end: createdEvent.end?.dateTime || createdEvent.end?.date,
          htmlLink: createdEvent.htmlLink
        },
        message: `Event "${args.title}" created successfully`
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Handle recent emails retrieval
   */
  async handleGetRecentEmails(args, userId) {
    try {
      const { maxResults = 10, query } = args;

      const emails = await this.gmailService.listEmails(maxResults, query);

      return {
        success: true,
        emails: emails.map(email => ({
          id: email.id,
          subject: email.subject,
          from: email.from,
          date: email.date,
          snippet: email.snippet,
          isUnread: email.isUnread
        })),
        count: emails.length
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Handle bills due soon retrieval
   */
  async handleGetBillsDueSoon(args, userId) {
    try {
      const { daysAhead = 7 } = args;

      const bills = await this.billService.getBillsDueSoon(userId, daysAhead);

      return {
        success: true,
        bills: bills.map(bill => ({
          id: bill.id,
          name: bill.name,
          amount: bill.amount,
          dueDate: bill.due_date,
          category: bill.category,
          description: bill.description
        })),
        count: bills.length,
        daysAhead: daysAhead
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Handle daily briefing generation
   */
  async handleGetDailyBriefing(args, userId) {
    try {
      const { includeCalendar = true, includeEmails = true, includeBills = true } = args;

      // Use the correct method name from DailyBriefingService
      const briefing = await this.dailyBriefingService.generateDailyBriefing(userId, `chatterbox-${Date.now()}`);

      return {
        success: true,
        briefing: briefing,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Generate final response incorporating tool results
   */
  async generateFinalResponse(messages, initialResponse, toolResults, callSid) {
    try {
      // Add tool call results to conversation context
      const toolResultMessages = toolResults.map(result => ({
        role: 'tool',
        tool_call_id: result.toolCallId,
        content: JSON.stringify(result.result)
      }));

      const enhancedMessages = [
        ...messages,
        {
          role: 'assistant',
          content: initialResponse.text,
          tool_calls: initialResponse.toolCalls
        },
        ...toolResultMessages
      ];

      // Generate final response with tool results incorporated
      const finalResponse = await this.openRouterService.generateResponseWithTools(
        enhancedMessages,
        [], // No additional tools needed for final response
        callSid
      );

      return {
        text: finalResponse.text || "I've processed your request. Is there anything else you'd like me to help you with?",
        model: finalResponse.model,
        usage: finalResponse.usage
      };

    } catch (error) {
      logger.error('Failed to generate final response', {
        callSid,
        error: error.message
      });

      // Fallback response based on tool results
      return {
        text: this.generateFallbackResponse(toolResults),
        model: 'fallback',
        usage: null
      };
    }
  }

  /**
   * Generate fallback response from tool results
   */
  generateFallbackResponse(toolResults) {
    if (!toolResults || toolResults.length === 0) {
      return "I've processed your request. How else may I assist you?";
    }

    const successfulResults = toolResults.filter(r => r.result.success);

    if (successfulResults.length === 0) {
      return "I encountered some difficulties processing your request. Please try again or ask me something else.";
    }

    // Generate basic response based on successful tool calls
    const responses = successfulResults.map(result => {
      switch (result.functionName) {
        case 'get_calendar_events':
          const eventCount = result.result.events?.length || 0;
          return `I found ${eventCount} calendar event${eventCount !== 1 ? 's' : ''}.`;
        case 'get_recent_emails':
          const emailCount = result.result.emails?.length || 0;
          return `I retrieved ${emailCount} recent email${emailCount !== 1 ? 's' : ''}.`;
        case 'get_bills_due_soon':
          const billCount = result.result.bills?.length || 0;
          return `I found ${billCount} bill${billCount !== 1 ? 's' : ''} due soon.`;
        case 'create_calendar_event':
          return result.result.message || "Calendar event created successfully.";
        case 'get_daily_briefing':
          return "I've prepared your daily briefing.";
        default:
          return "Task completed successfully.";
      }
    });

    return responses.join(' ') + " What else can I help you with?";
  }

  /**
   * Check if services are properly authenticated
   */
  async checkAuthentication() {
    const status = {
      calendar: false,
      gmail: false,
      openrouter: false
    };

    try {
      // Check calendar authentication
      status.calendar = this.calendarService.isAuthenticated();

      // Check Gmail authentication (same OAuth as calendar)
      status.gmail = this.gmailService.isAuthenticated();

      // Check OpenRouter connection
      const openRouterTest = await this.openRouterService.testConnection();
      status.openrouter = openRouterTest.success;

      logger.info('JARVIS authentication status', status);
      return status;

    } catch (error) {
      logger.error('Authentication check failed', error.message);
      return status;
    }
  }

  /**
   * Get service health status
   */
  async getHealthStatus() {
    const health = {
      status: 'healthy',
      services: {},
      timestamp: new Date().toISOString()
    };

    try {
      // Check calendar service
      const calendarTest = await this.calendarService.testConnection();
      health.services.calendar = {
        status: calendarTest.success ? 'healthy' : 'unhealthy',
        authenticated: calendarTest.authenticated || false,
        error: calendarTest.error || null
      };

      // Check Gmail service (use same authentication as calendar)
      health.services.gmail = {
        status: this.gmailService.isAuthenticated() ? 'healthy' : 'unhealthy',
        authenticated: this.gmailService.isAuthenticated(),
        error: this.gmailService.isAuthenticated() ? null : 'Not authenticated'
      };

      // Check OpenRouter service
      const openRouterTest = await this.openRouterService.testConnection();
      health.services.openrouter = {
        status: openRouterTest.success ? 'healthy' : 'unhealthy',
        modelsAvailable: openRouterTest.modelsAvailable || 0,
        error: openRouterTest.error || null
      };

      // Check bill service (Supabase connection)
      health.services.bills = {
        status: 'healthy', // Assume healthy if no errors
        database: 'supabase'
      };

      // Determine overall health
      const unhealthyServices = Object.values(health.services).filter(s => s.status === 'unhealthy');
      if (unhealthyServices.length > 0) {
        health.status = 'degraded';
      }

      return health;

    } catch (error) {
      logger.error('Health check failed', error.message);
      health.status = 'unhealthy';
      health.error = error.message;
      return health;
    }
  }

  /**
   * Initialize all services (useful for startup)
   */
  async initialize() {
    try {
      logger.info('Initializing JARVIS Unified Service...');

      // Check authentication status
      const authStatus = await this.checkAuthentication();

      // Get health status
      const healthStatus = await this.getHealthStatus();

      logger.info('JARVIS Unified Service initialization complete', {
        authentication: authStatus,
        health: healthStatus.status
      });

      return {
        success: true,
        authentication: authStatus,
        health: healthStatus
      };

    } catch (error) {
      logger.error('JARVIS initialization failed', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }
}
