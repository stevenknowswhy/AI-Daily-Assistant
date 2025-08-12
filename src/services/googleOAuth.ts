/**
 * Google OAuth Service for Frontend
 * Handles Google Calendar and Gmail OAuth integration
 */

export interface GoogleOAuthConfig {
  clientId: string;
  redirectUri: string;
  scopes: string[];
}

export interface GoogleOAuthResult {
  success: boolean;
  accessToken?: string;
  refreshToken?: string;
  error?: string;
}

export class GoogleOAuthService {
  // private config: GoogleOAuthConfig;

  constructor(_config: GoogleOAuthConfig) {
    // this.config = _config;
  }

  /**
   * Initiate Google OAuth flow for Calendar access (using working backend endpoints)
   */
  async connectCalendar(): Promise<GoogleOAuthResult> {
    try {
      console.log('🔗 Getting Google Calendar OAuth URL from working backend...');

      // Use the working backend endpoint (same as test interface)
      const response = await fetch('http://localhost:3005/test/calendar/auth', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const result = await response.json();

      if (result.success && result.authUrl) {
        console.log('✅ Got Calendar OAuth URL, redirecting to Google...');
        // Redirect to Google OAuth URL (same pattern as test interface)
        window.location.href = result.authUrl;

        return { success: true };
      } else {
        throw new Error(result.error || 'Failed to get Calendar OAuth URL');
      }
    } catch (error) {
      console.error('Calendar OAuth failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to connect Calendar'
      };
    }
  }

  /**
   * Initiate Google OAuth flow for Gmail access (using working backend endpoints)
   */
  async connectGmail(): Promise<GoogleOAuthResult> {
    try {
      console.log('🔗 Getting Gmail OAuth URL from working backend...');

      // Use the working backend endpoint (same as test interface)
      const response = await fetch('http://localhost:3005/test/gmail/auth', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const result = await response.json();

      if (result.success && result.authUrl) {
        console.log('✅ Got Gmail OAuth URL, redirecting to Google...');
        // Redirect to Google OAuth URL (same pattern as test interface)
        window.location.href = result.authUrl;

        return { success: true };
      } else {
        throw new Error(result.error || 'Failed to get Gmail OAuth URL');
      }
    } catch (error) {
      console.error('Gmail OAuth failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to connect Gmail'
      };
    }
  }




}

// Default configuration (simplified since we use backend OAuth flow)
const getDefaultConfig = (): GoogleOAuthConfig => {
  return {
    clientId: '667404557887-vaicl9m2g308dfagjei800e8cc9pom1n.apps.googleusercontent.com',
    redirectUri: 'http://localhost:3005/auth/google/callback', // Backend handles OAuth callback
    scopes: []
  };
};

const defaultConfig = getDefaultConfig();

// Export singleton instance
export const googleOAuthService = new GoogleOAuthService(defaultConfig);
