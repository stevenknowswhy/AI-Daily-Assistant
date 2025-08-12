/**
 * Twilio Management Routes
 * ========================
 *
 * API endpoints for managing Twilio calls and phone numbers
 */

import express from 'express';
import twilio from 'twilio';
import { logger } from '../utils/logger.js';

const { AccessToken } = twilio.jwt;
const { VoiceGrant } = AccessToken;

const router = express.Router();

/**
 * Generate Twilio access token for browser-based voice calls
 * GET /twilio/token
 */
router.get('/token', (req, res) => {
  try {
    // Validate required environment variables
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const apiKey = process.env.TWILIO_API_KEY;
    const apiSecret = process.env.TWILIO_API_SECRET;
    const twimlAppSid = process.env.TWILIO_TWIML_APP_SID;

    if (!accountSid || !apiKey || !apiSecret || !twimlAppSid) {
      logger.error('Missing Twilio Voice SDK credentials in environment variables');
      return res.status(500).json({
        success: false,
        error: 'Server configuration error',
        message: 'Twilio Voice SDK credentials not configured'
      });
    }

    // Create voice grant
    const voiceGrant = new VoiceGrant({
      outgoingApplicationSid: twimlAppSid, // Correct camelCase property name
      incomingAllow: false // Only allow outgoing calls for now
    });

    // Create access token
    const token = new AccessToken(accountSid, apiKey, apiSecret, {
      identity: 'web-user' // Unique identifier for the browser client
    });
    token.addGrant(voiceGrant);

    logger.info('Generated Twilio access token for browser client');

    res.json({
      success: true,
      token: token.toJwt()
    });

  } catch (error) {
    logger.error('Failed to generate Twilio access token:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Get account information
 */
router.get('/account', async (req, res) => {
  try {
    const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    const account = await client.api.accounts(process.env.TWILIO_ACCOUNT_SID).fetch();

    res.json({
      success: true,
      account: {
        sid: account.sid,
        friendlyName: account.friendlyName,
        status: account.status,
        type: account.type,
        dateCreated: account.dateCreated,
        dateUpdated: account.dateUpdated
      }
    });

  } catch (error) {
    logger.error('Failed to fetch account info:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * List phone numbers
 */
router.get('/phone-numbers', async (req, res) => {
  try {
    const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    const phoneNumbers = await client.incomingPhoneNumbers.list();

    const formattedNumbers = phoneNumbers.map(number => ({
      sid: number.sid,
      phoneNumber: number.phoneNumber,
      friendlyName: number.friendlyName,
      capabilities: number.capabilities,
      voiceUrl: number.voiceUrl,
      statusCallbackUrl: number.statusCallbackUrl,
      dateCreated: number.dateCreated
    }));

    res.json({
      success: true,
      phoneNumbers: formattedNumbers,
      count: formattedNumbers.length
    });

  } catch (error) {
    logger.error('Failed to fetch phone numbers:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * List recent calls
 */
router.get('/calls', async (req, res) => {
  try {
    const { limit = 20, status } = req.query;

    const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

    const options = { limit: parseInt(limit) };
    if (status) options.status = status;

    const calls = await client.calls.list(options);

    const formattedCalls = calls.map(call => ({
      sid: call.sid,
      from: call.from,
      to: call.to,
      status: call.status,
      direction: call.direction,
      duration: call.duration,
      price: call.price,
      priceUnit: call.priceUnit,
      dateCreated: call.dateCreated,
      dateUpdated: call.dateUpdated,
      endTime: call.endTime
    }));

    res.json({
      success: true,
      calls: formattedCalls,
      count: formattedCalls.length
    });

  } catch (error) {
    logger.error('Failed to fetch calls:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Make an outbound call
 */
router.post('/calls', async (req, res) => {
  try {
    const { to, message, voice = 'alice' } = req.body;

    if (!to) {
      return res.status(400).json({
        success: false,
        error: 'Phone number (to) is required'
      });
    }

    const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

    const twiml = message
      ? `<Response><Say voice="${voice}">${message}</Say></Response>`
      : `<Response><Say voice="${voice}">Hello, this is your AI Daily Assistant calling to test the connection.</Say></Response>`;

    const call = await client.calls.create({
      to: to,
      from: process.env.TWILIO_PHONE_NUMBER,
      twiml: twiml
    });

    logger.info('Outbound call initiated', {
      callSid: call.sid,
      to: call.to,
      from: call.from
    });

    res.json({
      success: true,
      call: {
        sid: call.sid,
        to: call.to,
        from: call.from,
        status: call.status,
        direction: call.direction
      }
    });

  } catch (error) {
    logger.error('Failed to make outbound call:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export { router as twilioRoutes };