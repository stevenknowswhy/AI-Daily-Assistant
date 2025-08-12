/**
 * Shared Authentication State Manager
 * ==================================
 * 
 * Manages authentication state across different route modules
 * to ensure consistent authentication behavior
 */

import { logger } from './logger.js';

// Bills authentication state
let billsAuthenticationState = {
  authenticated: false,
  lastAuthTime: null,
  userId: null
};

/**
 * Get Bills authentication state
 */
export function getBillsAuthState() {
  return { ...billsAuthenticationState };
}

/**
 * Set Bills authentication state
 */
export function setBillsAuthState(state) {
  billsAuthenticationState = { ...billsAuthenticationState, ...state };
  logger.info('Bills authentication state updated', {
    authenticated: billsAuthenticationState.authenticated,
    userId: billsAuthenticationState.userId,
    lastAuthTime: billsAuthenticationState.lastAuthTime
  });
}

/**
 * Authenticate Bills/Supabase
 */
export function authenticateBills(userId = 'dashboard-user') {
  setBillsAuthState({
    authenticated: true,
    lastAuthTime: new Date().toISOString(),
    userId: userId
  });
}

/**
 * Sign out of Bills/Supabase
 */
export function signOutBills() {
  setBillsAuthState({
    authenticated: false,
    lastAuthTime: null,
    userId: null
  });
}

/**
 * Check if Bills is authenticated
 */
export function isBillsAuthenticated() {
  return billsAuthenticationState.authenticated;
}

/**
 * Middleware to check Bills authentication
 */
export function checkBillsAuth(req, res, next) {
  if (!billsAuthenticationState.authenticated) {
    return res.status(401).json({
      success: false,
      error: 'Bills/Supabase authentication required. Please authenticate first.',
      authenticated: false
    });
  }
  next();
}
