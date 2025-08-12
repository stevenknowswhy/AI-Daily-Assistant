/**
 * Calendar Management Service
 * ===========================
 * 
 * Handles calendar event creation, attendee management, and Google Calendar integration
 * Supports voice-commanded event creation with LLM processing
 */

import { logger } from '../utils/logger.js';

export class CalendarManagementService {
  constructor(googleCalendarService, taskManagementService, openRouterService) {
    this.calendarService = googleCalendarService;
    this.taskService = taskManagementService;
    this.openRouterService = openRouterService;

    logger.info('CalendarManagementService initialized', {
      hasCalendarService: !!googleCalendarService,
      hasTaskService: !!taskManagementService,
      hasOpenRouter: !!openRouterService
    });
  }

  // =====================================================
  // CALENDAR EVENT CREATION
  // =====================================================

  /**
   * Process voice command to create calendar event
   */
  async processCalendarEventCommand(userId, voiceCommand) {
    try {
      // Use LLM to extract event details from voice command
      const eventDetails = await this.extractEventDetailsFromVoice(voiceCommand);

      // Create task for this calendar event
      const task = await this.taskService.createTask(userId, {
        taskType: 'calendar_event',
        taskSummary: `Create event: "${eventDetails.title}" on ${eventDetails.startTime}`,
        voiceCommand,
        llmConfidence: eventDetails.confidence,
        priority: eventDetails.isToday ? 2 : 3,
        taskDataDetails: eventDetails
      });

      // Create calendar action record
      const calendarAction = await this.taskService.createCalendarEventDraft(userId, task.id, {
        eventTitle: eventDetails.title,
        eventDescription: eventDetails.description,
        startTime: eventDetails.startTime,
        endTime: eventDetails.endTime,
        timezone: eventDetails.timezone || 'America/Los_Angeles',
        location: eventDetails.location,
        attendees: eventDetails.attendees,
        sendInvitations: eventDetails.sendInvitations !== false,
        meetingType: eventDetails.meetingType || 'in-person',
        videoCallLink: eventDetails.videoCallLink
      });

      // Update task status to draft_ready
      await this.taskService.updateTaskStatus(task.id, 'draft_ready');

      logger.info('Calendar event draft created from voice command', {
        userId,
        taskId: task.id,
        eventTitle: eventDetails.title,
        attendeeCount: eventDetails.attendees?.length || 0,
        voiceCommand
      });

      return {
        task,
        calendarAction,
        eventDetails,
        requiresApproval: true
      };
    } catch (error) {
      logger.error('Failed to process calendar event command', {
        userId,
        voiceCommand,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Extract event details from voice command using LLM
   */
  async extractEventDetailsFromVoice(voiceCommand) {
    try {
      const extractionPrompt = `Extract calendar event details from this voice command. Return a JSON object with the following structure:

{
  "title": "Event title",
  "description": "Event description (optional)",
  "startTime": "ISO 8601 timestamp",
  "endTime": "ISO 8601 timestamp", 
  "timezone": "America/Los_Angeles",
  "location": "Location (optional)",
  "attendees": ["email1@example.com", "email2@example.com"],
  "sendInvitations": true,
  "meetingType": "in-person|video_call|phone_call",
  "videoCallLink": "https://zoom.us/... (optional)",
  "isToday": true/false,
  "confidence": 0.95
}

Voice Command: "${voiceCommand}"

Current Date/Time: ${new Date().toISOString()}
Current Timezone: America/Los_Angeles

Extract the event details and return ONLY the JSON object:`;

      const llmResponse = await this.openRouterService.generateResponse([
        { role: 'user', content: extractionPrompt }
      ]);

      // Parse LLM response as JSON
      const eventDetails = JSON.parse(llmResponse.content.trim());

      // Validate required fields
      if (!eventDetails.title || !eventDetails.startTime || !eventDetails.endTime) {
        throw new Error('Missing required event details: title, startTime, or endTime');
      }

      // Ensure end time is after start time
      if (new Date(eventDetails.endTime) <= new Date(eventDetails.startTime)) {
        // Default to 1 hour duration if end time is invalid
        eventDetails.endTime = new Date(new Date(eventDetails.startTime).getTime() + 60 * 60 * 1000).toISOString();
      }

      logger.info('Event details extracted from voice command', {
        voiceCommand,
        eventTitle: eventDetails.title,
        startTime: eventDetails.startTime,
        attendeeCount: eventDetails.attendees?.length || 0,
        confidence: eventDetails.confidence
      });

      return eventDetails;
    } catch (error) {
      logger.error('Failed to extract event details from voice command', {
        voiceCommand,
        error: error.message
      });
      
      // Return basic event details as fallback
      return {
        title: 'Event from voice command',
        description: voiceCommand,
        startTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Tomorrow
        endTime: new Date(Date.now() + 25 * 60 * 60 * 1000).toISOString(), // Tomorrow + 1 hour
        timezone: 'America/Los_Angeles',
        attendees: [],
        sendInvitations: false,
        meetingType: 'in-person',
        isToday: false,
        confidence: 0.5
      };
    }
  }

  /**
   * Create calendar event in Google Calendar
   */
  async createCalendarEvent(calendarActionId) {
    try {
      // Get calendar action details
      const { data: calendarAction, error: fetchError } = await this.taskService.supabase
        .from('user_calendar_actions')
        .select('*')
        .eq('id', calendarActionId)
        .eq('event_status', 'draft')
        .single();

      if (fetchError || !calendarAction) {
        throw new Error(`Calendar action not found or not in draft status: ${calendarActionId}`);
      }

      // Prepare event data for Google Calendar
      const eventData = {
        summary: calendarAction.event_title,
        description: calendarAction.event_description,
        start: {
          dateTime: calendarAction.start_time,
          timeZone: calendarAction.timezone
        },
        end: {
          dateTime: calendarAction.end_time,
          timeZone: calendarAction.timezone
        },
        location: calendarAction.location,
        attendees: calendarAction.attendee_emails?.map(email => ({ email })) || [],
        sendUpdates: calendarAction.send_invitations ? 'all' : 'none'
      };

      // Add video call link if specified
      if (calendarAction.meeting_type === 'video_call' && calendarAction.video_call_link) {
        eventData.description = (eventData.description || '') + `\n\nJoin video call: ${calendarAction.video_call_link}`;
      }

      // Create event in Google Calendar
      const createdEvent = await this.calendarService.createEvent(eventData);

      // Update calendar action with Google Calendar details
      await this.taskService.markCalendarEventCreated(
        calendarActionId,
        createdEvent.id,
        createdEvent.htmlLink
      );

      // Complete the associated task
      const completionSummary = `Event created: "${calendarAction.event_title}" on ${new Date(calendarAction.start_time).toLocaleDateString()}`;
      await this.taskService.updateTaskStatus(calendarAction.task_id, 'completed', completionSummary);

      logger.info('Calendar event created successfully', {
        calendarActionId,
        googleEventId: createdEvent.id,
        eventTitle: calendarAction.event_title,
        attendeeCount: calendarAction.attendee_emails?.length || 0
      });

      return {
        success: true,
        googleEvent: createdEvent,
        completionSummary
      };
    } catch (error) {
      logger.error('Failed to create calendar event', {
        calendarActionId,
        error: error.message
      });
      throw error;
    }
  }

  // =====================================================
  // ATTENDEE MANAGEMENT
  // =====================================================

  /**
   * Extract attendee emails from voice command
   */
  extractAttendeesFromVoice(voiceCommand) {
    try {
      // Simple email extraction - could be enhanced with LLM
      const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
      const emails = voiceCommand.match(emailRegex) || [];

      // Also look for common patterns like "invite John" or "add Sarah"
      const namePatterns = /(?:invite|add|include)\s+([A-Za-z]+)/gi;
      const names = [];
      let match;
      while ((match = namePatterns.exec(voiceCommand)) !== null) {
        names.push(match[1]);
      }

      logger.info('Extracted attendees from voice command', {
        voiceCommand,
        emails,
        names,
        totalAttendees: emails.length + names.length
      });

      return {
        emails,
        names,
        attendees: [
          ...emails.map(email => ({ email, name: email.split('@')[0] })),
          ...names.map(name => ({ name, email: null }))
        ]
      };
    } catch (error) {
      logger.error('Failed to extract attendees from voice command', {
        voiceCommand,
        error: error.message
      });
      return { emails: [], names: [], attendees: [] };
    }
  }

  // =====================================================
  // UTILITY FUNCTIONS
  // =====================================================

  /**
   * Get user's upcoming tasks summary
   */
  async getUserTasksSummary(userId) {
    try {
      const pendingTasks = await this.taskService.getUserPendingTasks(userId);
      const completedTasks = await this.taskService.getUserCompletedTasks(userId, 5);

      const summary = {
        pending: {
          total: pendingTasks.length,
          byType: this.groupTasksByType(pendingTasks),
          urgent: pendingTasks.filter(task => task.priority <= 2).length
        },
        recentlyCompleted: completedTasks.map(task => ({
          type: task.task_type,
          summary: task.completion_summary,
          completedAt: task.completion_timestamp
        }))
      };

      logger.info('Generated user tasks summary', {
        userId,
        pendingCount: summary.pending.total,
        urgentCount: summary.pending.urgent,
        completedCount: completedTasks.length
      });

      return summary;
    } catch (error) {
      logger.error('Failed to get user tasks summary', {
        userId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Group tasks by type for summary
   */
  groupTasksByType(tasks) {
    return tasks.reduce((groups, task) => {
      const type = task.task_type;
      if (!groups[type]) {
        groups[type] = 0;
      }
      groups[type]++;
      return groups;
    }, {});
  }
}
