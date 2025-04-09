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
  signInAnonymously: () => Promise<boolean>;
  signOut: () => Promise<void>;
  loading: boolean;
  error: string | null;
}

// Create context with default values
const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  isAuthenticated: false,
  signInAnonymously: async () => false,
  signOut: async () => {},
  loading: true,
  error: null,
});

// Helper to convert Supabase user to our User type
const convertUser = (supabaseUser: SupabaseUser): User => {
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check for existing session on app load and handle auth changes
  useEffect(() => {
    // Get initial session
    const initAuth = async () => {
      try {
        setLoading(true);
        
        // Check if we have a session
        const { data: { session: currentSession }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          throw sessionError;
        }
        
        if (currentSession) {
          setSession(currentSession);
          setUser(convertUser(currentSession.user));
        } else {
          // Instead of anonymous login, use a demo account
          await handleDemoLogin();
        }
      } catch (err) {
        console.error('Auth initialization error:', err);
        setError(err instanceof Error ? err.message : 'Unknown authentication error');
      } finally {
        setLoading(false);
      }
    };

    // Subscribe to auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session ? convertUser(session.user) : null);
    });

    initAuth();

    // Cleanup subscription
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Demo login function using email/password
  const handleDemoLogin = async (): Promise<boolean> => {
    try {
      setLoading(true);
      setError(null);
      
      // Use a demo account for testing
      const { data, error } = await supabase.auth.signInWithPassword({
        email: 'demo@wineapp.com',
        password: 'demo123456'
      });
      
      // If account doesn't exist, create it
      if (error && error.message.includes('Invalid login credentials')) {
        console.log('Demo account does not exist, creating it...');
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email: 'demo@wineapp.com',
          password: 'demo123456'
        });
        
        if (signUpError) {
          throw signUpError;
        }
        
        if (signUpData.session) {
          setSession(signUpData.session);
          setUser(convertUser(signUpData.session.user));
          return true;
        }
      } else if (error) {
        throw error;
      } else if (data.session) {
        setSession(data.session);
        setUser(convertUser(data.session.user));
        return true;
      }
      
      return false;
    } catch (err) {
      console.error('Demo login error:', err);
      setError(err instanceof Error ? err.message : 'Failed to login with demo account');
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Replace the signInAnonymously function with the demo login
  const signInAnonymously = async (): Promise<boolean> => {
    return handleDemoLogin();
  };

  // Proper sign out function
  const handleSignOut = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        throw error;
      }
      
      setSession(null);
      setUser(null);
    } catch (err) {
      console.error('Sign out error:', err);
      setError(err instanceof Error ? err.message : 'Failed to sign out');
    } finally {
      setLoading(false);
    }
  };

  // Build context value
  const contextValue: AuthContextType = {
    user,
    session,
    isAuthenticated: !!user && !!session,
    signInAnonymously,
    signOut: handleSignOut,
    loading,
    error,
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
