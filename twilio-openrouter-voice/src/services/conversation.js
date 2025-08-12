/**
 * Conversation Management Service
 * ===============================
 *
 * Manages conversation state and context for phone calls
 */

import NodeCache from 'node-cache';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger.js';
import { createClient } from '@supabase/supabase-js';

class ConversationManager {
  constructor() {
    // Cache for active conversations (TTL: 30 minutes)
    this.conversationCache = new NodeCache({
      stdTTL: 1800, // 30 minutes
      checkperiod: 120 // Check for expired keys every 2 minutes
    });

    // Supabase client for logging
    this.supabase = null;
    if (process.env.SUPABASE_URL && (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY)) {
      this.supabase = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY
      );
    } else {
      logger.warn('Supabase not configured - call logging disabled');
    }

    this.maxTurns = parseInt(process.env.MAX_CONVERSATION_TURNS) || 20;
    this.contextWindowSize = parseInt(process.env.CONTEXT_WINDOW_SIZE) || 4000;
  }

  /**
   * Start a new conversation
   */
  async startConversation(callSid, fromNumber, toNumber) {
    const conversationId = uuidv4();

    const conversation = {
      id: conversationId,
      callSid,
      fromNumber,
      toNumber,
      startTime: new Date().toISOString(),
      messages: [],
      turnCount: 0,
      status: 'active'
    };

    // Store in cache
    this.conversationCache.set(callSid, conversation);

    // Log to database
    await this.logCallStart(conversation);

    logger.conversation('Conversation started', conversationId, {
      callSid,
      fromNumber,
      toNumber
    });

    return conversation;
  }

  /**
   * Add a message to the conversation
   */
  async addMessage(callSid, role, content, metadata = {}) {
    const conversation = this.conversationCache.get(callSid);

    if (!conversation) {
      logger.error('Conversation not found for call', { callSid });
      return null;
    }

    const message = {
      role,
      content,
      timestamp: new Date().toISOString(),
      metadata
    };

    conversation.messages.push(message);
    conversation.turnCount++;

    // Update cache
    this.conversationCache.set(callSid, conversation);

    // Log message to database
    await this.logMessage(conversation.id, message);

    logger.conversation('Message added', conversation.id, {
      callSid,
      role,
      contentLength: content.length,
      turnCount: conversation.turnCount
    });

    return conversation;
  }

  /**
   * Get conversation context for LLM
   */
  getConversationContext(callSid) {
    const conversation = this.conversationCache.get(callSid);

    if (!conversation) {
      return [];
    }

    // Return recent messages that fit within context window
    let context = [];
    let totalLength = 0;

    // Start from most recent and work backwards
    for (let i = conversation.messages.length - 1; i >= 0; i--) {
      const message = conversation.messages[i];
      const messageLength = message.content.length;

      if (totalLength + messageLength > this.contextWindowSize) {
        break;
      }

      context.unshift({
        role: message.role,
        content: message.content
      });

      totalLength += messageLength;
    }

    return context;
  }

  /**
   * End a conversation
   */
  async endConversation(callSid, reason = 'completed') {
    const conversation = this.conversationCache.get(callSid);

    if (!conversation) {
      logger.warn('Attempted to end non-existent conversation', { callSid });
      return null;
    }

    conversation.endTime = new Date().toISOString();
    conversation.status = 'ended';
    conversation.endReason = reason;

    // Calculate duration
    const startTime = new Date(conversation.startTime);
    const endTime = new Date(conversation.endTime);
    conversation.duration = Math.round((endTime - startTime) / 1000); // seconds

    // Log to database
    await this.logCallEnd(conversation);

    // Remove from cache
    this.conversationCache.del(callSid);

    logger.conversation('Conversation ended', conversation.id, {
      callSid,
      reason,
      duration: conversation.duration,
      messageCount: conversation.messages.length
    });

    return conversation;
  }

  /**
   * Check if conversation should continue
   */
  shouldContinueConversation(callSid) {
    const conversation = this.conversationCache.get(callSid);

    if (!conversation) {
      return false;
    }

    // Check turn limit
    if (conversation.turnCount >= this.maxTurns) {
      logger.conversation('Conversation reached turn limit', conversation.id, {
        callSid,
        turnCount: conversation.turnCount,
        maxTurns: this.maxTurns
      });
      return false;
    }

    return true;
  }

  /**
   * Log call start to database
   */
  async logCallStart(conversation) {
    if (!this.supabase) return;

    try {
      const { error } = await this.supabase
        .from('call_logs')
        .insert({
          id: conversation.id,
          call_sid: conversation.callSid,
          from_number: conversation.fromNumber,
          to_number: conversation.toNumber,
          start_time: conversation.startTime,
          status: 'active',
          service: 'twilio-openrouter'
        });

      if (error) {
        logger.error('Failed to log call start:', error);
      }
    } catch (error) {
      logger.error('Database error logging call start:', error.message);
    }
  }

  /**
   * Log message to database
   */
  async logMessage(conversationId, message) {
    if (!this.supabase) return;

    try {
      const { error } = await this.supabase
        .from('conversation_messages')
        .insert({
          conversation_id: conversationId,
          role: message.role,
          content: message.content,
          timestamp: message.timestamp,
          metadata: message.metadata
        });

      if (error && error.code !== 'PGRST116') { // Ignore table not exists
        logger.error('Failed to log message:', error);
      }
    } catch (error) {
      logger.error('Database error logging message:', error.message);
    }
  }

  /**
   * Log call end to database
   */
  async logCallEnd(conversation) {
    if (!this.supabase) return;

    try {
      const { error } = await this.supabase
        .from('call_logs')
        .update({
          end_time: conversation.endTime,
          duration: conversation.duration,
          message_count: conversation.messages.length,
          turn_count: conversation.turnCount,
          status: 'completed',
          end_reason: conversation.endReason
        })
        .eq('id', conversation.id);

      if (error && error.code !== 'PGRST116') { // Ignore table not exists
        logger.error('Failed to log call end:', error);
      }
    } catch (error) {
      logger.error('Database error logging call end:', error.message);
    }
  }

  /**
   * Get active conversation count
   */
  getActiveConversationCount() {
    return this.conversationCache.keys().length;
  }
}

export { ConversationManager };