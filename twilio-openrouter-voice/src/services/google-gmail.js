import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { logger } from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Google Gmail Service - Comprehensive email integration
 * Handles Gmail API authentication and email data retrieval with complete details
 */
export class GoogleGmailService {
  constructor() {
    this.gmail = null;
    this.auth = null;
    this.isInitialized = false;

    // Resolve paths relative to the actual project root (one level up from twilio-openrouter-voice)
    const projectRoot = path.resolve(__dirname, '../../..');
    this.credentialsPath = process.env.GOOGLE_CREDENTIALS_PATH
      ? path.resolve(projectRoot, process.env.GOOGLE_CREDENTIALS_PATH)
      : path.resolve(projectRoot, 'credentials.json');
    this.tokenPath = process.env.GOOGLE_TOKEN_PATH
      ? path.resolve(projectRoot, process.env.GOOGLE_TOKEN_PATH)
      : path.resolve(projectRoot, 'token.json');

    this.scopes = [
      'https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/gmail.modify',
      'https://www.googleapis.com/auth/gmail.compose'
      // Removed 'https://www.googleapis.com/auth/gmail' - Google rejects this as invalid scope
      // gmail.modify provides sufficient permissions for email deletion operations
    ];

    logger.info('GoogleGmailService constructor called', {
      credentialsPath: this.credentialsPath,
      tokenPath: this.tokenPath
    });
  }

  /**
   * Initialize Gmail service with authentication
   */
  async initialize() {
    try {
      logger.info('Initializing Google Gmail service');
      
      // Load credentials (this.credentialsPath is already an absolute path)
      const credentialsPath = this.credentialsPath;
      logger.info('Loading Google credentials from:', credentialsPath);

      if (!fs.existsSync(credentialsPath)) {
        throw new Error(`Credentials file not found: ${credentialsPath}`);
      }

      const credentials = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));
      logger.info('Google credentials loaded successfully');
      
      // Set up OAuth2 client
      const { client_id, client_secret, redirect_uris } = credentials.installed || credentials.web;
      
      this.auth = new google.auth.OAuth2(
        client_id,
        client_secret,
        'http://localhost:3005/auth/google/callback' // Use web redirect URI for Web application
      );

      logger.info('Using web redirect URI for Web application OAuth flow');
      logger.info('OAuth2 client initialized successfully', {
        clientId: client_id.substring(0, 20) + '...',
        redirectUri: 'http://localhost:3005/auth/google/callback'
      });
      
      // Load existing token if available
      const tokenPath = path.resolve(this.tokenPath);
      if (fs.existsSync(tokenPath)) {
        const token = JSON.parse(fs.readFileSync(tokenPath, 'utf8'));
        this.auth.setCredentials(token);
        logger.info('Gmail service initialized with existing token');
      } else {
        logger.warn('No existing token found. Gmail service requires authentication.');
      }
      
      // Initialize Gmail API
      this.gmail = google.gmail({ version: 'v1', auth: this.auth });
      this.isInitialized = true;
      
      logger.info('Google Gmail service initialized successfully');
      
    } catch (error) {
      logger.error('Failed to initialize Google Gmail service', {
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  /**
   * Check if Gmail service is authenticated
   */
  isAuthenticated() {
    try {
      if (!this.isInitialized || !this.auth) {
        return false;
      }
      
      const credentials = this.auth.credentials;
      return !!(credentials && credentials.access_token);
    } catch (error) {
      logger.error('Error checking Gmail authentication status', {
        error: error.message
      });
      return false;
    }
  }

  /**
   * Force re-authentication with updated scopes
   */
  async forceReAuthentication() {
    try {
      logger.info('Forcing Gmail re-authentication with updated scopes');

      // Clear existing token
      if (fs.existsSync(this.tokenPath)) {
        fs.unlinkSync(this.tokenPath);
        logger.info('Existing token file deleted');
      }

      // Reset authentication state
      this.auth = null;
      this.gmail = null;
      this.isInitialized = false;

      // Re-initialize with new scopes
      await this.initialize();

      // If not authenticated, provide authorization URL
      if (!this.isAuthenticated()) {
        const authUrl = this.auth.generateAuthUrl({
          access_type: 'offline',
          scope: this.scopes,
        });

        logger.warn('Gmail re-authentication requires manual authorization', {
          authUrl: authUrl
        });

        return {
          success: false,
          requiresAuth: true,
          authUrl: authUrl,
          message: 'Please visit the authorization URL to complete authentication'
        };
      }

      logger.info('Gmail re-authentication completed successfully');
      return { success: true };

    } catch (error) {
      logger.error('Error during Gmail re-authentication', {
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Complete OAuth authentication with authorization code
   */
  async completeOAuthAuthentication(authorizationCode) {
    try {
      logger.info('Completing OAuth authentication', {
        codeLength: authorizationCode.length
      });

      // Ensure service is initialized
      if (!this.isInitialized) {
        await this.initialize();
      }

      if (!this.auth) {
        throw new Error('OAuth client not initialized');
      }

      // Exchange authorization code for tokens
      const { tokens } = await this.auth.getToken(authorizationCode);

      if (!tokens) {
        throw new Error('No tokens received from Google OAuth');
      }

      logger.info('OAuth tokens received', {
        hasAccessToken: !!tokens.access_token,
        hasRefreshToken: !!tokens.refresh_token,
        expiryDate: tokens.expiry_date
      });

      // Set credentials
      this.auth.setCredentials(tokens);

      // Save tokens to file
      fs.writeFileSync(this.tokenPath, JSON.stringify(tokens, null, 2));

      // Verify token was saved
      if (!fs.existsSync(this.tokenPath)) {
        throw new Error('Failed to save authentication token');
      }

      // Initialize Gmail API client with new credentials
      this.gmail = google.gmail({ version: 'v1', auth: this.auth });

      logger.info('OAuth authentication completed successfully', {
        tokenPath: this.tokenPath,
        authenticated: this.isAuthenticated()
      });

      return {
        success: true,
        authenticated: this.isAuthenticated(),
        tokenSaved: true
      };

    } catch (error) {
      logger.error('Error completing OAuth authentication', {
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  /**
   * List Gmail messages with comprehensive details
   */
  async listMessages(maxResults = 10, query = 'newer_than:1d') {
    try {
      if (!this.isAuthenticated()) {
        throw new Error('Not authenticated with Gmail');
      }

      logger.info('Listing Gmail messages', {
        maxResults,
        query
      });

      // Get message list
      const response = await this.gmail.users.messages.list({
        userId: 'me',
        maxResults,
        q: query
      });

      const messages = response.data.messages || [];
      logger.info('Retrieved Gmail message list', {
        messageCount: messages.length
      });

      if (messages.length === 0) {
        return [];
      }

      // Get detailed information for each message
      const detailedMessages = await Promise.all(
        messages.map(async (message) => {
          try {
            const details = await this.gmail.users.messages.get({
              userId: 'me',
              id: message.id,
              format: 'full'
            });

            return this.parseMessageDetails(details.data);
          } catch (error) {
            logger.error('Error getting message details', {
              messageId: message.id,
              error: error.message
            });
            return null;
          }
        })
      );

      // Filter out failed requests
      const validMessages = detailedMessages.filter(msg => msg !== null);
      
      logger.info('Retrieved detailed Gmail messages', {
        totalMessages: validMessages.length
      });

      return validMessages;

    } catch (error) {
      logger.error('Error listing Gmail messages', {
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  /**
   * Parse comprehensive message details from Gmail API response
   */
  parseMessageDetails(messageData) {
    try {
      const headers = messageData.payload?.headers || [];
      const headerMap = {};
      
      // Create header map for easy access
      headers.forEach(header => {
        headerMap[header.name.toLowerCase()] = header.value;
      });

      // Extract email body
      const body = this.extractEmailBody(messageData.payload);
      
      // Extract attachments
      const attachments = this.extractAttachments(messageData.payload);
      
      // Parse labels
      const labels = messageData.labelIds || [];
      const isUnread = labels.includes('UNREAD');
      const isImportant = labels.includes('IMPORTANT');
      const isStarred = labels.includes('STARRED');
      
      const parsedMessage = {
        id: messageData.id,
        threadId: messageData.threadId,
        subject: headerMap['subject'] || 'No Subject',
        from: headerMap['from'] || 'Unknown Sender',
        to: headerMap['to'] || '',
        cc: headerMap['cc'] || '',
        bcc: headerMap['bcc'] || '',
        replyTo: headerMap['reply-to'] || '',
        date: headerMap['date'] || '',
        receivedTime: new Date(parseInt(messageData.internalDate)).toISOString(),
        snippet: messageData.snippet || '',
        body: body,
        attachments: attachments,
        labels: labels,
        isUnread: isUnread,
        isImportant: isImportant,
        isStarred: isStarred,
        messageId: headerMap['message-id'] || '',
        inReplyTo: headerMap['in-reply-to'] || '',
        references: headerMap['references'] || '',
        sizeEstimate: messageData.sizeEstimate || 0,
        historyId: messageData.historyId || ''
      };

      logger.info('Parsed message details', {
        messageId: parsedMessage.id,
        subject: parsedMessage.subject?.substring(0, 50),
        from: parsedMessage.from?.substring(0, 50),
        isUnread: parsedMessage.isUnread,
        attachmentCount: parsedMessage.attachments.length
      });

      return parsedMessage;

    } catch (error) {
      logger.error('Error parsing message details', {
        error: error.message,
        messageId: messageData?.id
      });
      return null;
    }
  }

  /**
   * Extract email body content (plain text and HTML)
   */
  extractEmailBody(payload) {
    try {
      let plainText = '';
      let htmlContent = '';

      const extractFromPart = (part) => {
        if (part.mimeType === 'text/plain' && part.body?.data) {
          plainText = Buffer.from(part.body.data, 'base64').toString('utf-8');
        } else if (part.mimeType === 'text/html' && part.body?.data) {
          htmlContent = Buffer.from(part.body.data, 'base64').toString('utf-8');
        } else if (part.parts) {
          part.parts.forEach(extractFromPart);
        }
      };

      if (payload.parts) {
        payload.parts.forEach(extractFromPart);
      } else if (payload.body?.data) {
        // Single part message
        if (payload.mimeType === 'text/plain') {
          plainText = Buffer.from(payload.body.data, 'base64').toString('utf-8');
        } else if (payload.mimeType === 'text/html') {
          htmlContent = Buffer.from(payload.body.data, 'base64').toString('utf-8');
        }
      }

      return {
        plainText: plainText || '',
        htmlContent: htmlContent || '',
        hasPlainText: !!plainText,
        hasHtml: !!htmlContent
      };

    } catch (error) {
      logger.error('Error extracting email body', {
        error: error.message
      });
      return {
        plainText: '',
        htmlContent: '',
        hasPlainText: false,
        hasHtml: false
      };
    }
  }

  /**
   * Extract attachment information
   */
  extractAttachments(payload) {
    try {
      const attachments = [];

      const extractFromPart = (part) => {
        if (part.filename && part.body?.attachmentId) {
          attachments.push({
            filename: part.filename,
            mimeType: part.mimeType || 'application/octet-stream',
            size: part.body.size || 0,
            attachmentId: part.body.attachmentId
          });
        } else if (part.parts) {
          part.parts.forEach(extractFromPart);
        }
      };

      if (payload.parts) {
        payload.parts.forEach(extractFromPart);
      }

      return attachments;

    } catch (error) {
      logger.error('Error extracting attachments', {
        error: error.message
      });
      return [];
    }
  }

  /**
   * Get Gmail profile information
   */
  async getProfile() {
    try {
      if (!this.isAuthenticated()) {
        throw new Error('Not authenticated with Gmail');
      }

      const response = await this.gmail.users.getProfile({
        userId: 'me'
      });

      return response.data;

    } catch (error) {
      logger.error('Error getting Gmail profile', {
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get detailed email information by ID
   */
  async getEmailDetails(messageId) {
    try {
      if (!this.isAuthenticated()) {
        throw new Error('Not authenticated with Gmail');
      }

      logger.info('Getting email details', { messageId });

      const response = await this.gmail.users.messages.get({
        userId: 'me',
        id: messageId,
        format: 'full'
      });

      const emailDetails = this.parseMessageDetails(response.data);

      logger.info('Retrieved email details', {
        messageId,
        subject: emailDetails.subject,
        from: emailDetails.from
      });

      return emailDetails;

    } catch (error) {
      logger.error('Error getting email details', {
        messageId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Send email reply
   */
  async sendReply(replyData) {
    try {
      if (!this.isAuthenticated()) {
        throw new Error('Not authenticated with Gmail');
      }

      const { threadId, to, subject, body, inReplyTo } = replyData;

      logger.info('Sending email reply', {
        threadId,
        to,
        subject: subject?.substring(0, 50)
      });

      // Create email message
      const email = [
        `To: ${to}`,
        `Subject: ${subject}`,
        `In-Reply-To: ${inReplyTo}`,
        `References: ${inReplyTo}`,
        '',
        body
      ].join('\n');

      // Encode email in base64
      const encodedEmail = Buffer.from(email).toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

      const response = await this.gmail.users.messages.send({
        userId: 'me',
        requestBody: {
          threadId: threadId,
          raw: encodedEmail
        }
      });

      logger.info('Email reply sent successfully', {
        messageId: response.data.id,
        threadId: response.data.threadId
      });

      return response.data;

    } catch (error) {
      logger.error('Error sending email reply', {
        error: error.message,
        replyData: { ...replyData, body: '[REDACTED]' }
      });
      throw error;
    }
  }

  /**
   * Send new email
   */
  async sendEmail(emailData) {
    try {
      if (!this.isAuthenticated()) {
        throw new Error('Not authenticated with Gmail');
      }

      const { to, subject, body, cc, bcc } = emailData;

      logger.info('Sending new email', {
        to,
        subject: subject?.substring(0, 50),
        hasCC: !!cc,
        hasBCC: !!bcc
      });

      // Create email message
      const emailLines = [`To: ${to}`];
      if (cc) emailLines.push(`Cc: ${cc}`);
      if (bcc) emailLines.push(`Bcc: ${bcc}`);
      emailLines.push(`Subject: ${subject}`);
      emailLines.push('');
      emailLines.push(body);

      const email = emailLines.join('\n');

      // Encode email in base64
      const encodedEmail = Buffer.from(email).toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

      const response = await this.gmail.users.messages.send({
        userId: 'me',
        requestBody: {
          raw: encodedEmail
        }
      });

      logger.info('New email sent successfully', {
        messageId: response.data.id,
        threadId: response.data.threadId
      });

      return response.data;

    } catch (error) {
      logger.error('Error sending new email', {
        error: error.message,
        emailData: { ...emailData, body: '[REDACTED]' }
      });
      throw error;
    }
  }

  /**
   * Delete email (move to trash)
   */
  async deleteEmail(messageId) {
    try {
      if (!this.isAuthenticated()) {
        throw new Error('Not authenticated with Gmail');
      }

      logger.info('Deleting email (moving to trash)', { messageId });

      // Use trash instead of delete - this moves email to trash folder
      // which requires gmail.modify scope (which we have)
      await this.gmail.users.messages.trash({
        userId: 'me',
        id: messageId
      });

      logger.info('Email moved to trash successfully', { messageId });

      return { success: true, messageId, action: 'moved_to_trash' };

    } catch (error) {
      logger.error('Error deleting email', {
        messageId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Permanently delete email (requires gmail.modify scope)
   */
  async permanentlyDeleteEmail(messageId) {
    try {
      if (!this.isAuthenticated()) {
        throw new Error('Not authenticated with Gmail');
      }

      logger.info('Permanently deleting email', { messageId });

      // This permanently deletes the email (cannot be undone)
      await this.gmail.users.messages.delete({
        userId: 'me',
        id: messageId
      });

      logger.info('Email permanently deleted successfully', { messageId });

      return { success: true, messageId, action: 'permanently_deleted' };

    } catch (error) {
      logger.error('Error permanently deleting email', {
        messageId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Archive email
   */
  async archiveEmail(messageId) {
    try {
      if (!this.isAuthenticated()) {
        throw new Error('Not authenticated with Gmail');
      }

      logger.info('Archiving email', { messageId });

      const response = await this.gmail.users.messages.modify({
        userId: 'me',
        id: messageId,
        requestBody: {
          removeLabelIds: ['INBOX']
        }
      });

      logger.info('Email archived successfully', { messageId });

      return response.data;

    } catch (error) {
      logger.error('Error archiving email', {
        messageId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Mark email as read
   */
  async markAsRead(messageId) {
    try {
      if (!this.isAuthenticated()) {
        throw new Error('Not authenticated with Gmail');
      }

      logger.info('Marking email as read', { messageId });

      const response = await this.gmail.users.messages.modify({
        userId: 'me',
        id: messageId,
        requestBody: {
          removeLabelIds: ['UNREAD']
        }
      });

      logger.info('Email marked as read', { messageId });

      return response.data;

    } catch (error) {
      logger.error('Error marking email as read', {
        messageId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Mark email as unread
   */
  async markAsUnread(messageId) {
    try {
      if (!this.isAuthenticated()) {
        throw new Error('Not authenticated with Gmail');
      }

      logger.info('Marking email as unread', { messageId });

      const response = await this.gmail.users.messages.modify({
        userId: 'me',
        id: messageId,
        requestBody: {
          addLabelIds: ['UNREAD']
        }
      });

      logger.info('Email marked as unread', { messageId });

      return response.data;

    } catch (error) {
      logger.error('Error marking email as unread', {
        messageId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Star email
   */
  async starEmail(messageId) {
    try {
      if (!this.isAuthenticated()) {
        throw new Error('Not authenticated with Gmail');
      }

      logger.info('Starring email', { messageId });

      const response = await this.gmail.users.messages.modify({
        userId: 'me',
        id: messageId,
        requestBody: {
          addLabelIds: ['STARRED']
        }
      });

      logger.info('Email starred successfully', { messageId });

      return response.data;

    } catch (error) {
      logger.error('Error starring email', {
        messageId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Unstar email
   */
  async unstarEmail(messageId) {
    try {
      if (!this.isAuthenticated()) {
        throw new Error('Not authenticated with Gmail');
      }

      logger.info('Unstarring email', { messageId });

      const response = await this.gmail.users.messages.modify({
        userId: 'me',
        id: messageId,
        requestBody: {
          removeLabelIds: ['STARRED']
        }
      });

      logger.info('Email unstarred successfully', { messageId });

      return response.data;

    } catch (error) {
      logger.error('Error unstarring email', {
        messageId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get email thread
   */
  async getThread(threadId) {
    try {
      if (!this.isAuthenticated()) {
        throw new Error('Not authenticated with Gmail');
      }

      logger.info('Getting email thread', { threadId });

      const response = await this.gmail.users.threads.get({
        userId: 'me',
        id: threadId,
        format: 'full'
      });

      const thread = {
        id: response.data.id,
        historyId: response.data.historyId,
        messages: response.data.messages.map(msg => this.parseMessageDetails(msg))
      };

      logger.info('Retrieved email thread', {
        threadId,
        messageCount: thread.messages.length
      });

      return thread;

    } catch (error) {
      logger.error('Error getting email thread', {
        threadId,
        error: error.message
      });
      throw error;
    }
  }
}
