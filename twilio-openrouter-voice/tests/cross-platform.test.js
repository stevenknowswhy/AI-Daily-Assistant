/**
 * Cross-Platform Integration Tests
 * ================================
 * 
 * Tests to ensure identical functionality across phone and web interfaces
 * and consistent user experience between different interaction methods.
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import { JarvisUnifiedService } from '../src/services/jarvis-unified.js';

describe('Cross-Platform Integration Tests', () => {
  let jarvisService;
  let server;

  beforeAll(async () => {
    // Initialize test environment
    process.env.NODE_ENV = 'test';
    
    jarvisService = new JarvisUnifiedService();
    
    // Import server
    const { default: app } = await import('../src/server.js');
    server = app;
  });

  afterAll(async () => {
    if (server && server.close) {
      await server.close();
    }
  });

  describe('Feature Parity Tests', () => {
    const testScenarios = [
      {
        name: 'Calendar Query',
        message: "What's on my calendar today?",
        expectedTools: ['get_calendar_events']
      },
      {
        name: 'Email Check',
        message: "Check my recent emails",
        expectedTools: ['get_recent_emails']
      },
      {
        name: 'Bills Inquiry',
        message: "What bills are due soon?",
        expectedTools: ['get_bills_due_soon']
      },
      {
        name: 'Daily Briefing',
        message: "Give me my daily briefing",
        expectedTools: ['get_daily_briefing']
      },
      {
        name: 'Basic Conversation',
        message: "Hello JARVIS, how are you today?",
        expectedTools: []
      }
    ];

    testScenarios.forEach(scenario => {
      describe(`${scenario.name} Scenario`, () => {
        it('should work identically via web API and phone service', async () => {
          const userId = 'test-user-cross-platform';
          const callSid = 'test-call-cross-platform';

          // Test via Web API
          const webResponse = await request(server)
            .post('/api/jarvis/process')
            .send({
              message: scenario.message,
              conversationContext: [],
              userId: userId
            });

          // Test via Phone Service (direct service call)
          const phoneResponse = await jarvisService.processRequest(
            scenario.message,
            [],
            callSid,
            userId
          );

          // Both should succeed
          expect(webResponse.status).toBe(200);
          expect(webResponse.body.success).toBe(true);
          expect(phoneResponse.success).toBe(true);

          // Both should have responses
          expect(webResponse.body.text).toBeDefined();
          expect(phoneResponse.text).toBeDefined();
          expect(webResponse.body.text.length).toBeGreaterThan(0);
          expect(phoneResponse.text.length).toBeGreaterThan(0);

          // Tool usage should be consistent
          const webToolCalls = webResponse.body.toolCalls || [];
          const phoneToolCalls = phoneResponse.toolCalls || [];

          if (scenario.expectedTools.length > 0) {
            // Should have used expected tools
            expect(webToolCalls.length).toBeGreaterThan(0);
            expect(phoneToolCalls.length).toBeGreaterThan(0);
            
            // Tool names should match expected
            const webToolNames = webToolCalls.map(tc => tc.function?.name).filter(Boolean);
            const phoneToolNames = phoneToolCalls.map(tc => tc.function?.name).filter(Boolean);
            
            scenario.expectedTools.forEach(expectedTool => {
              expect(webToolNames.some(name => name === expectedTool) || 
                     phoneToolNames.some(name => name === expectedTool)).toBe(true);
            });
          }

          // Response quality should be similar (both should be substantial)
          const webWordCount = webResponse.body.text.split(' ').length;
          const phoneWordCount = phoneResponse.text.split(' ').length;
          
          // Both responses should be reasonably substantial
          expect(webWordCount).toBeGreaterThan(3);
          expect(phoneWordCount).toBeGreaterThan(3);
        });

        it('should maintain JARVIS personality consistently', async () => {
          const userId = 'test-user-personality';
          
          // Test personality consistency
          const responses = await Promise.all([
            request(server)
              .post('/api/jarvis/process')
              .send({
                message: scenario.message,
                conversationContext: [],
                userId: userId
              }),
            jarvisService.processRequest(
              scenario.message,
              [],
              'test-call-personality',
              userId
            )
          ]);

          const [webResponse, phoneResponse] = responses;
          
          expect(webResponse.status).toBe(200);
          expect(webResponse.body.success).toBe(true);
          expect(phoneResponse.success).toBe(true);

          const webText = webResponse.body.text.toLowerCase();
          const phoneText = phoneResponse.text.toLowerCase();

          // Check for JARVIS personality indicators
          const personalityIndicators = [
            'good day', 'at your service', 'assist', 'help',
            'certainly', 'of course', 'indeed', 'quite',
            'shall', 'would you like', 'may i'
          ];

          const hasPersonality = (text) => 
            personalityIndicators.some(indicator => text.includes(indicator));

          // At least one response should show JARVIS personality
          expect(hasPersonality(webText) || hasPersonality(phoneText)).toBe(true);
        });
      });
    });
  });

  describe('Response Time Consistency', () => {
    it('should have similar response times across interfaces', async () => {
      const message = "Hello JARVIS";
      const userId = 'test-user-timing';

      // Measure web API response time
      const webStart = Date.now();
      const webResponse = await request(server)
        .post('/api/jarvis/process')
        .send({
          message: message,
          conversationContext: [],
          userId: userId
        });
      const webTime = Date.now() - webStart;

      // Measure phone service response time
      const phoneStart = Date.now();
      const phoneResponse = await jarvisService.processRequest(
        message,
        [],
        'test-call-timing',
        userId
      );
      const phoneTime = Date.now() - phoneStart;

      expect(webResponse.status).toBe(200);
      expect(phoneResponse.success).toBe(true);

      // Response times should be reasonable (under 10 seconds)
      expect(webTime).toBeLessThan(10000);
      expect(phoneTime).toBeLessThan(10000);

      // Times should be in similar range (within 5x of each other)
      const ratio = Math.max(webTime, phoneTime) / Math.min(webTime, phoneTime);
      expect(ratio).toBeLessThan(5);
    });
  });

  describe('Error Handling Consistency', () => {
    it('should handle errors consistently across interfaces', async () => {
      const invalidMessage = ''; // Empty message
      const userId = 'test-user-error';

      // Test web API error handling
      const webResponse = await request(server)
        .post('/api/jarvis/process')
        .send({
          message: invalidMessage,
          conversationContext: [],
          userId: userId
        });

      // Test phone service error handling
      const phoneResponse = await jarvisService.processRequest(
        invalidMessage,
        [],
        'test-call-error',
        userId
      );

      // Web API should return 400 for empty message
      expect(webResponse.status).toBe(400);
      expect(webResponse.body.success).toBe(false);

      // Phone service should handle gracefully
      expect(phoneResponse.success).toBeDefined();
      
      // Both should provide user-friendly error messages
      if (webResponse.body.error) {
        expect(webResponse.body.error).not.toContain('undefined');
        expect(webResponse.body.error).not.toContain('null');
      }
      
      if (!phoneResponse.success && phoneResponse.error) {
        expect(phoneResponse.error).not.toContain('undefined');
        expect(phoneResponse.error).not.toContain('null');
      }
    });
  });

  describe('Context Handling Consistency', () => {
    it('should handle conversation context consistently', async () => {
      const userId = 'test-user-context';
      const context = [
        { role: 'user', content: 'Hello JARVIS' },
        { role: 'assistant', content: 'Good day! How may I assist you?' },
        { role: 'user', content: 'I need help with my schedule' }
      ];
      const message = 'What about tomorrow?';

      // Test with context via web API
      const webResponse = await request(server)
        .post('/api/jarvis/process')
        .send({
          message: message,
          conversationContext: context,
          userId: userId
        });

      // Test with context via phone service
      const phoneResponse = await jarvisService.processRequest(
        message,
        context,
        'test-call-context',
        userId
      );

      expect(webResponse.status).toBe(200);
      expect(webResponse.body.success).toBe(true);
      expect(phoneResponse.success).toBe(true);

      // Both should provide contextual responses
      expect(webResponse.body.text).toBeDefined();
      expect(phoneResponse.text).toBeDefined();

      // Responses should be contextually relevant
      const webText = webResponse.body.text.toLowerCase();
      const phoneText = phoneResponse.text.toLowerCase();

      // Should reference schedule/calendar context
      const contextualTerms = ['schedule', 'calendar', 'tomorrow', 'event', 'meeting'];
      const isContextual = (text) => 
        contextualTerms.some(term => text.includes(term));

      expect(isContextual(webText) || isContextual(phoneText)).toBe(true);
    });
  });

  describe('Tool Execution Consistency', () => {
    it('should execute tools consistently across interfaces', async () => {
      const message = 'What bills are due this week?';
      const userId = 'test-user-tools';

      // Test tool execution via web API
      const webResponse = await request(server)
        .post('/api/jarvis/process')
        .send({
          message: message,
          conversationContext: [],
          userId: userId
        });

      // Test tool execution via phone service
      const phoneResponse = await jarvisService.processRequest(
        message,
        [],
        'test-call-tools',
        userId
      );

      expect(webResponse.status).toBe(200);
      expect(webResponse.body.success).toBe(true);
      expect(phoneResponse.success).toBe(true);

      // Both should have attempted tool calls
      const webToolCalls = webResponse.body.toolCalls || [];
      const phoneToolCalls = phoneResponse.toolCalls || [];

      if (webToolCalls.length > 0 || phoneToolCalls.length > 0) {
        // Should have used bills-related tools
        const allToolCalls = [...webToolCalls, ...phoneToolCalls];
        const toolNames = allToolCalls.map(tc => tc.function?.name).filter(Boolean);
        
        expect(toolNames.some(name => name.includes('bills') || name.includes('bill'))).toBe(true);
      }

      // Tool results should be incorporated into responses
      const webToolResults = webResponse.body.toolResults || [];
      const phoneToolResults = phoneResponse.toolResults || [];

      if (webToolResults.length > 0 || phoneToolResults.length > 0) {
        // Responses should reflect tool execution results
        expect(webResponse.body.text.length).toBeGreaterThan(20);
        expect(phoneResponse.text.length).toBeGreaterThan(20);
      }
    });
  });
});
