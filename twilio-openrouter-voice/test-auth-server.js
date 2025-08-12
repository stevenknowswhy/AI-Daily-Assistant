#!/usr/bin/env node

import express from 'express';
import { config } from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { google } from 'googleapis';

// Load environment variables
config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = 3005;

// Basic middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files
app.use('/static', express.static(path.join(__dirname, 'public/static')));

// Initialize OAuth2 client
let oauth2Client = null;

function initializeOAuth() {
  try {
    const projectRoot = path.resolve(__dirname, '..');
    const credentialsPath = path.resolve(projectRoot, 'credentials.json');
    
    console.log('Loading credentials from:', credentialsPath);
    
    if (!fs.existsSync(credentialsPath)) {
      throw new Error(`Credentials file not found: ${credentialsPath}`);
    }
    
    const credentials = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));
    const { client_id, client_secret } = credentials.installed || credentials.web;
    
    oauth2Client = new google.auth.OAuth2(
      client_id,
      client_secret,
      'http://localhost:3005/auth/google/callback' // Use web redirect URI
    );
    
    console.log('✅ OAuth2 client initialized with web redirect');
    return true;
  } catch (error) {
    console.error('❌ OAuth initialization failed:', error.message);
    return false;
  }
}

// Initialize OAuth on startup
const oauthReady = initializeOAuth();

// Health endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    oauth: oauthReady
  });
});

// Calendar auth endpoint - returns redirect URL
app.get('/test/calendar/auth', (req, res) => {
  try {
    if (!oauth2Client) {
      return res.status(500).json({
        success: false,
        error: 'OAuth client not initialized'
      });
    }

    const scopes = [
      'https://www.googleapis.com/auth/calendar.readonly',
      'https://www.googleapis.com/auth/calendar.events',
      'https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/gmail.modify',
      'https://www.googleapis.com/auth/gmail.compose'
    ];

    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      prompt: 'consent'
    });

    res.json({
      success: true,
      service: 'Google Calendar Auth',
      authUrl: authUrl,
      flowType: 'web-redirect',
      redirectUri: 'http://localhost:3005/auth/google/callback',
      instructions: 'Click the authUrl to authenticate. You will be redirected back automatically.',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      service: 'Google Calendar Auth',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// OAuth callback endpoint - handles the redirect from Google
app.get('/auth/google/callback', async (req, res) => {
  try {
    const { code, error } = req.query;

    if (error) {
      return res.status(400).send(`
        <html>
          <body style="font-family: Arial, sans-serif; padding: 20px;">
            <h2>❌ Authentication Error</h2>
            <p>Error: ${error}</p>
            <p><a href="/">Return to Dashboard</a></p>
          </body>
        </html>
      `);
    }

    if (!code) {
      return res.status(400).send(`
        <html>
          <body style="font-family: Arial, sans-serif; padding: 20px;">
            <h2>❌ Authentication Error</h2>
            <p>No authorization code received</p>
            <p><a href="/">Return to Dashboard</a></p>
          </body>
        </html>
      `);
    }

    // Exchange code for tokens
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);
    
    // Store tokens (in a real app, you'd save to database)
    const tokenPath = path.resolve(__dirname, '..', 'token.json');
    fs.writeFileSync(tokenPath, JSON.stringify(tokens, null, 2));

    res.send(`
      <html>
        <body style="font-family: Arial, sans-serif; padding: 20px;">
          <h2>✅ Google Authentication Successful!</h2>
          <p>You have successfully authenticated with Google Calendar and Gmail.</p>
          <p>You can now close this window and return to the dashboard.</p>
          <p><a href="/">Return to Dashboard</a></p>
          <script>
            // Auto-close window after 3 seconds
            setTimeout(() => {
              window.close();
            }, 3000);
          </script>
        </body>
      </html>
    `);

  } catch (error) {
    console.error('OAuth callback error:', error);
    res.status(500).send(`
      <html>
        <body style="font-family: Arial, sans-serif; padding: 20px;">
          <h2>❌ Authentication Failed</h2>
          <p>Error: ${error.message}</p>
          <p><a href="/">Return to Dashboard</a></p>
        </body>
      </html>
    `);
  }
});

// Test calendar endpoint - checks if authenticated
app.get('/test/calendar', async (req, res) => {
  try {
    if (!oauth2Client || !oauth2Client.credentials.access_token) {
      return res.json({
        success: false,
        service: 'Google Calendar',
        error: 'Not authenticated',
        timestamp: new Date().toISOString()
      });
    }

    // Test API call
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
    const response = await calendar.events.list({
      calendarId: 'primary',
      timeMin: new Date().toISOString(),
      maxResults: 5,
      singleEvents: true,
      orderBy: 'startTime',
    });

    res.json({
      success: true,
      service: 'Google Calendar',
      eventCount: response.data.items.length,
      events: response.data.items.map(event => ({
        summary: event.summary,
        start: event.start.dateTime || event.start.date
      })),
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      service: 'Google Calendar',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Serve test page
app.get('/', (req, res) => {
  const htmlPath = path.join(__dirname, 'public/test.html');
  
  if (!fs.existsSync(htmlPath)) {
    return res.send(`
      <html>
        <body style="font-family: Arial, sans-serif; padding: 20px;">
          <h1>🧪 Google OAuth Test Server</h1>
          <h2>Authentication Test</h2>
          <button onclick="testCalendarAuth()">Test Calendar Auth</button>
          <button onclick="testCalendar()">Test Calendar API</button>
          <div id="results" style="margin-top: 20px; padding: 10px; background: #f5f5f5;"></div>
          
          <script>
            async function testCalendarAuth() {
              const response = await fetch('/test/calendar/auth');
              const data = await response.json();
              if (data.success) {
                window.open(data.authUrl, '_blank');
              }
              document.getElementById('results').innerHTML = '<pre>' + JSON.stringify(data, null, 2) + '</pre>';
            }
            
            async function testCalendar() {
              const response = await fetch('/test/calendar');
              const data = await response.json();
              document.getElementById('results').innerHTML = '<pre>' + JSON.stringify(data, null, 2) + '</pre>';
            }
          </script>
        </body>
      </html>
    `);
  }
  
  fs.readFile(htmlPath, 'utf8', (err, html) => {
    if (err) {
      res.status(500).send('Error loading test page');
      return;
    }
    res.send(html);
  });
});

// Start server
app.listen(port, () => {
  console.log(`🚀 OAuth Test Server running on http://localhost:${port}`);
  console.log(`🧪 Test page: http://localhost:${port}`);
  console.log(`📋 Health check: http://localhost:${port}/health`);
  console.log(`✅ Calendar auth: http://localhost:${port}/test/calendar/auth`);
  console.log(`🔄 OAuth callback: http://localhost:${port}/auth/google/callback`);
  console.log(`📅 Test calendar: http://localhost:${port}/test/calendar`);
});
