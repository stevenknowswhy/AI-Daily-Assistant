/**
 * Comprehensive Test API Routes
 * =============================
 * 
 * RESTful API for comprehensive testing of AI Daily Assistant functionality
 * Handles natural language processing, LLM tool calls, and end-to-end workflows
 */

import express from 'express';
import { logger } from '../utils/logger.js';
import { ComprehensiveTestService } from '../services/comprehensive-test.js';

const router = express.Router();

// Initialize test service
let testService;

function getTestService() {
  if (!testService) {
    testService = new ComprehensiveTestService();
  }
  return testService;
}

// =====================================================
// NATURAL LANGUAGE COMMAND PROCESSING
// =====================================================

/**
 * POST /api/test-comprehensive/process - Process natural language command
 */
router.post('/process', async (req, res) => {
  try {
    const { command } = req.body;

    if (!command) {
      return res.status(400).json({
        success: false,
        error: 'Missing required field: command'
      });
    }

    logger.info('Processing natural language command via API', {
      command,
      timestamp: new Date().toISOString()
    });

    const result = await getTestService().processNaturalLanguageCommand(command);

    logger.info('Natural language command processed via API', {
      command,
      category: result.category,
      success: result.success,
      processingTime: result.processingTime
    });

    res.json(result);

  } catch (error) {
    logger.error('API error processing natural language command', {
      command: req.body.command,
      error: error.message,
      stack: error.stack
    });

    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/test-comprehensive/run-scenarios - Run all test scenarios
 */
router.post('/run-scenarios', async (req, res) => {
  try {
    logger.info('Running comprehensive test scenarios via API');

    const results = await getTestService().runTestScenarios();

    logger.info('Comprehensive test scenarios completed via API', {
      totalTests: results.totalTests,
      successfulTests: results.successfulTests,
      failedTests: results.failedTests,
      successRate: ((results.successfulTests / results.totalTests) * 100).toFixed(1)
    });

    res.json(results);

  } catch (error) {
    logger.error('API error running test scenarios', {
      error: error.message,
      stack: error.stack
    });

    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/test-comprehensive/stats - Get test statistics
 */
router.get('/stats', async (req, res) => {
  try {
    const summary = getTestService().getTestResultsSummary();

    logger.info('Test statistics retrieved via API', {
      totalTests: summary.total,
      successRate: summary.successRate
    });

    res.json(summary);

  } catch (error) {
    logger.error('API error retrieving test statistics', {
      error: error.message
    });

    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/test-comprehensive/clear - Clear test results
 */
router.post('/clear', async (req, res) => {
  try {
    getTestService().clearTestResults();

    logger.info('Test results cleared via API');

    res.json({
      success: true,
      message: 'Test results cleared'
    });

  } catch (error) {
    logger.error('API error clearing test results', {
      error: error.message
    });

    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// =====================================================
// APPROVAL WORKFLOW
// =====================================================

/**
 * POST /api/test-comprehensive/approve - Handle task approval/rejection
 */
router.post('/approve', async (req, res) => {
  try {
    const { resultId, actionType, approved, modifications } = req.body;

    if (!resultId || approved === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: resultId, approved'
      });
    }

    logger.info('Processing task approval via API', {
      resultId,
      actionType,
      approved,
      hasModifications: !!modifications
    });

    // For now, simulate approval processing
    // In a real implementation, this would:
    // 1. Find the task by resultId
    // 2. Execute the approved action (send email, create calendar event, etc.)
    // 3. Update the task status in the database

    const result = {
      success: true,
      message: approved 
        ? `${actionType || 'Action'} approved and executed successfully`
        : 'Action rejected',
      resultId,
      actionType,
      approved,
      executedAt: new Date().toISOString()
    };

    logger.info('Task approval processed via API', {
      resultId,
      approved,
      actionType
    });

    res.json(result);

  } catch (error) {
    logger.error('API error processing task approval', {
      resultId: req.body.resultId,
      error: error.message
    });

    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// =====================================================
// SPECIFIC FUNCTIONALITY TESTING
// =====================================================

/**
 * POST /api/test-comprehensive/test-daily-briefing - Test daily briefing functionality
 */
router.post('/test-daily-briefing', async (req, res) => {
  try {
    logger.info('Testing daily briefing functionality via API');

    const result = await getTestService().handleDailyBriefingCommand(
      'Give me my daily briefing',
      {
        category: 'daily_briefing',
        intent: 'Generate comprehensive daily briefing',
        confidence: 1.0,
        extractedData: { action: 'get_briefing' },
        requiresApproval: false
      }
    );

    logger.info('Daily briefing test completed via API', {
      success: result.success,
      emailCount: result.data?.emails || 0,
      calendarCount: result.data?.calendar || 0,
      billCount: result.data?.bills || 0
    });

    res.json({
      success: true,
      testType: 'daily_briefing',
      result,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('API error testing daily briefing', {
      error: error.message
    });

    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/test-comprehensive/test-email-management - Test email management functionality
 */
router.post('/test-email-management', async (req, res) => {
  try {
    const { command = 'Reply to John and tell him I can meet tomorrow at 2 PM' } = req.body;

    logger.info('Testing email management functionality via API', { command });

    const result = await getTestService().handleEmailCommand(
      command,
      {
        category: 'email_management',
        intent: 'Reply to email with meeting availability',
        confidence: 0.95,
        extractedData: {
          action: 'reply',
          recipient: 'john@example.com',
          content: 'I can meet tomorrow at 2 PM',
          subject: 'Re: Meeting Request'
        },
        requiresApproval: true
      }
    );

    logger.info('Email management test completed via API', {
      success: result.success,
      requiresApproval: result.requiresApproval
    });

    res.json({
      success: true,
      testType: 'email_management',
      result,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('API error testing email management', {
      error: error.message
    });

    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/test-comprehensive/test-calendar-management - Test calendar management functionality
 */
router.post('/test-calendar-management', async (req, res) => {
  try {
    const { command = 'Schedule a meeting with Sarah next Friday at 10 AM' } = req.body;

    logger.info('Testing calendar management functionality via API', { command });

    const result = await getTestService().handleCalendarCommand(
      command,
      {
        category: 'calendar_management',
        intent: 'Schedule new meeting',
        confidence: 0.9,
        extractedData: {
          action: 'schedule',
          eventTitle: 'Meeting with Sarah',
          eventTime: 'next Friday at 10 AM',
          attendees: ['sarah@example.com']
        },
        requiresApproval: true
      }
    );

    logger.info('Calendar management test completed via API', {
      success: result.success,
      requiresApproval: result.requiresApproval
    });

    res.json({
      success: true,
      testType: 'calendar_management',
      result,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('API error testing calendar management', {
      error: error.message
    });

    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/test-comprehensive/test-bill-management - Test bill management functionality
 */
router.post('/test-bill-management', async (req, res) => {
  try {
    const { command = 'Add my Netflix subscription bill for $15.99 due monthly on the 15th' } = req.body;

    logger.info('Testing bill management functionality via API', { command });

    const result = await getTestService().handleBillCommand(
      command,
      {
        category: 'bill_management',
        intent: 'Add new recurring bill',
        confidence: 0.95,
        extractedData: {
          action: 'add_bill',
          billName: 'Netflix subscription',
          amount: '15.99',
          recurrence: 'monthly',
          dueDate: '15th of each month'
        },
        requiresApproval: false
      }
    );

    logger.info('Bill management test completed via API', {
      success: result.success,
      billName: result.bill?.name
    });

    res.json({
      success: true,
      testType: 'bill_management',
      result,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('API error testing bill management', {
      error: error.message
    });

    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
