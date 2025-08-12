/**
 * Calendar Voice Service with LLM Tool Calling
 * ============================================
 *
 * Handles calendar operations for voice conversations using OpenRouter LLM
 * with tool calling for better natural language understanding
 */

import { GoogleCalendarService } from './google-calendar.js';
import { OpenRouterService } from './openrouter.js';
import { logger } from '../utils/logger.js';

export class CalendarVoiceService {
  constructor(googleCalendarService = null, openRouterService = null) {
    logger.info('Initializing CalendarVoiceService with LLM tool calling', {
      hasGoogleCalendar: !!googleCalendarService,
      hasOpenRouter: !!openRouterService
    });

    try {
      if (googleCalendarService) {
        logger.info('Using provided Google Calendar service');
        this.calendar = googleCalendarService;
      } else {
        logger.info('Creating new Google Calendar service');
        this.calendar = new GoogleCalendarService();
        this.calendar.initialize();
      }

      if (openRouterService) {
        logger.info('Using provided OpenRouter service');
        this.openRouter = openRouterService;
      } else {
        logger.info('Creating new OpenRouter service');
        this.openRouter = new OpenRouterService();
      }

      logger.info('CalendarVoiceService initialized successfully with LLM integration');
    } catch (error) {
      logger.error('Error initializing CalendarVoiceService', {
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  /**
   * Define calendar tools for LLM function calling
   */
  getCalendarTools() {
    return [
      {
        type: "function",
        function: {
          name: "query_calendar_events",
          description: "Query calendar events for a specific time period or date. Use this when user asks about their schedule, events, meetings, or appointments.",
          parameters: {
            type: "object",
            properties: {
              timeframe: {
                type: "string",
                enum: ["today", "tomorrow", "this_week", "next_week", "specific_date", "specific_time"],
                description: "The time period to query"
              },
              specific_date: {
                type: "string",
                description: "Specific date in YYYY-MM-DD format if timeframe is 'specific_date'"
              },
              specific_time: {
                type: "string",
                description: "Specific time in HH:MM format if looking for events at a particular time"
              },
              time_period: {
                type: "string",
                enum: ["morning", "afternoon", "evening", "all_day"],
                description: "Specific part of day if relevant"
              }
            },
            required: ["timeframe"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "get_event_details",
          description: "Get detailed information about a specific event, including description, location, attendees. Use when user asks about details of a specific appointment or meeting.",
          parameters: {
            type: "object",
            properties: {
              time_reference: {
                type: "string",
                description: "Time reference like '4:30 PM', '2:00', 'noon', etc."
              },
              event_title: {
                type: "string",
                description: "Partial or full event title if mentioned"
              },
              date: {
                type: "string",
                description: "Date reference like 'today', 'tomorrow', or specific date"
              }
            },
            required: ["time_reference"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "create_calendar_event",
          description: "Create a new calendar event. Use when user wants to schedule, book, or add something to their calendar.",
          parameters: {
            type: "object",
            properties: {
              title: {
                type: "string",
                description: "Event title or description"
              },
              date: {
                type: "string",
                description: "Date for the event (today, tomorrow, or specific date)"
              },
              start_time: {
                type: "string",
                description: "Start time in HH:MM format or natural language"
              },
              duration_minutes: {
                type: "number",
                description: "Duration in minutes (default 60)"
              },
              description: {
                type: "string",
                description: "Additional event details"
              },
              attendees: {
                type: "array",
                items: { type: "string" },
                description: "List of attendee names or emails"
              }
            },
            required: ["title", "date", "start_time"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "update_calendar_event",
          description: "Update or modify an existing calendar event. Use when user wants to change, move, or reschedule an event.",
          parameters: {
            type: "object",
            properties: {
              current_time: {
                type: "string",
                description: "Current time of the event to identify it"
              },
              new_time: {
                type: "string",
                description: "New time for the event"
              },
              new_date: {
                type: "string",
                description: "New date for the event"
              },
              new_title: {
                type: "string",
                description: "New title for the event"
              }
            },
            required: ["current_time"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "delete_calendar_event",
          description: "Delete or cancel a calendar event. Use when user wants to cancel, remove, or delete an event.",
          parameters: {
            type: "object",
            properties: {
              time_reference: {
                type: "string",
                description: "Time reference to identify the event"
              },
              event_title: {
                type: "string",
                description: "Event title to help identify it"
              },
              date: {
                type: "string",
                description: "Date of the event"
              }
            },
            required: ["time_reference"]
          }
        }
      }
    ];
  }

  /**
   * Process calendar-related voice commands using LLM tool calling
   */
  async processCalendarCommand(userMessage, callSid) {
    logger.info('=== STARTING processCalendarCommand ===', {
      callSid,
      message: userMessage.substring(0, 100),
      hasCalendar: !!this.calendar,
      hasOpenRouter: !!this.openRouter
    });

    // DIRECT SOLUTION: Skip LLM tool calling for now and use enhanced legacy approach
    logger.info('Using direct enhanced approach for calendar processing', { callSid });
    return await this.directProcessCalendarCommand(userMessage, callSid);
  }

  /**
   * Direct calendar processing with comprehensive event details
   */
  async directProcessCalendarCommand(userMessage, callSid) {
    try {
      logger.info('Direct processing calendar voice command', {
        callSid,
        message: userMessage.substring(0, 100)
      });

      // Check authentication first
      if (!this.calendar.isAuthenticated()) {
        logger.info('Calendar not authenticated, returning auth required message', { callSid });
        return {
          success: false,
          response: "I'd love to help with your calendar, but I need to be connected to your Google Calendar first. Please set that up through the web interface.",
          intent: 'authentication_required'
        };
      }

      logger.info('Calendar is authenticated, proceeding with direct processing', { callSid });

      // Enhanced intent detection for specific time queries
      const lowerMessage = userMessage.toLowerCase();

      // Check for specific time-based queries first
      const timeMatch = userMessage.match(/(\d{1,2}):?(\d{0,2})\s*(am|pm)?/i);
      if (timeMatch && (lowerMessage.includes('appointment') || lowerMessage.includes('meeting') || lowerMessage.includes('event') || lowerMessage.includes('about'))) {
        logger.info('Detected specific time query', {
          callSid,
          timeMatch: timeMatch[0],
          message: userMessage.substring(0, 100)
        });

        return await this.handleSpecificTimeQuery(timeMatch[0], userMessage, callSid);
      }

      // Check for general calendar queries
      const generalPatterns = [
        /what.*on.*calendar/i,
        /what.*scheduled/i,
        /any.*meetings?/i,
        /any.*appointments?/i,
        /what.*today/i,
        /what.*tomorrow/i,
        /check.*calendar/i,
        /show.*calendar/i,
        /calendar.*today/i,
        /do i have/i,
        /am i free/i
      ];

      if (generalPatterns.some(pattern => pattern.test(lowerMessage))) {
        logger.info('Detected general calendar query', {
          callSid,
          message: userMessage.substring(0, 100)
        });

        return await this.handleGeneralCalendarQuery(userMessage, callSid);
      }

      // Not a calendar command
      logger.info('Not detected as calendar command', { callSid });
      return null;

    } catch (error) {
      logger.error('Error in direct calendar processing', {
        callSid,
        error: error.message,
        stack: error.stack
      });

      return {
        success: false,
        response: "I'm having trouble accessing your calendar right now. Please try again in a moment.",
        error: error.message
      };
    }
  }

  /**
   * Handle specific time queries with comprehensive event details
   */
  async handleSpecificTimeQuery(timeReference, originalMessage, callSid) {
    try {
      logger.info('Handling specific time query', {
        callSid,
        timeReference,
        originalMessage: originalMessage.substring(0, 100)
      });

      // Get today's events
      const events = await this.calendar.listEvents(20, null, null, true);

      logger.info('Retrieved events for time query', {
        callSid,
        eventCount: events.length
      });

      // Parse the time reference
      const targetTime = this.parseTimeReference(timeReference);

      logger.info('Parsed target time', {
        callSid,
        targetTime,
        originalTimeRef: timeReference
      });

      // Find events around the specified time (within 30 minutes)
      const matchingEvents = events.filter(event => {
        const startTime = event.start?.dateTime;
        if (!startTime) return false;

        const eventDate = new Date(startTime);
        const eventHour = eventDate.getHours();
        const eventMinute = eventDate.getMinutes();

        // Check if event time is within 30 minutes of requested time
        const eventTotalMinutes = eventHour * 60 + eventMinute;
        const targetTotalMinutes = targetTime.hour * 60 + targetTime.minute;
        const timeDiff = Math.abs(eventTotalMinutes - targetTotalMinutes);

        logger.info('Checking event time match', {
          callSid,
          eventTitle: event.summary,
          eventTime: `${eventHour}:${eventMinute.toString().padStart(2, '0')}`,
          targetTime: `${targetTime.hour}:${targetTime.minute.toString().padStart(2, '0')}`,
          timeDiff,
          withinRange: timeDiff <= 30
        });

        return timeDiff <= 30; // Within 30 minutes
      });

      logger.info('Found matching events', {
        callSid,
        matchingCount: matchingEvents.length,
        eventTitles: matchingEvents.map(e => e.summary)
      });

      if (matchingEvents.length === 0) {
        return {
          success: true,
          response: `I don't see any appointments around ${timeReference}. Your calendar looks clear at that time.`,
          intent: 'query',
          eventCount: 0,
          method: 'direct_enhanced'
        };
      }

      // Return detailed information about the matching event
      const event = matchingEvents[0];
      const startTime = event.start?.dateTime || event.start?.date;
      const endTime = event.end?.dateTime || event.end?.date;

      const startTimeFormatted = startTime ? new Date(startTime).toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
        timeZone: 'America/Los_Angeles'
      }) : 'Unknown time';

      const endTimeFormatted = endTime ? new Date(endTime).toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
        timeZone: 'America/Los_Angeles'
      }) : null;

      let response = `At ${startTimeFormatted}, you have "${event.summary || 'Untitled event'}"`;

      if (endTimeFormatted) {
        response += ` until ${endTimeFormatted}`;
      }

      if (event.description) {
        response += `. Details: ${event.description}`;
      }

      if (event.location) {
        response += ` Location: ${event.location}`;
      }

      if (event.attendees && event.attendees.length > 0) {
        const attendeeNames = event.attendees.map(a => a.displayName || a.email).join(', ');
        response += ` Attendees: ${attendeeNames}`;
      }

      logger.info('Generated detailed response for time query', {
        callSid,
        eventTitle: event.summary,
        responseLength: response.length
      });

      return {
        success: true,
        response: response,
        intent: 'query',
        eventDetails: {
          title: event.summary,
          description: event.description,
          location: event.location,
          startTime: startTimeFormatted,
          endTime: endTimeFormatted,
          attendees: event.attendees
        },
        method: 'direct_enhanced'
      };

    } catch (error) {
      logger.error('Error handling specific time query', {
        callSid,
        error: error.message
      });

      return {
        success: false,
        response: "I'm having trouble finding that specific appointment. Please try again.",
        error: error.message
      };
    }
  }

  /**
   * Handle general calendar queries
   */
  async handleGeneralCalendarQuery(userMessage, callSid) {
    try {
      const events = await this.calendar.listEvents(10, null, null, true);

      if (events.length === 0) {
        return {
          success: true,
          response: "You don't have any events scheduled today. Your calendar is clear!",
          intent: 'query',
          eventCount: 0,
          method: 'direct_enhanced'
        };
      }

      // Format events for voice response
      const eventDescriptions = events.slice(0, 3).map(event => {
        const startTime = event.start?.dateTime || event.start?.date;
        const timeStr = startTime ? new Date(startTime).toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        }) : '';

        return `${event.summary || 'Untitled event'}${timeStr ? ` at ${timeStr}` : ''}`;
      });

      let response = `You have ${events.length} event${events.length > 1 ? 's' : ''} today. `;

      if (events.length <= 3) {
        response += eventDescriptions.join(', ');
      } else {
        response += `Your next few are: ${eventDescriptions.join(', ')}, and ${events.length - 3} more.`;
      }

      return {
        success: true,
        response,
        intent: 'query',
        eventCount: events.length,
        events: events.slice(0, 3),
        method: 'direct_enhanced'
      };

    } catch (error) {
      logger.error('Error handling general calendar query', {
        callSid,
        error: error.message
      });

      return {
        success: false,
        response: "I'm having trouble checking your calendar right now. Please try again.",
        error: error.message
      };
    }
  }

      // Use LLM with tool calling to determine intent and execute calendar operations
      const tools = this.getCalendarTools();

      logger.info('Retrieved calendar tools for LLM', {
        callSid,
        toolCount: tools.length,
        toolNames: tools.map(t => t.function.name)
      });

      const systemPrompt = `You are a helpful calendar assistant. The user is speaking to you over the phone, so keep responses brief and conversational.

You have access to calendar tools to help with:
- Querying calendar events and schedules
- Getting detailed information about specific events
- Creating new calendar events
- Updating existing events
- Deleting/canceling events

When the user asks about calendar-related tasks, use the appropriate tools to help them. If the request is not calendar-related, respond that you can only help with calendar operations.

IMPORTANT: For time-specific queries like "What's my appointment at 4:30?", use the get_event_details tool with the time_reference parameter.

Current date and time context: ${new Date().toLocaleString('en-US', {
  weekday: 'long',
  year: 'numeric',
  month: 'long',
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
  hour12: true,
  timeZone: 'America/Los_Angeles'
})}`;

      const messages = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage }
      ];

      logger.info('Calling LLM with calendar tools', {
        callSid,
        toolCount: tools.length,
        message: userMessage.substring(0, 50),
        hasOpenRouter: !!this.openRouter
      });

      // Call OpenRouter with tool calling
      const response = await this.openRouter.generateResponseWithTools(messages, tools, callSid);

      logger.info('LLM response received', {
        callSid,
        success: response.success,
        hasToolCalls: !!(response.toolCalls && response.toolCalls.length > 0),
        toolCallCount: response.toolCalls?.length || 0,
        responseText: response.text?.substring(0, 100)
      });

      if (!response.success) {
        logger.error('LLM tool calling failed, trying fallback', {
          callSid,
          error: response.error
        });

        // Fallback to legacy regex-based approach for debugging
        logger.info('Attempting fallback to legacy approach', { callSid });
        return await this.legacyProcessCalendarCommand(userMessage, callSid);
      }

      // Check if LLM used tools
      if (response.toolCalls && response.toolCalls.length > 0) {
        logger.info('LLM made tool calls', {
          callSid,
          toolCallCount: response.toolCalls.length,
          tools: response.toolCalls.map(tc => tc.function.name)
        });

        // Execute the tool calls
        const toolResults = await this.executeToolCalls(response.toolCalls, callSid);

        // Generate final response based on tool results
        const finalResponse = await this.generateFinalResponse(userMessage, toolResults, callSid);

        return {
          success: true,
          response: finalResponse,
          intent: 'calendar_operation',
          toolCalls: response.toolCalls.map(tc => tc.function.name),
          toolResults: toolResults
        };
      } else {
        // LLM responded without using tools - try legacy approach
        logger.info('LLM responded without tools, trying legacy approach', {
          callSid,
          response: response.text?.substring(0, 100)
        });

        // Try legacy approach as fallback
        const legacyResult = await this.legacyProcessCalendarCommand(userMessage, callSid);
        if (legacyResult) {
          return legacyResult;
        }

        // Check if the response indicates it's not a calendar command
        if (response.text && response.text.toLowerCase().includes('calendar')) {
          return {
            success: true,
            response: response.text,
            intent: 'calendar_general'
          };
        } else {
          // Not a calendar command
          return null;
        }
      }

    } catch (error) {
      logger.error('Error processing calendar voice command with LLM', {
        callSid,
        error: error.message,
        stack: error.stack
      });

      return {
        success: false,
        response: "I'm having trouble accessing your calendar right now. Please try again in a moment.",
        error: error.message
      };
    }
  }

  /**
   * Execute tool calls made by the LLM
   */
  async executeToolCalls(toolCalls, callSid) {
    const results = [];

    for (const toolCall of toolCalls) {
      const { name, arguments: args } = toolCall.function;

      logger.info('Executing tool call', {
        callSid,
        toolName: name,
        arguments: args
      });

      try {
        let result;

        switch (name) {
          case 'query_calendar_events':
            result = await this.executeQueryCalendarEvents(args, callSid);
            break;
          case 'get_event_details':
            result = await this.executeGetEventDetails(args, callSid);
            break;
          case 'create_calendar_event':
            result = await this.executeCreateCalendarEvent(args, callSid);
            break;
          case 'update_calendar_event':
            result = await this.executeUpdateCalendarEvent(args, callSid);
            break;
          case 'delete_calendar_event':
            result = await this.executeDeleteCalendarEvent(args, callSid);
            break;
          default:
            result = {
              success: false,
              error: `Unknown tool: ${name}`
            };
        }

        results.push({
          toolName: name,
          arguments: args,
          result: result
        });

      } catch (error) {
        logger.error('Error executing tool call', {
          callSid,
          toolName: name,
          error: error.message
        });

        results.push({
          toolName: name,
          arguments: args,
          result: {
            success: false,
            error: error.message
          }
        });
      }
    }

    return results;
  }

  /**
   * Generate final response based on tool results
   */
  async generateFinalResponse(originalMessage, toolResults, callSid) {
    // Create a summary of tool results for the LLM
    const toolSummary = toolResults.map(tr => {
      return `Tool: ${tr.toolName}\nResult: ${JSON.stringify(tr.result, null, 2)}`;
    }).join('\n\n');

    const responsePrompt = `Based on the user's request: "${originalMessage}"

Tool execution results:
${toolSummary}

Generate a brief, conversational response for a phone call. Keep it natural and friendly, focusing on the key information the user needs. If there were errors, explain them simply.`;

    try {
      const response = await this.openRouter.generateResponse(responsePrompt, [], callSid);
      return response.text || "I've processed your calendar request.";
    } catch (error) {
      logger.error('Error generating final response', {
        callSid,
        error: error.message
      });

      // Fallback to a simple response based on tool results
      const successfulResults = toolResults.filter(tr => tr.result.success);
      if (successfulResults.length > 0) {
        return "I've updated your calendar as requested.";
      } else {
        return "I had trouble processing your calendar request. Please try again.";
      }
    }
  }

  /**
   * Execute query calendar events tool with comprehensive event details
   */
  async executeQueryCalendarEvents(args, callSid) {
    try {
      const { timeframe, specific_date, specific_time, time_period } = args;

      let filterToday = false;
      let maxResults = 10;

      // Determine query parameters based on timeframe
      if (timeframe === 'today' || time_period) {
        filterToday = true;
        maxResults = 5;
      }

      const events = await this.calendar.listEvents(maxResults, null, null, filterToday);

      logger.info('Retrieved calendar events via tool', {
        callSid,
        eventCount: events.length,
        timeframe,
        filterToday
      });

      // Enhance events with comprehensive details for LLM context
      const enhancedEvents = events.map(event => {
        const startTime = event.start?.dateTime || event.start?.date;
        const endTime = event.end?.dateTime || event.end?.date;

        return {
          id: event.id,
          title: event.summary || 'Untitled Event',
          description: event.description || 'No description provided',
          startTime: startTime,
          endTime: endTime,
          startTimeFormatted: startTime ? new Date(startTime).toLocaleString('en-US', {
            weekday: 'long',
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
            hour12: true,
            timeZone: 'America/Los_Angeles'
          }) : 'No start time',
          endTimeFormatted: endTime ? new Date(endTime).toLocaleString('en-US', {
            weekday: 'long',
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
            hour12: true,
            timeZone: 'America/Los_Angeles'
          }) : 'No end time',
          location: event.location || 'No location specified',
          attendees: event.attendees ? event.attendees.map(attendee => ({
            name: attendee.displayName || attendee.email,
            email: attendee.email,
            status: attendee.responseStatus
          })) : [],
          status: event.status || 'confirmed',
          isRecurring: !!(event.recurrence && event.recurrence.length > 0),
          recurrenceInfo: event.recurrence ? event.recurrence.join(', ') : null,
          creator: event.creator ? {
            name: event.creator.displayName || event.creator.email,
            email: event.creator.email
          } : null,
          organizer: event.organizer ? {
            name: event.organizer.displayName || event.organizer.email,
            email: event.organizer.email
          } : null,
          htmlLink: event.htmlLink,
          timeZone: event.start?.timeZone || 'America/Los_Angeles'
        };
      });

      logger.info('Enhanced events with comprehensive details', {
        callSid,
        eventCount: enhancedEvents.length,
        sampleEvent: enhancedEvents[0] ? {
          title: enhancedEvents[0].title,
          hasDescription: !!enhancedEvents[0].description,
          hasLocation: !!enhancedEvents[0].location,
          attendeeCount: enhancedEvents[0].attendees.length
        } : null
      });

      return {
        success: true,
        events: enhancedEvents,
        eventCount: enhancedEvents.length,
        timeframe: timeframe,
        enhancedData: true
      };

    } catch (error) {
      logger.error('Error executing query calendar events', {
        callSid,
        error: error.message
      });

      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Execute get event details tool with comprehensive information
   */
  async executeGetEventDetails(args, callSid) {
    try {
      const { time_reference, event_title, date } = args;

      logger.info('Getting event details for time reference', {
        callSid,
        timeReference: time_reference,
        eventTitle: event_title,
        date: date
      });

      // Get today's events to search through
      const events = await this.calendar.listEvents(20, null, null, true);

      logger.info('Retrieved events for detail search', {
        callSid,
        totalEvents: events.length
      });

      // Parse the time reference to find matching events
      const targetTime = this.parseTimeReference(time_reference);

      logger.info('Parsed time reference', {
        callSid,
        targetTime,
        originalReference: time_reference
      });

      // Find events around the specified time (within 30 minutes)
      const matchingEvents = events.filter(event => {
        const startTime = event.start?.dateTime;
        if (!startTime) return false;

        const eventDate = new Date(startTime);
        const eventHour = eventDate.getHours();
        const eventMinute = eventDate.getMinutes();

        // Check if event time is within 30 minutes of requested time
        const eventTotalMinutes = eventHour * 60 + eventMinute;
        const targetTotalMinutes = targetTime.hour * 60 + targetTime.minute;
        const timeDiff = Math.abs(eventTotalMinutes - targetTotalMinutes);

        logger.info('Checking event time match', {
          callSid,
          eventTitle: event.summary,
          eventTime: `${eventHour}:${eventMinute.toString().padStart(2, '0')}`,
          targetTime: `${targetTime.hour}:${targetTime.minute.toString().padStart(2, '0')}`,
          timeDiff,
          withinRange: timeDiff <= 30
        });

        return timeDiff <= 30; // Within 30 minutes
      });

      logger.info('Found matching events for time reference', {
        callSid,
        timeReference: time_reference,
        matchingEvents: matchingEvents.length,
        eventTitles: matchingEvents.map(e => e.summary)
      });

      if (matchingEvents.length === 0) {
        return {
          success: true,
          events: [],
          message: `No events found around ${time_reference}`,
          searchDetails: {
            targetTime,
            totalEventsSearched: events.length
          }
        };
      }

      // Return the closest match with comprehensive details
      const event = matchingEvents[0];
      const startTime = event.start?.dateTime || event.start?.date;
      const endTime = event.end?.dateTime || event.end?.date;

      const comprehensiveDetails = {
        id: event.id,
        title: event.summary || 'Untitled Event',
        description: event.description || 'No description provided',
        location: event.location || 'No location specified',
        startTime: startTime,
        endTime: endTime,
        startTimeFormatted: startTime ? new Date(startTime).toLocaleString('en-US', {
          weekday: 'long',
          month: 'short',
          day: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
          hour12: true,
          timeZone: 'America/Los_Angeles'
        }) : 'No start time',
        endTimeFormatted: endTime ? new Date(endTime).toLocaleString('en-US', {
          weekday: 'long',
          month: 'short',
          day: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
          hour12: true,
          timeZone: 'America/Los_Angeles'
        }) : 'No end time',
        duration: startTime && endTime ?
          Math.round((new Date(endTime) - new Date(startTime)) / (1000 * 60)) + ' minutes' :
          'Duration unknown',
        attendees: event.attendees ? event.attendees.map(attendee => ({
          name: attendee.displayName || attendee.email,
          email: attendee.email,
          status: attendee.responseStatus || 'unknown'
        })) : [],
        status: event.status || 'confirmed',
        isRecurring: !!(event.recurrence && event.recurrence.length > 0),
        recurrenceInfo: event.recurrence ? event.recurrence.join(', ') : null,
        creator: event.creator ? {
          name: event.creator.displayName || event.creator.email,
          email: event.creator.email
        } : null,
        organizer: event.organizer ? {
          name: event.organizer.displayName || event.organizer.email,
          email: event.organizer.email
        } : null,
        htmlLink: event.htmlLink,
        timeZone: event.start?.timeZone || 'America/Los_Angeles',
        privacy: event.visibility || 'default'
      };

      logger.info('Returning comprehensive event details', {
        callSid,
        eventTitle: comprehensiveDetails.title,
        hasDescription: !!comprehensiveDetails.description,
        hasLocation: !!comprehensiveDetails.location,
        attendeeCount: comprehensiveDetails.attendees.length,
        duration: comprehensiveDetails.duration
      });

      return {
        success: true,
        event: event,
        eventDetails: comprehensiveDetails,
        matchingEvents: matchingEvents.length,
        searchCriteria: {
          timeReference: time_reference,
          targetTime,
          searchRadius: '30 minutes'
        }
      };

    } catch (error) {
      logger.error('Error executing get event details', {
        callSid,
        error: error.message,
        stack: error.stack
      });

      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Parse time reference into hour and minute
   */
  parseTimeReference(timeRef) {
    // Handle various time formats
    const timeMatch = timeRef.match(/(\d{1,2}):?(\d{0,2})\s*(am|pm|AM|PM)?/i);

    if (timeMatch) {
      let hour = parseInt(timeMatch[1]);
      let minute = timeMatch[2] ? parseInt(timeMatch[2]) : 0;
      const period = timeMatch[3];

      // Convert to 24-hour format
      if (period) {
        const isPM = period.toLowerCase() === 'pm';
        if (isPM && hour !== 12) {
          hour += 12;
        } else if (!isPM && hour === 12) {
          hour = 0;
        }
      }

      return { hour, minute };
    }

    // Default fallback
    return { hour: 12, minute: 0 };
  }

  /**
   * Execute create calendar event tool
   */
  async executeCreateCalendarEvent(args, callSid) {
    try {
      const { title, date, start_time, duration_minutes = 60, description, attendees } = args;

      // Parse the date and time
      const startDateTime = this.parseDateTime(date, start_time);
      const endDateTime = this.parseDateTime(date, start_time, duration_minutes);

      const eventData = {
        title: title,
        description: description || `Created via voice command`,
        startDateTime: startDateTime,
        endDateTime: endDateTime,
        timeZone: 'America/Los_Angeles'
      };

      const event = await this.calendar.createEvent(eventData);

      logger.info('Created calendar event via LLM tool', {
        callSid,
        eventId: event.id,
        title: title
      });

      return {
        success: true,
        event: event,
        eventId: event.id,
        title: title,
        startTime: startDateTime,
        endTime: endDateTime
      };

    } catch (error) {
      logger.error('Error executing create calendar event', {
        callSid,
        error: error.message
      });

      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Execute update calendar event tool
   */
  async executeUpdateCalendarEvent(args, callSid) {
    // For now, return a message that this feature is coming soon
    return {
      success: false,
      message: "Event updating is coming soon. For now, you can cancel the old event and create a new one."
    };
  }

  /**
   * Execute delete calendar event tool
   */
  async executeDeleteCalendarEvent(args, callSid) {
    // For now, return a message that this feature is coming soon
    return {
      success: false,
      message: "Event deletion is coming soon. You can cancel events through the web interface for now."
    };
  }

  /**
   * Parse date and time into ISO string
   */
  parseDateTime(dateRef, timeRef, offsetMinutes = 0) {
    const now = new Date();
    let targetDate = new Date(now);

    // Handle date reference
    if (dateRef === 'tomorrow') {
      targetDate.setDate(now.getDate() + 1);
    }
    // 'today' is default

    // Handle time reference
    if (timeRef) {
      const timeMatch = timeRef.match(/(\d{1,2}):?(\d{0,2})\s*(am|pm|AM|PM)?/i);
      if (timeMatch) {
        let hour = parseInt(timeMatch[1]);
        let minute = timeMatch[2] ? parseInt(timeMatch[2]) : 0;
        const period = timeMatch[3];

        if (period) {
          const isPM = period.toLowerCase() === 'pm';
          if (isPM && hour !== 12) hour += 12;
          if (!isPM && hour === 12) hour = 0;
        }

        targetDate.setHours(hour, minute, 0, 0);
      }
    } else {
      // Default to next hour
      targetDate.setHours(now.getHours() + 1, 0, 0, 0);
    }

    // Add offset for end time
    if (offsetMinutes > 0) {
      targetDate.setMinutes(targetDate.getMinutes() + offsetMinutes);
    }

    return targetDate.toISOString();
  }

  /**
   * Detect calendar intent from user message (legacy method - kept for compatibility)
   */
  detectCalendarIntent(message) {
    const lowerMessage = message.toLowerCase();

    logger.info('Detecting calendar intent', {
      message: message,
      lowerMessage: lowerMessage
    });
    
    // Calendar query patterns
    const queryPatterns = [
      /what.*on.*calendar/i,
      /what.*scheduled/i,
      /any.*meetings?/i,
      /any.*appointments?/i,
      /what.*today/i,
      /what.*tomorrow/i,
      /check.*calendar/i,
      /show.*calendar/i,
      /calendar.*today/i,
      /calendar.*tomorrow/i,
      /do i have/i,
      /am i free/i,
      /what.*this (morning|afternoon|evening)/i,
      // Event detail patterns
      /what.*appointment.*about/i,
      /tell me.*about.*meeting/i,
      /details.*about.*event/i,
      /what.*meeting.*at/i,
      /what.*appointment.*at/i,
      /what.*event.*at/i,
      /describe.*meeting/i,
      /describe.*appointment/i,
      /more.*details.*about/i,
      /what.*(\d{1,2}:?\d{0,2}\s*(am|pm)?)/i, // Time-specific queries
      /appointment.*at.*(\d{1,2}:?\d{0,2}\s*(am|pm)?)/i, // "appointment at 4:30"
      /meeting.*at.*(\d{1,2}:?\d{0,2}\s*(am|pm)?)/i, // "meeting at 4:30"
      /event.*at.*(\d{1,2}:?\d{0,2}\s*(am|pm)?)/i, // "event at 4:30"
      /appointment.*about.*at/i, // "appointment about at 4:30"
      /tell.*me.*what.*at/i // "tell me what at 4:30"
    ];

    // Event creation patterns
    const createPatterns = [
      /schedule.*meeting/i,
      /book.*appointment/i,
      /add.*calendar/i,
      /create.*event/i,
      /set.*meeting/i,
      /plan.*meeting/i,
      /schedule.*call/i,
      /book.*lunch/i,
      /schedule.*dinner/i,
      /add.*event/i
    ];

    // Event update patterns
    const updatePatterns = [
      /move.*meeting/i,
      /reschedule/i,
      /change.*time/i,
      /update.*meeting/i,
      /shift.*appointment/i,
      /move.*to/i
    ];

    // Event deletion patterns
    const deletePatterns = [
      /cancel.*meeting/i,
      /delete.*event/i,
      /remove.*appointment/i,
      /cancel.*appointment/i,
      /delete.*meeting/i,
      /cancel.*call/i
    ];

    // Check patterns
    if (queryPatterns.some(pattern => {
      const matches = pattern.test(lowerMessage);
      if (matches) {
        logger.info('Query pattern matched', { pattern: pattern.toString(), message: lowerMessage });
      }
      return matches;
    })) {
      const timeRef = this.extractTimeReference(message);
      logger.info('Calendar query detected', { timeReference: timeRef });
      return {
        isCalendarCommand: true,
        type: 'query',
        originalMessage: message,
        timeReference: timeRef
      };
    }

    if (createPatterns.some(pattern => pattern.test(lowerMessage))) {
      return {
        isCalendarCommand: true,
        type: 'create',
        originalMessage: message,
        eventDetails: this.extractEventDetails(message)
      };
    }

    if (updatePatterns.some(pattern => pattern.test(lowerMessage))) {
      return {
        isCalendarCommand: true,
        type: 'update',
        originalMessage: message,
        eventDetails: this.extractEventDetails(message)
      };
    }

    if (deletePatterns.some(pattern => pattern.test(lowerMessage))) {
      return {
        isCalendarCommand: true,
        type: 'delete',
        originalMessage: message,
        eventDetails: this.extractEventDetails(message)
      };
    }

    logger.info('No calendar intent detected', { message: lowerMessage });
    return {
      isCalendarCommand: false,
      type: null,
      originalMessage: message
    };
  }

  /**
   * Extract time reference from message
   */
  extractTimeReference(message) {
    const lowerMessage = message.toLowerCase();

    // Check for specific time mentions first
    const specificTimeMatch = message.match(/(\d{1,2}):?(\d{1,2})?\s*(am|pm|AM|PM)?/i);
    if (specificTimeMatch) {
      return {
        type: 'specific_time',
        time: specificTimeMatch[0],
        hour: parseInt(specificTimeMatch[1]),
        minute: specificTimeMatch[2] ? parseInt(specificTimeMatch[2]) : 0,
        period: specificTimeMatch[3] || null
      };
    }

    // Time patterns
    const timePatterns = {
      today: /today|this morning|this afternoon|this evening/i,
      tomorrow: /tomorrow|tomorrow morning|tomorrow afternoon/i,
      thisWeek: /this week|next few days/i,
      afternoon: /afternoon|this afternoon|today afternoon/i,
      morning: /morning|this morning|today morning/i,
      evening: /evening|this evening|tonight/i
    };

    for (const [key, pattern] of Object.entries(timePatterns)) {
      if (pattern.test(lowerMessage)) {
        return { type: 'general', period: key };
      }
    }

    return { type: 'general', period: 'today' }; // Default to today
  }

  /**
   * Extract event details from message
   */
  extractEventDetails(message) {
    // This is a simplified extraction - in production, you'd use more sophisticated NLP
    const details = {
      title: null,
      time: null,
      date: null,
      participants: []
    };

    // Extract potential meeting titles
    const meetingMatch = message.match(/meeting with ([^,\s]+)/i);
    if (meetingMatch) {
      details.title = `Meeting with ${meetingMatch[1]}`;
      details.participants.push(meetingMatch[1]);
    }

    // Extract time references
    const timeMatch = message.match(/(\d{1,2})\s*(am|pm|AM|PM)/i);
    if (timeMatch) {
      details.time = timeMatch[0];
    }

    // Extract date references
    if (/tomorrow/i.test(message)) {
      details.date = 'tomorrow';
    } else if (/today/i.test(message)) {
      details.date = 'today';
    }

    return details;
  }

  /**
   * Handle calendar queries
   */
  async handleCalendarQuery(intent, callSid) {
    try {
      const timeRef = intent.timeReference;

      // Check if this is a specific time query (e.g., "what's my appointment at 4:30?")
      if (timeRef.type === 'specific_time') {
        return await this.handleSpecificTimeQuery(intent, callSid);
      }

      let filterToday = false;
      let maxResults = 10;
      const period = timeRef.period || timeRef;

      if (period === 'today' || period === 'morning' || period === 'afternoon' || period === 'evening') {
        filterToday = true;
        maxResults = 5;
      }

      const events = await this.calendar.listEvents(maxResults, null, null, filterToday);

      logger.info('Retrieved calendar events for voice query', {
        callSid,
        eventCount: events.length,
        filterToday
      });

      if (events.length === 0) {
        const timeDescription = filterToday ? 'today' : 'coming up';
        return {
          success: true,
          response: `You don't have any events scheduled ${timeDescription}. Your calendar is clear!`,
          intent: 'query',
          eventCount: 0
        };
      }

      // Format events for voice response with more details
      const eventDescriptions = events.slice(0, 3).map(event => {
        const startTime = event.start?.dateTime || event.start?.date;
        const timeStr = startTime ? new Date(startTime).toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        }) : '';

        let description = `${event.summary || 'Untitled event'}${timeStr ? ` at ${timeStr}` : ''}`;

        // Add event description if available and query seems to want details
        if (event.description && intent.originalMessage.toLowerCase().includes('about')) {
          const shortDesc = event.description.length > 50
            ? event.description.substring(0, 50) + '...'
            : event.description;
          description += ` - ${shortDesc}`;
        }

        return description;
      });

      const timeDescription = filterToday ? 'today' : 'coming up';
      let response = `You have ${events.length} event${events.length > 1 ? 's' : ''} ${timeDescription}. `;

      if (events.length <= 3) {
        response += eventDescriptions.join(', ');
      } else {
        response += `Your next few are: ${eventDescriptions.join(', ')}, and ${events.length - 3} more.`;
      }

      return {
        success: true,
        response,
        intent: 'query',
        eventCount: events.length,
        events: events.slice(0, 3)
      };

    } catch (error) {
      logger.error('Error handling calendar query', { callSid, error: error.message });
      return {
        success: false,
        response: "I'm having trouble checking your calendar right now. Please try again.",
        error: error.message
      };
    }
  }

  /**
   * Handle specific time queries (e.g., "what's my appointment at 4:30?")
   */
  async handleSpecificTimeQuery(intent, callSid) {
    try {
      const timeRef = intent.timeReference;
      const targetHour = timeRef.hour;
      const targetMinute = timeRef.minute;

      // Convert to 24-hour format if needed
      let searchHour = targetHour;
      if (timeRef.period) {
        const isPM = timeRef.period.toLowerCase() === 'pm';
        if (isPM && targetHour !== 12) {
          searchHour = targetHour + 12;
        } else if (!isPM && targetHour === 12) {
          searchHour = 0;
        }
      }

      // Get today's events
      const events = await this.calendar.listEvents(20, null, null, true);

      // Find events around the specified time (within 30 minutes)
      const matchingEvents = events.filter(event => {
        const startTime = event.start?.dateTime;
        if (!startTime) return false;

        const eventDate = new Date(startTime);
        const eventHour = eventDate.getHours();
        const eventMinute = eventDate.getMinutes();

        // Check if event time is within 30 minutes of requested time
        const eventTotalMinutes = eventHour * 60 + eventMinute;
        const targetTotalMinutes = searchHour * 60 + targetMinute;
        const timeDiff = Math.abs(eventTotalMinutes - targetTotalMinutes);

        return timeDiff <= 30; // Within 30 minutes
      });

      logger.info('Found events for specific time query', {
        callSid,
        targetTime: `${targetHour}:${targetMinute.toString().padStart(2, '0')} ${timeRef.period || ''}`,
        matchingEvents: matchingEvents.length
      });

      if (matchingEvents.length === 0) {
        return {
          success: true,
          response: `I don't see any appointments around ${timeRef.time}. Your calendar looks clear at that time.`,
          intent: 'query',
          eventCount: 0
        };
      }

      // Provide detailed information about the matching event(s)
      const event = matchingEvents[0]; // Take the closest match
      const startTime = new Date(event.start.dateTime);
      const endTime = event.end?.dateTime ? new Date(event.end.dateTime) : null;

      const timeStr = startTime.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });

      const endTimeStr = endTime ? endTime.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      }) : null;

      let response = `At ${timeStr}, you have "${event.summary || 'Untitled event'}"`;

      if (endTimeStr) {
        response += ` until ${endTimeStr}`;
      }

      if (event.description) {
        const description = event.description.length > 100
          ? event.description.substring(0, 100) + '...'
          : event.description;
        response += `. Details: ${description}`;
      }

      if (event.location) {
        response += ` Location: ${event.location}`;
      }

      return {
        success: true,
        response,
        intent: 'query',
        eventCount: matchingEvents.length,
        events: [event]
      };

    } catch (error) {
      logger.error('Error handling specific time query', { callSid, error: error.message });
      return {
        success: false,
        response: "I'm having trouble finding that specific appointment. Please try again.",
        error: error.message
      };
    }
  }

  /**
   * Handle event creation
   */
  async handleEventCreation(intent, callSid) {
    try {
      const details = intent.eventDetails;
      
      // For now, create a simple event - in production, you'd parse more details
      const eventData = {
        title: details.title || 'Voice-created event',
        description: `Created via voice command: "${intent.originalMessage}"`,
        startDateTime: this.parseDateTime(details.date, details.time),
        endDateTime: this.parseDateTime(details.date, details.time, 60), // 1 hour duration
        timeZone: 'America/Los_Angeles'
      };

      const event = await this.calendar.createEvent(eventData);
      
      logger.info('Created calendar event via voice', {
        callSid,
        eventId: event.id,
        title: eventData.title
      });

      return {
        success: true,
        response: `Perfect! I've scheduled "${eventData.title}" for you.`,
        intent: 'create',
        eventId: event.id,
        eventTitle: eventData.title
      };

    } catch (error) {
      logger.error('Error creating calendar event via voice', { callSid, error: error.message });
      return {
        success: false,
        response: "I had trouble creating that event. Could you try again with more specific details?",
        error: error.message
      };
    }
  }

  /**
   * Handle event updates (simplified for now)
   */
  async handleEventUpdate(intent, callSid) {
    return {
      success: false,
      response: "I can help you update events, but I'll need you to be more specific about which event and what changes you'd like to make.",
      intent: 'update'
    };
  }

  /**
   * Handle event deletion (simplified for now)
   */
  async handleEventDeletion(intent, callSid) {
    return {
      success: false,
      response: "I can help you cancel events, but I'll need you to be more specific about which event you'd like to cancel.",
      intent: 'delete'
    };
  }

  /**
   * Parse date and time into ISO string
   */
  parseDateTime(dateRef, timeRef, offsetMinutes = 0) {
    const now = new Date();
    let targetDate = new Date(now);

    // Handle date reference
    if (dateRef === 'tomorrow') {
      targetDate.setDate(now.getDate() + 1);
    }
    // 'today' is default

    // Handle time reference
    if (timeRef) {
      const timeMatch = timeRef.match(/(\d{1,2})\s*(am|pm|AM|PM)/i);
      if (timeMatch) {
        let hour = parseInt(timeMatch[1]);
        const isPM = timeMatch[2].toLowerCase() === 'pm';
        
        if (isPM && hour !== 12) hour += 12;
        if (!isPM && hour === 12) hour = 0;
        
        targetDate.setHours(hour, 0, 0, 0);
      }
    } else {
      // Default to next hour
      targetDate.setHours(now.getHours() + 1, 0, 0, 0);
    }

    // Add offset for end time
    if (offsetMinutes > 0) {
      targetDate.setMinutes(targetDate.getMinutes() + offsetMinutes);
    }

    return targetDate.toISOString();
  }

  /**
   * Legacy calendar processing for fallback (enhanced with comprehensive event details)
   */
  async legacyProcessCalendarCommand(userMessage, callSid) {
    try {
      logger.info('Processing with legacy approach (enhanced)', {
        callSid,
        message: userMessage.substring(0, 100)
      });

      // Detect calendar intent using enhanced patterns
      const intent = this.detectCalendarIntent(userMessage);

      if (!intent.isCalendarCommand) {
        logger.info('Not detected as calendar command by legacy approach', { callSid });
        return null;
      }

      logger.info('Legacy approach detected calendar intent', {
        callSid,
        type: intent.type,
        timeReference: intent.timeReference
      });

      // Process based on intent with comprehensive event details
      switch (intent.type) {
        case 'query':
          return await this.legacyHandleCalendarQuery(intent, callSid);
        default:
          return {
            success: false,
            response: "I understand you want help with your calendar, but I'm not sure exactly what you'd like me to do. Could you be more specific?",
            intent: intent.type
          };
      }

    } catch (error) {
      logger.error('Error in legacy calendar processing', {
        callSid,
        error: error.message
      });

      return {
        success: false,
        response: "I'm having trouble accessing your calendar right now. Please try again in a moment.",
        error: error.message
      };
    }
  }

  /**
   * Legacy calendar query handler with comprehensive event details
   */
  async legacyHandleCalendarQuery(intent, callSid) {
    try {
      const timeRef = intent.timeReference;

      // Check if this is a specific time query
      if (timeRef.type === 'specific_time') {
        logger.info('Legacy handling specific time query', {
          callSid,
          timeReference: timeRef
        });

        // Use the enhanced event details method
        const result = await this.executeGetEventDetails({
          time_reference: timeRef.time,
          date: 'today'
        }, callSid);

        if (result.success && result.eventDetails) {
          const event = result.eventDetails;
          let response = `At ${event.startTimeFormatted}, you have "${event.title}".`;

          if (event.description && event.description !== 'No description provided') {
            response += ` Details: ${event.description}`;
          }

          if (event.location && event.location !== 'No location specified') {
            response += ` Location: ${event.location}`;
          }

          if (event.attendees && event.attendees.length > 0) {
            const attendeeNames = event.attendees.map(a => a.name).join(', ');
            response += ` Attendees: ${attendeeNames}`;
          }

          return {
            success: true,
            response: response,
            intent: 'query',
            eventDetails: event,
            method: 'legacy_enhanced'
          };
        } else {
          return {
            success: true,
            response: `I don't see any appointments around ${timeRef.time}. Your calendar looks clear at that time.`,
            intent: 'query',
            method: 'legacy_enhanced'
          };
        }
      }

      // Handle general queries
      let filterToday = false;
      let maxResults = 10;
      const period = timeRef.period || timeRef;

      if (period === 'today' || period === 'morning' || period === 'afternoon' || period === 'evening') {
        filterToday = true;
        maxResults = 5;
      }

      const events = await this.calendar.listEvents(maxResults, null, null, filterToday);

      if (events.length === 0) {
        const timeDescription = filterToday ? 'today' : 'coming up';
        return {
          success: true,
          response: `You don't have any events scheduled ${timeDescription}. Your calendar is clear!`,
          intent: 'query',
          eventCount: 0,
          method: 'legacy_enhanced'
        };
      }

      // Format events with comprehensive details
      const eventDescriptions = events.slice(0, 3).map(event => {
        const startTime = event.start?.dateTime || event.start?.date;
        const timeStr = startTime ? new Date(startTime).toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        }) : '';

        let description = `${event.summary || 'Untitled event'}${timeStr ? ` at ${timeStr}` : ''}`;

        // Add event description if available and query seems to want details
        if (event.description && intent.originalMessage.toLowerCase().includes('about')) {
          const shortDesc = event.description.length > 50
            ? event.description.substring(0, 50) + '...'
            : event.description;
          description += ` - ${shortDesc}`;
        }

        return description;
      });

      const timeDescription = filterToday ? 'today' : 'coming up';
      let response = `You have ${events.length} event${events.length > 1 ? 's' : ''} ${timeDescription}. `;

      if (events.length <= 3) {
        response += eventDescriptions.join(', ');
      } else {
        response += `Your next few are: ${eventDescriptions.join(', ')}, and ${events.length - 3} more.`;
      }

      return {
        success: true,
        response,
        intent: 'query',
        eventCount: events.length,
        events: events.slice(0, 3),
        method: 'legacy_enhanced'
      };

    } catch (error) {
      logger.error('Error in legacy calendar query handler', { callSid, error: error.message });
      return {
        success: false,
        response: "I'm having trouble checking your calendar right now. Please try again.",
        error: error.message
      };
    }
  }
}
