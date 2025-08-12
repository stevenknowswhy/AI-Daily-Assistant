import React, { useState } from 'react';
import { SignIn, SignUp, useAuth as useClerkAuth } from '@clerk/clerk-react';
import { useAuth } from '../../contexts/ClerkAuthContext';
import { Button } from '../ui/button';
import { Chrome } from 'lucide-react';

interface ClerkAuthPageProps {
  mode?: 'sign-in' | 'sign-up';
}

export const ClerkAuthPage: React.FC<ClerkAuthPageProps> = ({ mode = 'sign-in' }) => {
  const { isAuthenticated, isLoading, loginWithGoogle } = useAuth();
  const [currentMode, setCurrentMode] = useState<'sign-in' | 'sign-up'>(mode);
  const [error, setError] = useState('');

  // Check if Clerk is available
  const CLERK_PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
  const isClerkMode = !!CLERK_PUBLISHABLE_KEY;

  // Return null if already authenticated (parent component will handle routing)
  if (isAuthenticated) {
    return null;
  }

  // Fallback authentication UI when Clerk is not configured
  if (!isClerkMode) {
    const handleGoogleLogin = async () => {
      setError('');
      try {
        await loginWithGoogle();
      } catch (err) {
        setError('Google login failed. Please ensure the backend server is running.');
        console.error('Google login error:', err);
      }
    };

    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-700 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-6">
            <div className="text-center mb-6">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Welcome to AI Daily Assistant
              </h1>
              <p className="text-gray-600 dark:text-gray-300 mt-2">
                Sign in with your Google account to get started
              </p>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/20 border border-red-300 dark:border-red-700 rounded-md">
                <p className="text-red-700 dark:text-red-300 text-sm">{error}</p>
              </div>
            )}

            <Button
              onClick={handleGoogleLogin}
              disabled={isLoading}
              className="w-full"
              size="lg"
            >
              <Chrome className="w-5 h-5 mr-2" />
              {isLoading ? 'Signing in...' : 'Continue with Google'}
            </Button>

            <div className="mt-4 text-center">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                By signing in, you agree to our Terms of Service and Privacy Policy
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Clerk mode - use Clerk components
  if (isClerkMode) {
    const { isSignedIn, isLoaded } = useClerkAuth();

    // Show loading while Clerk is initializing
    if (!isLoaded) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-700 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading Clerk...</p>
          </div>
        </div>
      );
    }

    // Return null if already signed in (parent will handle routing)
    if (isSignedIn) {
      return null;
    }

    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-700 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-4">
            <button
              type="button"
              onClick={() => setCurrentMode(currentMode === 'sign-in' ? 'sign-up' : 'sign-in')}
              className="text-blue-600 hover:text-blue-700 text-sm underline"
            >
              {currentMode === 'sign-in' ? 'Need an account? Sign up' : 'Already have an account? Sign in'}
            </button>
          </div>

          {currentMode === 'sign-in' ? (
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-6">
              <div className="text-center mb-6">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Welcome back
                </h1>
                <p className="text-gray-600 dark:text-gray-300 mt-2">
                  Sign in to your AI Daily Assistant account
                </p>
              </div>
              <SignIn
                appearance={{
                  elements: {
                    rootBox: "w-full",
                    card: "shadow-none border-0 bg-transparent",
                    headerTitle: "hidden",
                    headerSubtitle: "hidden",
                    socialButtonsBlockButton: "w-full bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-slate-600",
                    formButtonPrimary: "w-full bg-blue-600 hover:bg-blue-700 text-white",
                    footerActionLink: "text-blue-600 hover:text-blue-700"
                  }
                }}
                afterSignInUrl="/dashboard"
                signUpUrl="#"
              />
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-6">
              <div className="text-center mb-6">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Create account
                </h1>
                <p className="text-gray-600 dark:text-gray-300 mt-2">
                  Get started with your AI Daily Assistant
                </p>
              </div>
              <SignUp
                appearance={{
                  elements: {
                    rootBox: "w-full",
                    card: "shadow-none border-0 bg-transparent",
                    headerTitle: "hidden",
                    headerSubtitle: "hidden",
                    socialButtonsBlockButton: "w-full bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-slate-600",
                    formButtonPrimary: "w-full bg-blue-600 hover:bg-blue-700 text-white",
                    footerActionLink: "text-blue-600 hover:text-blue-700"
                  }
                }}
                afterSignUpUrl="/dashboard"
                signInUrl="#"
              />
            </div>
          )}
        </div>
      </div>
    );
  }

  // This should never be reached due to the early returns above
  return null;
};
