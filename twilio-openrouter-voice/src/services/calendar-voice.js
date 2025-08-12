/**
 * Calendar Voice Service
 * =====================
 * 
 * Handles calendar operations for voice conversations
 */

import { GoogleCalendarService } from './google-calendar.js';
import { logger } from '../utils/logger.js';

export class CalendarVoiceService {
  constructor(googleCalendar = null, openRouter = null) {
    // Use provided authenticated calendar service or create new one
    this.calendar = googleCalendar || new GoogleCalendarService();
    this.openRouter = openRouter;

    // Initialize calendar if it's a new instance
    if (!googleCalendar) {
      this.calendar.initialize();
    }
  }

  /**
   * Process calendar-related voice commands
   */
  async processCalendarCommand(userMessage, callSid) {
    try {
      logger.info('Processing calendar voice command', {
        callSid,
        message: userMessage.substring(0, 100)
      });

      // Detect calendar intent
      const intent = this.detectCalendarIntent(userMessage);
      
      if (!intent.isCalendarCommand) {
        return null; // Not a calendar command
      }

      // Check authentication
      if (!this.calendar.isAuthenticated()) {
        return {
          success: false,
          response: "I'd love to help with your calendar, but I need to be connected to your Google Calendar first. Please set that up through the web interface.",
          intent: intent.type
        };
      }

      // Process based on intent
      switch (intent.type) {
        case 'query':
          return await this.handleCalendarQuery(intent, callSid);
        case 'create':
          return await this.handleEventCreation(intent, callSid);
        case 'update':
          return await this.handleEventUpdate(intent, callSid);
        case 'delete':
          return await this.handleEventDeletion(intent, callSid);
        default:
          return {
            success: false,
            response: "I understand you want help with your calendar, but I'm not sure exactly what you'd like me to do. Could you be more specific?",
            intent: intent.type
          };
      }

    } catch (error) {
      logger.error('Error processing calendar voice command', {
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
   * Detect calendar intent from user message
   */
  detectCalendarIntent(message) {
    const lowerMessage = message.toLowerCase();
    
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
      /what.*this (morning|afternoon|evening)/i
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
    if (queryPatterns.some(pattern => pattern.test(lowerMessage))) {
      return {
        isCalendarCommand: true,
        type: 'query',
        originalMessage: message,
        timeReference: this.extractTimeReference(message)
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
        return key;
      }
    }

    return 'today'; // Default to today
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
      let filterToday = false;
      let maxResults = 10;

      if (timeRef === 'today' || timeRef === 'morning' || timeRef === 'afternoon' || timeRef === 'evening') {
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
}
