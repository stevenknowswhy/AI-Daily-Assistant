/**
 * Test Routes
 * ===========
 *
 * API endpoints for testing Twilio and OpenRouter connectivity
 */

import express from 'express';
import twilio from 'twilio';
import { logger } from '../utils/logger.js';
import { OpenRouterService } from '../services/openrouter.js';
import { ConversationManager } from '../services/conversation.js';
import { GoogleCalendarService } from '../services/google-calendar.js';
import { CalendarVoiceService } from '../services/calendar-voice.js';
import { GoogleGmailService } from '../services/google-gmail.js';
import { GmailVoiceService } from '../services/gmail-voice.js';
import { DailyBriefingService } from '../services/daily-briefing.js';
import { ChatterboxUnifiedService } from '../services/chatterbox-unified.js';
import { getBillsAuthState, setBillsAuthState, authenticateBills, signOutBills } from '../utils/auth-state.js';

const router = express.Router();

// Lazy-load Chatterbox service to ensure environment variables are loaded
let chatterboxService = null;

function getChatterboxService() {
  if (!chatterboxService) {
    chatterboxService = new ChatterboxUnifiedService();
  }
  return chatterboxService;
}

// Lazy-load services to ensure environment variables are loaded
let openRouter = null;
let conversationManager = null;
let googleCalendar = null;
let calendarVoice = null;
let googleGmail = null;
let gmailVoice = null;
let dailyBriefing = null;

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

function getGoogleCalendar() {
  if (!googleCalendar) {
    googleCalendar = new GoogleCalendarService();
    googleCalendar.initialize();
  }
  return googleCalendar;
}

function getCalendarVoice() {
  if (!calendarVoice) {
    const googleCalendar = getGoogleCalendar();
    const openRouter = getOpenRouter();
    calendarVoice = new CalendarVoiceService(googleCalendar, openRouter);
  }
  return calendarVoice;
}

function getGoogleGmail() {
  if (!googleGmail) {
    logger.info('Initializing Google Gmail service');
    googleGmail = new GoogleGmailService();
    googleGmail.initialize().catch(error => {
      logger.error('Failed to initialize Google Gmail service', { error: error.message });
    });
  }
  return googleGmail;
}

function getGmailVoice() {
  if (!gmailVoice) {
    logger.info('Getting GmailVoice service');
    const gmail = getGoogleGmail();
    const openRouter = getOpenRouter();
    gmailVoice = new GmailVoiceService(gmail, openRouter);
    logger.info('GmailVoice service obtained');
  }
  return gmailVoice;
}

function getDailyBriefing() {
  if (!dailyBriefing) {
    logger.info('Getting DailyBriefing service');
    const calendar = getGoogleCalendar();
    const gmail = getGoogleGmail();
    const openRouter = getOpenRouter();
    dailyBriefing = new DailyBriefingService(calendar, gmail, openRouter);
    logger.info('DailyBriefing service obtained');
  }
  return dailyBriefing;
}

/**
 * Test OpenRouter connection
 */
router.get('/openrouter', async (req, res) => {
  try {
    logger.info('Testing OpenRouter connection');

    const result = await getOpenRouter().testConnection();

    res.json({
      success: result.success,
      service: 'OpenRouter',
      timestamp: new Date().toISOString(),
      ...result
    });

  } catch (error) {
    logger.error('OpenRouter test failed:', error.message);
    res.status(500).json({
      success: false,
      service: 'OpenRouter',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Test OpenRouter chat completion
 */
router.post('/openrouter/chat', async (req, res) => {
  try {
    const { message = 'Hello, this is a test message.' } = req.body;

    logger.info('Testing OpenRouter chat completion', { message });

    const response = await getOpenRouter().generateResponse(message, [], 'test-call');

    res.json({
      success: true,
      service: 'OpenRouter Chat',
      timestamp: new Date().toISOString(),
      input: message,
      response: response
    });

  } catch (error) {
    logger.error('OpenRouter chat test failed:', error.message);
    res.status(500).json({
      success: false,
      service: 'OpenRouter Chat',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Test Twilio connection
 */
router.get('/twilio', async (req, res) => {
  try {
    logger.info('Testing Twilio connection');

    const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

    // Test by fetching account information
    const account = await client.api.accounts(process.env.TWILIO_ACCOUNT_SID).fetch();

    // Get phone number info
    let phoneNumberInfo = null;
    try {
      const phoneNumbers = await client.incomingPhoneNumbers.list({
        phoneNumber: process.env.TWILIO_PHONE_NUMBER
      });
      phoneNumberInfo = phoneNumbers[0] || null;
    } catch (phoneError) {
      logger.warn('Could not fetch phone number info:', phoneError.message);
    }

    res.json({
      success: true,
      service: 'Twilio',
      timestamp: new Date().toISOString(),
      account: {
        sid: account.sid,
        friendlyName: account.friendlyName,
        status: account.status,
        type: account.type
      },
      phoneNumber: {
        number: process.env.TWILIO_PHONE_NUMBER,
        configured: !!phoneNumberInfo,
        sid: phoneNumberInfo?.sid,
        capabilities: phoneNumberInfo?.capabilities
      }
    });

  } catch (error) {
    logger.error('Twilio test failed:', error.message);
    res.status(500).json({
      success: false,
      service: 'Twilio',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Test outbound call
 */
router.post('/twilio/call', async (req, res) => {
  try {
    const { to, message = 'Hello, this is a test call from your AI Daily Assistant.' } = req.body;

    if (!to) {
      return res.status(400).json({
        success: false,
        error: 'Phone number (to) is required',
        timestamp: new Date().toISOString()
      });
    }

    logger.info('Testing outbound call', { to, message });

    const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

    const call = await client.calls.create({
      to: to,
      from: process.env.TWILIO_PHONE_NUMBER,
      twiml: `<Response><Say voice="${process.env.DEFAULT_VOICE || 'alice'}">${message}</Say></Response>`
    });

    res.json({
      success: true,
      service: 'Twilio Outbound Call',
      timestamp: new Date().toISOString(),
      call: {
        sid: call.sid,
        to: call.to,
        from: call.from,
        status: call.status,
        direction: call.direction
      }
    });

  } catch (error) {
    logger.error('Outbound call test failed:', error.message);
    res.status(500).json({
      success: false,
      service: 'Twilio Outbound Call',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Simple authentication status check for frontend (no validation middleware)
 */
router.get('/auth-status', async (req, res) => {
  try {
    const chatterboxService = getChatterboxService();
    const authStatus = await chatterboxService.checkAuthentication();

    res.json({
      success: true,
      authentication: authStatus,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Auth status check failed', error.message);

    res.json({
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
 * Disconnect individual services
 */
router.post('/auth/disconnect/:service', async (req, res) => {
  try {
    const { service } = req.params;
    console.log(`🚪 Backend disconnect requested for service: ${service}`);

    const chatterboxService = getChatterboxService();
    const authManager = chatterboxService.authManager;

    switch (service) {
      case 'calendar':
      case 'gmail':
        // For Google services, revoke the entire OAuth token
        if (authManager && typeof authManager.revokeAuthentication === 'function') {
          const revokeResult = await authManager.revokeAuthentication('default_user');
          if (revokeResult.success) {
            console.log(`✅ Successfully disconnected ${service}`);
            res.json({
              success: true,
              message: `Successfully disconnected ${service}`,
              service,
              timestamp: new Date().toISOString()
            });
          } else {
            throw new Error(revokeResult.error || `Failed to disconnect ${service}`);
          }
        } else {
          throw new Error('Auth manager not available');
        }
        break;

      case 'bills':
        // Clear Bills authentication state
        signOutBills();
        console.log('✅ Disconnected Bills/Supabase');
        res.json({
          success: true,
          message: 'Successfully disconnected Bills/Supabase',
          service,
          timestamp: new Date().toISOString()
        });
        break;

      case 'phone':
        // For phone, we could clear daily call preferences or just return success
        console.log('✅ Phone disconnect requested (handled by Daily Call widget)');
        res.json({
          success: true,
          message: 'Phone disconnect handled by Daily Call widget',
          service,
          timestamp: new Date().toISOString()
        });
        break;

      default:
        throw new Error(`Unknown service: ${service}`);
    }

  } catch (error) {
    logger.error(`Disconnect failed for service ${req.params.service}:`, error.message);
    res.status(500).json({
      success: false,
      error: error.message,
      service: req.params.service,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Sign out of all services - revoke authentication tokens
 */
router.post('/auth/signout', async (req, res) => {
  try {
    console.log('🚪 Backend sign-out requested...');

    // Get the auth manager and revoke authentication
    const chatterboxService = getChatterboxService();
    const authManager = chatterboxService.authManager;

    if (authManager && typeof authManager.revokeAuthentication === 'function') {
      const revokeResult = await authManager.revokeAuthentication('default_user');

      if (revokeResult.success) {
        console.log('✅ Successfully revoked authentication tokens');

        // Also clear Bills authentication state using shared module
        signOutBills();
        console.log('✅ Cleared Bills authentication state');

        res.json({
          success: true,
          message: 'Successfully signed out of all services',
          timestamp: new Date().toISOString()
        });
      } else {
        console.log('❌ Failed to revoke authentication:', revokeResult.error);
        res.json({
          success: false,
          error: revokeResult.error || 'Failed to revoke authentication',
          timestamp: new Date().toISOString()
        });
      }
    } else {
      console.log('⚠️ Auth manager not available for revocation');

      // Still clear Bills authentication state even if auth manager is not available
      signOutBills();
      console.log('✅ Cleared Bills authentication state');

      res.json({
        success: true,
        message: 'Sign-out completed (auth manager not available)',
        timestamp: new Date().toISOString()
      });
    }

  } catch (error) {
    logger.error('Sign-out failed', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Test webhook endpoints
 */
router.get('/webhook', (req, res) => {
  const webhookBaseUrl = process.env.WEBHOOK_BASE_URL || 'http://localhost:3001';

  res.json({
    success: true,
    service: 'Webhook Endpoints',
    timestamp: new Date().toISOString(),
    endpoints: {
      voice: `${webhookBaseUrl}/webhook/voice`,
      processSpeech: `${webhookBaseUrl}/webhook/process-speech`,
      status: `${webhookBaseUrl}/webhook/status`,
      health: `${webhookBaseUrl}/webhook/health`
    },
    configuration: {
      webhookBaseUrl: process.env.WEBHOOK_BASE_URL,
      configured: !process.env.WEBHOOK_BASE_URL?.includes('your-ngrok-url'),
      instructions: process.env.WEBHOOK_BASE_URL?.includes('your-ngrok-url')
        ? 'Set up ngrok and update WEBHOOK_BASE_URL in .env'
        : 'Webhook URL is configured'
    }
  });
});

/**
 * Test webhook health endpoint
 */
router.get('/webhook/health', async (req, res) => {
  try {
    // Always test the local webhook health endpoint
    const healthUrl = 'http://localhost:3001/webhook/health';

    // Test the webhook health endpoint
    const response = await fetch(healthUrl);
    const data = await response.json();

    res.json({
      success: response.ok,
      service: 'Webhook Health Test',
      timestamp: new Date().toISOString(),
      webhookHealth: data,
      endpoint: healthUrl,
      status: response.status,
      note: 'Testing local webhook health endpoint'
    });
  } catch (error) {
    res.json({
      success: false,
      service: 'Webhook Health Test',
      timestamp: new Date().toISOString(),
      error: error.message,
      endpoint: 'http://localhost:3001/webhook/health',
      note: 'Failed to connect to local webhook health endpoint'
    });
  }
});

/**
 * Get conversation statistics
 */
router.get('/conversations', (req, res) => {
  res.json({
    success: true,
    service: 'Conversation Manager',
    timestamp: new Date().toISOString(),
    activeConversations: getConversationManager().getActiveConversationCount(),
    configuration: {
      maxTurns: process.env.MAX_CONVERSATION_TURNS || 20,
      contextWindowSize: process.env.CONTEXT_WINDOW_SIZE || 4000,
      conversationTimeout: process.env.CONVERSATION_TIMEOUT || 300
    }
  });
});

/**
 * Run all tests
 */
router.get('/all', async (req, res) => {
  const results = {
    timestamp: new Date().toISOString(),
    tests: {}
  };

  // Test OpenRouter
  try {
    const openRouterResult = await getOpenRouter().testConnection();
    results.tests.openrouter = {
      success: openRouterResult.success,
      ...openRouterResult
    };
  } catch (error) {
    results.tests.openrouter = {
      success: false,
      error: error.message
    };
  }

  // Test Twilio
  try {
    const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    const account = await client.api.accounts(process.env.TWILIO_ACCOUNT_SID).fetch();

    results.tests.twilio = {
      success: true,
      accountSid: account.sid,
      status: account.status
    };
  } catch (error) {
    results.tests.twilio = {
      success: false,
      error: error.message
    };
  }

  const allSuccess = Object.values(results.tests).every(test => test.success);

  res.status(allSuccess ? 200 : 500).json({
    success: allSuccess,
    service: 'All Tests',
    ...results
  });
});

/**
 * Google Calendar Tests
 */

/**
 * Test Google Calendar connection
 */
router.get('/calendar', async (req, res) => {
  try {
    logger.info('Testing Google Calendar connection');

    const calendar = getGoogleCalendar();
    const result = await calendar.testConnection();

    res.json({
      success: result.success,
      service: 'Google Calendar',
      timestamp: new Date().toISOString(),
      ...result
    });

  } catch (error) {
    logger.error('Google Calendar test failed:', error.message);
    res.status(500).json({
      success: false,
      service: 'Google Calendar',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Get Google Calendar OAuth URL
 */
router.get('/calendar/auth', async (req, res) => {
  try {
    const calendar = getGoogleCalendar();
    const authResult = await calendar.getAuthUrl();

    const instructions = authResult.flowType === 'out-of-band'
      ? 'Visit the authUrl, grant permissions, and copy the authorization code to paste in the dashboard'
      : 'Visit the authUrl to authenticate. You will be redirected back automatically.';

    res.json({
      success: true,
      service: 'Google Calendar Auth',
      authUrl: authResult.authUrl,
      flowType: authResult.flowType,
      redirectUri: authResult.redirectUri,
      instructions: instructions,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Google Calendar auth URL generation failed:', error.message);
    res.status(500).json({
      success: false,
      service: 'Google Calendar Auth',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Bills authentication state is now managed by shared auth-state module

/**
 * Test Bills/Supabase connection status
 */
router.get('/bills/status', async (req, res) => {
  try {
    logger.info('Testing Bills/Supabase connection and authentication status');

    // Test Supabase connection through environment variables
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return res.json({
        success: false,
        authenticated: false,
        service: 'Bills/Supabase',
        error: 'Supabase environment variables not configured',
        timestamp: new Date().toISOString(),
        details: {
          hasUrl: !!supabaseUrl,
          hasKey: !!supabaseKey
        }
      });
    }

    // Test basic connectivity by making a simple request
    try {
      const testResponse = await fetch(`${supabaseUrl}/rest/v1/`, {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`
        }
      });

      const isConnected = testResponse.status === 200 || testResponse.status === 404; // 404 is OK for root endpoint

      const authState = getBillsAuthState();
      res.json({
        success: isConnected,
        authenticated: authState.authenticated,
        service: 'Bills/Supabase',
        timestamp: new Date().toISOString(),
        details: {
          status: testResponse.status,
          connected: isConnected,
          url: supabaseUrl.substring(0, 30) + '...', // Partial URL for security
          lastAuthTime: authState.lastAuthTime,
          userId: authState.userId
        }
      });

    } catch (fetchError) {
      res.json({
        success: false,
        authenticated: false,
        service: 'Bills/Supabase',
        error: fetchError.message,
        timestamp: new Date().toISOString()
      });
    }

  } catch (error) {
    logger.error('Bills/Supabase test failed:', error.message);
    res.status(500).json({
      success: false,
      authenticated: false,
      service: 'Bills/Supabase',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Authenticate Bills/Supabase - Set authentication state
 */
router.post('/bills/authenticate', async (req, res) => {
  try {
    const { userId = 'dashboard-user' } = req.body;
    logger.info('Authenticating Bills/Supabase for user:', userId);

    // Test Supabase connection
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return res.json({
        success: false,
        error: 'Supabase environment variables not configured'
      });
    }

    // Test connectivity
    const testResponse = await fetch(`${supabaseUrl}/rest/v1/`, {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`
      }
    });

    const isConnected = testResponse.status === 200 || testResponse.status === 404;

    if (isConnected) {
      // Set authentication state using shared module
      authenticateBills(userId);

      logger.info('Bills/Supabase authentication successful for user:', userId);
      res.json({
        success: true,
        message: 'Bills/Supabase authenticated successfully',
        timestamp: new Date().toISOString()
      });
    } else {
      res.json({
        success: false,
        error: 'Failed to connect to Supabase'
      });
    }

  } catch (error) {
    logger.error('Bills/Supabase authentication failed:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Sign out of Bills/Supabase - Clear authentication state
 */
router.post('/bills/signout', async (req, res) => {
  try {
    logger.info('Signing out of Bills/Supabase');

    // Clear authentication state using shared module
    signOutBills();

    res.json({
      success: true,
      message: 'Successfully signed out of Bills/Supabase',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Bills/Supabase sign-out failed:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Handle Google Calendar OAuth callback (POST for manual code entry)
 */
router.post('/calendar/callback', async (req, res) => {
  try {
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({
        success: false,
        error: 'Authorization code is required'
      });
    }

    const calendar = getGoogleCalendar();
    const tokens = await calendar.getTokenFromCode(code);

    res.json({
      success: true,
      service: 'Google Calendar OAuth',
      message: 'Authentication successful',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Google Calendar OAuth callback failed:', error.message);
    res.status(500).json({
      success: false,
      service: 'Google Calendar OAuth',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Test OAuth callback redirect (simulates successful authentication)
 * This tests the redirect logic without doing actual token exchange
 */
router.get('/oauth/test-redirect', async (req, res) => {
  try {
    logger.info('Testing OAuth callback redirect logic');

    // Simulate the exact same logic as the main OAuth callback
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173'; // Correct frontend port

    // Debug logging to track frontendUrl value
    logger.info('Test OAuth callback - preparing redirect', {
      frontendUrlType: typeof frontendUrl,
      frontendUrlValue: frontendUrl,
      frontendUrlString: String(frontendUrl)
    });

    // Use CSP-compliant redirect with nonce
    const nonce = req.cspNonce || 'fallback-nonce';

    res.send(`
      <html>
        <head>
          <title>Test OAuth Redirect</title>
          <meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'nonce-${nonce}'; style-src 'nonce-${nonce}';">
        </head>
        <body>
          <div class="oauth-success-container">
            <h2>🧪 Test OAuth Redirect</h2>
            <p>Testing redirect logic...</p>
            <p>frontendUrl type: ${typeof frontendUrl}</p>
            <p>frontendUrl value: ${frontendUrl}</p>
            <div class="spinner-container">
              <div class="spinner"></div>
            </div>
          </div>
          <style nonce="${nonce}">
            .oauth-success-container {
              font-family: Arial, sans-serif;
              padding: 20px;
              text-align: center;
            }
            .spinner-container {
              margin-top: 20px;
            }
            .spinner {
              display: inline-block;
              width: 20px;
              height: 20px;
              border: 2px solid #3498db;
              border-top: 2px solid transparent;
              border-radius: 50%;
              animation: spin 1s linear infinite;
            }
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          </style>
          <script nonce="${nonce}">
            console.log('Test OAuth callback: Starting redirect to frontend...');
            console.log('frontendUrl type:', typeof '${frontendUrl}');
            console.log('frontendUrl value:', '${frontendUrl}');

            // Test the redirect logic
            setTimeout(() => {
              console.log('Test OAuth callback: Redirecting to ${frontendUrl}?auth=success');
              window.location.href = '${frontendUrl}?auth=success';
            }, 3000);
          </script>
        </body>
      </html>
    `);

  } catch (error) {
    logger.error('Test OAuth callback failed:', error.message);
    res.status(500).send(`
      <html>
        <body>
          <h2>Test OAuth Callback Error</h2>
          <p>Error: ${error.message}</p>
        </body>
      </html>
    `);
  }
});

/**
 * List calendar events
 */
router.get('/calendar/events', async (req, res) => {
  try {
    const { maxResults = 10, timeMin, timeMax, date, today } = req.query;

    // Check if filtering for today's events
    const filterToday = today === 'true' || date === 'today';

    const calendar = getGoogleCalendar();
    const events = await calendar.listEvents(
      parseInt(maxResults),
      timeMin ? new Date(timeMin).toISOString() : null,
      timeMax ? new Date(timeMax).toISOString() : null,
      filterToday
    );

    const filterType = filterToday ? "today's" : 'upcoming';
    const dateInfo = filterToday ? { filterDate: new Date().toDateString(), filterType: 'today' } : {};

    res.json({
      success: true,
      service: 'Google Calendar Events',
      events: events,
      count: events.length,
      ...dateInfo,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Failed to list calendar events:', error.message);
    res.status(500).json({
      success: false,
      service: 'Google Calendar Events',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Create calendar event
 */
router.post('/calendar/events', async (req, res) => {
  try {
    const eventData = req.body;

    logger.info('Creating calendar event', {
      summary: eventData.summary,
      hasStart: !!eventData.start,
      hasEnd: !!eventData.end,
      startDateTime: eventData.start?.dateTime,
      endDateTime: eventData.end?.dateTime
    });

    // Validate required fields
    if (!eventData.summary) {
      return res.status(400).json({
        success: false,
        error: 'Event summary is required'
      });
    }

    if (!eventData.start?.dateTime || !eventData.end?.dateTime) {
      return res.status(400).json({
        success: false,
        error: 'Start and end date/time are required in format: { start: { dateTime: "..." }, end: { dateTime: "..." } }'
      });
    }

    // Transform the data to match Google Calendar API format
    const googleEventData = {
      title: eventData.summary, // Google Calendar service expects 'title'
      summary: eventData.summary,
      description: eventData.description || '',
      location: eventData.location || '',
      startDateTime: eventData.start.dateTime,
      endDateTime: eventData.end.dateTime,
      attendees: eventData.attendees || [],
      timeZone: eventData.timeZone || 'America/Los_Angeles'
    };

    const calendar = getGoogleCalendar();
    const event = await calendar.createEvent(googleEventData);

    res.json({
      success: true,
      service: 'Google Calendar Create Event',
      event: event,
      eventId: event.id,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Failed to create calendar event:', {
      error: error.message,
      stack: error.stack,
      eventData: req.body
    });
    res.status(500).json({
      success: false,
      service: 'Google Calendar Create Event',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Update calendar event
 */
router.put('/calendar/events/:eventId', async (req, res) => {
  try {
    const { eventId } = req.params;
    const eventData = req.body;

    logger.info('Updating calendar event', {
      eventId,
      summary: eventData.summary,
      hasStart: !!eventData.start,
      hasEnd: !!eventData.end
    });

    // Transform the data to match Google Calendar API format
    const googleEventData = {
      title: eventData.summary,
      summary: eventData.summary,
      description: eventData.description || '',
      location: eventData.location || '',
      startDateTime: eventData.start?.dateTime,
      endDateTime: eventData.end?.dateTime,
      attendees: eventData.attendees || [],
      timeZone: eventData.timeZone || 'America/Los_Angeles'
    };

    const calendar = getGoogleCalendar();
    const event = await calendar.updateEvent(eventId, googleEventData);

    res.json({
      success: true,
      service: 'Google Calendar Update Event',
      event: event,
      eventId: event.id,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Failed to update calendar event:', {
      error: error.message,
      eventId,
      eventData: req.body
    });
    res.status(500).json({
      success: false,
      service: 'Google Calendar Update Event',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Delete calendar event
 */
router.delete('/calendar/events/:eventId', async (req, res) => {
  try {
    const { eventId } = req.params;

    const calendar = getGoogleCalendar();
    await calendar.deleteEvent(eventId);

    res.json({
      success: true,
      service: 'Google Calendar Delete Event',
      message: `Event ${eventId} deleted successfully`,
      eventId: eventId,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Failed to delete calendar event:', error.message);
    res.status(500).json({
      success: false,
      service: 'Google Calendar Delete Event',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Get specific calendar event
 */
router.get('/calendar/events/:eventId', async (req, res) => {
  try {
    const { eventId } = req.params;

    const calendar = getGoogleCalendar();
    const event = await calendar.getEvent(eventId);

    res.json({
      success: true,
      service: 'Google Calendar Get Event',
      event: event,
      eventId: event.id,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Failed to get calendar event:', error.message);
    res.status(500).json({
      success: false,
      service: 'Google Calendar Get Event',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Test calendar voice commands
 */
router.post('/calendar/voice', async (req, res) => {
  try {
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({
        success: false,
        error: 'Message is required'
      });
    }

    logger.info('Testing calendar voice command', { message });

    let calendarVoice;
    try {
      logger.info('Getting CalendarVoice service');
      calendarVoice = getCalendarVoice();
      logger.info('CalendarVoice service obtained');
    } catch (serviceError) {
      logger.error('Error getting CalendarVoice service', {
        error: serviceError.message,
        stack: serviceError.stack
      });
      throw serviceError;
    }

    let result;
    try {
      logger.info('Calling processCalendarCommand');
      result = await calendarVoice.processCalendarCommand(message, 'test-call');
      logger.info('processCalendarCommand completed', { result: !!result });

      // If CalendarVoiceService returns null, try direct processing
      if (!result) {
        logger.info('CalendarVoiceService returned null, trying direct processing');

        // Use the same calendar instance that's already authenticated
        const calendar = getGoogleCalendar();

        // Check for specific time-based queries
        const lowerMessage = message.toLowerCase();
        const timeMatch = message.match(/(\d{1,2}):?(\d{0,2})\s*(am|pm)?/i);

        if (timeMatch && (lowerMessage.includes('appointment') || lowerMessage.includes('meeting') || lowerMessage.includes('event') || lowerMessage.includes('about'))) {
          logger.info('Direct processing: Detected specific time query', {
            timeMatch: timeMatch[0]
          });

          // Get today's events using the authenticated calendar
          const events = await calendar.listEvents(20, null, null, true);

          logger.info('Direct processing: Retrieved events', {
            eventCount: events.length
          });

          // Parse the time reference
          const timeRef = timeMatch[0];
          const targetTime = parseTimeReference(timeRef);

          logger.info('Direct processing: Parsed target time', {
            targetTime,
            originalTimeRef: timeRef
          });

          // Find events around the specified time (within 30 minutes)
          const matchingEvents = events.filter(event => {
            const startTime = event.start?.dateTime;
            if (!startTime) return false;

            const eventDate = new Date(startTime);
            const eventHour = eventDate.getHours();
            const eventMinute = eventDate.getMinutes();

            // Check if event time is within 30 minutes of requested time
            const eventTotalMinutes = eventHour * 60 + eventMinute;
            const targetTotalMinutes = targetTime.hour * 60 + targetTime.minute;
            const timeDiff = Math.abs(eventTotalMinutes - targetTotalMinutes);

            logger.info('Direct processing: Checking event time match', {
              eventTitle: event.summary,
              eventTime: `${eventHour}:${eventMinute.toString().padStart(2, '0')}`,
              targetTime: `${targetTime.hour}:${targetTime.minute.toString().padStart(2, '0')}`,
              timeDiff,
              withinRange: timeDiff <= 30
            });

            return timeDiff <= 30; // Within 30 minutes
          });

          logger.info('Direct processing: Found matching events', {
            matchingCount: matchingEvents.length,
            eventTitles: matchingEvents.map(e => e.summary)
          });

          if (matchingEvents.length === 0) {
            result = {
              success: true,
              response: `I don't see any appointments around ${timeRef}. Your calendar looks clear at that time.`,
              intent: 'query',
              eventCount: 0,
              method: 'direct_processing'
            };
          } else {
            // Return detailed information about the matching event
            const event = matchingEvents[0];
            const startTime = event.start?.dateTime || event.start?.date;
            const endTime = event.end?.dateTime || event.end?.date;

            const startTimeFormatted = startTime ? new Date(startTime).toLocaleTimeString('en-US', {
              hour: 'numeric',
              minute: '2-digit',
              hour12: true,
              timeZone: 'America/Los_Angeles'
            }) : 'Unknown time';

            const endTimeFormatted = endTime ? new Date(endTime).toLocaleTimeString('en-US', {
              hour: 'numeric',
              minute: '2-digit',
              hour12: true,
              timeZone: 'America/Los_Angeles'
            }) : null;

            let response = `At ${startTimeFormatted}, you have "${event.summary || 'Untitled event'}"`;

            if (endTimeFormatted) {
              response += ` until ${endTimeFormatted}`;
            }

            if (event.description) {
              response += `. Details: ${event.description}`;
            }

            if (event.location) {
              response += ` Location: ${event.location}`;
            }

            if (event.attendees && event.attendees.length > 0) {
              const attendeeNames = event.attendees.map(a => a.displayName || a.email).join(', ');
              response += ` Attendees: ${attendeeNames}`;
            }

            logger.info('Direct processing: Generated detailed response', {
              eventTitle: event.summary,
              responseLength: response.length
            });

            result = {
              success: true,
              response: response,
              intent: 'query',
              eventDetails: {
                title: event.summary,
                description: event.description,
                location: event.location,
                startTime: startTimeFormatted,
                endTime: endTimeFormatted,
                attendees: event.attendees
              },
              method: 'direct_processing'
            };
          }
        }
      }

    } catch (processError) {
      logger.error('Error in processCalendarCommand', {
        error: processError.message,
        stack: processError.stack
      });
      throw processError;
    }

    res.json({
      success: true,
      service: 'Calendar Voice Test',
      message: message,
      calendarResult: result,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Calendar voice test failed:', error.message);
    res.status(500).json({
      success: false,
      service: 'Calendar Voice Test',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Gmail authentication route
 */
router.get('/gmail/auth', async (req, res) => {
  try {
    logger.info('Starting Gmail authentication');

    const calendar = getGoogleCalendar(); // Use calendar service which now has Gmail scopes
    const authUrl = await calendar.getAuthUrl();

    res.json({
      success: true,
      service: 'Gmail Authentication',
      authUrl: authUrl,
      message: 'Visit the auth URL to authenticate with Gmail scopes',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Gmail auth failed:', error.message);
    res.status(500).json({
      success: false,
      service: 'Gmail Authentication',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Gmail authentication callback
 */
router.post('/gmail/auth/callback', async (req, res) => {
  try {
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({
        success: false,
        error: 'Authorization code is required'
      });
    }

    logger.info('Processing Gmail auth callback');

    const calendar = getGoogleCalendar();
    await calendar.authenticate(code);

    res.json({
      success: true,
      service: 'Gmail Authentication',
      message: 'Successfully authenticated with Gmail scopes',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Gmail auth callback failed:', error.message);
    res.status(500).json({
      success: false,
      service: 'Gmail Authentication',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Test Gmail connection
 */
router.get('/gmail', async (req, res) => {
  try {
    logger.info('Testing Gmail connection');

    const gmail = getGoogleGmail();

    if (!gmail.isAuthenticated()) {
      return res.json({
        success: false,
        service: 'Gmail',
        message: 'Not authenticated with Gmail',
        authenticated: false,
        timestamp: new Date().toISOString()
      });
    }

    // Test by getting profile
    const profile = await gmail.getProfile();

    res.json({
      success: true,
      service: 'Gmail',
      timestamp: new Date().toISOString(),
      authenticated: true,
      emailAddress: profile.emailAddress,
      messagesTotal: profile.messagesTotal,
      threadsTotal: profile.threadsTotal,
      message: 'Gmail connection successful'
    });

  } catch (error) {
    logger.error('Gmail test failed:', error.message);
    res.status(500).json({
      success: false,
      service: 'Gmail',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Test Gmail messages retrieval with enhanced filtering
 */
router.get('/gmail/messages', async (req, res) => {
  try {
    const {
      maxResults = 5,
      query = 'newer_than:1d',
      importantOnly = 'false',
      timeMin,
      timeMax
    } = req.query;

    logger.info('Testing Gmail messages retrieval', {
      maxResults,
      query,
      importantOnly,
      timeMin: timeMin ? new Date(timeMin).toISOString() : null,
      timeMax: timeMax ? new Date(timeMax).toISOString() : null
    });

    const gmail = getGoogleGmail();

    // Build query based on parameters
    let finalQuery = query;

    // Handle time-based filtering
    if (timeMin && timeMax) {
      const startDate = new Date(timeMin);
      const endDate = new Date(timeMax);

      // Convert to Gmail query format (YYYY/MM/DD)
      const startDateStr = startDate.toISOString().split('T')[0].replace(/-/g, '/');
      const endDateStr = endDate.toISOString().split('T')[0].replace(/-/g, '/');

      finalQuery = `after:${startDateStr} before:${endDateStr}`;
    }

    // Get messages from Gmail
    let messages = await gmail.listMessages(parseInt(maxResults) * 2, finalQuery); // Get more for filtering

    // Apply important-only filtering if requested
    if (importantOnly === 'true' && messages.length > 0) {
      messages = await filterImportantEmails(messages, parseInt(maxResults));
    } else {
      // Limit to requested count
      messages = messages.slice(0, parseInt(maxResults));
    }

    res.json({
      success: true,
      service: 'Gmail Messages',
      messages: messages,
      count: messages.length,
      query: finalQuery,
      importantOnly: importantOnly === 'true',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Gmail messages test failed:', error.message);
    res.status(500).json({
      success: false,
      service: 'Gmail Messages',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Filter emails for importance using LLM classification
 */
async function filterImportantEmails(emails, maxResults) {
  try {
    if (emails.length === 0) return [];

    // Get OpenRouter service
    const openRouter = getOpenRouter();

    if (!openRouter) {
      logger.warn('OpenRouter not available, using rule-based filtering');
      return filterImportantEmailsRuleBased(emails, maxResults);
    }

    // Prepare email summaries for LLM analysis
    const emailSummaries = emails.map(email => ({
      id: email.id,
      from: email.from || '',
      subject: email.subject || '',
      snippet: (email.snippet || '').substring(0, 200),
      isUnread: email.isUnread || false,
      isStarred: email.isStarred || false,
      labels: email.labels || []
    }));

    const prompt = `Analyze these emails and identify which ones are IMPORTANT based on these criteria:

IMPORTANT EMAIL CRITERIA:
1. Personal emails sent directly to the user (not mass emails)
2. Emails that are part of ongoing conversations/threads the user has replied to
3. Financial emails (bills, bank statements, investment updates, payment confirmations)
4. Work/business emails that require action or response
5. Emails from known contacts (not promotional/marketing)
6. Non-promotional, non-marketing, non-transactional emails
7. Emails that appear to have personal or business value

EXCLUDE:
- Newsletter subscriptions
- Marketing/promotional emails
- Automated notifications (unless financial)
- Social media notifications
- Spam or obvious mass emails

Email data:
${JSON.stringify(emailSummaries, null, 2)}

Return ONLY a comma-separated list of email IDs that are important. No explanations, just the IDs.

Important email IDs:`;

    const messages = [{ role: 'user', content: prompt }];
    const response = await openRouter.generateResponse(messages);

    if (response && response.text) {
      const importantIds = response.text
        .split(',')
        .map(id => id.trim())
        .filter(id => id.length > 0);

      const filteredEmails = emails.filter(email => importantIds.includes(email.id));

      logger.info('LLM email filtering completed', {
        totalEmails: emails.length,
        importantEmails: filteredEmails.length,
        importantIds: importantIds.slice(0, 5) // Log first 5 IDs
      });

      // Limit to max requested emails
      return filteredEmails.slice(0, maxResults);
    }

    // Fallback to rule-based filtering
    logger.warn('LLM filtering failed, using rule-based fallback');
    return filterImportantEmailsRuleBased(emails, maxResults);

  } catch (error) {
    logger.error('Error in LLM email filtering', {
      error: error.message
    });
    return filterImportantEmailsRuleBased(emails, maxResults);
  }
}

/**
 * Rule-based email filtering (fallback method)
 */
function filterImportantEmailsRuleBased(emails, maxResults) {
  // Filter out obvious promotional emails
  const filtered = emails.filter(email => {
    const subject = (email.subject || '').toLowerCase();
    const from = (email.from || '').toLowerCase();
    const snippet = (email.snippet || '').toLowerCase();

    // Exclude promotional indicators
    const isPromotional =
      subject.includes('unsubscribe') ||
      subject.includes('sale') ||
      subject.includes('offer') ||
      subject.includes('discount') ||
      subject.includes('newsletter') ||
      from.includes('noreply') ||
      from.includes('no-reply') ||
      from.includes('donotreply') ||
      snippet.includes('unsubscribe');

    // Include if marked as important by Gmail or starred
    const isMarkedImportant =
      email.isStarred ||
      (email.labels && email.labels.includes('IMPORTANT'));

    // Include financial keywords
    const isFinancial =
      subject.includes('bill') ||
      subject.includes('payment') ||
      subject.includes('invoice') ||
      subject.includes('statement') ||
      subject.includes('bank') ||
      subject.includes('account');

    return !isPromotional || isMarkedImportant || isFinancial;
  });

  // Sort by importance (starred/important first, then unread, then by date)
  filtered.sort((a, b) => {
    const aImportant = (a.isStarred ? 2 : 0) + (a.labels?.includes('IMPORTANT') ? 1 : 0);
    const bImportant = (b.isStarred ? 2 : 0) + (b.labels?.includes('IMPORTANT') ? 1 : 0);

    if (aImportant !== bImportant) return bImportant - aImportant;
    if (a.isUnread !== b.isUnread) return a.isUnread ? -1 : 1;

    return new Date(b.date || 0) - new Date(a.date || 0);
  });

  return filtered.slice(0, maxResults);
}

/**
 * Mark email as read
 */
router.post('/gmail/markRead', async (req, res) => {
  try {
    const { messageId } = req.body;
    logger.info('Marking email as read', { messageId });

    const gmail = getGoogleGmail();
    const result = await gmail.markAsRead(messageId);

    res.json({
      success: true,
      service: 'Gmail Mark Read',
      result,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Mark email as read failed:', error.message);
    res.status(500).json({
      success: false,
      service: 'Gmail Mark Read',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Mark email as unread
 */
router.post('/gmail/markUnread', async (req, res) => {
  try {
    const { messageId } = req.body;
    logger.info('Marking email as unread', { messageId });

    const gmail = getGoogleGmail();
    const result = await gmail.markAsUnread(messageId);

    res.json({
      success: true,
      service: 'Gmail Mark Unread',
      result,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Mark email as unread failed:', error.message);
    res.status(500).json({
      success: false,
      service: 'Gmail Mark Unread',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Star email
 */
router.post('/gmail/star', async (req, res) => {
  try {
    const { messageId } = req.body;
    logger.info('Starring email', { messageId });

    const gmail = getGoogleGmail();
    const result = await gmail.starEmail(messageId);

    res.json({
      success: true,
      service: 'Gmail Star',
      result,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Star email failed:', error.message);
    res.status(500).json({
      success: false,
      service: 'Gmail Star',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Unstar email
 */
router.post('/gmail/unstar', async (req, res) => {
  try {
    const { messageId } = req.body;
    logger.info('Unstarring email', { messageId });

    const gmail = getGoogleGmail();
    const result = await gmail.unstarEmail(messageId);

    res.json({
      success: true,
      service: 'Gmail Unstar',
      result,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Unstar email failed:', error.message);
    res.status(500).json({
      success: false,
      service: 'Gmail Unstar',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Delete email
 */
router.post('/gmail/delete', async (req, res) => {
  try {
    const { messageId } = req.body;
    logger.info('Deleting email', { messageId });

    const gmail = getGoogleGmail();
    const result = await gmail.deleteEmail(messageId);

    res.json({
      success: true,
      service: 'Gmail Delete',
      result,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Delete email failed:', error.message);
    res.status(500).json({
      success: false,
      service: 'Gmail Delete',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Reply to email
 */
router.post('/gmail/reply', async (req, res) => {
  try {
    const { messageId, threadId, to, subject, body } = req.body;
    logger.info('Replying to email', { messageId, to, subject: subject?.substring(0, 50) });

    const gmail = getGoogleGmail();

    // Get original message details for proper reply formatting
    const originalMessage = await gmail.getEmailDetails(messageId);

    const replyData = {
      threadId: threadId || originalMessage.threadId,
      to: to || originalMessage.from,
      subject: subject || (originalMessage.subject.startsWith('Re:') ? originalMessage.subject : `Re: ${originalMessage.subject}`),
      body: body || `\n\n--- Original Message ---\nFrom: ${originalMessage.from}\nSubject: ${originalMessage.subject}\nDate: ${originalMessage.date}\n\n${originalMessage.snippet}`,
      inReplyTo: originalMessage.messageId
    };

    const result = await gmail.sendReply(replyData);

    res.json({
      success: true,
      service: 'Gmail Reply',
      result,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Reply to email failed:', error.message);
    res.status(500).json({
      success: false,
      service: 'Gmail Reply',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Test daily summary voice commands (combines calendar, gmail, and bills)
 */
router.post('/daily-summary/voice', async (req, res) => {
  try {
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({
        success: false,
        error: 'Message is required'
      });
    }

    logger.info('Testing daily summary voice command', { message });

    // Import and initialize the daily briefing service
    let dailyBriefingService;
    try {
      logger.info('Getting DailyBriefingService');
      const { DailyBriefingService } = await import('../services/daily-briefing.js');
      dailyBriefingService = new DailyBriefingService();
      logger.info('DailyBriefingService obtained');
    } catch (serviceError) {
      logger.error('Error getting DailyBriefingService', {
        error: serviceError.message,
        stack: serviceError.stack
      });
      throw serviceError;
    }

    // Check if this is a daily summary request
    const lowerMessage = message.toLowerCase();
    const summaryPatterns = [
      /daily summary/i,
      /daily briefing/i,
      /morning briefing/i,
      /what.*today/i,
      /schedule.*today/i,
      /bills.*due/i,
      /what.*happening.*today/i,
      /morning update/i,
      /daily update/i,
      /give me.*summary/i,
      /tell me.*about.*day/i,
      /what.*need.*know/i
    ];

    const isDailySummaryRequest = summaryPatterns.some(pattern => pattern.test(lowerMessage));

    let result;
    if (isDailySummaryRequest) {
      logger.info('Processing daily summary request');

      try {
        // Generate comprehensive daily briefing
        const briefing = await dailyBriefingService.generateDailyBriefing(
          'test-user', // Using test user ID
          'voice-test-call'
        );

        result = {
          success: true,
          response: briefing.response,
          intent: 'daily_summary',
          data: briefing.data,
          alreadyCompleted: briefing.alreadyCompleted,
          method: 'daily_briefing_service'
        };

        logger.info('Daily summary generated successfully', {
          responseLength: briefing.response?.length,
          hasData: !!briefing.data,
          alreadyCompleted: briefing.alreadyCompleted
        });

      } catch (briefingError) {
        logger.error('Error generating daily briefing', {
          error: briefingError.message,
          stack: briefingError.stack
        });

        result = {
          success: false,
          response: "I'm having trouble generating your daily summary right now. Please try again in a few minutes.",
          intent: 'daily_summary',
          error: briefingError.message,
          method: 'daily_briefing_service'
        };
      }
    } else {
      // If not a daily summary request, provide guidance
      result = {
        success: true,
        response: "I can help you with your daily summary. Try asking: 'Give me my daily summary' or 'What's happening today?'",
        intent: 'guidance',
        method: 'pattern_matching'
      };
    }

    res.json({
      success: true,
      service: 'Daily Summary Voice Test',
      message: message,
      dailySummaryResult: result,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Daily summary voice test failed', {
      error: error.message,
      stack: error.stack
    });

    res.status(500).json({
      success: false,
      service: 'Daily Summary Voice Test',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Test Gmail voice commands
 */
router.post('/gmail/voice', async (req, res) => {
  try {
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({
        success: false,
        error: 'Message is required'
      });
    }

    logger.info('Testing Gmail voice command', { message });

    let gmailVoice;
    try {
      logger.info('Getting GmailVoice service');
      gmailVoice = getGmailVoice();
      logger.info('GmailVoice service obtained');
    } catch (serviceError) {
      logger.error('Error getting GmailVoice service', {
        error: serviceError.message,
        stack: serviceError.stack
      });
      throw serviceError;
    }

    let result;
    try {
      logger.info('Calling processGmailCommand');
      result = await gmailVoice.processGmailCommand(message, 'test-call');
      logger.info('processGmailCommand completed', { result: !!result });

      // If GmailVoiceService returns null, try direct processing
      if (!result) {
        logger.info('GmailVoiceService returned null, trying direct processing');

        // Use the same Gmail instance that's already authenticated
        const gmail = getGoogleGmail();

        // Check for general email queries
        const lowerMessage = message.toLowerCase();
        const emailPatterns = [
          /what.*emails?/i,
          /any.*emails?/i,
          /check.*inbox/i,
          /check.*email/i,
          /show.*emails?/i,
          /read.*emails?/i,
          /inbox/i,
          /messages?/i,
          /mail/i,
          /important.*emails?/i,
          /new.*emails?/i,
          /recent.*emails?/i,
          /this morning/i,
          /today.*emails?/i
        ];

        if (emailPatterns.some(pattern => pattern.test(lowerMessage))) {
          logger.info('Direct processing: Detected general email query');

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

          const emails = await gmail.listMessages(5, query);

          if (emails.length === 0) {
            result = {
              success: true,
              response: `You don't have any ${timeDescription} emails. Your inbox is clear!`,
              intent: 'query',
              emailCount: 0,
              method: 'direct_processing'
            };
          } else {
            // Format emails for voice response
            const emailDescriptions = emails.slice(0, 3).map(email => {
              const sender = extractSenderName(email.from);
              const subject = email.subject || 'No subject';
              const timeAgo = email.receivedTime ? getTimeAgo(email.receivedTime) : '';

              return `"${subject}" from ${sender}${timeAgo ? ` ${timeAgo}` : ''}`;
            });

            let response = `You have ${emails.length} ${timeDescription} email${emails.length > 1 ? 's' : ''}. `;

            if (emails.length <= 3) {
              response += emailDescriptions.join(', ');
            } else {
              response += `Your most recent ones are: ${emailDescriptions.join(', ')}, and ${emails.length - 3} more.`;
            }

            result = {
              success: true,
              response,
              intent: 'query',
              emailCount: emails.length,
              emails: emails.slice(0, 3),
              method: 'direct_processing'
            };
          }
        }
      }

    } catch (processError) {
      logger.error('Error in processGmailCommand', {
        error: processError.message,
        stack: processError.stack
      });
      throw processError;
    }

    res.json({
      success: true,
      service: 'Gmail Voice Test',
      message: message,
      gmailResult: result,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Gmail voice test failed:', error.message);
    res.status(500).json({
      success: false,
      service: 'Gmail Voice Test',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Direct calendar processing function (working solution)
 */
async function directProcessCalendarQuery(message, callSid, googleCalendar = null) {
  try {
    logger.info('Direct processing calendar query', {
      callSid,
      message: message.substring(0, 100)
    });

    const calendar = googleCalendar || getGoogleCalendar();

    if (!calendar.isAuthenticated()) {
      return {
        success: false,
        response: "I'd love to help with your calendar, but I need to be connected to your Google Calendar first. Please set that up through the web interface.",
        intent: 'authentication_required'
      };
    }

    const lowerMessage = message.toLowerCase();

    // Check for specific time-based queries
    const timeMatch = message.match(/(\d{1,2}):?(\d{0,2})\s*(am|pm)?/i);
    if (timeMatch && (lowerMessage.includes('appointment') || lowerMessage.includes('meeting') || lowerMessage.includes('event') || lowerMessage.includes('about'))) {
      logger.info('Direct processing: Detected specific time query', {
        callSid,
        timeMatch: timeMatch[0]
      });

      // Get today's events
      const events = await calendar.listEvents(20, null, null, true);

      logger.info('Direct processing: Retrieved events', {
        callSid,
        eventCount: events.length
      });

      // Parse the time reference
      const timeRef = timeMatch[0];
      const targetTime = parseTimeReference(timeRef);

      logger.info('Direct processing: Parsed target time', {
        callSid,
        targetTime,
        originalTimeRef: timeRef
      });

      // Find events around the specified time (within 30 minutes)
      const matchingEvents = events.filter(event => {
        const startTime = event.start?.dateTime;
        if (!startTime) return false;

        const eventDate = new Date(startTime);
        const eventHour = eventDate.getHours();
        const eventMinute = eventDate.getMinutes();

        // Check if event time is within 30 minutes of requested time
        const eventTotalMinutes = eventHour * 60 + eventMinute;
        const targetTotalMinutes = targetTime.hour * 60 + targetTime.minute;
        const timeDiff = Math.abs(eventTotalMinutes - targetTotalMinutes);

        logger.info('Direct processing: Checking event time match', {
          callSid,
          eventTitle: event.summary,
          eventTime: `${eventHour}:${eventMinute.toString().padStart(2, '0')}`,
          targetTime: `${targetTime.hour}:${targetTime.minute.toString().padStart(2, '0')}`,
          timeDiff,
          withinRange: timeDiff <= 30
        });

        return timeDiff <= 30; // Within 30 minutes
      });

      logger.info('Direct processing: Found matching events', {
        callSid,
        matchingCount: matchingEvents.length,
        eventTitles: matchingEvents.map(e => e.summary)
      });

      if (matchingEvents.length === 0) {
        return {
          success: true,
          response: `I don't see any appointments around ${timeRef}. Your calendar looks clear at that time.`,
          intent: 'query',
          eventCount: 0,
          method: 'direct_processing'
        };
      }

      // Return detailed information about the matching event
      const event = matchingEvents[0];
      const startTime = event.start?.dateTime || event.start?.date;
      const endTime = event.end?.dateTime || event.end?.date;

      const startTimeFormatted = startTime ? new Date(startTime).toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
        timeZone: 'America/Los_Angeles'
      }) : 'Unknown time';

      const endTimeFormatted = endTime ? new Date(endTime).toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
        timeZone: 'America/Los_Angeles'
      }) : null;

      let response = `At ${startTimeFormatted}, you have "${event.summary || 'Untitled event'}"`;

      if (endTimeFormatted) {
        response += ` until ${endTimeFormatted}`;
      }

      if (event.description) {
        response += `. Details: ${event.description}`;
      }

      if (event.location) {
        response += ` Location: ${event.location}`;
      }

      if (event.attendees && event.attendees.length > 0) {
        const attendeeNames = event.attendees.map(a => a.displayName || a.email).join(', ');
        response += ` Attendees: ${attendeeNames}`;
      }

      logger.info('Direct processing: Generated detailed response', {
        callSid,
        eventTitle: event.summary,
        responseLength: response.length
      });

      return {
        success: true,
        response: response,
        intent: 'query',
        eventDetails: {
          title: event.summary,
          description: event.description,
          location: event.location,
          startTime: startTimeFormatted,
          endTime: endTimeFormatted,
          attendees: event.attendees
        },
        method: 'direct_processing'
      };
    }

    // Check for general calendar queries
    const generalPatterns = [
      /what.*on.*calendar/i,
      /what.*scheduled/i,
      /any.*meetings?/i,
      /any.*appointments?/i,
      /what.*today/i,
      /what.*tomorrow/i,
      /check.*calendar/i,
      /show.*calendar/i,
      /calendar.*today/i,
      /do i have/i,
      /am i free/i
    ];

    if (generalPatterns.some(pattern => pattern.test(lowerMessage))) {
      logger.info('Direct processing: Detected general calendar query');

      const events = await calendar.listEvents(10, null, null, true);

      if (events.length === 0) {
        return {
          success: true,
          response: "You don't have any events scheduled today. Your calendar is clear!",
          intent: 'query',
          eventCount: 0,
          method: 'direct_processing'
        };
      }

      // Format events for voice response
      const eventDescriptions = events.slice(0, 3).map(event => {
        const startTime = event.start?.dateTime || event.start?.date;
        const timeStr = startTime ? new Date(startTime).toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        }) : '';

        return `${event.summary || 'Untitled event'}${timeStr ? ` at ${timeStr}` : ''}`;
      });

      let response = `You have ${events.length} event${events.length > 1 ? 's' : ''} today. `;

      if (events.length <= 3) {
        response += eventDescriptions.join(', ');
      } else {
        response += `Your next few are: ${eventDescriptions.join(', ')}, and ${events.length - 3} more.`;
      }

      return {
        success: true,
        response,
        intent: 'query',
        eventCount: events.length,
        events: events.slice(0, 3),
        method: 'direct_processing'
      };
    }

    // Not a calendar command
    logger.info('Direct processing: Not detected as calendar command');
    return null;

  } catch (error) {
    logger.error('Error in direct calendar processing', {
      callSid,
      error: error.message
    });

    return {
      success: false,
      response: "I'm having trouble accessing your calendar right now. Please try again in a moment.",
      error: error.message
    };
  }
}

/**
 * Extract sender name from email address
 */
function extractSenderName(fromField) {
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
function getTimeAgo(timestamp) {
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

/**
 * Parse time reference into hour and minute
 */
function parseTimeReference(timeRef) {
  // Handle various time formats
  const timeMatch = timeRef.match(/(\d{1,2}):?(\d{0,2})\s*(am|pm|AM|PM)?/i);

  if (timeMatch) {
    let hour = parseInt(timeMatch[1]);
    let minute = timeMatch[2] ? parseInt(timeMatch[2]) : 0;
    const period = timeMatch[3];

    // Convert to 24-hour format
    if (period) {
      const isPM = period.toLowerCase() === 'pm';
      if (isPM && hour !== 12) {
        hour += 12;
      } else if (!isPM && hour === 12) {
        hour = 0;
      }
    } else {
      // If no AM/PM specified, assume PM for times 1-11, AM for 12
      if (hour >= 1 && hour <= 11) {
        hour += 12; // Assume PM for afternoon times
      }
    }

    return { hour, minute };
  }

  // Default fallback
  return { hour: 12, minute: 0 };
}

/**
 * Test daily briefing generation
 */
router.post('/daily-briefing', async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({
        error: 'Missing required field: userId'
      });
    }

    logger.info('Testing daily briefing generation', { userId });

    const briefingService = getDailyBriefing();
    const briefing = await briefingService.generateDailyBriefing(userId, 'test-briefing-call');

    logger.info('Daily briefing test completed', {
      userId,
      success: true,
      responseLength: briefing.response?.length || 0
    });

    res.json({
      success: true,
      briefing
    });

  } catch (error) {
    logger.error('Daily briefing test failed', {
      userId: req.body.userId,
      error: error.message,
      stack: error.stack
    });

    res.status(500).json({
      error: error.message,
      success: false
    });
  }
});

export { router as testRoutes };