import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import { Session, User as SupabaseUser } from '@supabase/supabase-js';
import Constants from 'expo-constants';

// Define user type
export interface User {
  id: string;
  email?: string;
  isAnonymous: boolean;
}

// Auth context type
interface AuthContextType {
  user: User | null;
  session: Session | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  signOut: () => Promise<void>;
  signInWithEmailAndPassword: (email: string, password: string) => Promise<boolean>;
  getToken: () => Promise<string | null>;
}

// Create context with default values
const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,
  signOut: async () => {},
  signInWithEmailAndPassword: async () => false,
  getToken: async () => null,
});

// Helper to convert Supabase user to our User type
const convertUser = (supabaseUser: SupabaseUser): User => {
  console.log('Converting Supabase user:', supabaseUser);
  return {
    id: supabaseUser.id,
    email: supabaseUser.email || undefined,
    isAnonymous: supabaseUser.app_metadata?.provider === 'anonymous' || false,
  };
};

// Auth provider component
export const AuthProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Function to handle anonymous sign-in
  const handleAnonymousSignIn = async (): Promise<boolean> => {
    try {
      setIsLoading(true);
      setError(null);

      // Check if already authenticated
      if (user && session) {
        return true;
      }
      
      console.log('Attempting anonymous sign-in...');
      const { data, error: signInError } = await supabase.auth.signInAnonymously();

      if (signInError) {
        throw signInError;
      }

      if (data.session) {
        console.log('Anonymous sign-in successful.');
        setSession(data.session);
        setUser(convertUser(data.session.user));
        return true;
      } else {
        console.warn('Anonymous sign-in did not return a session.');
        return false;
      }
    } catch (err) {
      console.error('Anonymous sign-in error:', err);
      setError(err instanceof Error ? err.message : 'Failed to sign in anonymously');
      // Ensure state reflects failed attempt
      setSession(null);
      setUser(null);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Function to handle email/password sign-in
  const handleEmailPasswordSignIn = async (email: string, password: string): Promise<boolean> => {
    try {
      setIsLoading(true);
      setError(null);
      
      console.log('Attempting email/password sign-in with credentials:', email);
      
      // Get Supabase URL from context to display in error messages
      const supabaseUrlStr = process.env.SUPABASE_URL || 
                            Constants.expoConfig?.extra?.supabaseUrl || 
                            'http://127.0.0.1:54321';
      
      console.log('Using Supabase URL for auth:', supabaseUrlStr);
      
      try {
        // Check credentials against expected test user
        if (email === 'test@example.com' && password === 'password123') {
          console.log('Using test user credentials');
        } else {
          console.warn('Not using test user credentials - sign in may fail');
        }
        
        const { data, error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (signInError) {
          console.error('Sign-in error from Supabase:', signInError);
          throw signInError;
        }

        if (!data || !data.session) {
          console.error('No session returned from sign-in');
          setError('Login successful but no session was created.');
          return false;
        }

        console.log('Email/password sign-in successful. Session expires at:', new Date(data.session.expires_at! * 1000).toISOString());
        console.log('User authenticated:', data.user?.id);
        
        setSession(data.session);
        setUser(convertUser(data.session.user));
        return true;
      } catch (signInErr) {
        console.error('Email/password sign-in error:', signInErr);
        
        // Check if it's a network error
        if (signInErr instanceof Error && 
            (signInErr.message.includes('fetch') || 
             signInErr.message.includes('network') ||
             signInErr.message.includes('Failed to') ||
             signInErr.message.includes('ERR_NAME_NOT_RESOLVED'))) {
          
          // Check for common issues
          if (signInErr.message.includes('kong') || signInErr.message.includes('docker')) {
            setError(`Network error: Cannot connect to Supabase at ${supabaseUrlStr}. 
            This appears to be a Docker internal URL that isn't accessible from your browser. 
            Please update your .env file to use http://127.0.0.1:54321 instead.`);
          } else {
            setError(`Network error: Cannot connect to Supabase at ${supabaseUrlStr}. 
            Please check that the Supabase server is running and the URL is correct.`);
          }
        } else {
          // For auth-specific errors, provide more helpful messages
          const errorMessage = signInErr instanceof Error ? signInErr.message : 'Failed to sign in';
          if (errorMessage.includes('Email not confirmed')) {
            setError('Your email address has not been confirmed. Please check your inbox for a confirmation email.');
          } else if (errorMessage.includes('Invalid login credentials')) {
            setError('Invalid email or password. Please check your credentials.');
          } else {
            setError(errorMessage);
          }
        }
        
        return false;
      }
    } catch (err) {
      console.error('Email/password sign-in error:', err);
      setError(err instanceof Error ? err.message : 'Failed to sign in');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Check for existing session on app load and handle auth changes
  useEffect(() => {
    // Get initial session
    const initAuth = async () => {
      try {
        setIsLoading(true);
        console.log('Auth provider mounted. Checking session...');
        
        // Check if we have a session
        const { data: { session: currentSession }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('Error getting session:', sessionError);
          throw sessionError;
        }
        
        if (currentSession) {
          console.log('Found existing session:', currentSession.user.id);
          setSession(currentSession);
          setUser(convertUser(currentSession.user));
        } else {
          console.log('No active session found. Attempting anonymous sign-in.');
          // If no session, attempt anonymous sign-in
          await handleAnonymousSignIn();
        }
      } catch (err) {
        console.error('Auth initialization error:', err);
        setError(err instanceof Error ? err.message : 'Unknown authentication error');
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();

    // Subscribe to auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
      console.log('Auth state changed:', _event, newSession?.user?.id);
      setSession(newSession);
      setUser(newSession ? convertUser(newSession.user) : null);
      // If user signs out, we might want to sign them back in anonymously
      // or handle it based on app logic (e.g., navigate to login)
      // For now, if signed out completely, re-attempt anonymous login
      if (_event === 'SIGNED_OUT' && !newSession) {
          console.log('User signed out. Re-attempting anonymous sign-in.');
          handleAnonymousSignIn();
      }
    });

    // Cleanup subscription
    return () => {
      console.log('Unsubscribing from auth changes.');
      subscription.unsubscribe();
    };
  }, []);

  // Proper sign out function
  const handleSignOut = async () => {
    try {
      setIsLoading(true);
      setError(null);
      console.log('Signing out...');
      
      const { error: signOutError } = await supabase.auth.signOut();
      
      if (signOutError) {
        throw signOutError;
      }
      
      // Auth state change listener will handle setting user/session to null
      // and triggering anonymous re-login if needed.
      console.log('Sign out successful.');

    } catch (err) {
      console.error('Sign out error:', err);
      setError(err instanceof Error ? err.message : 'Failed to sign out');
    } finally {
      setIsLoading(false);
    }
  };

  // In the AuthProvider, add the getToken method
  const getToken = async (): Promise<string | null> => {
    try {
      if (!session) {
        console.log('No session found, attempting to get a fresh session');
        const { data, error } = await supabase.auth.getSession();
        if (error || !data.session) {
          console.error('Error getting session:', error);
          return null;
        }
        // Update the session
        setSession(data.session);
        return data.session.access_token;
      }
      return session.access_token;
    } catch (err) {
      console.error('Error getting token:', err);
      return null;
    }
  };

  // Build context value
  const contextValue: AuthContextType = {
    user,
    session,
    isAuthenticated: !!user && !!session,
    isLoading,
    error,
    signOut: handleSignOut,
    signInWithEmailAndPassword: handleEmailPasswordSignIn,
    getToken,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook for using auth context
export const useAuth = () => useContext(AuthContext);

export default AuthContext;
