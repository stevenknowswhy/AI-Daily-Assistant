/**
 * Jest Test Setup
 * ===============
 * 
 * Global test configuration and setup for JARVIS testing suite.
 */

import { config } from 'dotenv';

// Load test environment variables
config({ path: '.env.test' });

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'error'; // Reduce log noise during tests

// Mock external services for testing
global.mockServices = {
  twilio: {
    validateRequest: jest.fn(() => true),
    twiml: {
      VoiceResponse: jest.fn(() => ({
        say: jest.fn(),
        gather: jest.fn(),
        hangup: jest.fn(),
        toString: jest.fn(() => '<Response></Response>')
      }))
    }
  },
  
  openrouter: {
    generateResponse: jest.fn(() => ({
      success: true,
      text: 'Test response from JARVIS',
      model: 'test-model',
      usage: { tokens: 100 }
    }))
  }
};

// Global test utilities
global.testUtils = {
  /**
   * Create a test conversation context
   */
  createTestContext: (messages = []) => {
    return [
      { role: 'system', content: 'You are JARVIS, a sophisticated AI assistant.' },
      ...messages
    ];
  },

  /**
   * Create test user data
   */
  createTestUser: (overrides = {}) => {
    return {
      id: 'test-user-12345',
      phone: '+14158552745',
      name: 'Test User',
      ...overrides
    };
  },

  /**
   * Create test call data
   */
  createTestCall: (overrides = {}) => {
    return {
      CallSid: 'test-call-67890',
      From: '+14158552745',
      To: '+14158552745',
      CallStatus: 'in-progress',
      ...overrides
    };
  },

  /**
   * Wait for async operations
   */
  wait: (ms = 100) => new Promise(resolve => setTimeout(resolve, ms)),

  /**
   * Mock HTTP request/response
   */
  mockRequest: (body = {}, headers = {}) => ({
    body,
    headers: {
      'content-type': 'application/json',
      ...headers
    },
    ip: '127.0.0.1',
    method: 'POST',
    originalUrl: '/test',
    get: (header) => headers[header.toLowerCase()]
  }),

  mockResponse: () => {
    const res = {
      status: jest.fn(() => res),
      json: jest.fn(() => res),
      send: jest.fn(() => res),
      set: jest.fn(() => res),
      type: jest.fn(() => res)
    };
    return res;
  }
};

// Console override for cleaner test output
const originalConsole = global.console;
global.console = {
  ...originalConsole,
  log: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
};

// Restore console for specific tests if needed
global.restoreConsole = () => {
  global.console = originalConsole;
};

// Global test hooks
beforeEach(() => {
  // Clear all mocks before each test
  jest.clearAllMocks();
});

afterEach(() => {
  // Clean up after each test
  jest.restoreAllMocks();
});

// Handle unhandled promise rejections in tests
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Export test configuration
export const testConfig = {
  timeout: 30000,
  retries: 2,
  verbose: true
};
