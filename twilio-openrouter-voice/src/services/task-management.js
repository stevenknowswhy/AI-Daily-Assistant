/**
 * Task Management Service
 * =======================
 * 
 * Comprehensive task tracking and user action management for AI Daily Assistant
 * Handles email replies, calendar events, bill reminders, and automated briefing scheduling
 */

import { createClient } from '@supabase/supabase-js';
import { logger } from '../utils/logger.js';

export class TaskManagementService {
  constructor() {
    this.supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    logger.info('TaskManagementService initialized', {
      supabaseUrl: process.env.SUPABASE_URL?.substring(0, 30) + '...',
      hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY
    });
  }

  // =====================================================
  // USER ACTION TASKS MANAGEMENT
  // =====================================================

  /**
   * Create a new user action task from voice command
   */
  async createTask(userId, taskData) {
    try {
      const {
        taskType,
        taskSummary,
        voiceCommand,
        llmConfidence,
        priority = 3,
        estimatedDurationMinutes,
        dueDate,
        taskDataDetails
      } = taskData;

      const { data, error } = await this.supabase
        .from('user_action_tasks')
        .insert({
          user_id: userId,
          task_type: taskType,
          task_status: 'pending',
          task_summary: taskSummary,
          voice_command: voiceCommand,
          llm_confidence: llmConfidence,
          priority,
          estimated_duration_minutes: estimatedDurationMinutes,
          due_date: dueDate,
          task_data: taskDataDetails
        })
        .select()
        .single();

      if (error) {
        logger.error('Error creating task', {
          userId,
          taskType,
          error: error.message
        });
        throw error;
      }

      logger.info('Task created successfully', {
        userId,
        taskId: data.id,
        taskType,
        taskSummary
      });

      return data;
    } catch (error) {
      logger.error('Failed to create task', {
        userId,
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  /**
   * Update task status
   */
  async updateTaskStatus(taskId, status, completionSummary = null) {
    try {
      const updateData = {
        task_status: status,
        updated_at: new Date().toISOString()
      };

      if (status === 'completed') {
        updateData.completed_at = new Date().toISOString();
        if (completionSummary) {
          updateData.completion_summary = completionSummary;
        }
      }

      const { data, error } = await this.supabase
        .from('user_action_tasks')
        .update(updateData)
        .eq('id', taskId)
        .select()
        .single();

      if (error) {
        logger.error('Error updating task status', {
          taskId,
          status,
          error: error.message
        });
        throw error;
      }

      logger.info('Task status updated', {
        taskId,
        status,
        completionSummary
      });

      return data;
    } catch (error) {
      logger.error('Failed to update task status', {
        taskId,
        status,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get user's pending tasks
   */
  async getUserPendingTasks(userId) {
    try {
      const { data, error } = await this.supabase
        .from('user_action_tasks')
        .select('*')
        .eq('user_id', userId)
        .in('task_status', ['pending', 'draft_ready', 'in_progress'])
        .order('priority', { ascending: true })
        .order('created_at', { ascending: true });

      if (error) {
        logger.error('Error fetching pending tasks', {
          userId,
          error: error.message
        });
        throw error;
      }

      logger.info('Retrieved pending tasks', {
        userId,
        taskCount: data.length
      });

      return data;
    } catch (error) {
      logger.error('Failed to get pending tasks', {
        userId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get user's completed tasks (summaries only)
   */
  async getUserCompletedTasks(userId, limit = 10) {
    try {
      const { data, error } = await this.supabase
        .from('user_task_completion_log')
        .select('*')
        .eq('user_id', userId)
        .order('completion_timestamp', { ascending: false })
        .limit(limit);

      if (error) {
        logger.error('Error fetching completed tasks', {
          userId,
          error: error.message
        });
        throw error;
      }

      logger.info('Retrieved completed tasks', {
        userId,
        taskCount: data.length
      });

      return data;
    } catch (error) {
      logger.error('Failed to get completed tasks', {
        userId,
        error: error.message
      });
      throw error;
    }
  }

  // =====================================================
  // EMAIL MANAGEMENT
  // =====================================================

  /**
   * Create email reply draft
   */
  async createEmailReplyDraft(userId, taskId, emailData) {
    try {
      const {
        emailId,
        originalEmailData,
        draftContent,
        recipientEmail,
        replySubject,
        gmailThreadId
      } = emailData;

      const { data, error } = await this.supabase
        .from('user_email_actions')
        .insert({
          user_id: userId,
          task_id: taskId,
          email_id: emailId,
          action_type: 'reply',
          approval_status: 'pending',
          original_email_data: originalEmailData,
          draft_content: draftContent,
          recipient_email: recipientEmail,
          reply_subject: replySubject,
          gmail_thread_id: gmailThreadId
        })
        .select()
        .single();

      if (error) {
        logger.error('Error creating email reply draft', {
          userId,
          taskId,
          emailId,
          error: error.message
        });
        throw error;
      }

      logger.info('Email reply draft created', {
        userId,
        taskId,
        emailId,
        recipientEmail
      });

      return data;
    } catch (error) {
      logger.error('Failed to create email reply draft', {
        userId,
        taskId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Approve email reply and mark for sending
   */
  async approveEmailReply(emailActionId, finalContent = null) {
    try {
      const updateData = {
        approval_status: 'approved',
        updated_at: new Date().toISOString()
      };

      if (finalContent) {
        updateData.final_content = finalContent;
      }

      const { data, error } = await this.supabase
        .from('user_email_actions')
        .update(updateData)
        .eq('id', emailActionId)
        .select()
        .single();

      if (error) {
        logger.error('Error approving email reply', {
          emailActionId,
          error: error.message
        });
        throw error;
      }

      logger.info('Email reply approved', {
        emailActionId,
        recipientEmail: data.recipient_email,
        hasCustomContent: !!finalContent
      });

      return data;
    } catch (error) {
      logger.error('Failed to approve email reply', {
        emailActionId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Mark email as sent
   */
  async markEmailSent(emailActionId, gmailMessageId) {
    try {
      const { data, error } = await this.supabase
        .from('user_email_actions')
        .update({
          sent_at: new Date().toISOString(),
          gmail_message_id: gmailMessageId,
          updated_at: new Date().toISOString()
        })
        .eq('id', emailActionId)
        .select()
        .single();

      if (error) {
        logger.error('Error marking email as sent', {
          emailActionId,
          error: error.message
        });
        throw error;
      }

      logger.info('Email marked as sent', {
        emailActionId,
        gmailMessageId,
        recipientEmail: data.recipient_email
      });

      return data;
    } catch (error) {
      logger.error('Failed to mark email as sent', {
        emailActionId,
        error: error.message
      });
      throw error;
    }
  }

  // =====================================================
  // CALENDAR EVENT MANAGEMENT
  // =====================================================

  /**
   * Create calendar event draft
   */
  async createCalendarEventDraft(userId, taskId, eventData) {
    try {
      const {
        eventTitle,
        eventDescription,
        startTime,
        endTime,
        timezone = 'America/Los_Angeles',
        location,
        attendees = [],
        sendInvitations = true,
        meetingType = 'in-person',
        videoCallLink
      } = eventData;

      // Extract email addresses from attendees
      const attendeeEmails = attendees.map(attendee => 
        typeof attendee === 'string' ? attendee : attendee.email
      ).filter(Boolean);

      const { data, error } = await this.supabase
        .from('user_calendar_actions')
        .insert({
          user_id: userId,
          task_id: taskId,
          event_status: 'draft',
          event_title: eventTitle,
          event_description: eventDescription,
          start_time: startTime,
          end_time: endTime,
          timezone,
          location,
          attendees,
          attendee_emails: attendeeEmails,
          send_invitations: sendInvitations,
          meeting_type: meetingType,
          video_call_link: videoCallLink
        })
        .select()
        .single();

      if (error) {
        logger.error('Error creating calendar event draft', {
          userId,
          taskId,
          eventTitle,
          error: error.message
        });
        throw error;
      }

      logger.info('Calendar event draft created', {
        userId,
        taskId,
        eventTitle,
        attendeeCount: attendeeEmails.length
      });

      return data;
    } catch (error) {
      logger.error('Failed to create calendar event draft', {
        userId,
        taskId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Mark calendar event as created
   */
  async markCalendarEventCreated(calendarActionId, googleEventId, googleEventLink) {
    try {
      const { data, error } = await this.supabase
        .from('user_calendar_actions')
        .update({
          event_status: 'created',
          google_event_id: googleEventId,
          google_event_link: googleEventLink,
          updated_at: new Date().toISOString()
        })
        .eq('id', calendarActionId)
        .select()
        .single();

      if (error) {
        logger.error('Error marking calendar event as created', {
          calendarActionId,
          error: error.message
        });
        throw error;
      }

      logger.info('Calendar event marked as created', {
        calendarActionId,
        googleEventId,
        eventTitle: data.event_title
      });

      return data;
    } catch (error) {
      logger.error('Failed to mark calendar event as created', {
        calendarActionId,
        error: error.message
      });
      throw error;
    }
  }

  // =====================================================
  // BRIEFING SCHEDULE MANAGEMENT
  // =====================================================

  /**
   * Get or create user briefing schedule
   */
  async getUserBriefingSchedule(userId) {
    try {
      const { data, error } = await this.supabase
        .from('user_briefing_schedule')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        logger.error('Error fetching briefing schedule', {
          userId,
          error: error.message
        });
        throw error;
      }

      // Create default schedule if none exists
      if (!data) {
        return await this.createDefaultBriefingSchedule(userId);
      }

      logger.info('Retrieved briefing schedule', {
        userId,
        preferredTime: data.preferred_call_time,
        timezone: data.timezone,
        isActive: data.is_active
      });

      return data;
    } catch (error) {
      logger.error('Failed to get briefing schedule', {
        userId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Create default briefing schedule for new user
   */
  async createDefaultBriefingSchedule(userId) {
    try {
      const { data, error } = await this.supabase
        .from('user_briefing_schedule')
        .insert({
          user_id: userId,
          preferred_call_time: '08:00:00',
          timezone: 'America/Los_Angeles',
          call_frequency: 'daily',
          is_active: true,
          max_call_duration_minutes: 5,
          include_weather: true
        })
        .select()
        .single();

      if (error) {
        logger.error('Error creating default briefing schedule', {
          userId,
          error: error.message
        });
        throw error;
      }

      logger.info('Default briefing schedule created', {
        userId,
        preferredTime: data.preferred_call_time,
        timezone: data.timezone
      });

      return data;
    } catch (error) {
      logger.error('Failed to create default briefing schedule', {
        userId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Update briefing schedule preferences
   */
  async updateBriefingSchedule(userId, scheduleData) {
    try {
      const updateData = {
        ...scheduleData,
        updated_at: new Date().toISOString()
      };

      const { data, error } = await this.supabase
        .from('user_briefing_schedule')
        .update(updateData)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) {
        logger.error('Error updating briefing schedule', {
          userId,
          error: error.message
        });
        throw error;
      }

      logger.info('Briefing schedule updated', {
        userId,
        updatedFields: Object.keys(scheduleData)
      });

      return data;
    } catch (error) {
      logger.error('Failed to update briefing schedule', {
        userId,
        error: error.message
      });
      throw error;
    }
  }

  // =====================================================
  // TASK WORKFLOW MANAGEMENT
  // =====================================================

  /**
   * Process voice command and create appropriate task
   */
  async processVoiceCommand(userId, voiceCommand, llmAnalysis) {
    try {
      const {
        taskType,
        confidence,
        extractedData,
        suggestedAction
      } = llmAnalysis;

      // Create the main task
      const task = await this.createTask(userId, {
        taskType,
        taskSummary: suggestedAction,
        voiceCommand,
        llmConfidence: confidence,
        priority: this.calculateTaskPriority(taskType, extractedData),
        taskDataDetails: extractedData
      });

      // Create specific action records based on task type
      let actionRecord = null;

      switch (taskType) {
        case 'email_reply':
          actionRecord = await this.createEmailReplyDraft(userId, task.id, extractedData);
          break;
        case 'calendar_event':
          actionRecord = await this.createCalendarEventDraft(userId, task.id, extractedData);
          break;
        case 'email_delete':
          actionRecord = await this.createEmailDeleteAction(userId, task.id, extractedData);
          break;
      }

      logger.info('Voice command processed into task', {
        userId,
        taskId: task.id,
        taskType,
        voiceCommand,
        hasActionRecord: !!actionRecord
      });

      return {
        task,
        actionRecord,
        requiresApproval: ['email_reply', 'calendar_event', 'email_delete'].includes(taskType)
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
   * Calculate task priority based on type and content
   */
  calculateTaskPriority(taskType, extractedData) {
    // Urgent tasks (priority 1)
    if (extractedData?.isUrgent || extractedData?.keywords?.includes('urgent')) {
      return 1;
    }

    // High priority tasks (priority 2)
    if (taskType === 'email_reply' && extractedData?.isImportant) {
      return 2;
    }

    if (taskType === 'calendar_event' && extractedData?.isToday) {
      return 2;
    }

    // Normal priority (priority 3) - default
    return 3;
  }

  /**
   * Clean up completed task data (run periodically)
   */
  async cleanupCompletedTasks() {
    try {
      // This would typically be called by a cron job
      const { data, error } = await this.supabase.rpc('cleanup_completed_task_data');

      if (error) {
        logger.error('Error cleaning up completed tasks', {
          error: error.message
        });
        throw error;
      }

      logger.info('Completed task cleanup', {
        cleanedTaskCount: data
      });

      return data;
    } catch (error) {
      logger.error('Failed to cleanup completed tasks', {
        error: error.message
      });
      throw error;
    }
  }
}
