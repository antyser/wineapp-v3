import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import { Session, User as SupabaseUser } from '@supabase/supabase-js';

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
      
      console.log('Attempting email/password sign-in...');
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        throw signInError;
      }

      if (data.session) {
        console.log('Email/password sign-in successful.');
        setSession(data.session);
        setUser(convertUser(data.session.user));
        return true;
      } else {
        console.warn('Email/password sign-in did not return a session.');
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

  // Build context value
  const contextValue: AuthContextType = {
    user,
    session,
    isAuthenticated: !!user && !!session,
    isLoading,
    error,
    signOut: handleSignOut,
    signInWithEmailAndPassword: handleEmailPasswordSignIn,
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
