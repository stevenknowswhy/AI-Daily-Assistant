#!/usr/bin/env node

/**
 * Twilio-OpenRouter Voice Integration Server
 * ==========================================
 *
 * Main server for handling voice calls between Twilio and OpenRouter LLM
 * for the AI Daily Assistant project.
 */

import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import { config } from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

// Import custom modules
import { logger } from './utils/logger.js';
import { twilioRoutes } from './routes/twilio.js';
import { testRoutes } from './routes/test.js';
import { webhookRoutes } from './routes/webhook.js';
import billRoutes from './routes/bills.js';
import taskRoutes from './routes/tasks.js';
import testComprehensiveRoutes from './routes/test-comprehensive.js';
import emailRoutes from './routes/email.js';
import chatterboxRoutes from './routes/chatterbox.js';
import dailyCallPreferencesRoutes from './routes/daily-call-preferences.js';

import { errorHandler } from './middleware/errorHandler.js';
import {
  securityHeaders,
  corsOptions,
  requestLogger,
  validateInput,
  apiRateLimit,
  webhookRateLimit,
  validateTwilioSignature
} from './middleware/security.js';
import { enhancedCSPManager } from './utils/enhanced-csp.js';
import {
  validateVoiceMessage,
  validateAuthRequest,
  validateCalendarQuery,
  validateEmailQuery,
  validateTwilioWebhook,
  validateHealthCheck,
  validateUserProfile,
  validateSensitiveOperation
} from './middleware/input-validation.js';
import { AuthManager } from './services/auth-manager.js';
import { validateConfig } from './utils/config.js';

// Load environment variables
config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class VoiceIntegrationServer {
  constructor() {
    this.app = express();
    this.port = process.env.PORT || 3001;
    this.host = process.env.HOST || 'localhost';
    this.authManager = new AuthManager();

    this.setupMiddleware();
    this.setupRoutes();
    this.setupErrorHandling();
  }

  setupMiddleware() {
    // Request logging
    this.app.use(requestLogger);

    // Enhanced security headers with strict CSP
    if (Array.isArray(securityHeaders)) {
      securityHeaders.forEach(middleware => this.app.use(middleware));
    } else {
      this.app.use(securityHeaders);
    }

    // CORS configuration
    this.app.use(cors(corsOptions));

    // Input validation and sanitization
    this.app.use(validateInput);

    // Rate limiting for API endpoints
    this.app.use('/api', apiRateLimit);

    // Rate limiting for webhooks
    this.app.use('/webhook', webhookRateLimit);

    // Logging middleware
    this.app.use(morgan('combined', {
      stream: {
        write: (message) => logger.info(message.trim())
      }
    }));

    // Body parsing middleware
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Static files with proper MIME types
    this.app.use('/static', express.static(path.join(__dirname, '../public/static'), {
      setHeaders: (res, path) => {
        if (path.endsWith('.js')) {
          res.setHeader('Content-Type', 'application/javascript');
        }
      }
    }));

    // Additional JavaScript files in /js directory
    this.app.use('/js', express.static(path.join(__dirname, '../public/js'), {
      setHeaders: (res, path) => {
        if (path.endsWith('.js')) {
          res.setHeader('Content-Type', 'application/javascript');
        }
      }
    }));

    // Serve specific JavaScript files from public root
    this.app.get('/test.js', (req, res) => {
      res.setHeader('Content-Type', 'application/javascript');
      res.sendFile(path.join(__dirname, '../public/test.js'));
    });
  }

  setupRoutes() {
    // Health check endpoint with validation
    this.app.get('/health', validateHealthCheck, (req, res) => {
      const detailed = req.validatedData?.detailed || false;

      const response = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: '1.0.0'
      };

      if (detailed) {
        response.services = {
          twilio: 'connected',
          openrouter: 'connected',
          supabase: 'connected'
        };
        response.environment = process.env.NODE_ENV || 'development';
        response.uptime = process.uptime();
      }

      res.json(response);
    });

    // CSP violation reporting endpoint
    this.app.post('/api/csp-report', express.json({ type: 'application/csp-report' }),
      enhancedCSPManager.createReportEndpoint()
    );

    // CSP violation statistics endpoint (for monitoring)
    this.app.get('/api/csp-stats', validateInput, (req, res) => {
      try {
        const stats = enhancedCSPManager.getViolationStats();
        res.json({
          success: true,
          data: stats,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          error: 'Failed to retrieve CSP statistics'
        });
      }
    });

    // OAuth callback route (must be at root level to match Google Console redirect URI)
    this.app.get('/auth/google/callback', async (req, res) => {
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

        // Exchange code for tokens using AuthManager
        const result = await this.authManager.exchangeCodeForTokens(code);

        if (result.success) {
          // Check if this is a frontend OAuth request (redirect back to frontend)
          const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173'; // Correct frontend port

          // Debug logging to track frontendUrl value
          logger.info('OAuth callback success - preparing redirect', {
            frontendUrlType: typeof frontendUrl,
            frontendUrlValue: frontendUrl,
            frontendUrlString: String(frontendUrl)
          });

          // Use CSP-compliant redirect with nonce
          const nonce = req.cspNonce || 'fallback-nonce';

          res.send(`
            <html>
              <head>
                <title>Authentication Successful</title>
              </head>
              <body>
                <div class="oauth-success-container">
                  <h2>✅ Google Authentication Successful!</h2>
                  <p>You have successfully authenticated with Google Calendar and Gmail.</p>
                  <p>Redirecting back to your AI Daily Assistant...</p>
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
                  console.log('OAuth callback: Starting redirect to frontend...');
                  // Redirect to frontend with success parameter
                  setTimeout(() => {
                    console.log('OAuth callback: Redirecting to ${frontendUrl}?auth=success');
                    window.location.href = '${frontendUrl}?auth=success';
                  }, 2000);
                </script>
              </body>
            </html>
          `);
        } else {
          throw new Error(result.error);
        }

      } catch (error) {
        logger.error('OAuth callback error:', error);
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

    // Main routes with security and input validation
    this.app.use('/webhook', validateTwilioSignature, validateTwilioWebhook, validateSensitiveOperation, webhookRoutes);
    this.app.use('/twilio', validateSensitiveOperation, twilioRoutes);
    this.app.use('/test', testRoutes);
    this.app.use('/api/bills', validateSensitiveOperation, billRoutes);
    this.app.use('/api/tasks', validateSensitiveOperation, taskRoutes);
    this.app.use('/api/test-comprehensive', testComprehensiveRoutes);
    this.app.use('/api/email', validateEmailQuery, validateSensitiveOperation, emailRoutes);
    this.app.use('/api/chatterbox', validateVoiceMessage, validateSensitiveOperation, chatterboxRoutes);
    this.app.use('/api/daily-call-preferences', validateSensitiveOperation, dailyCallPreferencesRoutes);

    // Briefing preferences API (separate from bills)
    this.app.use('/api', billRoutes); // This includes briefing-preferences routes

    // Serve test page at root with CSP nonce injection
    this.app.get('/', (req, res) => {
      const htmlPath = path.join(__dirname, '../public/test.html');

      fs.readFile(htmlPath, 'utf8', (err, html) => {
        if (err) {
          res.status(500).send('Error loading test page');
          return;
        }

        // Inject nonce into script tag if CSP nonce is available
        let modifiedHtml = html;
        if (req.cspNonce) {
          modifiedHtml = html.replace(
            '<script src="/static/js/test.js"></script>',
            `<script nonce="${req.cspNonce}" src="/static/js/test.js"></script>`
          );
        }

        res.setHeader('Content-Type', 'text/html');
        res.send(modifiedHtml);
      });
    });

    // Serve bill management interface
    this.app.get('/bills', (req, res) => {
      res.sendFile(path.join(__dirname, '../public/bill-management.html'));
    });

    // Serve task management interface
    this.app.get('/tasks', (req, res) => {
      res.sendFile(path.join(__dirname, '../public/task-management.html'));
    });

    // Serve comprehensive test interface
    this.app.get('/test-comprehensive', (req, res) => {
      res.sendFile(path.join(__dirname, '../public/test-comprehensive.html'));
    });

    // Serve email test interface
    this.app.get('/email-test', (req, res) => {
      res.sendFile(path.join(__dirname, '../public/email-test.html'));
    });

    // Serve Gmail authentication interface
    this.app.get('/gmail-auth', (req, res) => {
      res.sendFile(path.join(__dirname, '../public/gmail-auth.html'));
    });

    // Serve Chatterbox test interface
    this.app.get('/chatterbox-test', (req, res) => {
      res.sendFile(path.join(__dirname, '../public/chatterbox-test.html'));
    });

    // Serve unified Chatterbox interface (main interface)
    this.app.get('/chatterbox', (req, res) => {
      res.sendFile(path.join(__dirname, '../public/chatterbox-unified.html'));
    });

    // 404 handler
    this.app.use('*', (req, res) => {
      res.status(404).json({
        error: 'Not Found',
        message: `Route ${req.originalUrl} not found`,
        timestamp: new Date().toISOString()
      });
    });
  }

  setupErrorHandling() {
    this.app.use(errorHandler);
  }

  async start() {
    try {
      // Validate configuration
      await validateConfig();
      logger.info('✅ All configuration validations passed');

      // Initialize authentication manager
      const authResult = await this.authManager.initialize();
      if (authResult.success) {
        logger.info('✅ Authentication manager initialized', {
          authenticated: authResult.authenticated
        });
      } else {
        logger.warn('⚠️ Authentication manager initialization failed', {
          error: authResult.error
        });
      }

      // Start server
      this.server = this.app.listen(this.port, this.host, () => {
        logger.info(`🚀 Twilio-OpenRouter Voice Integration Server started`);
        logger.info(`📞 Server running on http://${this.host}:${this.port}`);
        logger.info(`🧪 Test page available at http://${this.host}:${this.port}`);
        logger.info(`📋 Health check: http://${this.host}:${this.port}/health`);
        logger.info(`🔗 Webhook endpoint: http://${this.host}:${this.port}/webhook`);

        if (process.env.NODE_ENV === 'development') {
          logger.info(`⚠️  Development mode - Remember to set up ngrok for Twilio webhooks`);
          logger.info(`   Run: ngrok http ${this.port}`);
          logger.info(`   Then update WEBHOOK_BASE_URL in .env`);
        }
      });

      // Graceful shutdown
      process.on('SIGTERM', () => this.shutdown());
      process.on('SIGINT', () => this.shutdown());

    } catch (error) {
      logger.error('Failed to start server:', error);
      process.exit(1);
    }
  }

  async shutdown() {
    logger.info('🛑 Shutting down server...');

    if (this.server) {
      this.server.close(() => {
        logger.info('✅ Server shut down gracefully');
        process.exit(0);
      });
    } else {
      process.exit(0);
    }
  }
}

// Start server if this file is run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const server = new VoiceIntegrationServer();
  server.start();
}

export { VoiceIntegrationServer };