# JARVIS Deployment Guide

## Overview

This guide covers deploying the JARVIS Unified AI Assistant system to production, including server setup, environment configuration, monitoring, and maintenance procedures.

## 🏗️ Architecture Overview

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Load Balancer │    │   JARVIS Server │    │   External APIs │
│    (Optional)   │────│   (Node.js)     │────│  Google/Twilio  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │
                       ┌─────────────────┐
                       │   Database      │
                       │   (Supabase)    │
                       └─────────────────┘
```

## 📋 Prerequisites

### System Requirements
- **Node.js**: Version 18.0.0 or higher
- **Memory**: Minimum 2GB RAM (4GB recommended)
- **Storage**: 10GB available disk space
- **Network**: Stable internet connection with HTTPS support
- **SSL Certificate**: Required for production deployment

### Required Services
- **Supabase**: Database and authentication
- **Twilio**: Voice services and phone number
- **OpenRouter**: AI/LLM services
- **Google Cloud**: Calendar and Gmail APIs
- **Domain**: Custom domain with SSL certificate

## 🚀 Deployment Steps

### 1. Server Setup

#### Option A: Cloud Deployment (Recommended)

**Using Railway/Render/Vercel:**
```bash
# Clone repository
git clone <your-repo-url>
cd YourAiDailyAssistant/twilio-openrouter-voice

# Install dependencies
npm install

# Set environment variables (see Environment Configuration)
# Deploy using platform-specific commands
```

**Using Docker:**
```bash
# Build Docker image
docker build -t jarvis-ai .

# Run container
docker run -p 3001:3001 --env-file .env jarvis-ai
```

#### Option B: VPS Deployment

**Ubuntu/Debian Setup:**
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2 for process management
sudo npm install -g pm2

# Clone and setup application
git clone <your-repo-url>
cd YourAiDailyAssistant/twilio-openrouter-voice
npm install

# Configure environment variables
cp .env.example .env
# Edit .env with production values

# Start with PM2
pm2 start src/server.js --name jarvis-ai
pm2 startup
pm2 save
```

### 2. Environment Configuration

Create a production `.env` file:

```bash
# Server Configuration
NODE_ENV=production
PORT=3001
HOST=0.0.0.0

# Database
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Twilio Configuration
TWILIO_ACCOUNT_SID=your-account-sid
TWILIO_AUTH_TOKEN=your-auth-token
TWILIO_PHONE_NUMBER=+14158552745
WEBHOOK_BASE_URL=https://your-domain.com

# OpenRouter AI
OPENROUTER_API_KEY=your-openrouter-key
OPENROUTER_MODEL=google/gemini-2.5-flash-lite

# Google APIs
GOOGLE_CREDENTIALS_PATH=./credentials-production.json
GOOGLE_TOKEN_PATH=./token-production.json

# Security
JARVIS_API_KEY=your-secure-api-key
CORS_ORIGIN=https://your-domain.com

# Logging
LOG_LEVEL=info
LOG_FILE=./logs/jarvis.log

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

### 3. SSL Certificate Setup

#### Using Let's Encrypt (Recommended)
```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Obtain certificate
sudo certbot --nginx -d your-domain.com

# Auto-renewal
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

#### Using Cloudflare (Alternative)
- Configure Cloudflare for your domain
- Enable SSL/TLS encryption
- Set SSL mode to "Full (strict)"

### 4. Reverse Proxy Setup (Nginx)

Create `/etc/nginx/sites-available/jarvis`:

```nginx
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

    # Security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_req_zone $binary_remote_addr zone=webhook:10m rate=60r/m;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    location /api/ {
        limit_req zone=api burst=20 nodelay;
        proxy_pass http://localhost:3001;
        # ... same proxy settings as above
    }

    location /webhook/ {
        limit_req zone=webhook burst=10 nodelay;
        proxy_pass http://localhost:3001;
        # ... same proxy settings as above
    }
}
```

Enable the site:
```bash
sudo ln -s /etc/nginx/sites-available/jarvis /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 5. Database Setup

#### Supabase Configuration
1. Create a new Supabase project
2. Set up required tables:

```sql
-- User authentication tokens
CREATE TABLE user_auth_tokens (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id TEXT UNIQUE NOT NULL,
    access_token TEXT,
    refresh_token TEXT,
    token_type TEXT,
    expiry_date BIGINT,
    scope TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Bills and subscriptions (if not already exists)
CREATE TABLE IF NOT EXISTS bills (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    amount DECIMAL(10,2),
    due_date DATE,
    category TEXT,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Conversation logs (optional)
CREATE TABLE conversation_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    call_sid TEXT,
    user_id TEXT,
    message_type TEXT, -- 'user' or 'assistant'
    content TEXT,
    tool_calls JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

3. Configure Row Level Security (RLS) policies
4. Set up API keys and service roles

### 6. External Service Configuration

#### Twilio Setup
1. **Phone Number**: Configure your Twilio phone number
2. **Webhooks**: Set webhook URLs:
   - Voice: `https://your-domain.com/webhook/voice`
   - Status: `https://your-domain.com/webhook/status`
3. **TwiML Apps**: Create and configure TwiML applications
4. **Security**: Enable webhook signature validation

#### Google APIs Setup
1. **Credentials**: Upload production Google credentials
2. **OAuth Consent**: Configure OAuth consent screen
3. **Scopes**: Ensure proper API scopes are enabled
4. **Quotas**: Monitor and increase API quotas if needed

#### OpenRouter Configuration
1. **API Key**: Set production API key
2. **Models**: Verify model availability and pricing
3. **Rate Limits**: Configure appropriate rate limits

## 📊 Monitoring & Logging

### Application Monitoring

#### PM2 Monitoring
```bash
# View logs
pm2 logs jarvis-ai

# Monitor resources
pm2 monit

# Restart application
pm2 restart jarvis-ai

# View status
pm2 status
```

#### Log Configuration
Set up log rotation in `/etc/logrotate.d/jarvis`:

```
/path/to/jarvis/logs/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 jarvis jarvis
    postrotate
        pm2 reloadLogs
    endscript
}
```

### Health Monitoring

#### Uptime Monitoring
- Use services like UptimeRobot or Pingdom
- Monitor endpoints:
  - `https://your-domain.com/health`
  - `https://your-domain.com/api/jarvis/health`

#### Performance Monitoring
- Set up APM tools (New Relic, DataDog)
- Monitor response times and error rates
- Track resource usage (CPU, memory, disk)

### Alerting

Set up alerts for:
- Application downtime
- High error rates
- Resource exhaustion
- Failed webhook deliveries
- Authentication failures

## 🔧 Maintenance

### Regular Tasks

#### Daily
- Check application logs for errors
- Monitor system resources
- Verify webhook deliveries

#### Weekly
- Review performance metrics
- Check SSL certificate status
- Update dependencies (if needed)

#### Monthly
- Rotate API keys
- Review and clean logs
- Performance optimization
- Security audit

### Backup Procedures

#### Database Backups
```bash
# Automated Supabase backups are included
# Additional manual backup if needed
pg_dump -h your-db-host -U postgres -d your-db > backup-$(date +%Y%m%d).sql
```

#### Application Backups
```bash
# Backup configuration and credentials
tar -czf jarvis-backup-$(date +%Y%m%d).tar.gz \
    .env \
    credentials-production.json \
    token-production.json \
    logs/
```

### Update Procedures

#### Application Updates
```bash
# Backup current version
cp -r /path/to/jarvis /path/to/jarvis-backup

# Pull updates
git pull origin main

# Install dependencies
npm install

# Run tests
npm test

# Restart application
pm2 restart jarvis-ai

# Verify deployment
curl https://your-domain.com/health
```

## 🚨 Troubleshooting

### Common Issues

#### Application Won't Start
1. Check environment variables
2. Verify database connectivity
3. Check port availability
4. Review application logs

#### Webhook Failures
1. Verify Twilio signature validation
2. Check webhook URL accessibility
3. Review webhook logs
4. Test with Twilio debugger

#### Authentication Issues
1. Check Google credentials
2. Verify OAuth configuration
3. Review token expiration
4. Test API connections

#### Performance Issues
1. Monitor resource usage
2. Check database queries
3. Review rate limiting
4. Optimize caching

### Emergency Procedures

#### Service Outage
1. Check system status
2. Review recent changes
3. Rollback if necessary
4. Notify users if extended

#### Security Incident
1. Isolate affected systems
2. Review access logs
3. Rotate compromised keys
4. Update security measures

## 📈 Scaling

### Horizontal Scaling
- Use load balancers (Nginx, HAProxy)
- Deploy multiple application instances
- Implement session affinity for voice calls

### Vertical Scaling
- Increase server resources
- Optimize database queries
- Implement caching strategies

### Performance Optimization
- Enable gzip compression
- Implement CDN for static assets
- Optimize database indexes
- Use connection pooling

---

**Production Checklist**: ✅ SSL Certificate ✅ Environment Variables ✅ Database Setup ✅ Monitoring ✅ Backups ✅ Security Headers ✅ Rate Limiting

**Support**: For deployment issues, check logs first, then review this guide. Most issues are related to environment configuration or external service connectivity.
