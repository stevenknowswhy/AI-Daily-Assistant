# JARVIS Security Guide

## Overview

This document outlines the comprehensive security measures implemented in the JARVIS Unified AI Assistant system to protect both phone and web interfaces.

## Security Architecture

### 1. Authentication & Authorization

#### Google OAuth 2.0 Integration
- **Unified Authentication**: Single OAuth flow for both Calendar and Gmail access
- **Secure Token Storage**: Encrypted token storage in Supabase database
- **Automatic Token Refresh**: Prevents authentication expiration
- **Scope Management**: Minimal required permissions

```javascript
// Scopes used for Google services
const scopes = [
  'https://www.googleapis.com/auth/calendar.readonly',
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.modify',
  'https://www.googleapis.com/auth/gmail.compose'
];
```

#### API Key Management
- **Environment Variables**: All sensitive keys stored in environment variables
- **Development Mode**: Relaxed validation for development environments
- **Production Security**: Strict API key validation in production

### 2. Request Validation & Security

#### Twilio Webhook Security
- **Signature Validation**: All webhook requests validated using Twilio signature
- **Request Origin Verification**: Ensures requests come from Twilio servers
- **Replay Attack Prevention**: Timestamp validation prevents replay attacks

```javascript
// Twilio signature validation
const isValid = twilio.validateRequest(
  authToken,
  twilioSignature,
  url,
  req.body
);
```

#### Input Sanitization
- **XSS Prevention**: Removes script tags and dangerous content
- **Injection Protection**: Sanitizes SQL injection attempts
- **Content Length Limits**: Prevents oversized requests (10MB max)

### 3. Rate Limiting

#### Endpoint-Specific Limits
- **Webhook Endpoints**: 60 requests per minute
- **API Endpoints**: 200 requests per 15 minutes
- **Authentication**: 10 attempts per 15 minutes

#### IP-Based Protection
- **Automatic Blocking**: Temporary IP blocking for excessive requests
- **Graceful Degradation**: User-friendly error messages
- **Logging**: All rate limit violations logged

### 4. Security Headers

#### Content Security Policy (CSP)
```javascript
contentSecurityPolicy: {
  directives: {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'", "'unsafe-inline'", "https://sdk.twilio.com"],
    styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
    connectSrc: ["'self'", "https://api.openrouter.ai", "wss://chunderw-vpc-gll.twilio.com"]
  }
}
```

#### Additional Security Headers
- **HSTS**: HTTP Strict Transport Security enabled
- **X-Frame-Options**: Prevents clickjacking attacks
- **X-Content-Type-Options**: Prevents MIME type sniffing
- **Referrer-Policy**: Controls referrer information

### 5. CORS Configuration

#### Origin Validation
- **Whitelist Approach**: Only allowed origins can access the API
- **Development Support**: Flexible origins in development mode
- **Credential Support**: Secure cookie and authentication header handling

```javascript
const allowedOrigins = [
  'http://localhost:3001',
  'http://localhost:3000',
  'https://your-domain.com'
];
```

## Data Protection

### 1. Sensitive Data Handling

#### Token Security
- **Database Encryption**: Tokens encrypted at rest in Supabase
- **Memory Protection**: Tokens cleared from memory after use
- **Transmission Security**: HTTPS enforced for all communications

#### Logging Security
- **No Sensitive Data**: API keys and tokens never logged
- **Truncated Information**: Only partial data logged for debugging
- **Structured Logging**: Consistent, searchable log format

### 2. User Data Privacy

#### Data Minimization
- **Required Scopes Only**: Minimal Google API permissions requested
- **Temporary Storage**: Conversation data cached with TTL
- **User Isolation**: Each user's data completely isolated

#### Data Retention
- **Conversation Cache**: 30-minute TTL for active conversations
- **Token Storage**: Secure long-term storage with refresh capability
- **Log Retention**: Configurable log retention policies

## Network Security

### 1. Transport Layer Security

#### HTTPS Enforcement
- **Production Requirement**: HTTPS mandatory in production
- **Certificate Validation**: Proper SSL/TLS certificate validation
- **Secure Cookies**: All cookies marked as secure and httpOnly

#### WebSocket Security
- **Twilio Voice SDK**: Secure WebSocket connections for voice
- **Origin Validation**: WebSocket connections validated
- **Encryption**: All voice data encrypted in transit

### 2. API Security

#### Request Authentication
- **Multiple Methods**: API keys, OAuth tokens, Twilio signatures
- **Context-Aware**: Different authentication for different endpoints
- **Graceful Failures**: Secure error messages without information leakage

#### Response Security
- **Error Handling**: No sensitive information in error responses
- **Data Filtering**: Only necessary data returned in responses
- **Status Codes**: Appropriate HTTP status codes for security events

## Monitoring & Incident Response

### 1. Security Monitoring

#### Real-Time Alerts
- **Failed Authentication**: Multiple failed login attempts
- **Rate Limit Violations**: Excessive request patterns
- **Suspicious Activity**: Unusual access patterns

#### Audit Logging
- **Authentication Events**: All login/logout events logged
- **API Access**: All API calls logged with user context
- **Security Events**: Failed validations and blocked requests

### 2. Incident Response

#### Automated Responses
- **Rate Limiting**: Automatic temporary blocking
- **Token Revocation**: Automatic token invalidation on suspicious activity
- **Service Degradation**: Graceful service reduction under attack

#### Manual Procedures
- **Security Team Notification**: Automated alerts for security events
- **Incident Documentation**: Structured incident response procedures
- **Recovery Procedures**: Step-by-step recovery from security incidents

## Development Security

### 1. Secure Development Practices

#### Environment Separation
- **Development Mode**: Relaxed security for development
- **Staging Environment**: Production-like security testing
- **Production Hardening**: Maximum security in production

#### Code Security
- **Dependency Scanning**: Regular security updates for dependencies
- **Static Analysis**: Code security analysis in CI/CD
- **Secret Management**: No hardcoded secrets in code

### 2. Testing Security

#### Security Testing
- **Penetration Testing**: Regular security assessments
- **Vulnerability Scanning**: Automated vulnerability detection
- **Authentication Testing**: Comprehensive auth flow testing

#### Compliance Testing
- **OWASP Guidelines**: Following OWASP security guidelines
- **Industry Standards**: Compliance with relevant security standards
- **Regular Audits**: Periodic security audits and reviews

## Configuration Security

### 1. Environment Variables

#### Required Security Variables
```bash
# Authentication
GOOGLE_CREDENTIALS_PATH=../credentials-desktop.json
GOOGLE_TOKEN_PATH=../token.json

# API Keys
OPENROUTER_API_KEY=your_openrouter_key
TWILIO_AUTH_TOKEN=your_twilio_token
SUPABASE_SERVICE_ROLE_KEY=your_supabase_key

# Security Settings
JARVIS_API_KEY=your_api_key  # For web interface
NODE_ENV=production
CORS_ORIGIN=https://your-domain.com
```

#### Security Best Practices
- **No Default Values**: All security-critical values must be explicitly set
- **Environment Validation**: Startup validation of all required variables
- **Rotation Policy**: Regular rotation of API keys and tokens

### 2. Production Deployment

#### Security Checklist
- [ ] HTTPS enabled with valid certificates
- [ ] All environment variables properly set
- [ ] Rate limiting configured appropriately
- [ ] CORS origins restricted to production domains
- [ ] Security headers properly configured
- [ ] Logging configured for security monitoring
- [ ] Backup and recovery procedures tested

#### Monitoring Setup
- [ ] Security event alerting configured
- [ ] Performance monitoring enabled
- [ ] Error tracking and reporting setup
- [ ] Regular security scans scheduled

## Security Incident Procedures

### 1. Detection
- Monitor logs for suspicious patterns
- Set up automated alerts for security events
- Regular security assessments and penetration testing

### 2. Response
- Immediate containment of security threats
- Notification of relevant stakeholders
- Documentation of incident details and response actions

### 3. Recovery
- Secure system restoration procedures
- Post-incident security improvements
- Lessons learned documentation and process updates

This security guide ensures the JARVIS system maintains the highest security standards while providing seamless functionality across phone and web interfaces.
