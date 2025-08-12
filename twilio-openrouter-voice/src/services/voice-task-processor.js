/**
 * Voice Task Processor Service
 * ============================
 * 
 * Processes voice commands and creates appropriate tasks
 * Integrates LLM analysis with task management system
 */

import { logger } from '../utils/logger.js';

export class VoiceTaskProcessor {
  constructor(openRouterService, taskManagementService, emailManagementService, calendarManagementService) {
    this.openRouterService = openRouterService;
    this.taskService = taskManagementService;
    this.emailService = emailManagementService;
    this.calendarService = calendarManagementService;

    logger.info('VoiceTaskProcessor initialized', {
      hasOpenRouter: !!openRouterService,
      hasTaskService: !!taskManagementService,
      hasEmailService: !!emailManagementService,
      hasCalendarService: !!calendarManagementService
    });
  }

  // =====================================================
  // VOICE COMMAND ANALYSIS
  // =====================================================

  /**
   * Analyze voice command and determine task type
   */
  async analyzeVoiceCommand(voiceCommand) {
    try {
      const analysisPrompt = `Analyze this voice command and determine what task the user wants to perform. Return a JSON object with the following structure:

{
  "taskType": "email_reply|email_delete|calendar_event|bill_reminder|custom",
  "confidence": 0.95,
  "intent": "Brief description of user intent",
  "extractedData": {
    "emailId": "if email-related",
    "recipient": "email address if replying",
    "subject": "email subject if replying",
    "replyInstructions": "what to say in reply",
    "eventTitle": "if calendar event",
    "eventTime": "if calendar event",
    "attendees": ["email1", "email2"],
    "location": "if calendar event",
    "deleteReason": "if deleting email"
  },
  "suggestedAction": "Human-readable description of what will be done",
  "requiresApproval": true/false
}

Voice Command: "${voiceCommand}"

Examples:
- "Reply to John and tell him I can meet tomorrow at 2 PM" → email_reply
- "Delete that spam email from yesterday" → email_delete  
- "Schedule a meeting with Sarah next Tuesday at 3 PM" → calendar_event
- "Add dentist appointment to my calendar for Friday at 10 AM" → calendar_event
- "What bills are due this week" → bill_reminder

Return ONLY the JSON object:`;

      const llmResponse = await this.openRouterService.generateResponse([
        { role: 'user', content: analysisPrompt }
      ]);

      // Parse LLM response
      const analysis = JSON.parse(llmResponse.content.trim());

      // Validate analysis
      if (!analysis.taskType || !analysis.confidence || !analysis.suggestedAction) {
        throw new Error('Invalid LLM analysis response');
      }

      logger.info('Voice command analyzed', {
        voiceCommand,
        taskType: analysis.taskType,
        confidence: analysis.confidence,
        intent: analysis.intent
      });

      return analysis;
    } catch (error) {
      logger.error('Failed to analyze voice command', {
        voiceCommand,
        error: error.message
      });
      
      // Return fallback analysis
      return {
        taskType: 'custom',
        confidence: 0.5,
        intent: 'Custom task from voice command',
        extractedData: { originalCommand: voiceCommand },
        suggestedAction: voiceCommand,
        requiresApproval: false
      };
    }
  }

  // =====================================================
  // TASK CREATION FROM VOICE COMMANDS
  // =====================================================

  /**
   * Process voice command and create appropriate task
   */
  async processVoiceCommand(userId, voiceCommand) {
    try {
      // Analyze the voice command
      const analysis = await this.analyzeVoiceCommand(voiceCommand);

      let result;

      // Route to appropriate service based on task type
      switch (analysis.taskType) {
        case 'email_reply':
          result = await this.processEmailReplyCommand(userId, voiceCommand, analysis);
          break;
        
        case 'email_delete':
          result = await this.processEmailDeleteCommand(userId, voiceCommand, analysis);
          break;
        
        case 'calendar_event':
          result = await this.processCalendarEventCommand(userId, voiceCommand, analysis);
          break;
        
        case 'bill_reminder':
          result = await this.processBillReminderCommand(userId, voiceCommand, analysis);
          break;
        
        default:
          result = await this.processCustomCommand(userId, voiceCommand, analysis);
          break;
      }

      logger.info('Voice command processed successfully', {
        userId,
        voiceCommand,
        taskType: analysis.taskType,
        taskId: result.task?.id,
        requiresApproval: result.requiresApproval
      });

      return {
        ...result,
        analysis,
        voiceResponse: this.generateVoiceResponse(analysis, result)
      };
    } catch (error) {
      logger.error('Failed to process voice command', {
        userId,
        voiceCommand,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Process email reply command
   */
  async processEmailReplyCommand(userId, voiceCommand, analysis) {
    try {
      const { extractedData } = analysis;

      // If no specific email ID, we need to find the email first
      if (!extractedData.emailId) {
        // This would typically involve searching recent emails
        // For now, create a task that requires user to specify the email
        const task = await this.taskService.createTask(userId, {
          taskType: 'email_reply',
          taskSummary: `Reply to email: ${analysis.suggestedAction}`,
          voiceCommand,
          llmConfidence: analysis.confidence,
          priority: 2,
          taskDataDetails: extractedData
        });

        return {
          task,
          requiresApproval: true,
          needsEmailSelection: true,
          message: "I'll help you reply to an email. Which email would you like me to reply to?"
        };
      }

      // Generate email reply draft
      const result = await this.emailService.generateEmailReplyDraft(
        userId,
        extractedData.emailId,
        extractedData.replyInstructions || voiceCommand
      );

      return {
        ...result,
        requiresApproval: true,
        message: `I've drafted a reply to ${result.originalEmail.from}. Would you like me to send it or would you like to review it first?`
      };
    } catch (error) {
      logger.error('Failed to process email reply command', {
        userId,
        voiceCommand,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Process calendar event command
   */
  async processCalendarEventCommand(userId, voiceCommand, analysis) {
    try {
      const result = await this.calendarService.processCalendarEventCommand(userId, voiceCommand);

      return {
        ...result,
        message: `I'll create a calendar event: "${result.eventDetails.title}" on ${new Date(result.eventDetails.startTime).toLocaleDateString()}. Should I go ahead and create it?`
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
   * Process email delete command
   */
  async processEmailDeleteCommand(userId, voiceCommand, analysis) {
    try {
      const { extractedData } = analysis;

      // Create task for email deletion
      const task = await this.taskService.createTask(userId, {
        taskType: 'email_delete',
        taskSummary: `Delete email: ${analysis.suggestedAction}`,
        voiceCommand,
        llmConfidence: analysis.confidence,
        priority: 3,
        taskDataDetails: extractedData
      });

      // Create email delete action
      const emailAction = await this.emailService.createEmailDeleteAction(userId, task.id, extractedData);

      return {
        task,
        emailAction,
        requiresApproval: true,
        message: `I'll delete the email "${extractedData.subject || 'specified email'}". Should I proceed?`
      };
    } catch (error) {
      logger.error('Failed to process email delete command', {
        userId,
        voiceCommand,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Process bill reminder command
   */
  async processBillReminderCommand(userId, voiceCommand, analysis) {
    try {
      // Create task for bill reminder
      const task = await this.taskService.createTask(userId, {
        taskType: 'bill_reminder',
        taskSummary: analysis.suggestedAction,
        voiceCommand,
        llmConfidence: analysis.confidence,
        priority: 2,
        taskDataDetails: analysis.extractedData
      });

      // Mark as completed immediately since this is informational
      await this.taskService.updateTaskStatus(task.id, 'completed', 'Bill reminder provided');

      return {
        task,
        requiresApproval: false,
        message: "I'll check your upcoming bills and include them in your briefing."
      };
    } catch (error) {
      logger.error('Failed to process bill reminder command', {
        userId,
        voiceCommand,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Process custom command
   */
  async processCustomCommand(userId, voiceCommand, analysis) {
    try {
      const task = await this.taskService.createTask(userId, {
        taskType: 'custom',
        taskSummary: analysis.suggestedAction,
        voiceCommand,
        llmConfidence: analysis.confidence,
        priority: 3,
        taskDataDetails: analysis.extractedData
      });

      return {
        task,
        requiresApproval: false,
        message: `I've noted your request: "${analysis.suggestedAction}". I'll work on this for you.`
      };
    } catch (error) {
      logger.error('Failed to process custom command', {
        userId,
        voiceCommand,
        error: error.message
      });
      throw error;
    }
  }

  // =====================================================
  // VOICE RESPONSE GENERATION
  // =====================================================

  /**
   * Generate appropriate voice response for task creation
   */
  generateVoiceResponse(analysis, result) {
    const { taskType, confidence } = analysis;
    const { requiresApproval, message } = result;

    let response = message || "I've created a task for you.";

    // Add confidence indicator for low-confidence tasks
    if (confidence < 0.7) {
      response += " Please let me know if I understood your request correctly.";
    }

    // Add approval request for tasks that require it
    if (requiresApproval) {
      response += " Would you like me to proceed?";
    }

    return response;
  }

  // =====================================================
  // TASK STATUS UPDATES
  // =====================================================

  /**
   * Handle user approval/rejection of tasks
   */
  async handleTaskApproval(userId, taskId, approved, modifications = null) {
    try {
      if (approved) {
        // Execute the approved task
        const result = await this.executeApprovedTask(userId, taskId, modifications);
        return {
          success: true,
          message: result.completionSummary || "Task completed successfully!",
          result
        };
      } else {
        // Cancel the task
        await this.taskService.updateTaskStatus(taskId, 'cancelled');
        return {
          success: true,
          message: "Task cancelled as requested."
        };
      }
    } catch (error) {
      logger.error('Failed to handle task approval', {
        userId,
        taskId,
        approved,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Execute approved task based on type
   */
  async executeApprovedTask(userId, taskId, modifications) {
    try {
      // Get task details
      const { data: task, error } = await this.taskService.supabase
        .from('user_action_tasks')
        .select('*')
        .eq('id', taskId)
        .single();

      if (error || !task) {
        throw new Error(`Task not found: ${taskId}`);
      }

      let result;

      switch (task.task_type) {
        case 'email_reply':
          result = await this.executeEmailReply(taskId, modifications);
          break;
        
        case 'calendar_event':
          result = await this.executeCalendarEvent(taskId, modifications);
          break;
        
        case 'email_delete':
          result = await this.executeEmailDeletion(taskId);
          break;
        
        default:
          // Mark custom tasks as completed
          await this.taskService.updateTaskStatus(taskId, 'completed', 'Custom task completed');
          result = { completionSummary: 'Custom task completed' };
          break;
      }

      logger.info('Approved task executed', {
        userId,
        taskId,
        taskType: task.task_type,
        completionSummary: result.completionSummary
      });

      return result;
    } catch (error) {
      logger.error('Failed to execute approved task', {
        userId,
        taskId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Execute email reply task
   */
  async executeEmailReply(taskId, modifications) {
    try {
      // Get email action for this task
      const { data: emailAction, error } = await this.taskService.supabase
        .from('user_email_actions')
        .select('*')
        .eq('task_id', taskId)
        .eq('action_type', 'reply')
        .single();

      if (error || !emailAction) {
        throw new Error(`Email action not found for task: ${taskId}`);
      }

      // Apply modifications if provided
      const finalContent = modifications?.content || emailAction.draft_content;

      // Approve and send email
      await this.taskService.approveEmailReply(emailAction.id, finalContent);
      const result = await this.emailService.sendApprovedEmailReply(emailAction.id);

      return result;
    } catch (error) {
      logger.error('Failed to execute email reply', {
        taskId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Execute calendar event creation
   */
  async executeCalendarEvent(taskId, modifications) {
    try {
      // Get calendar action for this task
      const { data: calendarAction, error } = await this.taskService.supabase
        .from('user_calendar_actions')
        .select('*')
        .eq('task_id', taskId)
        .single();

      if (error || !calendarAction) {
        throw new Error(`Calendar action not found for task: ${taskId}`);
      }

      // Apply modifications if provided
      if (modifications) {
        const updateData = {};
        if (modifications.title) updateData.event_title = modifications.title;
        if (modifications.startTime) updateData.start_time = modifications.startTime;
        if (modifications.endTime) updateData.end_time = modifications.endTime;
        if (modifications.location) updateData.location = modifications.location;
        if (modifications.attendees) updateData.attendee_emails = modifications.attendees;

        if (Object.keys(updateData).length > 0) {
          await this.taskService.supabase
            .from('user_calendar_actions')
            .update(updateData)
            .eq('id', calendarAction.id);
        }
      }

      // Create calendar event
      const result = await this.calendarService.createCalendarEvent(calendarAction.id);

      return result;
    } catch (error) {
      logger.error('Failed to execute calendar event', {
        taskId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Execute email deletion
   */
  async executeEmailDeletion(taskId) {
    try {
      // Get email action for this task
      const { data: emailAction, error } = await this.taskService.supabase
        .from('user_email_actions')
        .select('*')
        .eq('task_id', taskId)
        .eq('action_type', 'delete')
        .single();

      if (error || !emailAction) {
        throw new Error(`Email action not found for task: ${taskId}`);
      }

      // Approve and execute deletion
      await this.taskService.approveEmailReply(emailAction.id); // Reusing approve function
      const result = await this.emailService.executeEmailDeletion(emailAction.id);

      return result;
    } catch (error) {
      logger.error('Failed to execute email deletion', {
        taskId,
        error: error.message
      });
      throw error;
    }
  }

  // =====================================================
  // TASK SUMMARY FOR BRIEFINGS
  // =====================================================

  /**
   * Get task summary for daily briefing
   */
  async getTaskSummaryForBriefing(userId) {
    try {
      const tasksSummary = await this.calendarService.getUserTasksSummary(userId);

      const briefingSummary = {
        pendingTasks: tasksSummary.pending.total,
        urgentTasks: tasksSummary.pending.urgent,
        tasksByType: tasksSummary.pending.byType,
        recentCompletions: tasksSummary.recentlyCompleted.slice(0, 3), // Last 3 completed
        hasEmailDrafts: (tasksSummary.pending.byType.email_reply || 0) > 0,
        hasCalendarDrafts: (tasksSummary.pending.byType.calendar_event || 0) > 0
      };

      logger.info('Generated task summary for briefing', {
        userId,
        pendingTasks: briefingSummary.pendingTasks,
        urgentTasks: briefingSummary.urgentTasks
      });

      return briefingSummary;
    } catch (error) {
      logger.error('Failed to get task summary for briefing', {
        userId,
        error: error.message
      });
      
      // Return empty summary on error
      return {
        pendingTasks: 0,
        urgentTasks: 0,
        tasksByType: {},
        recentCompletions: [],
        hasEmailDrafts: false,
        hasCalendarDrafts: false
      };
    }
  }
}
