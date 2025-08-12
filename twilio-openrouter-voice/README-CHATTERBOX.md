# 🤖 Chatterbox - Unified AI Assistant

A sophisticated AI assistant system that provides seamless voice and web interactions for managing your calendar, emails, and bills. Chatterbox combines the power of Twilio voice services, OpenRouter AI, and modern web technologies to create an intelligent personal assistant.

## ✨ Features

### 🎯 **Unified Experience**
- **📞 Phone Interface**: Call Chatterbox directly at `+1 (415) 855-2745`
- **🌐 Web Interface**: Modern, responsive dashboard with voice capabilities
- **🔄 Consistent Functionality**: Identical features across both interfaces

### 🧠 **AI-Powered Intelligence**
- **Natural Conversations**: Talk to Chatterbox like a human assistant
- **Context Awareness**: Remembers conversation history and context
- **Tool Calling**: Automatically executes calendar, email, and bill operations
- **AI Assistant Personality**: Sophisticated, witty, and helpful responses

### 📅 **Calendar Management**
- View today's schedule and upcoming events
- Create new meetings and appointments
- Check availability and manage conflicts
- Natural language scheduling ("Schedule a meeting with John tomorrow at 2 PM")

### 📧 **Email Integration**
- Check recent emails and unread count
- Search emails by sender or subject
- Get intelligent email summaries
- Gmail integration with OAuth security

### 💰 **Bill Tracking**
- Track upcoming bills and due dates
- Monitor subscriptions and recurring payments
- Payment reminders and notifications
- Comprehensive financial overview

### 🎨 **Modern Web Interface**
- **Mobile-First Design**: Responsive across all devices
- **Glassmorphism UI**: Beautiful, modern interface with blur effects
- **Real-Time Dashboard**: Live updates for calendar, email, and bills
- **Voice Integration**: Browser-based voice interaction with Twilio SDK

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Phone Call    │    │  Web Interface  │    │   JARVIS        │
│  (+1415855...)  │────│   (Browser)     │────│  Unified API    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                                        │
                    ┌───────────────────────────────────┼───────────────────────────────────┐
                    ▼                                   ▼                                   ▼
          ┌─────────────────┐              ┌─────────────────┐              ┌─────────────────┐
          │ Google Services │              │   OpenRouter    │              │   Supabase      │
          │ Calendar/Gmail  │              │   AI Models     │              │   Database      │
          └─────────────────┘              └─────────────────┘              └─────────────────┘
```

## 🚀 Quick Start

### 1. Installation
```bash
# Clone the repository
git clone <your-repo-url>
cd YourAiDailyAssistant/twilio-openrouter-voice

# Install dependencies
npm install
```

### 2. Environment Setup
```bash
# Copy environment template
cp .env.example .env

# Edit .env with your configuration
# Required: TWILIO_*, OPENROUTER_*, SUPABASE_*, GOOGLE_*
```

### 3. Start the Server
```bash
# Development mode
npm run dev

# Production mode
npm start
```

### 4. Access JARVIS
- **Web Interface**: http://localhost:3001
- **Phone Interface**: Call `+1 (415) 855-2745`
- **Health Check**: http://localhost:3001/health

## 📱 Usage Examples

### Phone Interface
```
📞 Call: +1 (415) 855-2745

You: "Hello JARVIS, what's on my calendar today?"
🤖: "Good day! You have 3 events scheduled today. At 10 AM, you have a project meeting..."

You: "What bills are due soon?"
🤖: "I found 2 bills due this week. Your Netflix subscription of $15.99 is due on August 15th..."
```

### Web Interface
```javascript
// Quick Actions
- Click "📅 Today's Schedule" → Get calendar summary
- Click "📧 Recent Emails" → View latest emails
- Click "💰 Upcoming Bills" → See bills due soon
- Click "📋 Daily Briefing" → Comprehensive overview

// Voice Interaction
- Click "Connect" → Enable voice features
- Click 🎤 → Start talking to JARVIS
- Use Ctrl+Space → Quick voice activation
```

## 🛠️ API Endpoints

### Chatterbox Unified API
```bash
# Process natural language requests
POST /api/chatterbox/process
{
  "message": "What's on my calendar today?",
  "conversationContext": [],
  "userId": "user-123"
}

# Get system health
GET /api/chatterbox/health

# Check authentication status
GET /api/chatterbox/auth-status

# Get available capabilities
GET /api/chatterbox/capabilities

# Run tests
POST /api/chatterbox/test
{
  "testType": "calendar|email|bills|briefing|basic",
  "userId": "user-123"
}
```

### Legacy Endpoints
```bash
# Twilio webhooks
POST /webhook/voice
POST /webhook/process-speech

# Service-specific APIs
GET /api/bills
GET /api/email
POST /twilio/token
```

## 🧪 Testing

### Automated Tests
```bash
# Run all tests
npm test

# Run specific test suites
npm run test:integration
npm run test:cross-platform

# Run with coverage
npm run test:coverage

# Watch mode
npm run test:watch
```

### Manual Testing
```bash
# Test JARVIS unified service
node test-jarvis-unified.js

# Test enhanced LLM integration
node test-enhanced-llm.js

# Legacy integration tests
npm run test:legacy
```

## 📊 Monitoring & Health

### Health Endpoints
- **System Health**: `/health`
- **JARVIS Health**: `/api/jarvis/health`
- **Service Status**: `/api/jarvis/auth-status`

### Logging
```bash
# View logs (PM2)
pm2 logs jarvis-ai

# View logs (Docker)
docker logs <container-id>

# Log levels: error, warn, info, debug
LOG_LEVEL=info
```

### Performance Metrics
- **Response Time**: < 2 seconds for most operations
- **Uptime**: 99.9% availability target
- **Concurrent Users**: Supports multiple simultaneous conversations
- **Rate Limits**: 100 requests/15min per IP (API), 60 requests/min (webhooks)

## 🔒 Security

### Authentication
- **Google OAuth 2.0**: Calendar and Gmail access
- **API Keys**: Secure service authentication
- **Twilio Signatures**: Webhook validation
- **Environment Variables**: Secure credential storage

### Security Features
- **Input Sanitization**: XSS and injection protection
- **Rate Limiting**: DDoS and abuse prevention
- **HTTPS Enforcement**: Encrypted communications
- **CORS Configuration**: Cross-origin request control
- **Security Headers**: Comprehensive security headers

### Data Privacy
- **Encrypted Storage**: All tokens encrypted at rest
- **Minimal Permissions**: Only required API scopes
- **No Data Sharing**: Your data stays private
- **Secure Logging**: No sensitive data in logs

## 📚 Documentation

### User Guides
- **[User Guide](docs/USER_GUIDE.md)**: Complete user manual
- **[Deployment Guide](docs/DEPLOYMENT_GUIDE.md)**: Production deployment
- **[Security Guide](docs/SECURITY_GUIDE.md)**: Security implementation
- **[API Architecture](docs/UNIFIED_API_ARCHITECTURE.md)**: Technical architecture

### Development
- **[Contributing](CONTRIBUTING.md)**: Development guidelines
- **[Changelog](CHANGELOG.md)**: Version history
- **[License](LICENSE)**: MIT License

## 🚀 Deployment

### Development
```bash
npm run dev
# Server: http://localhost:3001
# Hot reload enabled
```

### Production
```bash
# Using PM2
pm2 start src/server.js --name jarvis-ai

# Using Docker
docker build -t jarvis-ai .
docker run -p 3001:3001 --env-file .env jarvis-ai

# Cloud deployment (Railway, Render, Vercel)
# See deployment guide for detailed instructions
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Twilio**: Voice services and telephony infrastructure
- **OpenRouter**: AI model access and LLM services
- **Google**: Calendar and Gmail API integration
- **Supabase**: Database and authentication services
- **Open Source Community**: Various libraries and tools

## 📞 Support

- **Documentation**: Check the [docs](docs/) directory
- **Issues**: Open a GitHub issue
- **Health Check**: Visit `/health` endpoint
- **System Status**: Check `/api/jarvis/health`

---

**JARVIS** - *"Good day. I'm JARVIS, your AI assistant. How may I be of service?"*

**Version**: 1.0.0 | **Last Updated**: August 2025 | **Status**: Production Ready ✅
