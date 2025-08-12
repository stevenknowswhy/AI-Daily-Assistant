/**
 * MSW Test Server Setup
 * ====================
 * 
 * Sets up Mock Service Worker for Node.js environment (tests)
 */

import { setupServer } from 'msw/node';
import { handlers } from './handlers';

// Setup MSW server with our handlers
export const server = setupServer(...handlers);

// Export handlers for individual test customization
export { handlers };
