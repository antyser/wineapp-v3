import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Session } from '@supabase/supabase-js';

export const useAuth = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Initialize authentication
  useEffect(() => {
    const initAuth = async () => {
      try {
        setLoading(true);
        
        // Check existing session
        const { data: { session: existingSession }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          throw sessionError;
        }
        
        if (existingSession) {
          setSession(existingSession);
        } else {
          // Sign in anonymously if no session exists
          const { data, error: signInError } = await supabase.auth.signInAnonymously();
          
          if (signInError) {
            throw signInError;
          }
          
          setSession(data.session);
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
    });

    initAuth();

    // Cleanup subscription
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Function to sign in anonymously
  const signInAnonymously = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { data, error } = await supabase.auth.signInAnonymously();
      
      if (error) {
        throw error;
      }
      
      setSession(data.session);
      return data.session;
    } catch (err) {
      console.error('Anonymous sign-in error:', err);
      setError(err instanceof Error ? err.message : 'Failed to sign in anonymously');
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Function to sign out
  const signOut = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        throw error;
      }
      
      setSession(null);
    } catch (err) {
      console.error('Sign-out error:', err);
      setError(err instanceof Error ? err.message : 'Failed to sign out');
    } finally {
      setLoading(false);
    }
  };

  return {
    session,
    user: session?.user ?? null,
    loading,
    error,
    signInAnonymously,
    signOut,
    isAuthenticated: !!session,
  };
}; 