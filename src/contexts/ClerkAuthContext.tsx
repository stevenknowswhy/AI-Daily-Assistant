import React, { createContext, useContext, useEffect, useState } from 'react';
import { ClerkProvider, useAuth as useClerkAuth, useUser } from '@clerk/clerk-react';
import { User } from '../types/auth';

// Clerk publishable key from environment
const CLERK_PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

// Fallback mode if Clerk is not configured
const CLERK_FALLBACK_MODE = !CLERK_PUBLISHABLE_KEY;

if (CLERK_FALLBACK_MODE) {
  console.warn('⚠️ Clerk not configured, using fallback authentication mode');
}

export interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  updateProfile: (updates: Partial<User>) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: React.ReactNode;
}

// Inner provider that uses Clerk hooks
const ClerkAuthProviderInner: React.FC<AuthProviderProps> = ({ children }) => {
  const { isSignedIn, isLoaded, signOut } = useClerkAuth();
  const { user: clerkUser } = useUser();
  const [user, setUser] = useState<User | null>(null);

  // Convert Clerk user to our User type
  useEffect(() => {
    if (isLoaded && isSignedIn && clerkUser) {
      const convertedUser: User = {
        id: clerkUser.id,
        email: clerkUser.primaryEmailAddress?.emailAddress || '',
        name: clerkUser.fullName || clerkUser.firstName || 'User',
        avatar: clerkUser.imageUrl,
        phoneNumber: clerkUser.primaryPhoneNumber?.phoneNumber || undefined,
        preferences: {
          theme: 'system',
          notifications: true,
          callTime: '8:00 AM',
          timezone: 'America/Los_Angeles'
        }
      };
      setUser(convertedUser);
      console.log('✅ Clerk user authenticated:', convertedUser);
    } else if (isLoaded && !isSignedIn) {
      setUser(null);
      console.log('🔓 User not authenticated');
    }
  }, [isLoaded, isSignedIn, clerkUser]);

  const login = async (_email: string, _password: string) => {
    // Clerk handles this through their sign-in component
    throw new Error('Use Clerk SignIn component for email/password login');
  };

  const loginWithGoogle = async () => {
    // Clerk handles this through their sign-in component with Google OAuth
    throw new Error('Use Clerk SignIn component for Google OAuth login');
  };

  const logout = async () => {
    try {
      await signOut();
      setUser(null);
      console.log('✅ Successfully signed out via Clerk');
    } catch (error) {
      console.error('❌ Failed to sign out:', error);
      throw error;
    }
  };

  const register = async (_email: string, _password: string, _name: string) => {
    // Clerk handles this through their sign-up component
    throw new Error('Use Clerk SignUp component for registration');
  };

  const updateProfile = async (updates: Partial<User>) => {
    try {
      if (!clerkUser) {
        throw new Error('No authenticated user');
      }

      // Update Clerk user profile
      if (updates.name && updates.name !== clerkUser.fullName) {
        await clerkUser.update({
          firstName: updates.name.split(' ')[0],
          lastName: updates.name.split(' ').slice(1).join(' ') || undefined
        });
      }

      if (updates.phoneNumber !== undefined) {
        if (updates.phoneNumber === '') {
          // Remove phone number
          const phoneNumbers = clerkUser.phoneNumbers;
          if (phoneNumbers.length > 0) {
            await phoneNumbers[0].destroy();
          }
        } else {
          // Add or update phone number
          await clerkUser.createPhoneNumber({ phoneNumber: updates.phoneNumber });
        }
      }

      // Update local user state
      setUser(prev => prev ? { ...prev, ...updates } : null);
      console.log('✅ Profile updated via Clerk');
    } catch (error) {
      console.error('❌ Failed to update profile:', error);
      throw error;
    }
  };

  const resetPassword = async (_email: string) => {
    // Clerk handles this through their forgot password flow
    throw new Error('Use Clerk forgot password flow');
  };

  const value: AuthContextType = {
    user,
    isLoading: !isLoaded,
    isAuthenticated: !!isSignedIn && !!user,
    login,
    loginWithGoogle,
    logout,
    register,
    updateProfile,
    resetPassword,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Fallback provider when Clerk is not configured
const FallbackAuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check for existing authentication on mount
  useEffect(() => {
    const checkAuthentication = async () => {
      try {
        // Test if Google APIs are actually working instead of relying on auth-status
        // which seems to have detection issues
        const [calendarTest, gmailTest] = await Promise.allSettled([
          fetch('http://localhost:3005/test/calendar/events').then(r => r.json()),
          fetch('http://localhost:3005/test/gmail/messages?maxResults=1').then(r => r.json())
        ]);

        const calendarWorking = calendarTest.status === 'fulfilled' && calendarTest.value.success;
        const gmailWorking = gmailTest.status === 'fulfilled' && gmailTest.value.success;

        if (calendarWorking || gmailWorking) {
          // APIs are working, user is authenticated
          const authenticatedUser: User = {
            id: 'backend-authenticated-user',
            email: 'stephenobamastokes@gmail.com',
            name: 'Stephen',
            // Use Google profile image if available from backend; fallback to default Google avatar
            avatar: 'https://lh3.googleusercontent.com/a/default-user=s96-c',
            preferences: {
              theme: 'system',
              notifications: true,
              callTime: '8:00 AM',
              timezone: 'America/Los_Angeles'
            }
          };

          setUser(authenticatedUser);
          localStorage.setItem('ai-assistant-user', JSON.stringify(authenticatedUser));
          console.log('✅ Found working Google APIs - user is authenticated', {
            calendar: calendarWorking,
            gmail: gmailWorking
          });
        } else {
          // APIs not working, check localStorage for saved user
          const savedUser = localStorage.getItem('ai-assistant-user');
          if (savedUser) {
            try {
              setUser(JSON.parse(savedUser));
              console.log('✅ Restored user from localStorage');
            } catch (error) {
              console.error('Failed to parse saved user:', error);
              localStorage.removeItem('ai-assistant-user');
            }
          } else {
            console.log('🔓 No authentication found');
          }
        }
      } catch (error) {
        console.error('Failed to check authentication:', error);
        // Still check localStorage as fallback
        const savedUser = localStorage.getItem('ai-assistant-user');
        if (savedUser) {
          try {
            setUser(JSON.parse(savedUser));
            console.log('✅ Restored user from localStorage (fallback)');
          } catch (parseError) {
            localStorage.removeItem('ai-assistant-user');
          }
        }
      } finally {
        setIsLoading(false);
      }
    };

    checkAuthentication();
  }, []);

  const loginWithGoogle = async () => {
    try {
      setIsLoading(true);
      // Use the existing backend Google OAuth flow
      const response = await fetch('http://localhost:3005/test/calendar/auth');
      const result = await response.json();

      if (result.success && result.authUrl) {
        console.log('🔗 Redirecting to Google OAuth...');
        window.location.href = result.authUrl;
      } else {
        throw new Error(result.error || 'Failed to get Google OAuth URL');
      }
    } catch (error) {
      console.error('Google OAuth failed:', error);
      throw new Error('Google login failed. Please ensure the backend server is running.');
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      // Call backend sign-out endpoint
      await fetch('http://localhost:3005/test/auth/signout', { method: 'POST' });
      setUser(null);
      localStorage.removeItem('ai-assistant-user');
      console.log('✅ Successfully signed out');
    } catch (error) {
      console.error('❌ Failed to sign out:', error);
      throw error;
    }
  };

  const updateProfile = async (updates: Partial<User>) => {
    if (!user) throw new Error('No authenticated user');

    const updatedUser = { ...user, ...updates };
    setUser(updatedUser);
    localStorage.setItem('ai-assistant-user', JSON.stringify(updatedUser));
  };

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: !!user,
    login: async () => { throw new Error('Use Google OAuth login'); },
    loginWithGoogle,
    logout,
    register: async () => { throw new Error('Use Google OAuth registration'); },
    updateProfile,
    resetPassword: async () => { throw new Error('Not implemented in fallback mode'); },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Main provider that chooses between Clerk and fallback
export const ClerkAuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  if (CLERK_FALLBACK_MODE) {
    return <FallbackAuthProvider>{children}</FallbackAuthProvider>;
  }

  return (
    <ClerkProvider publishableKey={CLERK_PUBLISHABLE_KEY!}>
      <ClerkAuthProviderInner>
        {children}
      </ClerkAuthProviderInner>
    </ClerkProvider>
  );
};

// Export for backward compatibility
export const AuthProvider = ClerkAuthProvider;
