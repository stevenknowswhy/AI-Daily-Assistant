# Environment Variables Guide

This document explains the environment variable configuration for the AI Daily Assistant application.

## Overview

The application uses Vite's built-in environment variable system, which provides secure handling of configuration values for both development and production environments.

## Security Model

### Frontend Variables (VITE_ prefix)
- **Exposed to browser**: Variables with `VITE_` prefix are bundled into the client-side code
- **Public only**: Should only contain non-sensitive configuration (API URLs, public keys)
- **Access method**: `import.meta.env.VITE_VARIABLE_NAME`

### Backend Variables (No prefix)
- **Server-side only**: Variables without `VITE_` prefix are only accessible to Node.js backend
- **Sensitive data**: Can contain secrets, private keys, and sensitive configuration
- **Access method**: `process.env.VARIABLE_NAME`

## File Structure

```
.env                    # Main environment file (all variables)
.env.development        # Development-specific overrides
.env.production         # Production-specific overrides
.env.local              # Local overrides (gitignored)
.env.template           # Template for MCP server configuration
```

## Frontend Environment Variables

### API Configuration
```bash
VITE_API_BASE_URL=http://localhost:3005  # Backend API base URL
```

### Authentication (Public Keys Only)
```bash
VITE_CLERK_PUBLISHABLE_KEY=pk_test_...   # Clerk public key
VITE_GOOGLE_CLIENT_ID=...                # Google OAuth client ID
```

### Database (Public Configuration)
```bash
VITE_SUPABASE_URL=https://...            # Supabase project URL
VITE_SUPABASE_ANON_KEY=...               # Supabase anonymous key
```

## Backend Environment Variables

### Google OAuth (Sensitive)
```bash
GOOGLE_CLIENT_SECRET=...                 # Google OAuth client secret
GOOGLE_API_KEY=...                       # Google API key
```

### Database (Sensitive)
```bash
SUPABASE_SERVICE_ROLE_KEY=...            # Supabase service role key
```

### Authentication (Sensitive)
```bash
CLERK_SECRET_KEY=...                     # Clerk secret key
ENCRYPTION_KEY=...                       # Token encryption key
```

### External Services
```bash
RETELL_API_KEY=...                       # RetellAI API key
LIVEKIT_API_SECRET=...                   # LiveKit API secret
```

## Usage in Code

### Frontend Components
```typescript
// ✅ Correct - Using import.meta.env for frontend
const apiUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3005';
const clerkKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

// ❌ Incorrect - Don't use process.env in frontend
const apiUrl = process.env.VITE_API_BASE_URL; // Won't work in browser
```

### Backend Services
```javascript
// ✅ Correct - Using process.env for backend
const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// ❌ Incorrect - Don't expose secrets with VITE_ prefix
const secret = process.env.VITE_GOOGLE_CLIENT_SECRET; // Would expose secret!
```

### Development vs Production
```typescript
// ✅ Correct - Using Vite's built-in environment detection
if (import.meta.env.DEV) {
  // Development-only code
}

if (import.meta.env.PROD) {
  // Production-only code
}

// ❌ Incorrect - Don't use process.env.NODE_ENV in frontend
if (process.env.NODE_ENV === 'development') { // Won't work reliably
```

## TypeScript Support

Environment variables are typed in `src/types/global.d.ts`:

```typescript
declare interface ImportMetaEnv {
  readonly VITE_CLERK_PUBLISHABLE_KEY?: string;
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_GOOGLE_CLIENT_ID?: string;
  readonly DEV: boolean;
  readonly PROD: boolean;
  readonly MODE: string;
}
```

## Best Practices

### ✅ Do
- Use `VITE_` prefix only for non-sensitive frontend configuration
- Access frontend variables via `import.meta.env`
- Use backend variables for all sensitive data
- Validate required environment variables at startup
- Use `.env.local` for local development overrides

### ❌ Don't
- Put secrets in `VITE_` prefixed variables
- Use `process.env` in frontend React components
- Commit `.env.local` files to version control
- Hardcode API keys or secrets in source code

## Migration Notes

This project was migrated from using `dotenv` in frontend code to Vite's native environment variable system:

- **Before**: `process.env.NODE_ENV` in React components
- **After**: `import.meta.env.DEV` / `import.meta.env.PROD`

- **Before**: Manual `dotenv.config()` calls
- **After**: Automatic loading by Vite

- **Before**: `dotenv` in production dependencies
- **After**: `dotenv` in devDependencies (backend only)

## Troubleshooting

### Variable not accessible in frontend
- Ensure it has `VITE_` prefix
- Check it's defined in appropriate `.env` file
- Restart development server after adding new variables

### Variable not accessible in backend
- Ensure it does NOT have `VITE_` prefix
- Check Node.js process has access to the file
- Verify `dotenv` is configured in backend entry point

### TypeScript errors
- Add new variables to `ImportMetaEnv` interface
- Restart TypeScript language server
- Check variable names match exactly (case-sensitive)
