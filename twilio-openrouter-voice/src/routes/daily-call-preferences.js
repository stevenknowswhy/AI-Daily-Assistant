/**
 * Daily Call Preferences API Routes
 * =================================
 * 
 * RESTful API endpoints for managing daily call preferences
 */

import express from 'express';
import { logger } from '../utils/logger.js';
import { DailyCallPreferencesService } from '../services/daily-call-preferences.js';
import { checkBillsAuth } from '../utils/auth-state.js';

const router = express.Router();

// Lazy-load service
let preferencesService = null;

function getPreferencesService() {
  if (!preferencesService) {
    preferencesService = new DailyCallPreferencesService();
  }
  return preferencesService;
}

/**
 * GET /api/daily-call-preferences/:userId - Get user's daily call preferences
 */
router.get('/:userId', checkBillsAuth, async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'User ID is required'
      });
    }

    const preferences = await getPreferencesService().getUserPreferences(userId);

    // Add cache-busting headers to prevent 304 responses
    res.set({
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
      'ETag': `"${Date.now()}-${Math.random()}"` // Unique ETag to prevent caching
    });

    res.json({
      success: true,
      preferences: preferences || null
    });

  } catch (error) {
    logger.error('API error getting daily call preferences', {
      userId: req.params.userId,
      error: error.message
    });

    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/daily-call-preferences/:userId - Create or update user's daily call preferences
 */
router.post('/:userId', checkBillsAuth, async (req, res) => {
  try {
    const { userId } = req.params;
    const {
      phone_number: phoneNumber,
      call_time: callTime,
      timezone,
      no_answer_action: noAnswerAction,
      retry_count: retryCount,
      is_active: isActive
    } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'User ID is required'
      });
    }

    if (!phoneNumber) {
      return res.status(400).json({
        success: false,
        error: 'Phone number is required'
      });
    }

    const preferences = await getPreferencesService().saveUserPreferences(userId, {
      phoneNumber,
      callTime,
      timezone,
      noAnswerAction,
      retryCount,
      isActive
    });

    logger.info('Daily call preferences saved via API', {
      userId,
      phoneNumber
    });

    res.json({
      success: true,
      preferences
    });

  } catch (error) {
    logger.error('API error saving daily call preferences', {
      userId: req.params.userId,
      error: error.message
    });

    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * PUT /api/daily-call-preferences/:userId/phone - Update phone number only
 */
router.put('/:userId/phone', checkBillsAuth, async (req, res) => {
  try {
    const { userId } = req.params;
    const { phone_number: phoneNumber } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'User ID is required'
      });
    }

    if (!phoneNumber) {
      return res.status(400).json({
        success: false,
        error: 'Phone number is required'
      });
    }

    const preferences = await getPreferencesService().updatePhoneNumber(userId, phoneNumber);

    logger.info('Phone number updated via API', {
      userId,
      phoneNumber
    });

    res.json({
      success: true,
      preferences
    });

  } catch (error) {
    logger.error('API error updating phone number', {
      userId: req.params.userId,
      error: error.message
    });

    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * PUT /api/daily-call-preferences/:userId/active - Toggle active status
 */
router.put('/:userId/active', checkBillsAuth, async (req, res) => {
  try {
    const { userId } = req.params;
    const { is_active: isActive } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'User ID is required'
      });
    }

    if (typeof isActive !== 'boolean') {
      return res.status(400).json({
        success: false,
        error: 'isActive must be a boolean'
      });
    }

    const preferences = await getPreferencesService().toggleActiveStatus(userId, isActive);

    logger.info('Active status toggled via API', {
      userId,
      isActive
    });

    res.json({
      success: true,
      preferences
    });

  } catch (error) {
    logger.error('API error toggling active status', {
      userId: req.params.userId,
      error: error.message
    });

    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * DELETE /api/daily-call-preferences/:userId - Delete user's daily call preferences
 */
router.delete('/:userId', checkBillsAuth, async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'User ID is required'
      });
    }

    await getPreferencesService().deleteUserPreferences(userId);

    logger.info('Daily call preferences deleted via API', {
      userId
    });

    res.json({
      success: true,
      message: 'Daily call preferences deleted successfully'
    });

  } catch (error) {
    logger.error('API error deleting daily call preferences', {
      userId: req.params.userId,
      error: error.message
    });

    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/daily-call-preferences/active/users - Get all active users for scheduling
 */
router.get('/active/users', checkBillsAuth, async (req, res) => {
  try {
    const activeUsers = await getPreferencesService().getActiveUsers();

    res.json({
      success: true,
      users: activeUsers
    });

  } catch (error) {
    logger.error('API error getting active users', {
      error: error.message
    });

    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/daily-call-preferences/test/:userId - Test daily call functionality
 */
router.post('/test/:userId', checkBillsAuth, async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'User ID is required'
      });
    }

    // Get user preferences to get phone number
    const preferences = await getPreferencesService().getUserPreferences(userId);

    if (!preferences || !preferences.phone_number) {
      return res.status(400).json({
        success: false,
        error: 'No phone number found for user'
      });
    }

    logger.info('Test call initiated via API', {
      userId,
      phoneNumber: preferences.phone_number
    });

    // For now, just return success - actual Twilio integration would go here
    res.json({
      success: true,
      callSid: `test-call-${Date.now()}`,
      message: 'Test call initiated successfully'
    });

  } catch (error) {
    logger.error('API error initiating test call', {
      userId: req.params.userId,
      error: error.message
    });

    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
