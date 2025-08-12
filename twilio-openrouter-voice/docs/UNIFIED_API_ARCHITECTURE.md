# JARVIS Unified API Architecture

## Overview

The JARVIS Unified API Architecture provides a single, consistent interface that serves both phone and web interactions. This architecture consolidates calendar, email, and bill management functionality through a sophisticated LLM-powered service layer.

## Architecture Diagram

```
┌─────────────────┐    ┌─────────────────┐
│   Phone Call    │    │  Web Interface  │
│  (+14158552745) │    │   (Browser)     │
└─────────┬───────┘    └─────────┬───────┘
          │                      │
          ▼                      ▼
┌─────────────────┐    ┌─────────────────┐
│ Twilio Webhook  │    │   REST API      │
│   /webhook/*    │    │  /api/jarvis/*  │
└─────────┬───────┘    └─────────┬───────┘
          │                      │
          └──────────┬───────────┘
                     ▼
          ┌─────────────────────┐
          │ JARVIS Unified      │
          │     Service         │
          └─────────┬───────────┘
                    │
    ┌───────────────┼───────────────┐
    ▼               ▼               ▼
┌─────────┐  ┌─────────────┐  ┌─────────────┐
│Calendar │  │    Email    │  │    Bills    │
│Service  │  │   Service   │  │   Service   │
└─────────┘  └─────────────┘  └─────────────┘
    │               │               │
    ▼               ▼               ▼
┌─────────┐  ┌─────────────┐  ┌─────────────┐
│Google   │  │   Gmail     │  │  Supabase   │
│Calendar │  │    API      │  │  Database   │
└─────────┘  └─────────────┘  └─────────────┘
```

## Core Components

### 1. JARVIS Unified Service
**Location**: `src/services/jarvis-unified.js`
**Purpose**: Central orchestration layer that provides unified access to all functionality

**Key Methods**:
- `processRequest(message, context, callSid, userId)` - Main entry point for all requests
- `getHealthStatus()` - System health monitoring
- `checkAuthentication()` - Authentication status verification
- `initialize()` - Service initialization and validation

### 2. Enhanced LLM Integration
**Features**:
- Comprehensive tool calling with 5 available tools
- Natural language processing for complex operations
- JARVIS personality preservation
- Context-aware conversations

**Available Tools**:
1. `get_calendar_events` - Retrieve calendar events
2. `create_calendar_event` - Create new events
3. `get_recent_emails` - Access Gmail messages
4. `get_bills_due_soon` - Track upcoming bills
5. `get_daily_briefing` - Generate comprehensive summaries

### 3. Dual Interface Support

#### Phone Interface (Twilio Webhooks)
- **Endpoint**: `/webhook/voice` and `/webhook/process-speech`
- **Protocol**: TwiML voice responses
- **Features**: Real-time voice interaction with JARVIS
- **Authentication**: Twilio signature validation

#### Web Interface (REST API)
- **Base Path**: `/api/jarvis/*`
- **Protocol**: JSON REST API
- **Features**: Programmatic access to all JARVIS functionality
- **Authentication**: API key validation (future enhancement)

## API Endpoints

### Core JARVIS Endpoints

#### POST /api/jarvis/process
Process natural language requests with full tool calling support.

**Request**:
```json
{
  "message": "What's on my calendar today?",
  "conversationContext": [],
  "userId": "+14158552745",
  "callSid": "optional-call-id"
}
```

**Response**:
```json
{
  "success": true,
  "text": "You have 3 events today: Project meeting at 10 AM...",
  "toolCalls": [...],
  "toolResults": [...],
  "model": "google/gemini-2.5-flash-lite",
  "usage": {...}
}
```

#### GET /api/jarvis/health
Get comprehensive system health status.

**Response**:
```json
{
  "status": "healthy|degraded|unhealthy",
  "services": {
    "calendar": {"status": "healthy", "authenticated": true},
    "gmail": {"status": "healthy", "authenticated": true},
    "openrouter": {"status": "healthy", "modelsAvailable": 316},
    "bills": {"status": "healthy", "database": "supabase"}
  },
  "timestamp": "2025-08-08T02:40:10.779Z"
}
```

#### GET /api/jarvis/auth-status
Check authentication status for all services.

**Response**:
```json
{
  "success": true,
  "authentication": {
    "calendar": false,
    "gmail": false,
    "openrouter": true
  },
  "timestamp": "2025-08-08T02:40:10.779Z"
}
```

#### GET /api/jarvis/capabilities
Discover available JARVIS capabilities.

**Response**:
```json
{
  "success": true,
  "capabilities": {
    "calendar": {
      "description": "Google Calendar integration",
      "actions": ["View events", "Create events", "Update events"]
    },
    "email": {
      "description": "Gmail integration", 
      "actions": ["Read emails", "Search emails", "Compose replies"]
    },
    "bills": {
      "description": "Bill management",
      "actions": ["Track bills", "Payment reminders", "Add bills"]
    }
  }
}
```

#### POST /api/jarvis/test
Test JARVIS functionality with predefined scenarios.

**Request**:
```json
{
  "testType": "calendar|email|bills|briefing|basic",
  "userId": "+14158552745"
}
```

### Webhook Endpoints (Phone Interface)

#### POST /webhook/voice
Initial call handling - generates welcome message and starts conversation.

#### POST /webhook/process-speech
Processes speech input and generates AI responses using JARVIS Unified Service.

## Shared Business Logic

### 1. Authentication Management
- **Google OAuth**: Unified across calendar and email services
- **API Keys**: Secure storage and validation
- **Token Refresh**: Automatic token renewal
- **Scope Management**: Appropriate permissions for each service

### 2. Error Handling
- **Graceful Degradation**: System continues operating with reduced functionality
- **User-Friendly Messages**: Clear error communication
- **Logging**: Comprehensive error tracking
- **Fallback Responses**: JARVIS personality maintained during errors

### 3. Data Access Patterns
- **Service Abstraction**: Consistent interface across different data sources
- **Caching**: Efficient data retrieval and storage
- **Rate Limiting**: Respectful API usage
- **Data Transformation**: Consistent data formats across services

## Security Considerations

### 1. Authentication & Authorization
- Google OAuth 2.0 for calendar and email access
- Twilio signature validation for webhook security
- Environment variable protection for API keys
- User-specific data isolation

### 2. Data Protection
- No sensitive data logging
- Secure token storage
- HTTPS enforcement
- Input validation and sanitization

### 3. Rate Limiting
- API endpoint protection
- Service-specific rate limits
- Graceful handling of rate limit exceeded

## Performance Optimization

### 1. Caching Strategy
- Conversation context caching (30-minute TTL)
- Service instance reuse
- Token caching with automatic refresh

### 2. Async Operations
- Non-blocking service calls
- Parallel tool execution where possible
- Efficient error handling

### 3. Resource Management
- Connection pooling for database access
- Memory-efficient conversation storage
- Automatic cleanup of expired sessions

## Monitoring & Observability

### 1. Health Checks
- Real-time service status monitoring
- Authentication status tracking
- Performance metrics collection

### 2. Logging
- Structured logging with Winston
- Request/response tracking
- Error tracking and alerting

### 3. Metrics
- Response time monitoring
- Tool execution success rates
- User interaction patterns

## Future Enhancements

### 1. Authentication Improvements
- Multi-user support with user-specific authentication
- OAuth refresh token management
- Service account integration

### 2. API Enhancements
- GraphQL endpoint for complex queries
- WebSocket support for real-time updates
- API versioning strategy

### 3. Security Enhancements
- API key authentication for web interface
- Role-based access control
- Audit logging

This unified architecture provides a solid foundation for the JARVIS AI assistant, ensuring consistent functionality across phone and web interfaces while maintaining security, performance, and scalability.
