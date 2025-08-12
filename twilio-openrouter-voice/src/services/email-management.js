/**
 * Email Management Service
 * ========================
 * 
 * Handles email reply drafts, deletions, and approval workflows
 * Integrates with Gmail API and task management system
 */

import { logger } from '../utils/logger.js';
import { GoogleGmailService } from './google-gmail.js';

export class EmailManagementService {
  constructor(gmailService, taskManagementService, openRouterService) {
    this.gmailService = gmailService || new GoogleGmailService();
    this.taskService = taskManagementService;
    this.openRouterService = openRouterService;

    // Email cache for performance
    this.emailCache = new Map();
    this.cacheExpiry = 5 * 60 * 1000; // 5 minutes

    logger.info('EmailManagementService initialized', {
      hasGmail: !!this.gmailService,
      hasTaskService: !!taskManagementService,
      hasOpenRouter: !!openRouterService
    });
  }

  // =====================================================
  // EMAIL RETRIEVAL & DISPLAY FUNCTIONALITY
  // =====================================================

  /**
   * Initialize Gmail service if not already done
   */
  async ensureGmailInitialized() {
    if (!this.gmailService.isInitialized) {
      await this.gmailService.initialize();
    }

    if (!this.gmailService.isAuthenticated()) {
      throw new Error('Gmail authentication required. Please authenticate first.');
    }
  }

  /**
   * Get user's email inbox with comprehensive details
   */
  async getInboxEmails(userId, options = {}) {
    try {
      await this.ensureGmailInitialized();

      const {
        maxResults = 20,
        query = 'in:inbox',
        includeSpam = false,
        includeTrash = false
      } = options;

      logger.info('Retrieving inbox emails', {
        userId,
        maxResults,
        query
      });

      // Check cache first
      const cacheKey = `inbox_${userId}_${query}_${maxResults}`;
      const cached = this.emailCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
        logger.info('Returning cached inbox emails', { userId, count: cached.emails.length });
        return cached.emails;
      }

      // Fetch from Gmail API
      const emails = await this.gmailService.listMessages(maxResults, query);

      // Enhance emails with additional metadata (using async categorization)
      const enhancedEmails = await Promise.all(emails.map(async email => ({
        ...email,
        priority: this.calculateEmailPriority(email),
        category: await this.categorizeEmail(email),
        sentiment: this.analyzeSentiment(email.snippet || email.body?.plainText || ''),
        actionSuggestions: this.suggestActions(email)
      })));

      // Cache the results
      this.emailCache.set(cacheKey, {
        emails: enhancedEmails,
        timestamp: Date.now()
      });

      logger.info('Retrieved and enhanced inbox emails', {
        userId,
        emailCount: enhancedEmails.length,
        unreadCount: enhancedEmails.filter(e => e.isUnread).length
      });

      return enhancedEmails;

    } catch (error) {
      logger.error('Error retrieving inbox emails', {
        userId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get email thread with full conversation history
   */
  async getEmailThread(userId, threadId) {
    try {
      await this.ensureGmailInitialized();

      logger.info('Retrieving email thread', { userId, threadId });

      const thread = await this.gmailService.getThread(threadId);

      // Enhance thread messages
      thread.messages = thread.messages.map(message => ({
        ...message,
        priority: this.calculateEmailPriority(message),
        sentiment: this.analyzeSentiment(message.snippet || message.body?.plainText || '')
      }));

      logger.info('Retrieved email thread', {
        userId,
        threadId,
        messageCount: thread.messages.length
      });

      return thread;

    } catch (error) {
      logger.error('Error retrieving email thread', {
        userId,
        threadId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Search emails with advanced filtering
   */
  async searchEmails(userId, searchOptions) {
    try {
      await this.ensureGmailInitialized();

      const {
        query,
        sender,
        subject,
        dateRange,
        hasAttachment,
        isUnread,
        maxResults = 50
      } = searchOptions;

      // Build Gmail search query
      let gmailQuery = query || '';

      if (sender) gmailQuery += ` from:${sender}`;
      if (subject) gmailQuery += ` subject:"${subject}"`;
      if (dateRange) {
        if (dateRange.after) gmailQuery += ` after:${dateRange.after}`;
        if (dateRange.before) gmailQuery += ` before:${dateRange.before}`;
      }
      if (hasAttachment) gmailQuery += ' has:attachment';
      if (isUnread) gmailQuery += ' is:unread';

      logger.info('Searching emails', {
        userId,
        gmailQuery,
        maxResults
      });

      const emails = await this.gmailService.listMessages(maxResults, gmailQuery.trim());

      logger.info('Email search completed', {
        userId,
        resultCount: emails.length
      });

      return emails;

    } catch (error) {
      logger.error('Error searching emails', {
        userId,
        searchOptions,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Categorize email based on content and metadata using LLM classification
   */
  async categorizeEmail(email) {
    try {
      // First try rule-based classification for speed
      const ruleBasedCategory = this.categorizeEmailRuleBased(email);

      // For promotional and general categories, use LLM for better accuracy
      if (ruleBasedCategory === 'promotional' || ruleBasedCategory === 'general') {
        return await this.categorizeEmailWithLLM(email);
      }

      return ruleBasedCategory;
    } catch (error) {
      logger.error('Error in LLM email categorization, falling back to rule-based', {
        error: error.message,
        emailId: email.id
      });
      return this.categorizeEmailRuleBased(email);
    }
  }

  /**
   * Rule-based email categorization (fallback method)
   */
  categorizeEmailRuleBased(email) {
    const subject = (email.subject || '').toLowerCase();

    // Safely extract body text
    let bodyText = '';
    if (email.body) {
      if (typeof email.body === 'string') {
        bodyText = email.body;
      } else if (email.body.plainText) {
        bodyText = email.body.plainText;
      } else if (email.body.htmlContent) {
        bodyText = email.body.htmlContent;
      }
    }
    const body = (bodyText || email.snippet || '').toLowerCase();
    const from = (email.from || '').toLowerCase();

    // Business/Work
    if (subject.includes('meeting') || subject.includes('project') ||
        body.includes('deadline') || body.includes('proposal')) {
      return 'business';
    }

    // Personal
    if (from.includes('family') || from.includes('friend') ||
        subject.includes('personal')) {
      return 'personal';
    }

    // Promotional
    if (subject.includes('sale') || subject.includes('offer') ||
        subject.includes('discount') || body.includes('unsubscribe')) {
      return 'promotional';
    }

    // Social
    if (from.includes('facebook') || from.includes('twitter') ||
        from.includes('linkedin') || from.includes('instagram')) {
      return 'social';
    }

    // Financial
    if (subject.includes('invoice') || subject.includes('payment') ||
        subject.includes('bill') || subject.includes('statement')) {
      return 'financial';
    }

    return 'general';
  }

  /**
   * LLM-based email categorization for better accuracy
   */
  async categorizeEmailWithLLM(email) {
    try {
      if (!this.openRouterService) {
        return this.categorizeEmailRuleBased(email);
      }

      const subject = email.subject || '';
      const snippet = email.snippet || '';
      const from = email.from || '';

      // Limit content length for LLM processing
      const content = `${subject} ${snippet}`.substring(0, 500);

      const prompt = `Analyze this email and categorize it into one of these categories:
- business: Work-related, meetings, projects, professional communications
- personal: Family, friends, personal matters
- promotional: Marketing, sales, offers, newsletters, advertisements
- social: Social media notifications, social platforms
- financial: Bills, invoices, payments, banking, financial statements
- important: Urgent matters, time-sensitive communications
- general: Everything else

Email details:
From: ${from}
Subject: ${subject}
Content: ${snippet}

Respond with only the category name (lowercase, single word).`;

      const messages = [{ role: 'user', content: prompt }];
      const response = await this.openRouterService.generateResponse(messages);

      if (response && response.text) {
        const category = response.text.trim().toLowerCase();
        const validCategories = ['business', 'personal', 'promotional', 'social', 'financial', 'important', 'general'];

        if (validCategories.includes(category)) {
          logger.info('LLM email categorization successful', {
            emailId: email.id,
            category,
            from: from.substring(0, 50)
          });
          return category;
        }
      }

      // Fallback to rule-based if LLM response is invalid
      return this.categorizeEmailRuleBased(email);

    } catch (error) {
      logger.error('Error in LLM email categorization', {
        error: error.message,
        emailId: email.id
      });
      return this.categorizeEmailRuleBased(email);
    }
  }

  /**
   * Analyze email sentiment
   */
  analyzeSentiment(text) {
    if (!text) return 'neutral';

    const positiveWords = ['thank', 'great', 'excellent', 'wonderful', 'amazing', 'love', 'perfect'];
    const negativeWords = ['sorry', 'problem', 'issue', 'error', 'wrong', 'bad', 'terrible', 'hate'];
    const urgentWords = ['urgent', 'asap', 'immediately', 'critical', 'emergency'];

    const lowerText = text.toLowerCase();

    if (urgentWords.some(word => lowerText.includes(word))) {
      return 'urgent';
    }

    const positiveCount = positiveWords.filter(word => lowerText.includes(word)).length;
    const negativeCount = negativeWords.filter(word => lowerText.includes(word)).length;

    if (positiveCount > negativeCount) return 'positive';
    if (negativeCount > positiveCount) return 'negative';
    return 'neutral';
  }

  /**
   * Suggest actions for an email
   */
  suggestActions(email) {
    const actions = [];
    const subject = (email.subject || '').toLowerCase();

    // Safely extract body text
    let bodyText = '';
    if (email.body) {
      if (typeof email.body === 'string') {
        bodyText = email.body;
      } else if (email.body.plainText) {
        bodyText = email.body.plainText;
      } else if (email.body.htmlContent) {
        bodyText = email.body.htmlContent;
      }
    }
    const body = (bodyText || email.snippet || '').toLowerCase();

    // Reply suggestions
    if (body.includes('?') || body.includes('please respond') || body.includes('let me know')) {
      actions.push({
        type: 'reply',
        priority: 'high',
        suggestion: 'This email appears to require a response'
      });
    }

    // Meeting suggestions
    if (subject.includes('meeting') || body.includes('schedule') || body.includes('calendar')) {
      actions.push({
        type: 'calendar',
        priority: 'medium',
        suggestion: 'Consider adding to calendar or scheduling a meeting'
      });
    }

    // Archive suggestions
    if (email.category === 'promotional' || email.category === 'social') {
      actions.push({
        type: 'archive',
        priority: 'low',
        suggestion: 'Consider archiving this promotional/social email'
      });
    }

    return actions;
  }

  // =====================================================
  // AI WRITING ASSISTANT & REPLY FUNCTIONALITY
  // =====================================================

  /**
   * Generate multiple AI-powered reply options
   */
  async generateReplyOptions(userId, emailId, replyInstructions, options = {}) {
    try {
      await this.ensureGmailInitialized();

      // Get original email details
      const originalEmail = await this.gmailService.getEmailDetails(emailId);

      if (!originalEmail) {
        throw new Error(`Email not found: ${emailId}`);
      }

      const {
        tones = ['professional', 'casual', 'brief', 'detailed'],
        includeContext = true,
        maxOptions = 3
      } = options;

      logger.info('Generating AI reply options', {
        userId,
        emailId,
        tones,
        maxOptions
      });

      // Generate replies for each tone
      const replyOptions = [];

      for (const tone of tones.slice(0, maxOptions)) {
        try {
          const replyPrompt = this.buildAdvancedReplyPrompt(originalEmail, replyInstructions, tone, includeContext);
          const llmResponse = await this.openRouterService.generateResponse([
            { role: 'user', content: replyPrompt }
          ]);

          const replyContent = this.extractReplyContent(llmResponse.content);
          const replySubject = this.generateReplySubject(originalEmail.subject);

          replyOptions.push({
            tone,
            subject: replySubject,
            content: replyContent,
            wordCount: replyContent.split(' ').length,
            sentiment: this.analyzeSentiment(replyContent),
            confidence: this.calculateReplyConfidence(originalEmail, replyContent, tone)
          });

        } catch (error) {
          logger.error('Error generating reply option', {
            tone,
            error: error.message
          });
        }
      }

      // Sort by confidence
      replyOptions.sort((a, b) => b.confidence - a.confidence);

      logger.info('Generated AI reply options', {
        userId,
        emailId,
        optionCount: replyOptions.length
      });

      return {
        originalEmail: {
          id: originalEmail.id,
          subject: originalEmail.subject,
          from: originalEmail.from,
          snippet: originalEmail.snippet,
          sentiment: this.analyzeSentiment(originalEmail.body?.plainText || originalEmail.snippet)
        },
        replyOptions
      };

    } catch (error) {
      logger.error('Error generating reply options', {
        userId,
        emailId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Build advanced reply prompt with tone and context awareness
   */
  buildAdvancedReplyPrompt(originalEmail, replyInstructions, tone, includeContext) {
    const contextInfo = includeContext ? `
Original Email Context:
- From: ${originalEmail.from}
- Subject: ${originalEmail.subject}
- Date: ${originalEmail.date}
- Content: ${originalEmail.body?.plainText || originalEmail.snippet}
- Sentiment: ${this.analyzeSentiment(originalEmail.body?.plainText || originalEmail.snippet)}
` : '';

    const toneInstructions = {
      professional: 'Write in a professional, formal tone. Use proper business language and maintain courtesy.',
      casual: 'Write in a casual, friendly tone. Use conversational language while remaining respectful.',
      brief: 'Write a brief, concise response. Get straight to the point while being polite.',
      detailed: 'Write a comprehensive, detailed response. Provide thorough explanations and context.'
    };

    return `You are an AI email writing assistant. Generate a ${tone} email reply based on the following:

${contextInfo}

Reply Instructions: ${replyInstructions}

Tone Guidelines: ${toneInstructions[tone] || toneInstructions.professional}

Requirements:
1. Match the tone and formality level of the original email
2. Address all points mentioned in the original email
3. Be helpful and constructive
4. Include appropriate greetings and closings
5. Keep the response relevant and focused
6. Use proper grammar and spelling

Generate ONLY the email body content (no subject line):`;
  }

  /**
   * Calculate reply confidence based on context matching
   */
  calculateReplyConfidence(originalEmail, replyContent, tone) {
    let confidence = 0.7; // Base confidence

    // Check if reply addresses key points from original
    const originalText = (originalEmail.body?.plainText || originalEmail.snippet || '').toLowerCase();
    const replyText = replyContent.toLowerCase();

    // Look for question words in original and responses in reply
    const questionWords = ['what', 'when', 'where', 'who', 'why', 'how', '?'];
    const hasQuestions = questionWords.some(word => originalText.includes(word));

    if (hasQuestions) {
      const responseWords = ['yes', 'no', 'will', 'can', 'would', 'should', 'let me', 'i will'];
      const hasResponses = responseWords.some(word => replyText.includes(word));
      if (hasResponses) confidence += 0.15;
    }

    // Check tone appropriateness
    const originalSentiment = this.analyzeSentiment(originalText);
    const replySentiment = this.analyzeSentiment(replyText);

    if (originalSentiment === 'urgent' && tone === 'brief') confidence += 0.1;
    if (originalSentiment === 'positive' && replySentiment === 'positive') confidence += 0.05;

    // Length appropriateness
    const replyLength = replyContent.split(' ').length;
    if (tone === 'brief' && replyLength < 50) confidence += 0.05;
    if (tone === 'detailed' && replyLength > 100) confidence += 0.05;

    return Math.min(confidence, 0.98); // Cap at 98%
  }

  /**
   * Generate smart reply suggestions for common scenarios
   */
  async generateSmartSuggestions(userId, emailId) {
    try {
      const originalEmail = await this.gmailService.getEmailDetails(emailId);
      const emailText = (originalEmail.body?.plainText || originalEmail.snippet || '').toLowerCase();
      const subject = (originalEmail.subject || '').toLowerCase();

      const suggestions = [];

      // Meeting scheduling
      if (emailText.includes('meeting') || emailText.includes('schedule') || emailText.includes('calendar')) {
        suggestions.push({
          type: 'meeting',
          title: 'Schedule Meeting',
          template: "I'd be happy to meet. I'm available [INSERT TIMES]. Please let me know what works best for you.",
          confidence: 0.9
        });
      }

      // Follow-up responses
      if (emailText.includes('follow up') || emailText.includes('checking in')) {
        suggestions.push({
          type: 'followup',
          title: 'Follow-up Response',
          template: "Thank you for following up. [INSERT UPDATE]. I'll keep you posted on any developments.",
          confidence: 0.85
        });
      }

      // Confirmation responses
      if (emailText.includes('confirm') || emailText.includes('please let me know')) {
        suggestions.push({
          type: 'confirmation',
          title: 'Confirmation',
          template: "Yes, I can confirm [INSERT DETAILS]. Please let me know if you need any additional information.",
          confidence: 0.9
        });
      }

      // Thank you responses
      if (emailText.includes('thank') || emailText.includes('appreciate')) {
        suggestions.push({
          type: 'thanks',
          title: 'Thank You Reply',
          template: "You're very welcome! I'm glad I could help. Please don't hesitate to reach out if you need anything else.",
          confidence: 0.8
        });
      }

      // Decline/unavailable responses
      if (emailText.includes('available') || emailText.includes('can you')) {
        suggestions.push({
          type: 'decline',
          title: 'Polite Decline',
          template: "Thank you for thinking of me. Unfortunately, I won't be able to [INSERT REASON]. I hope you understand.",
          confidence: 0.75
        });
      }

      logger.info('Generated smart reply suggestions', {
        userId,
        emailId,
        suggestionCount: suggestions.length
      });

      return suggestions;

    } catch (error) {
      logger.error('Error generating smart suggestions', {
        userId,
        emailId,
        error: error.message
      });
      return [];
    }
  }

  /**
   * Generate email reply draft using LLM (enhanced version)
   */
  async generateEmailReplyDraft(userId, emailId, replyInstructions) {
    try {
      // Get original email details
      const originalEmail = await this.gmailService.getEmailDetails(emailId);
      
      if (!originalEmail) {
        throw new Error(`Email not found: ${emailId}`);
      }

      // Generate reply using LLM
      const replyPrompt = this.buildReplyPrompt(originalEmail, replyInstructions);
      const llmResponse = await this.openRouterService.generateResponse([
        { role: 'user', content: replyPrompt }
      ]);

      // Extract reply content and subject
      const draftContent = this.extractReplyContent(llmResponse.content);
      const replySubject = this.generateReplySubject(originalEmail.subject);

      // Create task for this email reply
      const task = await this.taskService.createTask(userId, {
        taskType: 'email_reply',
        taskSummary: `Reply to ${originalEmail.from} about "${originalEmail.subject}"`,
        voiceCommand: replyInstructions,
        llmConfidence: 0.85,
        priority: this.calculateEmailPriority(originalEmail),
        taskDataDetails: {
          email_id: emailId,
          recipient: originalEmail.from,
          original_subject: originalEmail.subject,
          reply_instructions: replyInstructions
        }
      });

      // Create email action record
      const emailAction = await this.taskService.createEmailReplyDraft(userId, task.id, {
        emailId,
        originalEmailData: originalEmail,
        draftContent,
        recipientEmail: originalEmail.from,
        replySubject,
        gmailThreadId: originalEmail.threadId
      });

      // Update task status to draft_ready
      await this.taskService.updateTaskStatus(task.id, 'draft_ready');

      logger.info('Email reply draft generated', {
        userId,
        taskId: task.id,
        emailId,
        recipientEmail: originalEmail.from,
        draftLength: draftContent.length
      });

      return {
        task,
        emailAction,
        draftContent,
        originalEmail: {
          subject: originalEmail.subject,
          from: originalEmail.from,
          snippet: originalEmail.snippet
        }
      };
    } catch (error) {
      logger.error('Failed to generate email reply draft', {
        userId,
        emailId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Build LLM prompt for email reply generation
   */
  buildReplyPrompt(originalEmail, replyInstructions) {
    return `You are helping a user reply to an email. Generate a professional, concise email reply.

ORIGINAL EMAIL:
From: ${originalEmail.from}
Subject: ${originalEmail.subject}
Date: ${originalEmail.date}
Content: ${originalEmail.body || originalEmail.snippet}

USER'S REPLY INSTRUCTIONS: ${replyInstructions}

Generate a professional email reply that:
1. Addresses the original email appropriately
2. Follows the user's instructions
3. Maintains a professional but friendly tone
4. Is concise and clear
5. Includes appropriate greetings and closings

REPLY EMAIL:`;
  }

  /**
   * Extract reply content from LLM response
   */
  extractReplyContent(llmResponse) {
    // Clean up LLM response to extract just the email content
    let content = llmResponse.trim();
    
    // Remove common LLM prefixes
    content = content.replace(/^(Here's a|Here is a|I'll help you|Let me help you).*?reply:?\s*/i, '');
    content = content.replace(/^REPLY EMAIL:\s*/i, '');
    
    return content.trim();
  }

  /**
   * Generate appropriate reply subject
   */
  generateReplySubject(originalSubject) {
    if (originalSubject.toLowerCase().startsWith('re:')) {
      return originalSubject;
    }
    return `Re: ${originalSubject}`;
  }

  /**
   * Calculate email priority based on content and sender
   */
  calculateEmailPriority(email) {
    // Safely extract text content from email body
    let bodyText = '';
    if (email.body) {
      if (typeof email.body === 'string') {
        bodyText = email.body;
      } else if (email.body.plainText) {
        bodyText = email.body.plainText;
      } else if (email.body.htmlContent) {
        bodyText = email.body.htmlContent;
      }
    }

    const content = (bodyText || email.snippet || '').toLowerCase();
    const subject = (email.subject || '').toLowerCase();

    // High priority indicators
    if (content.includes('urgent') || subject.includes('urgent')) return 1;
    if (content.includes('asap') || subject.includes('asap')) return 1;
    if (content.includes('important') || subject.includes('important')) return 2;

    // Normal priority
    return 3;
  }

  // =====================================================
  // BULK EMAIL MANAGEMENT & SECURITY
  // =====================================================

  /**
   * Bulk delete emails with safety checks
   */
  async bulkDeleteEmails(userId, emailIds, options = {}) {
    try {
      await this.ensureGmailInitialized();

      const {
        requireConfirmation = true,
        maxBatchSize = 50,
        dryRun = false
      } = options;

      if (emailIds.length > maxBatchSize) {
        throw new Error(`Batch size too large. Maximum ${maxBatchSize} emails per batch.`);
      }

      logger.info('Starting bulk email deletion', {
        userId,
        emailCount: emailIds.length,
        dryRun
      });

      const results = {
        successful: [],
        failed: [],
        skipped: []
      };

      // Get email details for safety verification
      const emailDetails = [];
      for (const emailId of emailIds) {
        try {
          const email = await this.gmailService.getEmailDetails(emailId);
          emailDetails.push(email);
        } catch (error) {
          results.failed.push({
            emailId,
            error: 'Failed to retrieve email details'
          });
        }
      }

      // Safety checks
      const importantEmails = emailDetails.filter(email =>
        email.isImportant ||
        email.isStarred ||
        this.calculateEmailPriority(email) <= 2
      );

      if (importantEmails.length > 0 && requireConfirmation) {
        logger.warn('Bulk deletion includes important emails', {
          userId,
          importantCount: importantEmails.length
        });

        return {
          requiresConfirmation: true,
          importantEmails: importantEmails.map(email => ({
            id: email.id,
            subject: email.subject,
            from: email.from,
            isImportant: email.isImportant,
            isStarred: email.isStarred
          })),
          totalCount: emailIds.length
        };
      }

      // Perform deletion (or dry run)
      if (!dryRun) {
        for (const email of emailDetails) {
          try {
            await this.gmailService.deleteEmail(email.id);
            results.successful.push({
              emailId: email.id,
              subject: email.subject,
              from: email.from
            });
          } catch (error) {
            results.failed.push({
              emailId: email.id,
              error: error.message
            });
          }
        }
      } else {
        results.successful = emailDetails.map(email => ({
          emailId: email.id,
          subject: email.subject,
          from: email.from,
          action: 'would_delete'
        }));
      }

      logger.info('Bulk email deletion completed', {
        userId,
        successful: results.successful.length,
        failed: results.failed.length,
        dryRun
      });

      return results;

    } catch (error) {
      logger.error('Error in bulk email deletion', {
        userId,
        emailCount: emailIds.length,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Bulk archive emails
   */
  async bulkArchiveEmails(userId, emailIds) {
    try {
      await this.ensureGmailInitialized();

      logger.info('Starting bulk email archiving', {
        userId,
        emailCount: emailIds.length
      });

      const results = {
        successful: [],
        failed: []
      };

      for (const emailId of emailIds) {
        try {
          await this.gmailService.archiveEmail(emailId);
          results.successful.push(emailId);
        } catch (error) {
          results.failed.push({
            emailId,
            error: error.message
          });
        }
      }

      logger.info('Bulk email archiving completed', {
        userId,
        successful: results.successful.length,
        failed: results.failed.length
      });

      return results;

    } catch (error) {
      logger.error('Error in bulk email archiving', {
        userId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Bulk mark emails as read/unread
   */
  async bulkMarkEmails(userId, emailIds, markAsRead = true) {
    try {
      await this.ensureGmailInitialized();

      logger.info('Starting bulk email marking', {
        userId,
        emailCount: emailIds.length,
        markAsRead
      });

      const results = {
        successful: [],
        failed: []
      };

      for (const emailId of emailIds) {
        try {
          if (markAsRead) {
            await this.gmailService.markAsRead(emailId);
          } else {
            await this.gmailService.markAsUnread(emailId);
          }
          results.successful.push(emailId);
        } catch (error) {
          results.failed.push({
            emailId,
            error: error.message
          });
        }
      }

      logger.info('Bulk email marking completed', {
        userId,
        successful: results.successful.length,
        failed: results.failed.length,
        markAsRead
      });

      return results;

    } catch (error) {
      logger.error('Error in bulk email marking', {
        userId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Detect and filter spam emails
   */
  async detectSpamEmails(userId, emails) {
    try {
      const spamIndicators = [
        'urgent action required',
        'click here now',
        'limited time offer',
        'congratulations you have won',
        'nigerian prince',
        'free money',
        'act now',
        'no obligation',
        'risk free'
      ];

      const suspiciousEmails = emails.filter(email => {
        const content = (email.body?.plainText || email.snippet || '').toLowerCase();
        const subject = (email.subject || '').toLowerCase();
        const from = (email.from || '').toLowerCase();

        // Check for spam indicators
        const hasSpamWords = spamIndicators.some(indicator =>
          content.includes(indicator) || subject.includes(indicator)
        );

        // Check for suspicious sender patterns
        const hasSuspiciousSender = from.includes('noreply') &&
          (content.includes('click') || content.includes('verify'));

        // Check for excessive capitalization
        const hasExcessiveCaps = subject.length > 0 &&
          (subject.match(/[A-Z]/g) || []).length / subject.length > 0.5;

        return hasSpamWords || hasSuspiciousSender || hasExcessiveCaps;
      });

      logger.info('Spam detection completed', {
        userId,
        totalEmails: emails.length,
        suspiciousEmails: suspiciousEmails.length
      });

      return suspiciousEmails;

    } catch (error) {
      logger.error('Error in spam detection', {
        userId,
        error: error.message
      });
      return [];
    }
  }

  /**
   * Implement undo functionality for email operations
   */
  async undoEmailOperation(userId, operationId) {
    try {
      // This would require implementing an operation log
      // For now, return a placeholder
      logger.info('Undo operation requested', {
        userId,
        operationId
      });

      return {
        success: false,
        message: 'Undo functionality not yet implemented. Please check Gmail trash for deleted emails.'
      };

    } catch (error) {
      logger.error('Error in undo operation', {
        userId,
        operationId,
        error: error.message
      });
      throw error;
    }
  }

  // =====================================================
  // EMAIL DELETION FUNCTIONALITY
  // =====================================================

  /**
   * Create email deletion task
   */
  async createEmailDeleteAction(userId, taskId, emailData) {
    try {
      const { emailId, reason } = emailData;

      // Get email details for confirmation
      const originalEmail = await this.gmailService.getEmailDetails(emailId);
      
      const { data, error } = await this.taskService.supabase
        .from('user_email_actions')
        .insert({
          user_id: userId,
          task_id: taskId,
          email_id: emailId,
          action_type: 'delete',
          approval_status: 'pending',
          original_email_data: {
            subject: originalEmail.subject,
            from: originalEmail.from,
            date: originalEmail.date,
            snippet: originalEmail.snippet,
            reason: reason
          }
        })
        .select()
        .single();

      if (error) {
        logger.error('Error creating email delete action', {
          userId,
          taskId,
          emailId,
          error: error.message
        });
        throw error;
      }

      logger.info('Email delete action created', {
        userId,
        taskId,
        emailId,
        emailSubject: originalEmail.subject
      });

      return data;
    } catch (error) {
      logger.error('Failed to create email delete action', {
        userId,
        taskId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Execute approved email deletion
   */
  async executeEmailDeletion(emailActionId) {
    try {
      // Get email action details
      const { data: emailAction, error: fetchError } = await this.taskService.supabase
        .from('user_email_actions')
        .select('*')
        .eq('id', emailActionId)
        .eq('approval_status', 'approved')
        .single();

      if (fetchError || !emailAction) {
        throw new Error(`Email action not found or not approved: ${emailActionId}`);
      }

      // Delete email via Gmail API
      await this.gmailService.deleteEmail(emailAction.email_id);

      // Update email action record
      await this.taskService.supabase
        .from('user_email_actions')
        .update({
          sent_at: new Date().toISOString(), // Using sent_at as "executed_at" for deletions
          updated_at: new Date().toISOString()
        })
        .eq('id', emailActionId);

      // Complete the associated task
      const completionSummary = `Email deleted: "${emailAction.original_email_data.subject}" from ${emailAction.original_email_data.from}`;
      await this.taskService.updateTaskStatus(emailAction.task_id, 'completed', completionSummary);

      logger.info('Email deletion executed', {
        emailActionId,
        emailId: emailAction.email_id,
        emailSubject: emailAction.original_email_data.subject
      });

      return {
        success: true,
        completionSummary
      };
    } catch (error) {
      logger.error('Failed to execute email deletion', {
        emailActionId,
        error: error.message
      });
      throw error;
    }
  }

  // =====================================================
  // EMAIL SENDING FUNCTIONALITY
  // =====================================================

  /**
   * Send approved email reply
   */
  async sendApprovedEmailReply(emailActionId) {
    try {
      // Get approved email action
      const { data: emailAction, error: fetchError } = await this.taskService.supabase
        .from('user_email_actions')
        .select('*')
        .eq('id', emailActionId)
        .eq('approval_status', 'approved')
        .single();

      if (fetchError || !emailAction) {
        throw new Error(`Email action not found or not approved: ${emailActionId}`);
      }

      const contentToSend = emailAction.final_content || emailAction.draft_content;

      // Send email via Gmail API
      const sentMessage = await this.gmailService.sendReply({
        threadId: emailAction.gmail_thread_id,
        to: emailAction.recipient_email,
        subject: emailAction.reply_subject,
        body: contentToSend,
        inReplyTo: emailAction.email_id
      });

      // Update email action with sent details
      await this.taskService.markEmailSent(emailActionId, sentMessage.id);

      // Complete the associated task
      const completionSummary = `Reply sent to ${emailAction.recipient_email}: "${emailAction.reply_subject}"`;
      await this.taskService.updateTaskStatus(emailAction.task_id, 'completed', completionSummary);

      logger.info('Email reply sent successfully', {
        emailActionId,
        recipientEmail: emailAction.recipient_email,
        gmailMessageId: sentMessage.id
      });

      return {
        success: true,
        sentMessageId: sentMessage.id,
        completionSummary
      };
    } catch (error) {
      logger.error('Failed to send email reply', {
        emailActionId,
        error: error.message
      });
      throw error;
    }
  }
}
