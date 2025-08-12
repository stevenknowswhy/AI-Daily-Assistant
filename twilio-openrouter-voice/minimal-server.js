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
const port = process.env.PORT || 3005;

// Basic middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files
app.use('/static', express.static(path.join(__dirname, 'public/static')));

// Simple OAuth2 client setup
let oauth2Client = null;

function initializeOAuth() {
  try {
    const projectRoot = path.resolve(__dirname, '..');
    const credentialsPath = process.env.GOOGLE_CREDENTIALS_PATH 
      ? path.resolve(projectRoot, process.env.GOOGLE_CREDENTIALS_PATH)
      : path.resolve(projectRoot, 'credentials.json');
    
    console.log('Loading credentials from:', credentialsPath);
    
    if (!fs.existsSync(credentialsPath)) {
      throw new Error(`Credentials file not found: ${credentialsPath}`);
    }
    
    const credentials = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));
    const { client_id, client_secret } = credentials.installed || credentials.web;
    
    oauth2Client = new google.auth.OAuth2(
      client_id,
      client_secret,
      'urn:ietf:wg:oauth:2.0:oob'
    );
    
    console.log('✅ OAuth2 client initialized');
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
    version: '1.0.0',
    oauth: oauthReady
  });
});

// Calendar auth endpoint
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
      flowType: 'out-of-band',
      redirectUri: 'urn:ietf:wg:oauth:2.0:oob',
      instructions: 'Visit the authUrl, grant permissions, and copy the authorization code to paste in the dashboard',
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

// Gmail auth endpoint
app.get('/test/gmail/auth', (req, res) => {
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
      service: 'Gmail Authentication',
      authUrl: {
        authUrl: authUrl,
        redirectUri: 'urn:ietf:wg:oauth:2.0:oob',
        flowType: 'out-of-band'
      },
      message: 'Visit the auth URL to authenticate with Gmail scopes',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      service: 'Gmail Authentication',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Serve test page
app.get('/', (req, res) => {
  const htmlPath = path.join(__dirname, 'public/test.html');
  
  fs.readFile(htmlPath, 'utf8', (err, html) => {
    if (err) {
      res.status(500).send('Error loading test page');
      return;
    }
    
    // Generate a simple nonce for CSP
    const nonce = Buffer.from(Math.random().toString()).toString('base64').substring(0, 16);
    
    // Inject nonce into script tag
    const modifiedHtml = html.replace(
      '<script src="/static/js/test.js"></script>',
      `<script nonce="${nonce}" src="/static/js/test.js"></script>`
    );
    
    res.setHeader('Content-Type', 'text/html');
    res.send(modifiedHtml);
  });
});

// Start server
app.listen(port, () => {
  console.log(`🚀 Minimal server running on http://localhost:${port}`);
  console.log(`🧪 Test page: http://localhost:${port}`);
  console.log(`📋 Health check: http://localhost:${port}/health`);
  console.log(`✅ Calendar auth: http://localhost:${port}/test/calendar/auth`);
  console.log(`✅ Gmail auth: http://localhost:${port}/test/gmail/auth`);
});
