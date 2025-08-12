/**
 * Twilio Webhook Routes
 * =====================
 *
 * Handles incoming Twilio webhook requests for voice calls
 */

import express from 'express';
import twilio from 'twilio';
import { logger } from '../utils/logger.js';
import { OpenRouterService } from '../services/openrouter.js';
import { ConversationManager } from '../services/conversation.js';
import { CalendarVoiceService } from '../services/calendar-voice.js';
import { DailyBriefingService } from '../services/daily-briefing.js';
import { ChatterboxUnifiedService } from '../services/chatterbox-unified.js';

const router = express.Router();
const VoiceResponse = twilio.twiml.VoiceResponse;

// Lazy-load services to ensure environment variables are loaded
let openRouter = null;
let conversationManager = null;
let calendarVoice = null;
let dailyBriefing = null;
let chatterboxUnified = null;

function getOpenRouter() {
  if (!openRouter) {
    openRouter = new OpenRouterService();
  }
  return openRouter;
}

function getConversationManager() {
  if (!conversationManager) {
    conversationManager = new ConversationManager();
  }
  return conversationManager;
}

function getCalendarVoice() {
  if (!calendarVoice) {
    const openRouter = getOpenRouter();
    calendarVoice = new CalendarVoiceService(null, openRouter);
  }
  return calendarVoice;
}

function getDailyBriefing() {
  if (!dailyBriefing) {
    const openRouter = getOpenRouter();
    dailyBriefing = new DailyBriefingService(null, null, openRouter);
  }
  return dailyBriefing;
}

function getChatterboxUnified() {
  if (!chatterboxUnified) {
    chatterboxUnified = new ChatterboxUnifiedService();
  }
  return chatterboxUnified;
}

/**
 * Handle incoming calls
 */
router.post('/voice', async (req, res) => {
  try {
    const { CallSid, From, To, CallStatus } = req.body;

    logger.webhook('Incoming call webhook', {
      callSid: CallSid,
      from: From,
      to: To,
      status: CallStatus
    });

    const twiml = new VoiceResponse();

    // Start conversation
    await getConversationManager().startConversation(CallSid, From, To);

    // Welcome message
    const welcomeMessage = "Good day. Your AI assistant is at your service. How may I assist you today?";

    // Add welcome message to conversation
    await getConversationManager().addMessage(CallSid, 'assistant', welcomeMessage);

    // Use Gather to collect speech input
    const gather = twiml.gather({
      input: 'speech',
      timeout: parseInt(process.env.SPEECH_TIMEOUT) || 5,
      speechTimeout: 'auto',
      action: '/webhook/process-speech',
      method: 'POST'
    });

    gather.say({
      voice: process.env.DEFAULT_VOICE || 'alice'
    }, welcomeMessage);

    // Fallback if no input
    twiml.say({
      voice: process.env.DEFAULT_VOICE || 'alice'
    }, "I didn't hear anything. Please call back when you're ready to chat!");

    twiml.hangup();

    res.type('text/xml');
    res.send(twiml.toString());

  } catch (error) {
    logger.error('Error handling incoming call:', {
      error: error.message,
      callSid: req.body.CallSid
    });

    const twiml = new VoiceResponse();
    twiml.say({
      voice: process.env.DEFAULT_VOICE || 'alice'
    }, "I'm sorry, there was an error. Please try calling again later.");
    twiml.hangup();

    res.type('text/xml');
    res.send(twiml.toString());
  }
});

/**
 * Process speech input and generate AI response
 */
router.post('/process-speech', async (req, res) => {
  try {
    const { CallSid, SpeechResult, Confidence } = req.body;

    logger.webhook('Processing speech input', {
      callSid: CallSid,
      speechResult: SpeechResult?.substring(0, 100),
      confidence: Confidence
    });

    const twiml = new VoiceResponse();

    // Check if conversation should continue
    if (!getConversationManager().shouldContinueConversation(CallSid)) {
      twiml.say({
        voice: process.env.DEFAULT_VOICE || 'alice'
      }, "Thank you for calling! Have a great day!");
      twiml.hangup();

      await getConversationManager().endConversation(CallSid, 'max_turns_reached');

      res.type('text/xml');
      res.send(twiml.toString());
      return;
    }

    if (!SpeechResult) {
      // No speech detected
      twiml.say({
        voice: process.env.DEFAULT_VOICE || 'alice'
      }, "I didn't catch that. Could you please repeat?");

      // Try again
      const gather = twiml.gather({
        input: 'speech',
        timeout: parseInt(process.env.SPEECH_TIMEOUT) || 5,
        speechTimeout: 'auto',
        action: '/webhook/process-speech',
        method: 'POST'
      });

      gather.say({
        voice: process.env.DEFAULT_VOICE || 'alice'
      }, "What would you like to talk about?");

      twiml.hangup();

      res.type('text/xml');
      res.send(twiml.toString());
      return;
    }

    // Add user message to conversation
    await getConversationManager().addMessage(CallSid, 'user', SpeechResult, {
      confidence: Confidence
    });

    // Use Chatterbox Unified Service for comprehensive processing
    const context = getConversationManager().getConversationContext(CallSid);
    const userId = req.body.From; // Use caller's phone number as user ID

    logger.info('Processing speech with Chatterbox Unified Service', {
      callSid: CallSid,
      userId: userId,
      speechLength: SpeechResult.length,
      contextLength: context.length
    });

    const aiResponse = await getChatterboxUnified().processRequest(
      SpeechResult,
      context,
      CallSid,
      userId
    );

    // Log the unified response
    logger.info('Chatterbox Unified response generated', {
      callSid: CallSid,
      success: aiResponse.success,
      hasToolCalls: aiResponse.toolCalls?.length > 0,
      toolCallCount: aiResponse.toolCalls?.length || 0,
      responseLength: aiResponse.text?.length || 0
    });

    // Add AI response to conversation
    await getConversationManager().addMessage(CallSid, 'assistant', aiResponse.text, {
      model: aiResponse.model,
      toolCalls: aiResponse.toolCalls,
      toolResults: aiResponse.toolResults,
      usage: aiResponse.usage
    });

    // Speak the AI response
    twiml.say({
      voice: process.env.DEFAULT_VOICE || 'alice'
    }, aiResponse.text);

    // Continue conversation
    const gather = twiml.gather({
      input: 'speech',
      timeout: parseInt(process.env.SPEECH_TIMEOUT) || 5,
      speechTimeout: 'auto',
      action: '/webhook/process-speech',
      method: 'POST',
      finishOnKey: process.env.FINISH_ON_KEY || '#'
    });

    gather.say({
      voice: process.env.DEFAULT_VOICE || 'alice'
    }, "Is there anything else you require?");

    // End call if no response
    twiml.say({
      voice: process.env.DEFAULT_VOICE || 'alice'
    }, "Very well. Until next time, have an excellent day.");
    twiml.hangup();

    res.type('text/xml');
    res.send(twiml.toString());

  } catch (error) {
    logger.error('Error processing speech:', {
      error: error.message,
      callSid: req.body.CallSid
    });

    const twiml = new VoiceResponse();
    twiml.say({
      voice: process.env.DEFAULT_VOICE || 'alice'
    }, "I'm sorry, I had trouble understanding. Let me try again.");

    // Try to continue conversation
    const gather = twiml.gather({
      input: 'speech',
      timeout: parseInt(process.env.SPEECH_TIMEOUT) || 5,
      speechTimeout: 'auto',
      action: '/webhook/process-speech',
      method: 'POST'
    });

    gather.say({
      voice: process.env.DEFAULT_VOICE || 'alice'
    }, "What can I help you with?");

    twiml.hangup();

    res.type('text/xml');
    res.send(twiml.toString());
  }
});

/**
 * Handle call status updates
 */
router.post('/status', async (req, res) => {
  try {
    const { CallSid, CallStatus, CallDuration } = req.body;

    logger.webhook('Call status update', {
      callSid: CallSid,
      status: CallStatus,
      duration: CallDuration
    });

    // End conversation if call is completed
    if (CallStatus === 'completed' || CallStatus === 'failed' || CallStatus === 'busy' || CallStatus === 'no-answer') {
      await getConversationManager().endConversation(CallSid, CallStatus);
    }

    res.status(200).send('OK');

  } catch (error) {
    logger.error('Error handling call status:', {
      error: error.message,
      callSid: req.body.CallSid
    });
    res.status(500).send('Error');
  }
});

/**
 * Health check for webhooks
 */
router.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'twilio-webhook',
    timestamp: new Date().toISOString(),
    activeConversations: getConversationManager().getActiveConversationCount()
  });
});

export { router as webhookRoutes };