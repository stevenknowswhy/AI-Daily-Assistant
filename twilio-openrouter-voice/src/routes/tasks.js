/**
 * Task Management API Routes
 * ==========================
 * 
 * RESTful API for user action tasks, email management, and calendar events
 */

import express from 'express';
import { logger } from '../utils/logger.js';
import { TaskManagementService } from '../services/task-management.js';
import { EmailManagementService } from '../services/email-management.js';
import { CalendarManagementService } from '../services/calendar-management.js';

const router = express.Router();

// Initialize services
let taskService, emailService, calendarService;

function getTaskService() {
  if (!taskService) {
    taskService = new TaskManagementService();
  }
  return taskService;
}

function getEmailService() {
  if (!emailService) {
    // These will be injected when services are available
    emailService = new EmailManagementService(null, getTaskService(), null);
  }
  return emailService;
}

function getCalendarService() {
  if (!calendarService) {
    // These will be injected when services are available
    calendarService = new CalendarManagementService(null, getTaskService(), null);
  }
  return calendarService;
}

// =====================================================
// USER ACTION TASKS ROUTES
// =====================================================

/**
 * GET /api/tasks/:userId - Get user's pending tasks
 */
router.get('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { status } = req.query;

    let tasks;
    if (status === 'completed') {
      tasks = await getTaskService().getUserCompletedTasks(userId);
    } else {
      tasks = await getTaskService().getUserPendingTasks(userId);
    }

    logger.info('Tasks retrieved via API', {
      userId,
      taskCount: tasks.length,
      status: status || 'pending'
    });

    res.json(tasks);

  } catch (error) {
    logger.error('API error fetching tasks', {
      userId: req.params.userId,
      error: error.message
    });

    res.status(500).json({
      error: error.message
    });
  }
});

/**
 * POST /api/tasks - Create a new task from voice command
 */
router.post('/', async (req, res) => {
  try {
    const { userId, voiceCommand, taskType, taskSummary, llmAnalysis } = req.body;

    if (!userId || !voiceCommand) {
      return res.status(400).json({
        error: 'Missing required fields: userId, voiceCommand'
      });
    }

    // Process voice command into task
    const result = await getTaskService().processVoiceCommand(userId, voiceCommand, llmAnalysis || {
      taskType: taskType || 'custom',
      confidence: 0.8,
      extractedData: { summary: taskSummary },
      suggestedAction: taskSummary || voiceCommand
    });

    logger.info('Task created from voice command via API', {
      userId,
      taskId: result.task.id,
      taskType: result.task.task_type,
      requiresApproval: result.requiresApproval
    });

    res.json({
      success: true,
      task: result.task,
      actionRecord: result.actionRecord,
      requiresApproval: result.requiresApproval
    });

  } catch (error) {
    logger.error('API error creating task', {
      error: error.message,
      body: req.body
    });

    res.status(500).json({
      error: error.message
    });
  }
});

/**
 * PATCH /api/tasks/:taskId/status - Update task status
 */
router.patch('/:taskId/status', async (req, res) => {
  try {
    const { taskId } = req.params;
    const { status, completionSummary } = req.body;

    if (!status) {
      return res.status(400).json({
        error: 'Missing required field: status'
      });
    }

    const updatedTask = await getTaskService().updateTaskStatus(taskId, status, completionSummary);

    logger.info('Task status updated via API', {
      taskId,
      status,
      completionSummary
    });

    res.json({
      success: true,
      task: updatedTask
    });

  } catch (error) {
    logger.error('API error updating task status', {
      taskId: req.params.taskId,
      error: error.message
    });

    res.status(500).json({
      error: error.message
    });
  }
});

/**
 * GET /api/tasks/:userId/summary - Get user's tasks summary
 */
router.get('/:userId/summary', async (req, res) => {
  try {
    const { userId } = req.params;

    const summary = await getCalendarService().getUserTasksSummary(userId);

    logger.info('Tasks summary retrieved via API', {
      userId,
      pendingCount: summary.pending.total,
      urgentCount: summary.pending.urgent
    });

    res.json(summary);

  } catch (error) {
    logger.error('API error fetching tasks summary', {
      userId: req.params.userId,
      error: error.message
    });

    res.status(500).json({
      error: error.message
    });
  }
});

// =====================================================
// EMAIL MANAGEMENT ROUTES
// =====================================================

/**
 * POST /api/tasks/email/reply - Generate email reply draft
 */
router.post('/email/reply', async (req, res) => {
  try {
    const { userId, emailId, replyInstructions } = req.body;

    if (!userId || !emailId || !replyInstructions) {
      return res.status(400).json({
        error: 'Missing required fields: userId, emailId, replyInstructions'
      });
    }

    const result = await getEmailService().generateEmailReplyDraft(userId, emailId, replyInstructions);

    logger.info('Email reply draft generated via API', {
      userId,
      taskId: result.task.id,
      emailId,
      recipientEmail: result.originalEmail.from
    });

    res.json({
      success: true,
      task: result.task,
      emailAction: result.emailAction,
      draftContent: result.draftContent,
      originalEmail: result.originalEmail
    });

  } catch (error) {
    logger.error('API error generating email reply draft', {
      error: error.message,
      body: req.body
    });

    res.status(500).json({
      error: error.message
    });
  }
});

/**
 * POST /api/tasks/email/:emailActionId/approve - Approve email reply
 */
router.post('/email/:emailActionId/approve', async (req, res) => {
  try {
    const { emailActionId } = req.params;
    const { finalContent } = req.body;

    // Approve the email reply
    const approvedEmail = await getTaskService().approveEmailReply(emailActionId, finalContent);

    // Send the email
    const sentResult = await getEmailService().sendApprovedEmailReply(emailActionId);

    logger.info('Email reply approved and sent via API', {
      emailActionId,
      recipientEmail: approvedEmail.recipient_email,
      sentMessageId: sentResult.sentMessageId
    });

    res.json({
      success: true,
      sentMessageId: sentResult.sentMessageId,
      completionSummary: sentResult.completionSummary
    });

  } catch (error) {
    logger.error('API error approving/sending email reply', {
      emailActionId: req.params.emailActionId,
      error: error.message
    });

    res.status(500).json({
      error: error.message
    });
  }
});

// =====================================================
// CALENDAR MANAGEMENT ROUTES
// =====================================================

/**
 * POST /api/tasks/calendar/event - Create calendar event from voice command
 */
router.post('/calendar/event', async (req, res) => {
  try {
    const { userId, voiceCommand } = req.body;

    if (!userId || !voiceCommand) {
      return res.status(400).json({
        error: 'Missing required fields: userId, voiceCommand'
      });
    }

    const result = await getCalendarService().processCalendarEventCommand(userId, voiceCommand);

    logger.info('Calendar event draft created via API', {
      userId,
      taskId: result.task.id,
      eventTitle: result.eventDetails.title,
      voiceCommand
    });

    res.json({
      success: true,
      task: result.task,
      calendarAction: result.calendarAction,
      eventDetails: result.eventDetails,
      requiresApproval: result.requiresApproval
    });

  } catch (error) {
    logger.error('API error creating calendar event', {
      error: error.message,
      body: req.body
    });

    res.status(500).json({
      error: error.message
    });
  }
});

/**
 * POST /api/tasks/calendar/:calendarActionId/create - Create approved calendar event
 */
router.post('/calendar/:calendarActionId/create', async (req, res) => {
  try {
    const { calendarActionId } = req.params;

    const result = await getCalendarService().createCalendarEvent(calendarActionId);

    logger.info('Calendar event created via API', {
      calendarActionId,
      googleEventId: result.googleEvent.id
    });

    res.json({
      success: true,
      googleEvent: result.googleEvent,
      completionSummary: result.completionSummary
    });

  } catch (error) {
    logger.error('API error creating calendar event', {
      calendarActionId: req.params.calendarActionId,
      error: error.message
    });

    res.status(500).json({
      error: error.message
    });
  }
});

export default router;
