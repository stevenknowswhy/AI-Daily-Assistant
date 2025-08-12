import '@testing-library/jest-dom';
import { beforeAll, afterEach, afterAll, beforeEach, vi } from 'vitest';
import { server } from './src/__tests__/mocks/server';

// Make vitest globals available
global.beforeEach = beforeEach;
global.vi = vi;

// MSW Setup
beforeAll(() => {
  // Start the MSW server before all tests
  server.listen({ onUnhandledRequest: 'warn' });
});

afterEach(() => {
  // Reset handlers after each test to ensure test isolation
  server.resetHandlers();
});

afterAll(() => {
  // Clean up after all tests are done
  server.close();
});

