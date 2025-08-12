/**
 * Bill Management API Routes
 * =========================
 * 
 * RESTful API endpoints for managing bills, subscriptions, and daily briefing preferences
 */

import express from 'express';
import { logger } from '../utils/logger.js';
import { BillManagementService } from '../services/bill-management.js';
import { DailyBriefingService } from '../services/daily-briefing.js';
import { OpenRouterService } from '../services/openrouter.js';
import { checkBillsAuth, getBillsAuthState, setBillsAuthState } from '../utils/auth-state.js';

const router = express.Router();

// Lazy-load services
let billService = null;
let briefingService = null;

function getBillService() {
  if (!billService) {
    billService = new BillManagementService();
  }
  return billService;
}

function getBriefingService() {
  if (!briefingService) {
    // Initialize with OpenRouter service for LLM functionality
    const openRouterService = new OpenRouterService();
    briefingService = new DailyBriefingService(null, null, openRouterService);
  }
  return briefingService;
}

/**
 * POST /api/bills/init-user - Initialize user in Supabase
 */
router.post('/init-user', async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'Missing required field: userId'
      });
    }

    // Test Supabase connection and initialize user preferences
    const billService = getBillService();

    // Check if user already exists
    const existingBills = await billService.getUserBills(userId);

    // If user has no bills, add some sample bills for demo
    if (existingBills.length === 0) {
      const sampleBills = [
        {
          name: 'Netflix Subscription',
          amount: 15.99,
          dueDate: '2025-08-15',
          recurrenceType: 'monthly',
          category: 'entertainment',
          description: 'Monthly Netflix subscription',
          autoPay: true
        },
        {
          name: 'Electric Bill',
          amount: 120.00,
          dueDate: '2025-08-08',
          recurrenceType: 'monthly',
          category: 'utilities',
          description: 'PG&E electric bill',
          autoPay: false
        }
      ];

      for (const bill of sampleBills) {
        await billService.addBill(userId, bill);
      }
    }

    res.json({
      success: true,
      message: 'User initialized in Supabase successfully',
      billCount: existingBills.length || 2,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Failed to initialize user in Supabase:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * POST /api/bills - Add a new bill/subscription
 */
router.post('/', checkBillsAuth, async (req, res) => {
  try {
    const { userId, name, amount, dueDate, recurrenceType, category, description, autoPay, reminderPreference } = req.body;

    if (!userId || !name || !dueDate) {
      return res.status(400).json({
        error: 'Missing required fields: userId, name, dueDate'
      });
    }

    const billData = {
      name,
      amount,
      dueDate,
      recurrenceType: recurrenceType || 'monthly',
      category: category || 'other',
      description: description || '',
      autoPay: autoPay || false,
      reminderPreference: reminderPreference || '1-day'
    };

    // Use real database operations
    const bill = await getBillService().addBill(userId, billData);

    logger.info('Bill added via API', {
      userId,
      billId: bill.id,
      billName: name
    });

    res.json({
      success: true,
      bill
    });

  } catch (error) {
    logger.error('API error adding bill', {
      error: error.message,
      body: req.body
    });

    res.status(500).json({
      error: error.message
    });
  }
});

/**
 * GET /api/bills/:userId - Get all bills for a user
 */
router.get('/:userId', checkBillsAuth, async (req, res) => {
  try {
    const { userId } = req.params;

    // Use real database operations
    const bills = await getBillService().getUserBills(userId);

    logger.info('Bills retrieved via API', {
      userId,
      billCount: bills.length
    });

    res.json(bills);

  } catch (error) {
    logger.error('API error fetching bills', {
      userId: req.params.userId,
      error: error.message
    });

    res.status(500).json({
      error: error.message
    });
  }
});

/**
 * GET /api/bills/:userId/due-soon - Get bills due soon for a user
 */
router.get('/:userId/due-soon', async (req, res) => {
  try {
    const { userId } = req.params;
    const daysAhead = parseInt(req.query.days) || 7;

    // Use real database operations
    const bills = await getBillService().getBillsDueSoon(userId, daysAhead);

    logger.info('Bills due soon retrieved', {
      userId,
      billCount: bills.length,
      daysAhead
    });

    res.json(bills);

  } catch (error) {
    logger.error('API error fetching bills due soon', {
      userId: req.params.userId,
      error: error.message
    });

    res.status(500).json({
      error: error.message
    });
  }
});

/**
 * POST /api/bills/:billId/paid - Mark a bill as paid
 */
router.post('/:billId/paid', async (req, res) => {
  try {
    const { billId } = req.params;
    const { paymentDate } = req.body;

    // Use real database operations
    const updatedBill = await getBillService().markBillPaid(billId, paymentDate);

    logger.info('Bill marked as paid via API', {
      billId,
      billName: updatedBill.name
    });

    res.json({
      success: true,
      bill: updatedBill
    });

  } catch (error) {
    logger.error('API error marking bill as paid', {
      billId: req.params.billId,
      error: error.message
    });

    res.status(500).json({
      error: error.message
    });
  }
});

/**
 * POST /api/briefing-preferences - Update user briefing preferences
 */
router.post('/briefing-preferences', async (req, res) => {
  try {
    const { userId, ...preferences } = req.body;

    if (!userId) {
      return res.status(400).json({
        error: 'Missing required field: userId'
      });
    }

    const updatedPreferences = await getBillService().updateBriefingPreferences(userId, preferences);

    logger.info('Briefing preferences updated via API', {
      userId,
      preferences: Object.keys(preferences)
    });

    res.json({
      success: true,
      preferences: updatedPreferences
    });

  } catch (error) {
    logger.error('API error updating briefing preferences', {
      error: error.message,
      body: req.body
    });

    res.status(500).json({
      error: error.message
    });
  }
});

/**
 * GET /api/briefing-preferences/:userId - Get user briefing preferences
 */
router.get('/briefing-preferences/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const preferences = await getBillService().getUserBriefingPreferences(userId);

    res.json(preferences);

  } catch (error) {
    logger.error('API error fetching briefing preferences', {
      userId: req.params.userId,
      error: error.message
    });

    res.status(500).json({
      error: error.message
    });
  }
});

/**
 * PUT /api/bills/:billId - Update an existing bill/subscription
 */
router.put('/:billId', checkBillsAuth, async (req, res) => {
  try {
    const { billId } = req.params;
    const { userId, name, amount, dueDate, recurrenceType, category, description, reminderPreference } = req.body;

    if (!userId || !name || !dueDate) {
      return res.status(400).json({
        error: 'Missing required fields: userId, name, dueDate'
      });
    }

    const billData = {
      name,
      amount,
      dueDate,
      recurrenceType: recurrenceType || 'monthly',
      category: category || 'other',
      description: description || '',
      reminderPreference: reminderPreference || '1-day'
    };

    const bill = await getBillService().updateBill(billId, billData);

    logger.info('Bill updated via API', {
      userId,
      billId,
      billName: name
    });

    res.json({
      success: true,
      bill
    });

  } catch (error) {
    logger.error('API error updating bill', {
      billId: req.params.billId,
      error: error.message
    });

    res.status(500).json({
      error: error.message
    });
  }
});

/**
 * DELETE /api/bills/:billId - Delete a bill/subscription
 */
router.delete('/:billId', checkBillsAuth, async (req, res) => {
  try {
    const { billId } = req.params;

    await getBillService().deleteBill(billId);

    logger.info('Bill deleted via API', {
      billId
    });

    res.json({
      success: true,
      message: 'Bill deleted successfully'
    });

  } catch (error) {
    logger.error('API error deleting bill', {
      billId: req.params.billId,
      error: error.message
    });

    res.status(500).json({
      error: error.message
    });
  }
});

/**
 * POST /api/daily-briefing - Generate comprehensive daily briefing for dashboard
 */
router.post('/daily-briefing', async (req, res) => {
  try {
    const { userId, data: aggregatedData, requestType } = req.body;

    if (!userId) {
      return res.status(400).json({
        error: 'Missing required field: userId'
      });
    }

    logger.info('Generating dashboard daily briefing', {
      userId,
      requestType,
      hasCalendarData: !!aggregatedData?.calendar,
      hasEmailData: !!aggregatedData?.emails,
      hasBillsData: !!aggregatedData?.bills
    });

    // Use the existing daily briefing service
    const briefingService = getBriefingService();

    if (aggregatedData) {
      // Use provided aggregated data
      const briefingResponse = await briefingService.generateLLMBriefing(
        userId,
        aggregatedData,
        'dashboard-briefing'
      );

      res.json({
        success: true,
        briefing: briefingResponse,
        data: aggregatedData
      });
    } else {
      // Generate briefing with service's own data collection
      const briefing = await briefingService.generateDailyBriefing(userId, 'dashboard-briefing');

      res.json({
        success: true,
        briefing: briefing.response,
        data: briefing.data
      });
    }

  } catch (error) {
    logger.error('API error generating daily briefing', {
      userId: req.body.userId,
      error: error.message
    });

    res.status(500).json({
      error: error.message
    });
  }
});

export default router;
