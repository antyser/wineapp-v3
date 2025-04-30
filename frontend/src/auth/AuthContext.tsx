import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import { Session, User as SupabaseUser } from '@supabase/supabase-js';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { makeRedirectUri } from 'expo-auth-session';
import * as QueryParams from 'expo-auth-session/build/QueryParams';

// Ensure compatible AuthSession behavior on web
WebBrowser.maybeCompleteAuthSession();

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
  getToken: () => Promise<string | null>;
  signInWithGoogle: () => Promise<void>;
  signInWithApple: () => Promise<void>;
  signInWithEmailOtp: (email: string) => Promise<void>;
  signInWithPhoneOtp: (phone: string) => Promise<void>;
  verifyEmailOtp: (email: string, token: string) => Promise<boolean>;
  signInAnonymously: () => Promise<boolean>;
}

// Create context with default values
const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,
  signOut: async () => {},
  getToken: async () => null,
  signInWithGoogle: async () => {},
  signInWithApple: async () => {},
  signInWithEmailOtp: async (email: string) => {},
  signInWithPhoneOtp: async (phone: string) => {},
  verifyEmailOtp: async (email: string, token: string) => false,
  signInAnonymously: async () => false,
});

// Helper to convert Supabase user to our User type
const convertUser = (supabaseUser: SupabaseUser): User => {
  console.log('Converting Supabase user:', supabaseUser);
  // Log the is_anonymous field directly from Supabase user object
  console.log('Supabase user is_anonymous:', supabaseUser.is_anonymous);
  
  return {
    id: supabaseUser.id,
    email: supabaseUser.email || undefined,
    isAnonymous: supabaseUser.is_anonymous ?? false,
  };
};

// Auth provider component
export const AuthProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // --- Helper function to create session from URL ---
  const createSessionFromUrl = async (url: string): Promise<boolean> => {
    try {
      console.log('Attempting to create session from URL:', url);
      const { params, errorCode } = QueryParams.getQueryParams(url);

      if (errorCode) {
        throw new Error(`Error extracting params from URL: ${errorCode}`);
      }

      // Ensure tokens are strings
      const access_token = typeof params.access_token === 'string' ? params.access_token : undefined;
      const refresh_token = typeof params.refresh_token === 'string' ? params.refresh_token : undefined;

      if (!access_token || !refresh_token) {
        // Check if it's an error URL from the provider
        const errorParam = params.error;
        const errorDescParam = params.error_description;

        if (errorParam) {
            // Ensure error parts are strings
            const errorString = Array.isArray(errorParam) ? errorParam.join(', ') : errorParam;
            let descriptionString = 'No description';
            if (errorDescParam) {
                descriptionString = Array.isArray(errorDescParam) ? errorDescParam.join(', ') : errorDescParam;
            }
           throw new Error(`OAuth error from provider: ${errorString} - ${descriptionString}`);
        }
        console.warn('URL does not contain required tokens:', params);
        // Don't throw here, maybe it's not an auth URL
        return false;
      }

      console.log('Extracted tokens. Setting session...');
      const { data, error: sessionError } = await supabase.auth.setSession({
        access_token,
        refresh_token,
      });

      if (sessionError) {
        console.error('Error setting session from URL tokens:', sessionError);
        throw sessionError;
      }

      console.log('Session successfully set from URL:', data.session?.user.id);
      // The onAuthStateChange listener should now pick up the new session
      setSession(data.session);
      setUser(data.session ? convertUser(data.session.user) : null);
      return true;
    } catch (err) {
      console.error('Failed to create session from URL:', err);
      setError(err instanceof Error ? err.message : 'Failed to handle auth redirect');
      return false;
    }
  };

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

 

  // --- Refactored Google Sign-In ---
  const signInWithGoogle = async (): Promise<void> => { // Return void, handle errors internally
    try {
      setIsLoading(true);
      setError(null);
      console.log('Attempting Google sign-in (React Native pattern)...');

      const redirectTo = makeRedirectUri();

      console.log(`Using redirectTo for ${Platform.OS}: ${redirectTo}`);

      // 1. Get the Auth URL from Supabase
      const { data, error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo,
          skipBrowserRedirect: true,
        },
      });

      if (oauthError) {
        console.error('Supabase signInWithOAuth error:', oauthError);
        throw oauthError;
      }

      if (!data?.url) {
        throw new Error('No URL returned from signInWithOAuth');
      }

      // 2. Open the URL using Expo WebBrowser
      console.log('Opening auth session with URL:', data.url);
      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo, {
         // preferEphemeralSession: true, // Optional: For iOS, attempts private session
      });

      console.log('WebBrowser result:', result);

      // 3. Handle the result
      if (result.type === 'success') {
        // App was foregrounded with the redirect URL containing tokens
        await createSessionFromUrl(result.url);
      } else if (result.type === 'cancel' || result.type === 'dismiss') {
         console.log('OAuth flow cancelled or dismissed by user.');
      } else {
         console.warn('WebBrowser returned unhandled result type:', result.type);
      }

    } catch (err) {
      console.error('Google sign-in error:', err);
      setError(err instanceof Error ? err.message : 'Failed to sign in with Google');
      // Ensure loading is stopped on error
      setIsLoading(false);
    } finally {
      // Consider keeping loading true until onAuthStateChange confirms session?
      // For now, set to false after the flow attempts completion or errors out.
      // The session check in useEffect will handle the final loading state.
      // setIsLoading(false); // Might cause flicker, handled by session check effect instead
    }
  };

  // --- Sign in with Apple ---
  const signInWithApple = async (): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);
      console.log('Attempting Apple sign-in (React Native pattern)...');

      const redirectTo = makeRedirectUri();

      console.log(`Using redirectTo for ${Platform.OS}: ${redirectTo}`);

      // 1. Get the Auth URL from Supabase
      const { data, error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: 'apple', // Changed provider
        options: {
          redirectTo,
          skipBrowserRedirect: true,
        },
      });

      if (oauthError) {
        console.error('Supabase signInWithOAuth (Apple) error:', oauthError);
        throw oauthError;
      }

      if (!data?.url) {
        throw new Error('No URL returned from signInWithOAuth (Apple)');
      }

      // 2. Open the URL using Expo WebBrowser
      console.log('Opening auth session with URL (Apple):', data.url);
      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo, {
        // preferEphemeralSession: true, // Optional for iOS
      });

      console.log('WebBrowser result (Apple):', result);

      // 3. Handle the result (same logic as Google)
      if (result.type === 'success') {
        await createSessionFromUrl(result.url);
      } else if (result.type === 'cancel' || result.type === 'dismiss') {
         console.log('Apple OAuth flow cancelled or dismissed by user.');
      } else {
         console.warn('WebBrowser returned unhandled result type (Apple):', result.type);
      }

    } catch (err) {
      console.error('Apple sign-in error:', err);
      setError(err instanceof Error ? err.message : 'Failed to sign in with Apple');
      setIsLoading(false);
    } finally {
      // Handled by session check effect
    }
  };

  // --- Sign in with Email OTP (Magic Link) ---
  const signInWithEmailOtp = async (email: string): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);
      console.log('Attempting Email OTP (Magic Link) sign-in for:', email);

      // Define redirect URI for the magic link
      const redirectTo = makeRedirectUri();

      console.log(`Using emailRedirectTo for ${Platform.OS}: ${redirectTo}`);

      const { error: otpError } = await supabase.auth.signInWithOtp({
        email: email,
        options: {
          emailRedirectTo: redirectTo,
        },
      });

      if (otpError) {
        console.error('Supabase signInWithOtp (Email) error:', otpError);
        throw otpError;
      }

      console.log('Email OTP (Magic Link) sent successfully to:', email);
      // Inform the user to check their email
      // Session will be set when the user clicks the link and the app handles the deep link

    } catch (err) {
      console.error('Email OTP sign-in error:', err);
      setError(err instanceof Error ? err.message : 'Failed to send email magic link');
    } finally {
      setIsLoading(false); // Link sending is complete
    }
  };

  // --- Sign in with Phone OTP (Send Code) ---
  const signInWithPhoneOtp = async (phone: string): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);
      console.log('Attempting Phone OTP sign-in for:', phone);

      const { error: otpError } = await supabase.auth.signInWithOtp({
        phone: phone, // Use phone number
      });

      if (otpError) {
        console.error('Supabase signInWithOtp (Phone) error:', otpError);
        throw otpError;
      }

      console.log('Phone OTP sent successfully to:', phone);
      // Inform user an SMS was sent. UI should now prompt for the code.

    } catch (err) {
      console.error('Phone OTP sending error:', err);
      setError(err instanceof Error ? err.message : 'Failed to send phone OTP');
    } finally {
      setIsLoading(false); // OTP sending attempt is complete
    }
  };

  // --- Verify Email OTP ---
  const verifyEmailOtp = async (email: string, token: string): Promise<boolean> => {
    try {
      setIsLoading(true);
      setError(null);
      console.log(`Attempting to verify OTP for ${email}...`);

      const { data, error: verifyError } = await supabase.auth.verifyOtp({
        email,
        token,
        type: 'email',
      });

      if (verifyError) {
        console.error('Supabase verifyOtp error:', verifyError);
        throw verifyError;
      }

      // verifyOtp returns session data on success
      if (data.session) {
        console.log('OTP verified successfully, session obtained.');
        setSession(data.session);
        setUser(convertUser(data.session.user));
        setError(null);
        return true; // Indicate success
      } else {
        // This case might happen if the OTP is wrong but doesn't throw an error, or if the session isn't returned for some reason.
        console.warn('verifyOtp succeeded but did not return a session.');
        setError('Invalid or expired OTP code.');
        return false; // Indicate failure
      }
    } catch (err) {
      console.error('Error verifying email OTP:', err);
      setError(err instanceof Error ? err.message : 'Failed to verify OTP');
      // Ensure state reflects failed attempt
      // Don't clear session/user here as they might be valid from a previous login method
      return false; // Indicate failure
    } finally {
      setIsLoading(false);
    }
  };

  // Check for existing session on app load and handle auth changes
  useEffect(() => {
    let isMounted = true; // Prevent state updates on unmounted component

    // --- Handle Deep Linking ---
    // Define the type for the event parameter explicitly
    const handleDeepLink = (event: { url: string }) => {
      if (isMounted) {
        console.log('Deep link received:', event.url);
        createSessionFromUrl(event.url);
      }
    };

    // Get initial URL if app launched via deep link
    Linking.getInitialURL().then(url => {
      if (url && isMounted) {
        console.log('App launched with initial URL:', url);
        createSessionFromUrl(url);
      }
    });

    // Listen for subsequent deep links
    const linkingSubscription = Linking.addEventListener('url', handleDeepLink);
    // --- End Deep Linking Handling ---


    // Get initial session
    const initAuth = async () => {
       try {
        // No change needed here, it checks existing persisted session first
        setIsLoading(true); // Start loading indicator
        console.log('Auth provider mounted. Checking existing session...');
        const { data: { session: currentSession }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) throw sessionError;

        if (currentSession && isMounted) {
          console.log('Found existing persisted session:', currentSession.user.id);
          setSession(currentSession);
          setUser(convertUser(currentSession.user));
        } else if (isMounted) {
          console.log('No active session found. Will wait for deep link or manual login.');
          // We DON'T attempt anonymous sign-in here anymore if deep linking might provide a session
          // If anonymous is desired as fallback, logic needs adjustment
        }
      } catch (err) {
         if (isMounted) {
            console.error('Auth initialization error:', err);
            setError(err instanceof Error ? err.message : 'Unknown authentication error');
         }
      } finally {
         if (isMounted) {
            // Set loading false only after initial check/deep link attempt
            setIsLoading(false);
         }
      }
    };

    initAuth();

    // Subscribe to auth changes (e.g., after setSession, signOut)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
      if (!isMounted) return; // Avoid state updates if unmounted

      console.log('Auth state changed event:', _event, newSession?.user?.id);
      setSession(newSession);
      setUser(newSession ? convertUser(newSession.user) : null);
      setError(null); // Clear previous errors on auth change
      setIsLoading(false); // Auth state change means loading is complete

      // Re-evaluate anonymous sign-in logic if needed on SIGNED_OUT
      // if (_event === 'SIGNED_OUT' && !newSession) {
      //     console.log('User signed out. Re-attempting anonymous sign-in.');
      //     handleAnonymousSignIn(); // If you want auto anonymous login after sign out
      // }
    });

    // Cleanup subscription and listener
    return () => {
      isMounted = false;
      console.log('Unsubscribing from auth changes and linking events.');
      subscription.unsubscribe();
      linkingSubscription.remove();
    };
  }, []); // Empty dependency array ensures this runs once on mount

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
    // isAuthenticated should ideally check session?.access_token expiry too
    isAuthenticated: !!user && !!session,
    isLoading,
    error,
    signOut: handleSignOut,
    getToken,
    signInWithGoogle,
    signInWithApple,
    signInWithEmailOtp,
    signInWithPhoneOtp,
    verifyEmailOtp,
    signInAnonymously: handleAnonymousSignIn,
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
