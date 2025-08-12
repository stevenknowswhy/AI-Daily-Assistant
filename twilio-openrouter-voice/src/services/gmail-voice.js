import { logger } from '../utils/logger.js';

/**
 * Gmail Voice Service - Comprehensive email integration for voice commands
 * Handles voice-based Gmail queries with complete email data retrieval
 */
export class GmailVoiceService {
  constructor(gmailService, openRouterService) {
    this.gmail = gmailService;
    this.openRouter = openRouterService;
    
    logger.info('GmailVoiceService initialized', {
      hasGmail: !!this.gmail,
      hasOpenRouter: !!this.openRouter
    });
  }

  /**
   * Process Gmail voice command with comprehensive email data
   */
  async processGmailCommand(userMessage, callSid) {
    logger.info('=== STARTING processGmailCommand ===', {
      callSid,
      message: userMessage.substring(0, 100),
      hasGmail: !!this.gmail,
      hasOpenRouter: !!this.openRouter
    });
    
    // DIRECT SOLUTION: Skip LLM tool calling for now and use enhanced direct approach
    logger.info('Using direct enhanced approach for Gmail processing', { callSid });
    return await this.directProcessGmailCommand(userMessage, callSid);
  }

  /**
   * Direct Gmail processing with comprehensive email details
   */
  async directProcessGmailCommand(userMessage, callSid) {
    try {
      logger.info('Direct processing Gmail voice command', {
        callSid,
        message: userMessage.substring(0, 100)
      });

      // Check authentication first
      if (!this.gmail.isAuthenticated()) {
        logger.info('Gmail not authenticated, returning auth required message', { callSid });
        return {
          success: false,
          response: "I'd love to help with your Gmail, but I need to be connected to your Google account first. Please set that up through the web interface.",
          intent: 'authentication_required'
        };
      }

      logger.info('Gmail is authenticated, proceeding with direct processing', { callSid });

      // Enhanced intent detection for email queries
      const lowerMessage = userMessage.toLowerCase();
      
      // Use LLM-based analysis for all email queries (no more regex!)
      if (lowerMessage.includes('email') || lowerMessage.includes('message') ||
          lowerMessage.includes('inbox') || lowerMessage.includes('mail')) {
        logger.info('Detected email query - using LLM analysis', {
          callSid,
          message: userMessage.substring(0, 100)
        });

        return await this.handleLLMBasedEmailQuery(userMessage, callSid);
      }
      
      // Not an email command
      logger.info('Not detected as email command', { callSid });
      return null;

    } catch (error) {
      logger.error('Error in direct Gmail processing', {
        callSid,
        error: error.message,
        stack: error.stack
      });
      
      return {
        success: false,
        response: "I'm having trouble accessing your Gmail right now. Please try again in a moment.",
        error: error.message
      };
    }
  }

  /**
   * Handle email queries using LLM analysis (replaces all regex-based logic)
   */
  async handleLLMBasedEmailQuery(userMessage, callSid) {
    try {
      logger.info('Processing email query with LLM analysis', {
        callSid,
        message: userMessage.substring(0, 100)
      });

      // Get recent emails (last 24 hours + unread)
      const emails = await this.gmail.listMessages(20, 'is:unread OR newer_than:1d');

      logger.info('Retrieved emails for LLM analysis', {
        callSid,
        emailCount: emails.length
      });

      if (emails.length === 0) {
        return {
          response: "You don't have any recent emails to review.",
          emailDetails: null
        };
      }

      // Prepare email data for LLM analysis
      const emailSummaries = emails.map(email => ({
        subject: email.subject || 'No subject',
        from: email.from || 'Unknown sender',
        senderName: this.extractSenderName(email.from || ''),
        timestamp: email.date || 'Unknown time',
        isUnread: email.isUnread || false,
        isImportant: email.isImportant || false,
        snippet: email.snippet || '',
        labels: email.labels || []
      }));

      // Create email-specific messages for LLM
      const messages = this.createEmailAnalysisMessages(userMessage, emailSummaries);

      // Get LLM response using generateResponseWithTools (no system prompt override)
      const llmResponse = await this.openRouter.generateResponseWithTools(messages, [], callSid);

      logger.info('LLM email analysis completed', {
        callSid,
        success: llmResponse.success,
        responseLength: llmResponse.text?.length || 0,
        emailsAnalyzed: emails.length
      });

      return {
        response: llmResponse.success ? llmResponse.text : "I'm having trouble analyzing your emails right now. Please try again.",
        emailDetails: emailSummaries.length > 0 ? emailSummaries[0] : null,
        totalEmails: emails.length
      };

    } catch (error) {
      logger.error('Error in LLM-based email query', {
        callSid,
        error: error.message,
        stack: error.stack
      });

      return {
        response: "I'm having trouble accessing your emails right now. Please try again.",
        emailDetails: null
      };
    }
  }

  /**
   * Create comprehensive messages for LLM email analysis
   */
  createEmailAnalysisMessages(userQuery, emailSummaries) {
    const currentTime = new Date().toLocaleString('en-US', {
      timeZone: 'America/Los_Angeles',
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });

    const systemPrompt = `You are an intelligent email assistant. You're speaking to someone over the phone, so keep responses:
- Brief and conversational (1-2 sentences max)
- Natural and friendly
- Avoid technical jargon
- Focus on being helpful and specific

Current time: ${currentTime}

Here are the user's recent emails (last 24 hours + unread):

${emailSummaries.map((email, index) => `
Email ${index + 1}:
- Subject: ${email.subject}
- From: ${email.from}
- Sender Name: ${email.senderName}
- Time: ${email.timestamp}
- Status: ${email.isUnread ? 'Unread' : 'Read'}${email.isImportant ? ', Important' : ''}
- Preview: ${email.snippet.substring(0, 100)}...
- Labels: ${email.labels.join(', ')}
`).join('\n')}

Instructions:
1. Analyze the user's query and match it against the actual email data above
2. For sender-specific queries (e.g., "from John", "from Sara"), match against the actual sender names and email addresses
3. For time-based queries (e.g., "today", "this morning"), consider the timestamps
4. For content queries (e.g., "important emails"), use the status and labels
5. Provide accurate, specific responses based on the real email data
6. If no emails match the criteria, clearly state that
7. Keep responses conversational and suitable for voice interaction
8. Include specific details like sender names, subjects, and timing when relevant

Respond naturally as if speaking to the user on the phone.`;

    return [
      {
        role: 'system',
        content: systemPrompt
      },
      {
        role: 'user',
        content: userQuery
      }
    ];
  }

  /**
   * Handle sender-specific email queries with comprehensive details (DEPRECATED)
   */
  async handleSenderSpecificQuery(senderName, originalMessage, callSid) {
    try {
      logger.info('Handling sender-specific email query', {
        callSid,
        senderName,
        originalMessage: originalMessage.substring(0, 100)
      });
      
      // Get recent emails (past 24 hours by default)
      const emails = await this.gmail.listMessages(20, 'is:unread OR newer_than:1d');
      
      logger.info('Retrieved emails for sender query', {
        callSid,
        emailCount: emails.length
      });
      
      // Filter emails by sender name (precise matching)
      const matchingEmails = emails.filter(email => {
        const senderInfo = email.from || '';
        const senderLower = senderInfo.toLowerCase();
        const searchLower = senderName.toLowerCase().trim();

        // Extract the actual sender name from "Name <email>" format
        const extractedName = this.extractSenderName(senderInfo).toLowerCase();

        // Check for exact name match or partial match in extracted name only
        const exactMatch = extractedName.includes(searchLower);

        // For multi-word searches, check if all words appear in the extracted name
        const searchWords = searchLower.split(' ').filter(word => word.length > 1);
        const allWordsMatch = searchWords.length > 0 &&
                             searchWords.every(word => extractedName.includes(word));

        const matches = exactMatch || allWordsMatch;

        logger.info('Checking sender match', {
          callSid,
          emailSubject: email.subject?.substring(0, 50),
          senderInfo: senderInfo.substring(0, 50),
          extractedName: extractedName.substring(0, 30),
          searchName: searchLower,
          searchWords: searchWords,
          exactMatch,
          allWordsMatch,
          matches
        });

        return matches;
      });
      
      logger.info('Found matching emails from sender', {
        callSid,
        matchingCount: matchingEmails.length,
        senderName
      });
      
      if (matchingEmails.length === 0) {
        return {
          success: true,
          response: `I don't see any recent emails from ${senderName}. Your inbox looks clear from that sender.`,
          intent: 'query',
          emailCount: 0,
          method: 'direct_processing'
        };
      }
      
      // Return detailed information about the matching emails
      const email = matchingEmails[0]; // Most recent match
      
      let response = `You have ${matchingEmails.length} email${matchingEmails.length > 1 ? 's' : ''} from ${senderName}. `;
      
      // Add details about the most recent email
      response += `The most recent one: "${email.subject || 'No subject'}"`;
      
      if (email.receivedTime) {
        const timeAgo = this.getTimeAgo(email.receivedTime);
        response += ` received ${timeAgo}`;
      }
      
      if (email.snippet) {
        const snippet = email.snippet.length > 100 ? 
          email.snippet.substring(0, 100) + '...' : 
          email.snippet;
        response += `. Preview: ${snippet}`;
      }
      
      logger.info('Generated detailed response for sender query', {
        callSid,
        senderName,
        emailSubject: email.subject,
        responseLength: response.length
      });
      
      return {
        success: true,
        response: response,
        intent: 'query',
        emailDetails: {
          subject: email.subject,
          from: email.from,
          snippet: email.snippet,
          receivedTime: email.receivedTime,
          isUnread: email.isUnread,
          body: email.body,
          attachments: email.attachments
        },
        emailCount: matchingEmails.length,
        method: 'direct_processing'
      };
      
    } catch (error) {
      logger.error('Error handling sender-specific email query', {
        callSid,
        error: error.message
      });
      
      return {
        success: false,
        response: "I'm having trouble finding emails from that sender. Please try again.",
        error: error.message
      };
    }
  }

  /**
   * Handle general email queries
   */
  async handleGeneralEmailQuery(userMessage, callSid) {
    try {
      logger.info('Handling general email query', {
        callSid,
        message: userMessage.substring(0, 100)
      });
      
      const lowerMessage = userMessage.toLowerCase();
      let query = 'newer_than:1d'; // Default: past 24 hours
      let timeDescription = 'today';
      
      // Adjust query based on time references
      if (lowerMessage.includes('morning')) {
        query = 'newer_than:12h';
        timeDescription = 'this morning';
      } else if (lowerMessage.includes('unread') || lowerMessage.includes('new')) {
        query = 'is:unread';
        timeDescription = 'unread';
      } else if (lowerMessage.includes('important')) {
        query = 'is:important OR is:starred';
        timeDescription = 'important';
      }
      
      logger.info('Using email query', {
        callSid,
        query,
        timeDescription
      });
      
      const emails = await this.gmail.listMessages(10, query);
      
      logger.info('Retrieved emails for general query', {
        callSid,
        emailCount: emails.length,
        query
      });
      
      if (emails.length === 0) {
        return {
          success: true,
          response: `You don't have any ${timeDescription} emails. Your inbox is clear!`,
          intent: 'query',
          emailCount: 0,
          method: 'direct_processing'
        };
      }
      
      // Format emails for voice response
      const emailDescriptions = emails.slice(0, 3).map(email => {
        const sender = this.extractSenderName(email.from);
        const subject = email.subject || 'No subject';
        const timeAgo = email.receivedTime ? this.getTimeAgo(email.receivedTime) : '';
        
        return `"${subject}" from ${sender}${timeAgo ? ` ${timeAgo}` : ''}`;
      });
      
      let response = `You have ${emails.length} ${timeDescription} email${emails.length > 1 ? 's' : ''}. `;
      
      if (emails.length <= 3) {
        response += emailDescriptions.join(', ');
      } else {
        response += `Your most recent ones are: ${emailDescriptions.join(', ')}, and ${emails.length - 3} more.`;
      }
      
      logger.info('Generated response for general email query', {
        callSid,
        emailCount: emails.length,
        responseLength: response.length
      });
      
      return {
        success: true,
        response,
        intent: 'query',
        emailCount: emails.length,
        emails: emails.slice(0, 3).map(email => ({
          subject: email.subject,
          from: email.from,
          snippet: email.snippet,
          receivedTime: email.receivedTime,
          isUnread: email.isUnread,
          body: email.body,
          attachments: email.attachments
        })),
        method: 'direct_processing'
      };
      
    } catch (error) {
      logger.error('Error handling general email query', {
        callSid,
        error: error.message
      });
      
      return {
        success: false,
        response: "I'm having trouble checking your emails right now. Please try again.",
        error: error.message
      };
    }
  }

  /**
   * Extract sender name from email address
   */
  extractSenderName(fromField) {
    if (!fromField) return 'Unknown sender';
    
    // Extract name from "Name <email@domain.com>" format
    const nameMatch = fromField.match(/^([^<]+)<.*>$/);
    if (nameMatch) {
      return nameMatch[1].trim().replace(/"/g, '');
    }
    
    // Extract name from email address
    const emailMatch = fromField.match(/([^@]+)@/);
    if (emailMatch) {
      return emailMatch[1].replace(/[._]/g, ' ');
    }
    
    return fromField;
  }

  /**
   * Get human-readable time ago string
   */
  getTimeAgo(timestamp) {
    try {
      const now = new Date();
      const emailTime = new Date(timestamp);
      const diffMs = now - emailTime;
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffMinutes = Math.floor(diffMs / (1000 * 60));
      
      if (diffHours < 1) {
        return `${diffMinutes} minute${diffMinutes !== 1 ? 's' : ''} ago`;
      } else if (diffHours < 24) {
        return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
      } else {
        const diffDays = Math.floor(diffHours / 24);
        return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
      }
    } catch (error) {
      return '';
    }
  }
}
