import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { dashboardApi } from '../services/dashboardApi';

export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  phoneNumber?: string;
  preferences?: {
    theme: 'light' | 'dark' | 'system';
    notifications: boolean;
    callTime: string;
    timezone: string;
  };
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
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for existing session on mount
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      setIsLoading(true);

      // Note: OAuth callback handling is now done by ModernGamifiedOnboarding component
      // to prevent conflicts with step persistence during onboarding flow

      // Check if the working backend is authenticated
      const authStatus = await dashboardApi.checkBackendAuthentication();

      // Backend is considered authenticated if it has working OAuth infrastructure
      // Even if individual services need initialization, the voice endpoints work
      const backendWorking = authStatus.calendar !== false || authStatus.gmail !== false;

      if (backendWorking) {
        // Backend has working authentication infrastructure, create user session
        const authenticatedUser: User = {
          id: 'backend-authenticated-user',
          email: 'stephenobamastokes@gmail.com', // From working backend
          name: 'Stephen',
          preferences: {
            theme: 'system',
            notifications: true,
            callTime: '8:00 AM',
            timezone: 'America/Los_Angeles'
          }
        };

        setUser(authenticatedUser);
        localStorage.setItem('ai-assistant-user', JSON.stringify(authenticatedUser));
        console.log('✅ Using backend with working authentication infrastructure', {
          calendar: authStatus.calendar,
          gmail: authStatus.gmail,
          backendWorking
        });
        return;
      }

      // Fallback: Check localStorage for existing session
      const storedUser = localStorage.getItem('ai-assistant-user');
      if (storedUser) {
        setUser(JSON.parse(storedUser));
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      // Fallback to localStorage check
      try {
        const storedUser = localStorage.getItem('ai-assistant-user');
        if (storedUser) {
          setUser(JSON.parse(storedUser));
        }
      } catch (fallbackError) {
        console.error('Fallback auth check failed:', fallbackError);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, _password: string) => {
    try {
      setIsLoading(true);
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Mock user data
      const mockUser: User = {
        id: '1',
        email,
        name: email.split('@')[0],
        preferences: {
          theme: 'system',
          notifications: true,
          callTime: '8:00 AM',
          timezone: 'America/New_York'
        }
      };
      
      setUser(mockUser);
      localStorage.setItem('ai-assistant-user', JSON.stringify(mockUser));
    } catch (error) {
      throw new Error('Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  const loginWithGoogle = async () => {
    try {
      setIsLoading(true);

      // Check if backend is already authenticated
      const authStatus = await dashboardApi.checkBackendAuthentication();

      // Backend is considered authenticated if it has working OAuth infrastructure
      const backendWorking = authStatus.calendar !== false || authStatus.gmail !== false;

      if (backendWorking) {
        // Backend has working authentication infrastructure, use existing session
        const authenticatedUser: User = {
          id: 'backend-authenticated-user',
          email: 'stephenobamastokes@gmail.com',
          name: 'Stephen',
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
        console.log('✅ Using existing backend authentication infrastructure');
        return;
      }

      // Backend not authenticated, use working OAuth flow pattern
      console.log('🔄 Starting Google OAuth flow (same as test interface)...');

      // Get Google OAuth URL from backend (same as test interface)
      const authResult = await dashboardApi.getCalendarAuthUrl();

      if (authResult.success && authResult.authUrl) {
        console.log('🔗 Redirecting to Google OAuth URL...');
        // Redirect to Google OAuth URL (same pattern as test interface)
        window.location.href = authResult.authUrl;
      } else {
        throw new Error(authResult.error || 'Failed to get Google OAuth URL');
      }

    } catch (error) {
      console.error('Google OAuth failed:', error);
      throw new Error('Google login failed. Please ensure the backend server is running on localhost:3005');
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (email: string, _password: string, name: string) => {
    try {
      setIsLoading(true);
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const mockUser: User = {
        id: Date.now().toString(),
        email,
        name,
        preferences: {
          theme: 'system',
          notifications: true,
          callTime: '8:00 AM',
          timezone: 'America/New_York'
        }
      };
      
      setUser(mockUser);
      localStorage.setItem('ai-assistant-user', JSON.stringify(mockUser));
    } catch (error) {
      throw new Error('Registration failed');
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      setIsLoading(true);
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setUser(null);
      localStorage.removeItem('ai-assistant-user');
    } catch (error) {
      console.error('Logout failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const updateProfile = async (updates: Partial<User>) => {
    try {
      if (!user) throw new Error('No user logged in');
      
      const updatedUser = { ...user, ...updates };
      setUser(updatedUser);
      localStorage.setItem('ai-assistant-user', JSON.stringify(updatedUser));
    } catch (error) {
      throw new Error('Profile update failed');
    }
  };

  const resetPassword = async (_email: string) => {
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      // In real app, this would send a reset email
    } catch (error) {
      throw new Error('Password reset failed');
    }
  };

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: !!user,
    login,
    loginWithGoogle,
    logout,
    register,
    updateProfile,
    resetPassword,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
