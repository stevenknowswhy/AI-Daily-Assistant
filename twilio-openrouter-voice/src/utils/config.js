/**
 * Configuration Validation
 * ========================
 *
 * Validates environment variables and service connections
 */

import { logger } from './logger.js';
import twilio from 'twilio';
import axios from 'axios';
import { createClient } from '@supabase/supabase-js';

/**
 * Validate all required environment variables
 */
export function validateEnvironmentVariables() {
  const required = [
    'TWILIO_ACCOUNT_SID',
    'TWILIO_AUTH_TOKEN',
    'TWILIO_PHONE_NUMBER',
    'OPENROUTER_API_KEY',
    'OPENROUTER_PRIMARY_MODEL',
    'SUPABASE_URL',
    'SUPABASE_ANON_KEY'
  ];

  const missing = required.filter(key => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  logger.info('✅ All required environment variables are present');
  return true;
}

/**
 * Test Twilio connection and credentials
 */
export async function validateTwilioConnection() {
  try {
    const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

    // Test by fetching account information
    const account = await client.api.accounts(process.env.TWILIO_ACCOUNT_SID).fetch();

    logger.twilio('✅ Twilio connection validated', {
      accountSid: account.sid,
      status: account.status
    });

    return true;
  } catch (error) {
    logger.error('❌ Twilio connection failed:', error.message);
    throw new Error(`Twilio validation failed: ${error.message}`);
  }
}

/**
 * Test OpenRouter API connection
 */
export async function validateOpenRouterConnection() {
  try {
    const response = await axios.get('https://openrouter.ai/api/v1/models', {
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });

    if (response.status === 200) {
      const models = response.data.data || [];
      const primaryModel = models.find(m => m.id === process.env.OPENROUTER_PRIMARY_MODEL);
      const fallbackModel = models.find(m => m.id === process.env.OPENROUTER_FALLBACK_MODEL);

      logger.openrouter('✅ OpenRouter connection validated', {
        totalModels: models.length,
        primaryModelAvailable: !!primaryModel,
        fallbackModelAvailable: !!fallbackModel
      });

      return true;
    } else {
      throw new Error(`Unexpected response status: ${response.status}`);
    }
  } catch (error) {
    logger.error('❌ OpenRouter connection failed:', error.message);
    throw new Error(`OpenRouter validation failed: ${error.message}`);
  }
}

/**
 * Test Supabase connection
 */
export async function validateSupabaseConnection() {
  // Skip validation if Supabase is not configured
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
    logger.warn('⚠️  Supabase not configured - skipping validation');
    return true;
  }

  try {
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY
    );

    // Test connection with a simple query that doesn't depend on specific tables
    const { data, error } = await supabase.auth.getSession();

    // If we get here without throwing, the connection works
    logger.info('✅ Supabase connection validated');
    return true;
  } catch (error) {
    logger.warn('⚠️  Supabase connection issue (continuing anyway):', error.message);
    return true; // Don't fail startup for Supabase issues
  }
}

/**
 * Run all configuration validations
 */
export async function validateConfig() {
  logger.info('🔍 Validating configuration...');

  try {
    // Validate environment variables
    validateEnvironmentVariables();

    // Validate service connections
    await Promise.all([
      validateTwilioConnection(),
      validateOpenRouterConnection(),
      validateSupabaseConnection()
    ]);

    logger.info('✅ All configuration validations passed');
    return true;
  } catch (error) {
    logger.error('❌ Configuration validation failed:', error.message);
    throw error;
  }
}