/**
 * Enhanced Content Security Policy (CSP) Manager
 * ==============================================
 * 
 * Implements strict CSP headers with nonce-based security,
 * removing unsafe-inline directives for maximum security.
 */

import crypto from 'crypto';
import { logger } from './logger.js';
import { securityEventLogger, SecurityEventTypes } from './security-event-logger.js';

/**
 * CSP Directive Types
 */
export const CSPDirectives = {
  DEFAULT_SRC: 'default-src',
  SCRIPT_SRC: 'script-src',
  STYLE_SRC: 'style-src',
  IMG_SRC: 'img-src',
  FONT_SRC: 'font-src',
  CONNECT_SRC: 'connect-src',
  MEDIA_SRC: 'media-src',
  OBJECT_SRC: 'object-src',
  CHILD_SRC: 'child-src',
  FRAME_SRC: 'frame-src',
  WORKER_SRC: 'worker-src',
  MANIFEST_SRC: 'manifest-src',
  BASE_URI: 'base-uri',
  FORM_ACTION: 'form-action',
  FRAME_ANCESTORS: 'frame-ancestors',
  REPORT_URI: 'report-uri',
  REPORT_TO: 'report-to'
};

/**
 * Enhanced CSP Manager class
 */
export class EnhancedCSPManager {
  constructor() {
    this.nonceCache = new Map(); // Cache nonces for requests
    this.violationReports = [];
    this.trustedDomains = new Set([
      'self',
      'https://api.openrouter.ai',
      'https://api.twilio.com',
      'https://supabase.co',
      'https://*.supabase.co',
      'https://fonts.googleapis.com',
      'https://fonts.gstatic.com',
      'https://cdnjs.cloudflare.com'
    ]);
    
    this.basePolicy = {
      [CSPDirectives.DEFAULT_SRC]: ["'self'"],
      [CSPDirectives.SCRIPT_SRC]: ["'self'", "'strict-dynamic'"],
      [CSPDirectives.STYLE_SRC]: ["'self'", 'https://fonts.googleapis.com'],
      [CSPDirectives.IMG_SRC]: ["'self'", 'data:', 'https:'],
      [CSPDirectives.FONT_SRC]: ["'self'", 'https://fonts.gstatic.com'],
      [CSPDirectives.CONNECT_SRC]: ["'self'", 'https://api.openrouter.ai', 'https://api.twilio.com', 'https://*.supabase.co'],
      [CSPDirectives.MEDIA_SRC]: ["'self'"],
      [CSPDirectives.OBJECT_SRC]: ["'none'"],
      [CSPDirectives.CHILD_SRC]: ["'self'"],
      [CSPDirectives.FRAME_SRC]: ["'self'"],
      [CSPDirectives.WORKER_SRC]: ["'self'"],
      [CSPDirectives.MANIFEST_SRC]: ["'self'"],
      [CSPDirectives.BASE_URI]: ["'self'"],
      [CSPDirectives.FORM_ACTION]: ["'self'"],
      [CSPDirectives.FRAME_ANCESTORS]: ["'none'"],
      [CSPDirectives.REPORT_URI]: ['/api/csp-report']
    };
  }

  /**
   * Generate a cryptographically secure nonce
   */
  generateNonce() {
    return crypto.randomBytes(16).toString('base64');
  }

  /**
   * Get or create nonce for request
   */
  getNonceForRequest(req) {
    const requestId = req.id || req.headers['x-request-id'] || crypto.randomUUID();
    
    if (!this.nonceCache.has(requestId)) {
      const nonce = this.generateNonce();
      this.nonceCache.set(requestId, nonce);
      
      // Clean up old nonces after 5 minutes
      setTimeout(() => {
        this.nonceCache.delete(requestId);
      }, 5 * 60 * 1000);
    }
    
    return this.nonceCache.get(requestId);
  }

  /**
   * Build CSP policy string with nonce
   */
  buildCSPPolicy(nonce, options = {}) {
    const policy = { ...this.basePolicy };
    
    // Add nonce to script-src and style-src
    if (nonce) {
      policy[CSPDirectives.SCRIPT_SRC] = [
        ...policy[CSPDirectives.SCRIPT_SRC],
        `'nonce-${nonce}'`
      ];
      policy[CSPDirectives.STYLE_SRC] = [
        ...policy[CSPDirectives.STYLE_SRC],
        `'nonce-${nonce}'`
      ];
    }

    // Add additional trusted domains if specified
    if (options.additionalDomains) {
      for (const [directive, domains] of Object.entries(options.additionalDomains)) {
        if (policy[directive]) {
          policy[directive] = [...policy[directive], ...domains];
        }
      }
    }

    // Build policy string
    const policyString = Object.entries(policy)
      .map(([directive, sources]) => `${directive} ${sources.join(' ')}`)
      .join('; ');

    return policyString;
  }

  /**
   * Middleware to set CSP headers
   */
  middleware(options = {}) {
    return (req, res, next) => {
      try {
        // Generate nonce for this request
        const nonce = this.getNonceForRequest(req);
        
        // Store nonce in request for use in templates
        req.cspNonce = nonce;
        
        // Build CSP policy
        const cspPolicy = this.buildCSPPolicy(nonce, options);
        
        // Set CSP header
        res.setHeader('Content-Security-Policy', cspPolicy);
        
        // Also set report-only header for testing if specified
        if (options.reportOnly) {
          res.setHeader('Content-Security-Policy-Report-Only', cspPolicy);
        }

        // Log CSP policy application
        logger.debug('CSP policy applied', {
          requestId: req.id,
          nonce: nonce.substring(0, 8) + '...',
          policy: cspPolicy.substring(0, 100) + '...'
        });

        next();
      } catch (error) {
        logger.error('Failed to apply CSP policy', {
          error: error.message,
          stack: error.stack
        });
        
        // Apply basic CSP as fallback
        res.setHeader('Content-Security-Policy', "default-src 'self'");
        next();
      }
    };
  }

  /**
   * Handle CSP violation reports
   */
  handleViolationReport(req, res, next) {
    try {
      const report = req.body;
      
      if (report && report['csp-report']) {
        const violation = report['csp-report'];
        
        // Store violation report
        this.violationReports.push({
          timestamp: new Date().toISOString(),
          violation,
          userAgent: req.get('User-Agent'),
          ip: req.ip
        });

        // Log security event
        securityEventLogger.logSecurityEvent(
          SecurityEventTypes.SECURITY_SUSPICIOUS_ACTIVITY,
          'CSP violation detected',
          {
            ip: req.ip,
            userAgent: req.get('User-Agent'),
            endpoint: req.originalUrl,
            method: req.method,
            additionalDetails: {
              violatedDirective: violation['violated-directive'],
              blockedUri: violation['blocked-uri'],
              documentUri: violation['document-uri'],
              originalPolicy: violation['original-policy']
            }
          }
        );

        // Log violation details
        logger.warn('CSP violation reported', {
          violatedDirective: violation['violated-directive'],
          blockedUri: violation['blocked-uri'],
          documentUri: violation['document-uri'],
          sourceFile: violation['source-file'],
          lineNumber: violation['line-number'],
          columnNumber: violation['column-number'],
          userAgent: req.get('User-Agent'),
          ip: req.ip
        });

        // Keep only last 1000 violation reports
        if (this.violationReports.length > 1000) {
          this.violationReports.shift();
        }
      }

      res.status(204).send(); // No content response
    } catch (error) {
      logger.error('Failed to handle CSP violation report', {
        error: error.message,
        stack: error.stack
      });
      res.status(500).json({ error: 'Failed to process violation report' });
    }
  }

  /**
   * Get CSP violation statistics
   */
  getViolationStats() {
    const now = Date.now();
    const last24Hours = this.violationReports.filter(report => 
      now - new Date(report.timestamp).getTime() < 24 * 60 * 60 * 1000
    );

    const violationsByDirective = {};
    const violationsByIP = {};
    const violationsByUserAgent = {};

    for (const report of last24Hours) {
      const directive = report.violation['violated-directive'];
      const ip = report.ip;
      const userAgent = report.userAgent;

      violationsByDirective[directive] = (violationsByDirective[directive] || 0) + 1;
      violationsByIP[ip] = (violationsByIP[ip] || 0) + 1;
      violationsByUserAgent[userAgent] = (violationsByUserAgent[userAgent] || 0) + 1;
    }

    return {
      totalViolations: this.violationReports.length,
      last24Hours: last24Hours.length,
      violationsByDirective,
      violationsByIP,
      violationsByUserAgent,
      mostRecentViolations: this.violationReports.slice(-10)
    };
  }

  /**
   * Add trusted domain
   */
  addTrustedDomain(domain) {
    this.trustedDomains.add(domain);
    logger.info('Added trusted domain to CSP', { domain });
  }

  /**
   * Remove trusted domain
   */
  removeTrustedDomain(domain) {
    this.trustedDomains.delete(domain);
    logger.info('Removed trusted domain from CSP', { domain });
  }

  /**
   * Get current CSP policy for debugging
   */
  getCurrentPolicy(nonce = null) {
    return this.buildCSPPolicy(nonce || this.generateNonce());
  }

  /**
   * Validate CSP policy
   */
  validatePolicy(policy) {
    const issues = [];
    
    // Check for unsafe directives
    if (policy.includes("'unsafe-inline'")) {
      issues.push("Policy contains 'unsafe-inline' directive");
    }
    
    if (policy.includes("'unsafe-eval'")) {
      issues.push("Policy contains 'unsafe-eval' directive");
    }
    
    if (policy.includes('*')) {
      issues.push("Policy contains wildcard (*) directive");
    }
    
    // Check for required directives
    const requiredDirectives = [
      CSPDirectives.DEFAULT_SRC,
      CSPDirectives.SCRIPT_SRC,
      CSPDirectives.STYLE_SRC,
      CSPDirectives.OBJECT_SRC
    ];
    
    for (const directive of requiredDirectives) {
      if (!policy.includes(directive)) {
        issues.push(`Missing required directive: ${directive}`);
      }
    }
    
    return {
      isValid: issues.length === 0,
      issues
    };
  }

  /**
   * Generate CSP report endpoint handler
   */
  createReportEndpoint() {
    return (req, res, next) => {
      this.handleViolationReport(req, res, next);
    };
  }

  /**
   * Clean up old data
   */
  cleanup() {
    const now = Date.now();
    
    // Clean up old nonces
    for (const [requestId, timestamp] of this.nonceCache.entries()) {
      if (now - timestamp > 5 * 60 * 1000) { // 5 minutes
        this.nonceCache.delete(requestId);
      }
    }
    
    // Keep only last 7 days of violation reports
    const sevenDaysAgo = now - (7 * 24 * 60 * 60 * 1000);
    this.violationReports = this.violationReports.filter(report =>
      new Date(report.timestamp).getTime() > sevenDaysAgo
    );
  }
}

// Export singleton instance
export const enhancedCSPManager = new EnhancedCSPManager();

// Schedule cleanup every hour
setInterval(() => {
  enhancedCSPManager.cleanup();
}, 60 * 60 * 1000);
