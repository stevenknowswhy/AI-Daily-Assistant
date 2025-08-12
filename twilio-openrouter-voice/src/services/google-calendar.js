/**
 * Google Calendar Service
 * ======================
 * 
 * Custom Google Calendar integration that works with our existing OAuth setup
 */

import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { logger } from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class GoogleCalendarService {
  constructor() {
    this.calendar = null;
    this.auth = null;

    // Resolve paths relative to the actual project root (one level up from twilio-openrouter-voice)
    const projectRoot = path.resolve(__dirname, '../../..');
    this.credentialsPath = process.env.GOOGLE_CREDENTIALS_PATH
      ? path.resolve(projectRoot, process.env.GOOGLE_CREDENTIALS_PATH)
      : path.resolve(projectRoot, 'credentials-desktop.json');
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
  }

  /**
   * Initialize the Google Calendar service
   */
  async initialize() {
    try {
      logger.info('Initializing Google Calendar service');

      // Load credentials
      const credentials = await this.loadCredentials();
      if (!credentials) {
        throw new Error('Google Calendar credentials not found');
      }

      // Set up OAuth2 client
      const credentialData = credentials.installed || credentials.web;
      if (!credentialData) {
        throw new Error('Invalid credentials format - missing installed or web section');
      }

      const { client_secret, client_id } = credentialData;
      if (!client_id || !client_secret) {
        throw new Error('Missing client_id or client_secret in credentials');
      }

      // Choose redirect URI based on client type
      // Desktop applications (installed) support out-of-band flow
      // Web applications need specific redirect URIs
      const redirectUris = credentialData.redirect_uris || [];
      let redirectUri = 'urn:ietf:wg:oauth:2.0:oob'; // Default for desktop apps

      // Check if this is a desktop/installed client (supports out-of-band)
      if (credentials.installed && redirectUris.includes('http://localhost')) {
        redirectUri = 'urn:ietf:wg:oauth:2.0:oob';
        logger.info('Using out-of-band redirect URI for Desktop application OAuth flow');
      } else if (credentials.web) {
        // This is a web client, use web redirect
        redirectUri = 'http://localhost:3005/auth/google/callback';
        logger.info('Using web client redirect URI for OAuth flow');
      }

      this.auth = new google.auth.OAuth2(client_id, client_secret, redirectUri);
      this.redirectUri = redirectUri; // Store for later use

      logger.info('OAuth2 client initialized successfully', {
        clientId: client_id.substring(0, 20) + '...',
        redirectUri
      });

      // Load existing token or prompt for authorization
      const token = await this.loadToken();
      if (token) {
        this.auth.setCredentials(token);
        logger.info('Google Calendar service initialized with existing token');
      } else {
        logger.warn('Google Calendar service initialized but requires authentication');
      }

      // Initialize Calendar API
      this.calendar = google.calendar({ version: 'v3', auth: this.auth });

      // Mark as initialized
      this.initialized = true;

      return true;
    } catch (error) {
      logger.error('Failed to initialize Google Calendar service:', error.message);
      this.initialized = false;
      return false;
    }
  }

  /**
   * Load Google OAuth credentials
   */
  async loadCredentials() {
    try {
      logger.info(`Loading Google credentials from: ${this.credentialsPath}`);
      const credentialsData = fs.readFileSync(this.credentialsPath, 'utf8');
      const credentials = JSON.parse(credentialsData);
      logger.info('Google credentials loaded successfully');
      return credentials;
    } catch (error) {
      logger.error(`Error loading Google credentials from ${this.credentialsPath}:`, error.message);
      return null;
    }
  }

  /**
   * Load existing OAuth token
   */
  async loadToken() {
    try {
      if (fs.existsSync(this.tokenPath)) {
        const tokenData = fs.readFileSync(this.tokenPath, 'utf8');
        return JSON.parse(tokenData);
      }
      return null;
    } catch (error) {
      logger.error('Error loading Google token:', error.message);
      return null;
    }
  }

  /**
   * Save OAuth token
   */
  async saveToken(token) {
    try {
      fs.writeFileSync(this.tokenPath, JSON.stringify(token, null, 2));
      logger.info('Google OAuth token saved');
    } catch (error) {
      logger.error('Error saving Google token:', error.message);
    }
  }

  /**
   * Get authorization URL for OAuth flow
   */
  async getAuthUrl() {
    try {
      // Ensure service is initialized
      if (!this.initialized && !this.auth) {
        await this.initialize();
      }

      if (!this.auth) {
        throw new Error('OAuth client not initialized');
      }

      const authUrl = this.auth.generateAuthUrl({
        access_type: 'offline',
        scope: this.scopes,
        prompt: 'consent'
      });

      logger.info('Generated Google OAuth URL successfully', {
        redirectUri: this.redirectUri,
        flowType: this.redirectUri === 'urn:ietf:wg:oauth:2.0:oob' ? 'out-of-band' : 'web-redirect'
      });

      return {
        authUrl,
        redirectUri: this.redirectUri,
        flowType: this.redirectUri === 'urn:ietf:wg:oauth:2.0:oob' ? 'out-of-band' : 'web-redirect'
      };
    } catch (error) {
      logger.error('Error generating Google OAuth URL:', error.message);
      throw error;
    }
  }

  /**
   * Exchange authorization code for tokens
   */
  async getTokenFromCode(code) {
    try {
      const { tokens } = await this.auth.getToken(code);
      this.auth.setCredentials(tokens);
      await this.saveToken(tokens);
      logger.info('Google OAuth tokens obtained and saved');
      return tokens;
    } catch (error) {
      logger.error('Error getting tokens from code:', error.message);
      throw error;
    }
  }

  /**
   * Check if the service is authenticated
   */
  isAuthenticated() {
    return this.auth && this.auth.credentials && this.auth.credentials.access_token;
  }

  /**
   * List upcoming calendar events
   */
  async listEvents(maxResults = 10, timeMin = null, timeMax = null, filterToday = false) {
    try {
      if (!this.isAuthenticated()) {
        throw new Error('Not authenticated with Google Calendar');
      }

      let startTime = timeMin;
      let endTime = timeMax;

      // If filtering for today's events, set time boundaries
      if (filterToday) {
        const today = new Date();
        const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0, 0);
        const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);

        startTime = startOfDay.toISOString();
        endTime = endOfDay.toISOString();

        logger.info(`Filtering events for today: ${startOfDay.toDateString()}`);
      }

      const params = {
        calendarId: 'primary',
        timeMin: startTime || new Date().toISOString(),
        maxResults: maxResults,
        singleEvents: true,
        orderBy: 'startTime',
      };

      if (endTime) {
        params.timeMax = endTime;
      }

      const response = await this.calendar.events.list(params);
      const events = response.data.items || [];

      const filterType = filterToday ? "today's" : 'upcoming';
      logger.info(`Retrieved ${events.length} ${filterType} calendar events`);
      return events;
    } catch (error) {
      logger.error('Error listing calendar events:', error.message);
      throw error;
    }
  }

  /**
   * Create a new calendar event
   */
  async createEvent(eventData) {
    try {
      if (!this.isAuthenticated()) {
        throw new Error('Not authenticated with Google Calendar');
      }

      const event = {
        summary: eventData.title || eventData.summary,
        description: eventData.description || '',
        start: {
          dateTime: eventData.startDateTime,
          timeZone: eventData.timeZone || 'America/Los_Angeles',
        },
        end: {
          dateTime: eventData.endDateTime,
          timeZone: eventData.timeZone || 'America/Los_Angeles',
        },
        attendees: eventData.attendees || [],
        reminders: {
          useDefault: false,
          overrides: [
            { method: 'email', minutes: 24 * 60 },
            { method: 'popup', minutes: 10 },
          ],
        },
      };

      const response = await this.calendar.events.insert({
        calendarId: 'primary',
        resource: event,
      });

      logger.info(`Created calendar event: ${response.data.id}`);
      return response.data;
    } catch (error) {
      logger.error('Error creating calendar event:', error.message);
      throw error;
    }
  }

  /**
   * Update an existing calendar event
   */
  async updateEvent(eventId, eventData) {
    try {
      if (!this.isAuthenticated()) {
        throw new Error('Not authenticated with Google Calendar');
      }

      const response = await this.calendar.events.update({
        calendarId: 'primary',
        eventId: eventId,
        resource: eventData,
      });

      logger.info(`Updated calendar event: ${eventId}`);
      return response.data;
    } catch (error) {
      logger.error('Error updating calendar event:', error.message);
      throw error;
    }
  }

  /**
   * Delete a calendar event
   */
  async deleteEvent(eventId) {
    try {
      if (!this.isAuthenticated()) {
        throw new Error('Not authenticated with Google Calendar');
      }

      await this.calendar.events.delete({
        calendarId: 'primary',
        eventId: eventId,
      });

      logger.info(`Deleted calendar event: ${eventId}`);
      return true;
    } catch (error) {
      logger.error('Error deleting calendar event:', error.message);
      throw error;
    }
  }

  /**
   * Get a specific calendar event
   */
  async getEvent(eventId) {
    try {
      if (!this.isAuthenticated()) {
        throw new Error('Not authenticated with Google Calendar');
      }

      const response = await this.calendar.events.get({
        calendarId: 'primary',
        eventId: eventId,
      });

      logger.info(`Retrieved calendar event: ${eventId}`);
      return response.data;
    } catch (error) {
      logger.error('Error getting calendar event:', error.message);
      throw error;
    }
  }

  /**
   * Test the calendar connection
   */
  async testConnection() {
    try {
      if (!this.isAuthenticated()) {
        return {
          success: false,
          error: 'Not authenticated',
          authUrl: this.getAuthUrl()
        };
      }

      // Try to list a few events to test the connection
      const events = await this.listEvents(1);
      
      return {
        success: true,
        authenticated: true,
        eventsCount: events.length,
        message: 'Google Calendar connection successful'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        authenticated: this.isAuthenticated()
      };
    }
  }
}
