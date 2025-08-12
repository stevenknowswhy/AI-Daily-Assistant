/**
 * Chatterbox Unified API Routes
 * =============================
 *
 * API endpoints for the unified Chatterbox service that consolidates
 * calendar, email, and bill management functionality.
 */

import express from 'express';
import { logger } from '../utils/logger.js';
import { ChatterboxUnifiedService } from '../services/chatterbox-unified.js';

const router = express.Router();

// Lazy-load Chatterbox service to ensure environment variables are loaded
let chatterboxService = null;

function getChatterboxService() {
  if (!chatterboxService) {
    chatterboxService = new ChatterboxUnifiedService();
  }
  return chatterboxService;
}

/**
 * POST /api/chatterbox/process - Process natural language request
 */
router.post('/process', async (req, res) => {
  try {
    const { message, conversationContext = [], userId, callSid } = req.body;

    if (!message) {
      return res.status(400).json({
        success: false,
        error: 'Message is required'
      });
    }

    logger.info('Processing Chatterbox request via API', {
      messageLength: message.length,
      contextLength: conversationContext.length,
      userId,
      callSid
    });

    const result = await getChatterboxService().processRequest(
      message,
      conversationContext,
      callSid,
      userId
    );

    res.json(result);

  } catch (error) {
    logger.error('Chatterbox API processing failed', {
      error: error.message,
      stack: error.stack
    });

    res.status(500).json({
      success: false,
      error: error.message,
      text: "I apologize, but I'm experiencing technical difficulties. Please try again."
    });
  }
});

/**
 * GET /api/chatterbox/health - Get Chatterbox service health status
 */
router.get('/health', async (req, res) => {
  try {
    const healthStatus = await getChatterboxService().getHealthStatus();

    const statusCode = healthStatus.status === 'healthy' ? 200 :
                      healthStatus.status === 'degraded' ? 206 : 500;

    res.status(statusCode).json(healthStatus);

  } catch (error) {
    logger.error('Chatterbox health check failed', error.message);

    res.status(500).json({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/chatterbox/auth-status - Check authentication status
 */
router.get('/auth-status', async (req, res) => {
  try {
    const authStatus = await getChatterboxService().checkAuthentication();

    res.json({
      success: true,
      authentication: authStatus,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Chatterbox auth status check failed', error.message);

    res.status(500).json({
      success: false,
      error: error.message,
      authentication: {
        calendar: false,
        gmail: false,
        openrouter: false
      }
    });
  }
});

/**
 * POST /api/chatterbox/initialize - Initialize Chatterbox service
 */
router.post('/initialize', async (req, res) => {
  try {
    logger.info('Initializing Chatterbox service via API');

    const initResult = await getChatterboxService().initialize();

    const statusCode = initResult.success ? 200 : 500;
    res.status(statusCode).json(initResult);

  } catch (error) {
    logger.error('Chatterbox initialization failed', error.message);

    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/chatterbox/capabilities - Get available Chatterbox capabilities
 */
router.get('/capabilities', (req, res) => {
  try {
    const capabilities = {
      calendar: {
        description: 'Google Calendar integration',
        actions: [
          'View calendar events',
          'Create new events',
          'Update existing events',
          'Get today\'s schedule',
          'Check availability'
        ]
      },
      email: {
        description: 'Gmail integration',
        actions: [
          'Read recent emails',
          'Search emails',
          'Get email details',
          'Compose replies',
          'Manage inbox'
        ]
      },
      bills: {
        description: 'Bill and subscription management',
        actions: [
          'Track upcoming bills',
          'View payment reminders',
          'Mark bills as paid',
          'Add new bills',
          'Manage subscriptions'
        ]
      },
      briefing: {
        description: 'Daily briefing service',
        actions: [
          'Generate daily summary',
          'Combine calendar, email, and bill data',
          'Provide personalized insights',
          'Morning briefing calls'
        ]
      },
      voice: {
        description: 'Voice interaction capabilities',
        actions: [
          'Phone-based conversations',
          'Web-based voice calls',
          'Natural language processing',
          'AI Assistant personality responses'
        ]
      }
    };

    res.json({
      success: true,
      capabilities,
      totalCapabilities: Object.keys(capabilities).length,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Failed to get Chatterbox capabilities', error.message);
    
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/chatterbox/test - Test Chatterbox with sample requests
 */
router.post('/test', async (req, res) => {
  try {
    const { testType = 'basic', userId } = req.body;

    let testMessage;
    switch (testType) {
      case 'calendar':
        testMessage = "What's on my calendar today?";
        break;
      case 'email':
        testMessage = "Check my recent emails";
        break;
      case 'bills':
        testMessage = "What bills are due soon?";
        break;
      case 'briefing':
        testMessage = "Give me my daily briefing";
        break;
      default:
        testMessage = "Hello AI Assistant, how are you today?";
    }

    logger.info('Running Chatterbox test', {
      testType,
      testMessage,
      userId
    });

    const result = await getChatterboxService().processRequest(
      testMessage,
      [],
      `test-${Date.now()}`,
      userId
    );

    res.json({
      success: true,
      testType,
      testMessage,
      result,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Chatterbox test failed', {
      error: error.message,
      testType: req.body.testType
    });

    res.status(500).json({
      success: false,
      error: error.message,
      testType: req.body.testType
    });
  }
});

export default router;
