import express from 'express';
import { logger } from '../utils/logger.js';
import { GoogleGmailService } from '../services/google-gmail.js';
import { EmailManagementService } from '../services/email-management.js';
import { OpenRouterService } from '../services/openrouter.js';

const router = express.Router();

// Initialize services
const gmailService = new GoogleGmailService();
const openRouterService = new OpenRouterService();
const emailService = new EmailManagementService(gmailService, null, openRouterService);

/**
 * Test Gmail authentication status
 */
router.get('/auth-status', async (req, res) => {
  try {
    logger.info('Checking Gmail authentication status');

    // Initialize Gmail service if needed
    if (!gmailService.isInitialized) {
      await gmailService.initialize();
    }

    const isAuthenticated = gmailService.isAuthenticated();

    res.json({
      success: true,
      authenticated: isAuthenticated,
      message: isAuthenticated ? 'Gmail is authenticated' : 'Gmail authentication required'
    });

  } catch (error) {
    logger.error('Error checking Gmail auth status', {
      error: error.message
    });

    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Force Gmail re-authentication with updated scopes
 */
router.post('/re-authenticate', async (req, res) => {
  try {
    logger.info('Forcing Gmail re-authentication');

    const result = await gmailService.forceReAuthentication();

    if (result.requiresAuth) {
      res.json({
        success: false,
        requiresAuth: true,
        authUrl: result.authUrl,
        message: 'Please visit the authorization URL to complete Gmail authentication with updated scopes.',
        instructions: 'Copy the authorization URL, visit it in your browser, grant permissions, and copy the authorization code back.'
      });
    } else {
      res.json({
        success: true,
        message: 'Gmail re-authentication completed successfully.'
      });
    }

  } catch (error) {
    logger.error('Error during Gmail re-authentication', {
      error: error.message
    });

    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Re-authentication failed. Check server logs for details.'
    });
  }
});

/**
 * Get user's inbox emails
 */
router.get('/inbox', async (req, res) => {
  try {
    const userId = 'test-user'; // In production, get from auth
    const maxResults = parseInt(req.query.maxResults) || 20;
    const query = req.query.query || 'in:inbox';

    logger.info('Fetching inbox emails', {
      userId,
      maxResults,
      query
    });

    const emails = await emailService.getInboxEmails(userId, {
      maxResults,
      query
    });

    res.json({
      success: true,
      emails,
      count: emails.length
    });

  } catch (error) {
    logger.error('Error fetching inbox emails', {
      error: error.message
    });

    res.status(500).json({
      success: false,
      error: error.message,
      details: 'Check Gmail authentication and API credentials'
    });
  }
});

/**
 * Search emails
 */
router.post('/search', async (req, res) => {
  try {
    const userId = 'test-user';
    const searchOptions = req.body;

    logger.info('Searching emails', {
      userId,
      searchOptions
    });

    const emails = await emailService.searchEmails(userId, searchOptions);

    res.json({
      success: true,
      emails,
      count: emails.length
    });

  } catch (error) {
    logger.error('Error searching emails', {
      error: error.message
    });

    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Get email thread
 */
router.get('/thread/:threadId', async (req, res) => {
  try {
    const userId = 'test-user';
    const { threadId } = req.params;

    logger.info('Fetching email thread', {
      userId,
      threadId
    });

    const thread = await emailService.getEmailThread(userId, threadId);

    res.json({
      success: true,
      thread
    });

  } catch (error) {
    logger.error('Error fetching email thread', {
      threadId: req.params.threadId,
      error: error.message
    });

    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Generate AI reply options
 */
router.post('/reply-options', async (req, res) => {
  try {
    const userId = 'test-user';
    const { emailId, replyInstructions, options } = req.body;

    logger.info('Generating AI reply options', {
      userId,
      emailId,
      replyInstructions
    });

    const replyData = await emailService.generateReplyOptions(
      userId, 
      emailId, 
      replyInstructions, 
      options
    );

    res.json({
      success: true,
      ...replyData
    });

  } catch (error) {
    logger.error('Error generating reply options', {
      emailId: req.body.emailId,
      error: error.message
    });

    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Generate smart suggestions
 */
router.post('/smart-suggestions', async (req, res) => {
  try {
    const userId = 'test-user';
    const { emailId } = req.body;

    logger.info('Generating smart suggestions', {
      userId,
      emailId
    });

    const suggestions = await emailService.generateSmartSuggestions(userId, emailId);

    res.json({
      success: true,
      suggestions
    });

  } catch (error) {
    logger.error('Error generating smart suggestions', {
      emailId: req.body.emailId,
      error: error.message
    });

    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Send email reply
 */
router.post('/reply', async (req, res) => {
  try {
    const userId = 'test-user';
    const { emailId, replyContent, subject } = req.body;

    logger.info('Sending email reply', {
      userId,
      emailId,
      subject
    });

    // This would integrate with the approval workflow
    const result = await emailService.sendEmailReply(userId, {
      emailId,
      content: replyContent,
      subject
    });

    res.json({
      success: true,
      result
    });

  } catch (error) {
    logger.error('Error sending email reply', {
      emailId: req.body.emailId,
      error: error.message
    });

    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Archive email
 */
router.post('/archive', async (req, res) => {
  try {
    const { emailId } = req.body;

    logger.info('Archiving email', { emailId });

    await gmailService.archiveEmail(emailId);

    res.json({
      success: true,
      message: 'Email archived successfully'
    });

  } catch (error) {
    logger.error('Error archiving email', {
      emailId: req.body.emailId,
      error: error.message
    });

    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Delete email
 */
router.post('/delete', async (req, res) => {
  try {
    const { emailId } = req.body;

    logger.info('Deleting email', { emailId });

    await gmailService.deleteEmail(emailId);

    res.json({
      success: true,
      message: 'Email deleted successfully'
    });

  } catch (error) {
    logger.error('Error deleting email', {
      emailId: req.body.emailId,
      error: error.message
    });

    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Mark email as read/unread
 */
router.post('/mark-read', async (req, res) => {
  try {
    const { emailId, markAsRead } = req.body;

    logger.info('Updating email read status', { emailId, markAsRead });

    if (markAsRead) {
      await gmailService.markAsRead(emailId);
    } else {
      await gmailService.markAsUnread(emailId);
    }

    res.json({
      success: true,
      message: `Email marked as ${markAsRead ? 'read' : 'unread'}`
    });

  } catch (error) {
    logger.error('Error updating email read status', {
      emailId: req.body.emailId,
      error: error.message
    });

    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Bulk operations
 */
router.post('/bulk-delete', async (req, res) => {
  try {
    const userId = 'test-user';
    const { emailIds, options } = req.body;

    logger.info('Bulk deleting emails', {
      userId,
      emailCount: emailIds.length
    });

    const result = await emailService.bulkDeleteEmails(userId, emailIds, options);

    res.json({
      success: true,
      result
    });

  } catch (error) {
    logger.error('Error in bulk delete', {
      error: error.message
    });

    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.post('/bulk-archive', async (req, res) => {
  try {
    const userId = 'test-user';
    const { emailIds } = req.body;

    logger.info('Bulk archiving emails', {
      userId,
      emailCount: emailIds.length
    });

    const result = await emailService.bulkArchiveEmails(userId, emailIds);

    res.json({
      success: true,
      result
    });

  } catch (error) {
    logger.error('Error in bulk archive', {
      error: error.message
    });

    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Complete OAuth authentication with authorization code
 */
router.post('/complete-auth', async (req, res) => {
  try {
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({
        success: false,
        error: 'Authorization code is required'
      });
    }

    logger.info('Completing Gmail OAuth authentication', {
      codeLength: code.length
    });

    // Use the Gmail service's OAuth completion method
    const result = await gmailService.completeOAuthAuthentication(code);

    logger.info('Gmail OAuth authentication completed successfully');

    res.json({
      success: true,
      message: 'Gmail authentication completed successfully. You can now use email operations.',
      tokenSaved: result.tokenSaved,
      authenticated: result.authenticated
    });

  } catch (error) {
    logger.error('Error completing Gmail OAuth authentication', {
      error: error.message,
      stack: error.stack
    });

    // Provide more specific error messages
    let userMessage = 'Failed to complete authentication. Please try again.';

    if (error.message.includes('invalid_grant')) {
      userMessage = 'Invalid authorization code. Please get a new authorization code and try again.';
    } else if (error.message.includes('invalid_client')) {
      userMessage = 'Gmail client configuration error. Please check credentials.';
    } else if (error.message.includes('access_denied')) {
      userMessage = 'Access denied. Please grant the required permissions and try again.';
    }

    res.status(500).json({
      success: false,
      error: error.message,
      message: userMessage
    });
  }
});

export default router;
