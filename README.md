# AI Daily Assistant

A comprehensive voice-enabled daily assistant application built with React, Vite, Supabase, and integrated with Google Calendar, Gmail, Twilio voice services, and OpenRouter AI.

## 🚀 Features

### Core Features
- **Voice-Enabled Assistant (JARVIS)**: Natural language voice commands for calendar, email, and bill management
- **Google Calendar Integration**: Full CRUD operations (Create, Read, Update, Delete) for calendar events with both voice commands and UI interface
- **Gmail Integration**: Read emails, compose replies with AI assistance, and manage inbox
- **Bills & Subscriptions Management**: Track and manage recurring bills with CRUD operations
- **Daily Briefings**: AI-powered summaries combining calendar, email, and financial data
- **Gamified Onboarding**: Interactive setup wizard with progress tracking

### Technical Features
- **Real-time Voice Processing**: Twilio + OpenRouter LLM integration
- **Responsive Design**: Mobile-first approach with glassmorphism UI
- **Authentication**: Google OAuth 2.0 with Clerk integration
- **Database**: Supabase PostgreSQL with real-time subscriptions
- **Testing**: Comprehensive unit, integration, and E2E tests with Playwright
- **Accessibility**: WCAG compliant with screen reader support

## 🛠️ Tech Stack

### Frontend
- **React 18** with TypeScript
- **Vite** for build tooling and development
- **Tailwind CSS** for styling with glassmorphism design
- **Radix UI** for accessible component primitives
- **TanStack Query** for data fetching and caching
- **React Hook Form** with Zod validation

### Backend
- **Node.js/Express** server (twilio-openrouter-voice/)
- **Supabase** for database and real-time features
- **Google APIs** for Calendar and Gmail integration
- **Twilio** for voice telephony services
- **OpenRouter** for AI/LLM processing

### Development & Testing
- **TypeScript** for type safety
- **Vitest** for unit testing
- **Playwright** for E2E testing
- **Storybook** for component development
- **ESLint/Prettier** for code quality

## 🏗️ Architecture Highlights

### Calendar CRUD Feature
Our Calendar management follows the **Feature-Colocation Model** for optimal maintainability:

```
src/features/calendar-management/
├── components/
│   ├── CalendarWidgetWithCrud.tsx    # Enhanced widget with CRUD operations
│   ├── CalendarEventModal.tsx        # Create/Edit modal with form validation
│   └── DeleteEventModal.tsx          # Confirmation dialog
├── hooks/
│   └── useCalendarCrud.ts            # TanStack Query mutations for CRUD
├── tests/
│   ├── CalendarWidgetWithCrud.test.tsx
│   └── useCalendarCrud.test.ts
├── schemas.ts                        # Zod validation schemas
└── index.ts                          # Public API exports
```

**Key Features:**
- **Full CRUD Operations**: Create, Read, Update, Delete calendar events
- **Form Validation**: Zod schemas with TypeScript integration
- **Optimistic Updates**: TanStack Query for caching and real-time UI updates
- **Compound Components**: Flexible modal system for reusability
- **Error Handling**: Comprehensive error states and user feedback
- **Accessibility**: WCAG compliant with proper ARIA labels
- **Testing**: 100% test coverage for hooks and components

## 📋 Prerequisites

- Node.js 18+ and npm
- Google Cloud Console account (for Calendar/Gmail APIs)
- Supabase account and project
- Twilio account (for voice features)
- OpenRouter API key (for AI processing)
- Clerk account (for authentication)

## 🔧 Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/stevenknowswhy/AI-Daily-Assistant.git
   cd AI-Daily-Assistant
   ```

2. **Install dependencies**
   ```bash
   # Frontend dependencies
   npm install
   
   # Backend dependencies
   cd twilio-openrouter-voice
   npm install
   cd ..
   ```

3. **Environment Configuration**
   ```bash
   # Copy environment template
   cp .env .env.local
   
   # Edit .env.local with your actual API keys and configuration
   # See docs/ENVIRONMENT_VARIABLES.md for detailed setup
   ```

4. **Database Setup**
   ```bash
   # Run Supabase migrations (see twilio-openrouter-voice/database/)
   # Configure Google OAuth redirect URIs
   # Set up Twilio webhook endpoints
   ```

## 🚀 Development

### Start All Services
```bash
npm run dev:all
```
This starts:
- Frontend: http://localhost:5174
- Backend: http://localhost:3005
- Optional TTS: http://localhost:8000

### Individual Services
```bash
# Frontend only
npm run dev:frontend

# Backend only  
npm run dev:backend

# All services without TTS
npm run dev:all:no-tts
```

### Testing
```bash
# Unit tests
npm test

# E2E tests
npm run test:e2e

# Test with UI
npm run test:ui
npm run test:e2e:ui
```

## 📱 Usage

1. **Onboarding**: Complete the gamified setup wizard
2. **Authentication**: Connect Google Calendar and Gmail accounts
3. **Voice Commands**: Use JARVIS for natural language interactions
4. **Dashboard**: Manage bills, view calendar, and get daily briefings
5. **Settings**: Configure call preferences and notification settings

## 🔐 Security

- OAuth 2.0 for Google services authentication
- Encrypted token storage with Supabase
- Rate limiting and input validation
- CORS and CSP security headers
- Secure environment variable handling

## 📚 Documentation

- [Environment Variables Guide](docs/ENVIRONMENT_VARIABLES.md)
- [Backend API Documentation](twilio-openrouter-voice/docs/)
- [Testing Guide](tests/README.md)
- [Component Stories](src/stories/)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes with tests
4. Run the test suite
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details

## 🚀 Deployment

### Vercel Deployment Guide

This application is optimized for deployment on Vercel with the following configuration:

#### Pre-deployment Checklist

1. **Verify Build Configuration**

   ```bash
   # Test local build
   npm run build

   # Verify build output in dist/
   ls -la dist/
   ```

2. **Environment Variables Audit**
   - Ensure all `VITE_` prefixed variables contain only public configuration
   - Verify sensitive backend variables (without `VITE_` prefix) are ready for Vercel
   - Test all integrations work with current environment setup

3. **Code Quality Check**

   ```bash
   # Run linting
   npm run lint

   # Run all tests
   npm test
   npm run test:e2e
   ```

#### Vercel Configuration

1. **Import Project**
   - Go to [Vercel Dashboard](https://vercel.com/dashboard)
   - Click "New Project"
   - Import from GitHub: `https://github.com/stevenknowswhy/AI-Daily-Assistant.git`

2. **Framework Settings**
   - **Framework Preset**: Vite (should auto-detect)
   - **Build Command**: `npm run build` (should auto-populate)
   - **Output Directory**: `dist` (should auto-populate)
   - **Install Command**: `npm install` (should auto-populate)

   **Important**: Do NOT add a custom `vercel.json` file - Vercel auto-detects Vite projects correctly.

3. **Environment Variables Setup**

   Navigate to Project Settings → Environment Variables and add:

   **Frontend Variables (VITE_ prefix)**

   ```bash
   VITE_API_BASE_URL=https://your-backend-domain.com
   VITE_CLERK_PUBLISHABLE_KEY=pk_live_...
   VITE_GOOGLE_CLIENT_ID=667404557887-...
   VITE_SUPABASE_URL=https://bunpgmxgectzjiqbwvwg.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIs...
   ```

   **Backend Variables (for API routes)**

   ```bash
   GOOGLE_CLIENT_SECRET=GOCSPX-...
   GOOGLE_API_KEY=AIzaSyC...
   SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIs...
   CLERK_SECRET_KEY=sk_live_...
   RETELL_API_KEY=key_...
   OPENROUTER_API_KEY=sk-or-...
   TWILIO_SID=AC...
   TWILIO_AUTH_TOKEN=...
   ENCRYPTION_KEY=your-32-character-key
   ```

   **Set for both Production and Preview environments**

#### OAuth Configuration Updates

After deployment, update OAuth redirect URIs:

1. **Google Cloud Console**
   - Go to [Google Cloud Console](https://console.cloud.google.com)
   - Navigate to APIs & Services → Credentials
   - Edit your OAuth 2.0 Client ID
   - Add authorized redirect URIs:

     ```text
     https://your-app.vercel.app/auth/callback
     https://your-app.vercel.app/auth/google/callback
     ```

2. **Clerk Dashboard**
   - Update allowed origins and redirect URLs
   - Add your Vercel domain to authorized domains

#### Backend Deployment (Separate)

The backend (`twilio-openrouter-voice/`) needs separate deployment:

1. **Option A: Vercel Functions**
   - Create `api/` directory in root
   - Move backend routes to Vercel serverless functions
   - Update `VITE_API_BASE_URL` to use Vercel API routes

2. **Option B: Separate Backend Hosting**
   - Deploy backend to Railway, Render, or Heroku
   - Update `VITE_API_BASE_URL` to backend URL
   - Configure CORS for your frontend domain

#### Post-deployment Verification

1. **Test Core Features**

   ```bash
   # Test authentication flow
   # Verify Google Calendar/Gmail OAuth
   # Test voice commands (if backend deployed)
   # Verify Supabase data operations
   # Test responsive design on mobile
   ```

2. **Monitor Performance**
   - Check Vercel Analytics for Core Web Vitals
   - Monitor Supabase usage and performance
   - Test voice features with real phone calls

3. **Update Documentation**
   - Update README with live demo URL
   - Document any production-specific configuration
   - Update API documentation with live endpoints

#### Troubleshooting

##### Build Failures

- Check TypeScript errors: `npm run build:check`
- Verify all dependencies are in `dependencies` not `devDependencies`
- Ensure environment variables are properly prefixed

##### Function Runtimes Error

The "Function Runtimes must have a valid version" error occurs when Vercel detects invalid runtime settings. Follow these steps:

**Step 1: Locate Configuration Files**

```bash
# Check for problematic files
find . -name "vercel.json" -o -name "now.json" -o -name ".vercel" -type d
```

**Step 2: Remove Legacy Configuration**

- **Delete `vercel.json`** if it contains outdated function runtime settings
- **Delete `now.json`** (legacy Vercel configuration)
- **Remove `.vercel/` directory** if present

**Step 3: Clean Package.json**

Remove any legacy configuration:

```json
// Remove these sections if present:
"now": { "runtime": "now-node@1.0.0" },
"engines": { "now": "^1.0.0" }
```

**Step 4: Force Fresh Deployment**

- Commit and push changes to trigger new deployment
- In Vercel dashboard, click "Redeploy" to use latest commit
- Verify deployment uses correct commit hash (not cached version)

##### OAuth Issues

- Verify redirect URIs match exactly (including https://)
- Check Google Cloud Console quotas and billing
- Ensure OAuth consent screen is published

##### API Connection Issues

- Verify `VITE_API_BASE_URL` points to correct backend
- Check CORS configuration on backend
- Verify all environment variables are set in Vercel

##### Performance Issues

- Review Vite build chunks configuration
- Check bundle size with `npm run build`
- Monitor Vercel function cold starts

### Custom Domain (Optional)

1. **Add Domain in Vercel**
   - Go to Project Settings → Domains
   - Add your custom domain
   - Configure DNS records as instructed

2. **Update OAuth Configurations**
   - Add custom domain to Google OAuth redirect URIs
   - Update Clerk allowed origins
   - Update `VITE_API_BASE_URL` if needed

## 🆘 Support

For issues and questions:

- Check the documentation in `/docs`
- Review test files for usage examples
- Open an issue on GitHub

---

Built with ❤️ for developers who want an intelligent daily assistant
