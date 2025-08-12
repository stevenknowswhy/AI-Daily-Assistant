/**
 * Authentication Manager
 * =====================
 * 
 * Unified authentication service that manages Google OAuth, API keys,
 * and security measures across phone and web interfaces.
 */

import { google } from 'googleapis';
import { createClient } from '@supabase/supabase-js';
import { logger } from '../utils/logger.js';
import { secureTokenManager } from '../utils/secure-token-manager.js';
import { SecureError, ErrorTypes } from '../utils/secure-error-handler.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class AuthManager {
  constructor() {
    // Resolve paths relative to the actual project root (one level up from twilio-openrouter-voice)
    const projectRoot = path.resolve(__dirname, '../../..');
    this.credentialsPath = process.env.GOOGLE_CREDENTIALS_PATH
      ? path.resolve(projectRoot, process.env.GOOGLE_CREDENTIALS_PATH)
      : path.resolve(projectRoot, 'credentials.json');
    this.tokenPath = process.env.GOOGLE_TOKEN_PATH
      ? path.resolve(projectRoot, process.env.GOOGLE_TOKEN_PATH)
      : path.resolve(projectRoot, 'token.json');
    this.scopes = [
      'https://www.googleapis.com/auth/calendar.readonly',
      'https://www.googleapis.com/auth/calendar.events',
      'https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/gmail.modify',
      'https://www.googleapis.com/auth/gmail.compose'
    ];

    // Initialize Supabase for secure token storage
    this.supabase = null;
    if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
      this.supabase = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
      );
    }

    this.oauth2Client = null;
    this.isInitialized = false;

    logger.info('AuthManager initialized', {
      hasSupabase: !!this.supabase,
      credentialsPath: this.credentialsPath,
      scopeCount: this.scopes.length
    });
  }

  /**
   * Initialize the authentication manager
   */
  async initialize() {
    try {
      if (this.isInitialized) {
        return { success: true, message: 'Already initialized' };
      }

      // Load Google credentials
      const credentialsResult = await this.loadGoogleCredentials();
      if (!credentialsResult.success) {
        return credentialsResult;
      }

      // Try to load existing tokens
      await this.loadExistingTokens();

      this.isInitialized = true;
      logger.info('AuthManager initialization complete');

      return {
        success: true,
        authenticated: this.isAuthenticated(),
        message: 'Authentication manager initialized successfully'
      };

    } catch (error) {
      const secureError = new SecureError(
        ErrorTypes.CONFIGURATION_ERROR,
        'Authentication manager initialization failed',
        { component: 'AuthManager' }
      );

      logger.error('AuthManager initialization failed', {
        errorId: secureError.errorId,
        error: error.message,
        stack: error.stack
      });

      return {
        success: false,
        error: 'Authentication system initialization failed'
      };
    }
  }

  /**
   * Load Google OAuth credentials
   */
  async loadGoogleCredentials() {
    try {
      // this.credentialsPath is already an absolute path
      const credentialsPath = this.credentialsPath;
      
      if (!fs.existsSync(credentialsPath)) {
        throw new SecureError(
          ErrorTypes.CONFIGURATION_ERROR,
          'Google credentials file not found',
          { credentialsPath: 'credentials-desktop.json' }
        );
      }

      const credentials = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));
      const { client_secret, client_id, redirect_uris } = credentials.installed || credentials.web;

      this.oauth2Client = new google.auth.OAuth2(
        client_id,
        client_secret,
        'http://localhost:3005/auth/google/callback' // Use web redirect URI for Web application
      );

      logger.info('Google credentials loaded successfully', {
        clientId: client_id.substring(0, 20) + '...',
        redirectUri: redirect_uris[0] || 'urn:ietf:wg:oauth:2.0:oob'
      });

      return { success: true };

    } catch (error) {
      const secureError = error instanceof SecureError ? error : new SecureError(
        ErrorTypes.CONFIGURATION_ERROR,
        'Failed to load Google credentials',
        { component: 'GoogleCredentials' }
      );

      logger.error('Failed to load Google credentials', {
        errorId: secureError.errorId,
        error: error.message,
        credentialsPath: this.credentialsPath
      });

      return {
        success: false,
        error: 'Google credentials configuration error'
      };
    }
  }

  /**
   * Load existing tokens from file or database
   */
  async loadExistingTokens() {
    try {
      // Try to load from file first (for backward compatibility)
      const tokenPath = path.resolve(__dirname, this.tokenPath);
      
      if (fs.existsSync(tokenPath)) {
        const tokens = JSON.parse(fs.readFileSync(tokenPath, 'utf8'));
        this.oauth2Client.setCredentials(tokens);
        
        logger.info('Tokens loaded from file', {
          hasAccessToken: !!tokens.access_token,
          hasRefreshToken: !!tokens.refresh_token,
          expiryDate: tokens.expiry_date
        });

        // Migrate to database if available
        if (this.supabase) {
          await this.storeTokensSecurely('default_user', tokens);
        }

        return { success: true, source: 'file' };
      }

      // Try to load from database
      if (this.supabase) {
        const tokens = await this.getStoredTokens('default_user');
        if (tokens) {
          this.oauth2Client.setCredentials(tokens);
          logger.info('Tokens loaded from database');
          return { success: true, source: 'database' };
        }
      }

      logger.info('No existing tokens found');
      return { success: false, message: 'No existing tokens' };

    } catch (error) {
      logger.error('Failed to load existing tokens', {
        error: error.message
      });
      return { success: false, error: error.message };
    }
  }

  /**
   * Generate Google OAuth authorization URL
   */
  getAuthUrl() {
    if (!this.oauth2Client) {
      throw new Error('OAuth client not initialized');
    }

    const authUrl = this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: this.scopes,
      prompt: 'consent' // Force consent to get refresh token
    });

    logger.info('Generated OAuth authorization URL');
    return authUrl;
  }

  /**
   * Exchange authorization code for tokens
   */
  async authenticateWithCode(code, userId = 'default_user') {
    try {
      if (!this.oauth2Client) {
        throw new Error('OAuth client not initialized');
      }

      const { tokens } = await this.oauth2Client.getToken(code);
      this.oauth2Client.setCredentials(tokens);

      // Store tokens securely
      await this.storeTokensSecurely(userId, tokens);

      // Also save to file for backward compatibility
      const tokenPath = path.resolve(__dirname, this.tokenPath);
      fs.writeFileSync(tokenPath, JSON.stringify(tokens, null, 2));

      logger.info('Authentication successful', {
        userId,
        hasAccessToken: !!tokens.access_token,
        hasRefreshToken: !!tokens.refresh_token,
        expiryDate: tokens.expiry_date
      });

      return {
        success: true,
        tokens: tokens,
        message: 'Authentication successful'
      };

    } catch (error) {
      logger.error('Authentication failed', {
        userId,
        error: error.message
      });

      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Store tokens securely in database with encryption
   */
  async storeTokensSecurely(userId, tokens) {
    if (!this.supabase) {
      logger.warn('Supabase not available for secure token storage');
      return;
    }

    try {
      // Encrypt sensitive token data
      const encryptedAccessToken = secureTokenManager.encrypt(
        tokens.access_token,
        `oauth-access-${userId}`
      );

      const encryptedRefreshToken = tokens.refresh_token
        ? secureTokenManager.encrypt(tokens.refresh_token, `oauth-refresh-${userId}`)
        : null;

      const tokenData = {
        user_id: userId,
        provider: 'google', // Default to Google OAuth
        encrypted_access_token: JSON.stringify(encryptedAccessToken),
        encrypted_refresh_token: encryptedRefreshToken ? JSON.stringify(encryptedRefreshToken) : null,
        token_expires_at: tokens.expiry_date ? new Date(tokens.expiry_date).toISOString() : null,
        scopes: tokens.scope ? tokens.scope.split(' ') : [],
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { error } = await this.supabase
        .from('oauth_tokens')
        .upsert(tokenData, { onConflict: 'user_id,provider' });

      if (error) {
        logger.error('Failed to store encrypted tokens in database', {
          userId,
          error: error.message
        });
        throw new Error(`Database storage failed: ${error.message}`);
      } else {
        logger.info('Encrypted tokens stored securely in database', {
          userId,
          hasRefreshToken: !!tokens.refresh_token
        });
      }

    } catch (error) {
      logger.error('Error storing tokens securely', {
        userId,
        error: error.message,
        stack: error.stack
      });
      throw error; // Re-throw to allow caller to handle
    }
  }

  /**
   * Retrieve and decrypt stored tokens from database
   */
  async getStoredTokens(userId = 'default_user') {
    if (!this.supabase) {
      return null;
    }

    try {
      const { data, error } = await this.supabase
        .from('oauth_tokens')
        .select('*')
        .eq('user_id', userId)
        .eq('provider', 'google')
        .single();

      if (error || !data) {
        logger.debug('No stored tokens found for user', { userId });
        return null;
      }

      // Handle both encrypted (new) and unencrypted (legacy) tokens
      let accessToken, refreshToken;

      if (data.encrypted_access_token) {
        // New encrypted format
        try {
          const encryptedAccessData = JSON.parse(data.encrypted_access_token);
          accessToken = secureTokenManager.decrypt(encryptedAccessData);

          if (data.encrypted_refresh_token) {
            const encryptedRefreshData = JSON.parse(data.encrypted_refresh_token);
            refreshToken = secureTokenManager.decrypt(encryptedRefreshData);
          }

          logger.debug('Successfully decrypted stored tokens', {
            userId,
            hasRefreshToken: !!refreshToken
          });

        } catch (decryptError) {
          logger.error('Failed to decrypt stored tokens', {
            userId,
            error: decryptError.message
          });
          return null;
        }
      } else if (data.access_token) {
        // Legacy unencrypted format - migrate to encrypted
        logger.warn('Found legacy unencrypted tokens, migrating to encrypted storage', { userId });

        accessToken = data.access_token;
        refreshToken = data.refresh_token;

        // Migrate to encrypted storage
        const tokens = {
          access_token: accessToken,
          refresh_token: refreshToken,
          token_type: data.token_type || 'Bearer',
          expiry_date: data.token_expires_at ? new Date(data.token_expires_at).getTime() : null,
          scope: Array.isArray(data.scopes) ? data.scopes.join(' ') : data.scopes
        };

        // Store encrypted version (this will overwrite the unencrypted data)
        await this.storeTokensSecurely(userId, tokens);

        logger.info('Successfully migrated legacy tokens to encrypted storage', { userId });
      } else {
        logger.warn('No valid token data found', { userId });
        return null;
      }

      return {
        access_token: accessToken,
        refresh_token: refreshToken,
        token_type: data.token_type || 'Bearer',
        expiry_date: data.token_expires_at ? new Date(data.token_expires_at).getTime() : null,
        scope: Array.isArray(data.scopes) ? data.scopes.join(' ') : data.scopes
      };

    } catch (error) {
      logger.error('Error retrieving stored tokens', {
        userId,
        error: error.message,
        stack: error.stack
      });
      return null;
    }
  }

  /**
   * Check if currently authenticated
   */
  isAuthenticated() {
    if (!this.oauth2Client) {
      return false;
    }

    const credentials = this.oauth2Client.credentials;
    return !!(credentials && credentials.access_token);
  }

  /**
   * Get authenticated OAuth2 client
   */
  getAuthenticatedClient() {
    if (!this.isAuthenticated()) {
      throw new Error('Not authenticated with Google');
    }

    return this.oauth2Client;
  }

  /**
   * Refresh access token if needed
   */
  async refreshTokenIfNeeded(userId = 'default_user') {
    try {
      if (!this.oauth2Client || !this.oauth2Client.credentials) {
        return { success: false, error: 'No credentials available' };
      }

      const credentials = this.oauth2Client.credentials;
      const now = Date.now();
      const expiryTime = credentials.expiry_date;

      // Refresh if token expires within 5 minutes
      if (expiryTime && (expiryTime - now) < 5 * 60 * 1000) {
        logger.info('Refreshing access token', { userId });

        const { credentials: newCredentials } = await this.oauth2Client.refreshAccessToken();
        this.oauth2Client.setCredentials(newCredentials);

        // Store updated tokens
        await this.storeTokensSecurely(userId, newCredentials);

        logger.info('Access token refreshed successfully', { userId });
        return { success: true, refreshed: true };
      }

      return { success: true, refreshed: false };

    } catch (error) {
      logger.error('Token refresh failed', {
        userId,
        error: error.message
      });

      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Revoke authentication
   */
  async revokeAuthentication(userId = 'default_user') {
    try {
      if (this.oauth2Client && this.oauth2Client.credentials) {
        await this.oauth2Client.revokeCredentials();
      }

      // Clear stored tokens
      if (this.supabase) {
        await this.supabase
          .from('oauth_tokens')
          .delete()
          .eq('user_id', userId)
          .eq('provider', 'google');
      }

      // Clear file tokens
      const tokenPath = path.resolve(__dirname, this.tokenPath);
      if (fs.existsSync(tokenPath)) {
        fs.unlinkSync(tokenPath);
      }

      this.oauth2Client = null;

      logger.info('Authentication revoked successfully', { userId });
      return { success: true };

    } catch (error) {
      logger.error('Failed to revoke authentication', {
        userId,
        error: error.message
      });

      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get authentication status
   */
  getAuthStatus() {
    const isAuth = this.isAuthenticated();
    const credentials = this.oauth2Client?.credentials;

    return {
      authenticated: isAuth,
      hasAccessToken: !!(credentials?.access_token),
      hasRefreshToken: !!(credentials?.refresh_token),
      expiryDate: credentials?.expiry_date,
      scopes: credentials?.scope?.split(' ') || [],
      tokenType: credentials?.token_type
    };
  }

  /**
   * Exchange authorization code for tokens (for web redirect flow)
   */
  async exchangeCodeForTokens(code) {
    try {
      if (!this.oauth2Client) {
        throw new Error('OAuth client not initialized');
      }

      logger.info('Exchanging authorization code for tokens');

      const { tokens } = await this.oauth2Client.getToken(code);
      this.oauth2Client.setCredentials(tokens);

      // Save tokens to file
      await this.saveTokens(tokens);

      logger.info('Tokens exchanged and saved successfully');

      return {
        success: true,
        message: 'Authentication successful',
        authenticated: true
      };

    } catch (error) {
      logger.error('Failed to exchange code for tokens:', error.message);
      return {
        success: false,
        error: error.message,
        authenticated: false
      };
    }
  }

  /**
   * Save tokens to file
   */
  async saveTokens(tokens) {
    try {
      logger.info('Saving tokens to file');
      fs.writeFileSync(this.tokenPath, JSON.stringify(tokens, null, 2));
      logger.info('Tokens saved successfully', { tokenPath: this.tokenPath });
    } catch (error) {
      logger.error('Failed to save tokens:', error.message);
      throw error;
    }
  }
}
