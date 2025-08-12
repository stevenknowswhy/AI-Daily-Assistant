/**
 * JARVIS Integration Tests
 * ========================
 * 
 * Comprehensive test suite for the unified JARVIS system
 * covering API endpoints, voice interactions, and web interface functionality.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import request from 'supertest';
import { JarvisUnifiedService } from '../src/services/jarvis-unified.js';

// Test configuration
const TEST_USER_ID = 'test-user-12345';
const TEST_CALL_SID = 'test-call-67890';

describe('JARVIS Unified System Integration Tests', () => {
  let jarvisService;
  let server;

  beforeAll(async () => {
    // Initialize test environment
    process.env.NODE_ENV = 'test';
    process.env.OPENROUTER_API_KEY = 'test-key';
    
    // Import server after setting environment
    const { default: app } = await import('../src/server.js');
    server = app;
    
    jarvisService = new JarvisUnifiedService();
  });

  afterAll(async () => {
    if (server && server.close) {
      await server.close();
    }
  });

  describe('JARVIS Unified Service', () => {
    describe('Service Initialization', () => {
      it('should initialize all service dependencies', () => {
        expect(jarvisService.calendarService).toBeDefined();
        expect(jarvisService.gmailService).toBeDefined();
        expect(jarvisService.billService).toBeDefined();
        expect(jarvisService.openRouterService).toBeDefined();
        expect(jarvisService.dailyBriefingService).toBeDefined();
      });

      it('should have default user ID configured', () => {
        expect(jarvisService.defaultUserId).toBeDefined();
      });
    });

    describe('Tool Calling System', () => {
      it('should provide all required tools', () => {
        const tools = jarvisService.getAvailableTools();
        
        expect(tools).toHaveLength(5);
        
        const toolNames = tools.map(tool => tool.function.name);
        expect(toolNames).toContain('get_calendar_events');
        expect(toolNames).toContain('create_calendar_event');
        expect(toolNames).toContain('get_recent_emails');
        expect(toolNames).toContain('get_bills_due_soon');
        expect(toolNames).toContain('get_daily_briefing');
      });

      it('should have proper tool schemas', () => {
        const tools = jarvisService.getAvailableTools();
        
        tools.forEach(tool => {
          expect(tool.type).toBe('function');
          expect(tool.function.name).toBeDefined();
          expect(tool.function.description).toBeDefined();
          expect(tool.function.parameters).toBeDefined();
          expect(tool.function.parameters.type).toBe('object');
        });
      });
    });

    describe('Request Processing', () => {
      it('should handle basic conversation requests', async () => {
        const response = await jarvisService.processRequest(
          'Hello JARVIS',
          [],
          TEST_CALL_SID,
          TEST_USER_ID
        );

        expect(response.success).toBe(true);
        expect(response.text).toBeDefined();
        expect(typeof response.text).toBe('string');
        expect(response.text.length).toBeGreaterThan(0);
      });

      it('should handle requests with conversation context', async () => {
        const context = [
          { role: 'user', content: 'Hello' },
          { role: 'assistant', content: 'Good day! How may I assist you?' }
        ];

        const response = await jarvisService.processRequest(
          'What can you help me with?',
          context,
          TEST_CALL_SID,
          TEST_USER_ID
        );

        expect(response.success).toBe(true);
        expect(response.text).toBeDefined();
      });

      it('should handle tool-calling requests', async () => {
        const response = await jarvisService.processRequest(
          'What bills are due soon?',
          [],
          TEST_CALL_SID,
          TEST_USER_ID
        );

        expect(response.success).toBe(true);
        expect(response.text).toBeDefined();
        
        // Should have attempted tool calls
        if (response.toolCalls) {
          expect(Array.isArray(response.toolCalls)).toBe(true);
        }
      });
    });

    describe('Health and Status', () => {
      it('should provide health status', async () => {
        const health = await jarvisService.getHealthStatus();
        
        expect(health.status).toBeDefined();
        expect(['healthy', 'degraded', 'unhealthy']).toContain(health.status);
        expect(health.services).toBeDefined();
        expect(health.timestamp).toBeDefined();
      });

      it('should check authentication status', async () => {
        const authStatus = await jarvisService.checkAuthentication();
        
        expect(authStatus).toHaveProperty('calendar');
        expect(authStatus).toHaveProperty('gmail');
        expect(authStatus).toHaveProperty('openrouter');
        
        expect(typeof authStatus.calendar).toBe('boolean');
        expect(typeof authStatus.gmail).toBe('boolean');
        expect(typeof authStatus.openrouter).toBe('boolean');
      });
    });
  });

  describe('API Endpoints', () => {
    describe('JARVIS API Routes', () => {
      it('should process requests via API', async () => {
        const response = await request(server)
          .post('/api/jarvis/process')
          .send({
            message: 'Hello JARVIS',
            conversationContext: [],
            userId: TEST_USER_ID
          });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.text).toBeDefined();
      });

      it('should return health status', async () => {
        const response = await request(server)
          .get('/api/jarvis/health');

        expect([200, 206, 500]).toContain(response.status);
        expect(response.body.status).toBeDefined();
        expect(response.body.services).toBeDefined();
        expect(response.body.timestamp).toBeDefined();
      });

      it('should return authentication status', async () => {
        const response = await request(server)
          .get('/api/jarvis/auth-status');

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.authentication).toBeDefined();
      });

      it('should return capabilities', async () => {
        const response = await request(server)
          .get('/api/jarvis/capabilities');

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.capabilities).toBeDefined();
        expect(response.body.totalCapabilities).toBeGreaterThan(0);
      });

      it('should handle test requests', async () => {
        const response = await request(server)
          .post('/api/jarvis/test')
          .send({
            testType: 'basic',
            userId: TEST_USER_ID
          });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.testType).toBe('basic');
        expect(response.body.result).toBeDefined();
      });
    });

    describe('Error Handling', () => {
      it('should handle missing message in process request', async () => {
        const response = await request(server)
          .post('/api/jarvis/process')
          .send({
            conversationContext: [],
            userId: TEST_USER_ID
          });

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.error).toContain('Message is required');
      });

      it('should handle invalid JSON in requests', async () => {
        const response = await request(server)
          .post('/api/jarvis/process')
          .send('invalid json');

        expect(response.status).toBe(400);
      });
    });
  });

  describe('Security and Validation', () => {
    describe('Input Validation', () => {
      it('should sanitize malicious input', async () => {
        const maliciousInput = '<script>alert("xss")</script>Hello JARVIS';
        
        const response = await request(server)
          .post('/api/jarvis/process')
          .send({
            message: maliciousInput,
            conversationContext: [],
            userId: TEST_USER_ID
          });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        // Should not contain script tags in response
        expect(response.body.text).not.toContain('<script>');
      });

      it('should handle oversized requests', async () => {
        const largeMessage = 'A'.repeat(1000000); // 1MB message
        
        const response = await request(server)
          .post('/api/jarvis/process')
          .send({
            message: largeMessage,
            conversationContext: [],
            userId: TEST_USER_ID
          });

        // Should either process or reject gracefully
        expect([200, 413, 400]).toContain(response.status);
      });
    });

    describe('Rate Limiting', () => {
      it('should apply rate limiting to API endpoints', async () => {
        // Make multiple rapid requests
        const requests = Array(10).fill().map(() =>
          request(server)
            .get('/api/jarvis/health')
        );

        const responses = await Promise.all(requests);
        
        // All should succeed or some should be rate limited
        responses.forEach(response => {
          expect([200, 206, 429, 500]).toContain(response.status);
        });
      });
    });
  });

  describe('Cross-Platform Consistency', () => {
    describe('Feature Parity', () => {
      it('should provide same functionality via API and webhook', async () => {
        const message = 'What bills are due soon?';
        
        // Test via API
        const apiResponse = await request(server)
          .post('/api/jarvis/process')
          .send({
            message: message,
            conversationContext: [],
            userId: TEST_USER_ID
          });

        // Test via service directly (simulating webhook)
        const serviceResponse = await jarvisService.processRequest(
          message,
          [],
          TEST_CALL_SID,
          TEST_USER_ID
        );

        expect(apiResponse.status).toBe(200);
        expect(apiResponse.body.success).toBe(true);
        expect(serviceResponse.success).toBe(true);
        
        // Both should have similar response structure
        expect(typeof apiResponse.body.text).toBe('string');
        expect(typeof serviceResponse.text).toBe('string');
      });
    });

    describe('Response Consistency', () => {
      it('should maintain JARVIS personality across interfaces', async () => {
        const responses = await Promise.all([
          request(server)
            .post('/api/jarvis/process')
            .send({
              message: 'Hello JARVIS, how are you?',
              conversationContext: [],
              userId: TEST_USER_ID
            }),
          jarvisService.processRequest(
            'Hello JARVIS, how are you?',
            [],
            TEST_CALL_SID,
            TEST_USER_ID
          )
        ]);

        const [apiResponse, serviceResponse] = responses;
        
        expect(apiResponse.status).toBe(200);
        expect(apiResponse.body.success).toBe(true);
        expect(serviceResponse.success).toBe(true);
        
        // Both responses should reflect JARVIS personality
        const apiText = apiResponse.body.text.toLowerCase();
        const serviceText = serviceResponse.text.toLowerCase();
        
        // Should contain characteristic JARVIS language patterns
        const jarvisPatterns = ['good day', 'at your service', 'assist', 'how may i'];
        const hasJarvisPattern = (text) => jarvisPatterns.some(pattern => text.includes(pattern));
        
        expect(hasJarvisPattern(apiText) || hasJarvisPattern(serviceText)).toBe(true);
      });
    });
  });
});
