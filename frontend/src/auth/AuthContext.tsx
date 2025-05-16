import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import { Session, User as SupabaseUser } from '@supabase/supabase-js';
import Constants from 'expo-constants';
import { Alert, Platform, AppState } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { makeRedirectUri } from 'expo-auth-session';
import * as QueryParams from 'expo-auth-session/build/QueryParams';
import {
  GoogleSignin,
  statusCodes,
} from '@react-native-google-signin/google-signin';
import * as AppleAuthentication from 'expo-apple-authentication';

// Ensure compatible AuthSession behavior on web
WebBrowser.maybeCompleteAuthSession();

GoogleSignin.configure({
  iosClientId: '189158143517-d8677bm1i5ml3o28qf1n8nr2l0eu41gm.apps.googleusercontent.com',
  webClientId: '189158143517-6fbhdeads7ct664pr7i5iuvkkdk8u4hm.apps.googleusercontent.com',
});

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
  isAnonymous: boolean;
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
  isAnonymous: false,
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
  console.log('Converting Supabase user:', supabaseUser.id, 'is_anonymous:', supabaseUser.is_anonymous);
  return {
    id: supabaseUser.id,
    email: supabaseUser.email || undefined,
    isAnonymous: supabaseUser.is_anonymous ?? false,
  };
};

// Auth provider component
export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isAnonymous, setIsAnonymous] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const createSessionFromUrl = async (url: string) => {
    const { params, errorCode } = QueryParams.getQueryParams(url);
    if (errorCode) throw new Error(errorCode);
    const { access_token, refresh_token } = params;
    if (!access_token) return;
    const { data, error } = await supabase.auth.setSession({
      access_token,
      refresh_token,
    });
    if (error) throw error;
    return data.session;
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
        setIsAnonymous(true);
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
      setIsAnonymous(false);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // --- Native Google Sign-In ---
  const signInWithGoogle = async (): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);
      console.log('[AuthContext] Attempting Google sign-in (Native SDK)...');
      
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      const userInfo = await GoogleSignin.signIn(); 
      
      if (!userInfo?.data?.idToken || !userInfo?.data?.user) {
        throw new Error('Google Sign-In failed to return necessary user information or ID token.');
      }

      console.log('[AuthContext] Google Sign-In successful (Native SDK)', { 
        email: userInfo.data.user.email, 
        idTokenProvided: !!userInfo.data.idToken 
      });
      
      const { data, error: supabaseError } = await supabase.auth.signInWithIdToken({
          provider: 'google',
          token: userInfo.data.idToken,
        });

        if (supabaseError) {
          console.error('[AuthContext] Supabase sign-in with Google ID token error:', supabaseError);
          throw supabaseError; 
        } else if (!data || !data.session) { // Check if Supabase returned data and a session
          // This case means Supabase did not error but also did not return a session.
          console.error('[AuthContext] Supabase signInWithIdToken call did not return a session, though no explicit error was thrown. UserInfo from Google:', userInfo, 'Supabase response data:', data);
          throw new Error('Supabase did not return a session after Google sign-in.');
        }

        // If we reach here, Supabase sign-in was successful and data.session exists.
        // The onAuthStateChange listener should handle setting the user and session state.
        console.log("[AuthContext] Supabase sign-in with Google ID token successful. Session user ID:", data.session.user.id);
        // No need to manually set session/user here as onAuthStateChange should pick it up.

    } catch (err: any) {
      console.error('[AuthContext] Google sign-in error (Native SDK):', err);
      let errorMessage = 'Failed to sign in with Google. Please try again.';
      if (err.code === statusCodes.SIGN_IN_CANCELLED) {
        errorMessage = 'Sign-in process was cancelled.';
      } else if (err.code === statusCodes.IN_PROGRESS) {
        errorMessage = 'Sign-in is already in progress. Please wait.';
      } else if (err.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        errorMessage = 'Google Play services not available or outdated. Please update Google Play Services.';
        Alert.alert('Google Sign-In Error', errorMessage); 
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
      if (errorMessage !== 'Sign-in process was cancelled.' && errorMessage !== 'Sign-in is already in progress. Please wait.' && err.code !== statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        Alert.alert('Google Sign-In Failed', errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // --- Native Sign in with Apple (Reverted to original state without nonce/Mixpanel) ---
  const signInWithApple = async (): Promise<void> => {
    if (Platform.OS !== 'ios') {
      console.log('[AuthContext] Apple Sign-In is only available on iOS.');
      Alert.alert("Unsupported Platform", "Apple Sign-In is only available on iOS devices.");
      return;
    }
    try {
      setIsLoading(true);
      setError(null);
      console.log('[AuthContext] Attempting Apple sign-in (Native SDK)...');

      const appleAuthRequestResponse = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });
      console.log('[AuthContext] Apple Sign-In successful (Native SDK)');

      if (appleAuthRequestResponse.identityToken) {
        const { data, error: supabaseError } = await supabase.auth.signInWithIdToken({
          provider: 'apple',
          token: appleAuthRequestResponse.identityToken,
        });

        if (supabaseError) {
          console.error('[AuthContext] Supabase sign-in with Apple ID token error:', supabaseError);
          throw supabaseError; 
        }
        
        console.log('[AuthContext] Supabase sign-in with Apple successful. User ID:', data.user?.id);
      } else {
        throw new Error('No identityToken present from Apple Sign-In!');
      }

    } catch (err: any) {
      console.error('[AuthContext] Apple sign-in error (Native SDK):', err);
      let errorMessage = 'Failed to sign in with Apple. Please try again.';
      if (err.code === 'ERR_REQUEST_CANCELED' || err.code === '1001') {
        errorMessage = 'Sign-in process was cancelled.';
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
      if (errorMessage !== 'Sign-in process was cancelled.') {
        Alert.alert('Apple Sign-In Failed', errorMessage);
      }
    } finally {
      setIsLoading(false);
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
        setIsAnonymous(data.session.user.is_anonymous ?? false);
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
       let didSignInAnonymously = false;
       try {
        setIsLoading(true); // START loading indicator for initAuth
        console.log('[AuthContext] initAuth: Checking existing session...');
        const { data: { session: currentSession }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) throw sessionError;

        if (currentSession && isMounted) {
          console.log('[AuthContext] initAuth: Found existing persisted session:', currentSession.user.id);
          setSession(currentSession);
          setUser(convertUser(currentSession.user));
          setIsAnonymous(currentSession.user.is_anonymous ?? false);
          // Found session, set loading false ONLY if listener hasn't already
          if (isLoading) setIsLoading(false);
        } else if (isMounted) {
          console.log('[AuthContext] initAuth: No active session found. Attempting anonymous sign-in...');
          // await handleAnonymousSignIn(); // handleAnonymousSignIn manages its own loading state
          didSignInAnonymously = await handleAnonymousSignIn(); // Call and await, check result
          // Loading state will be set by handleAnonymousSignIn
        } else {
          console.log('[AuthContext] initAuth: Component unmounted during session check.');
        }
      } catch (err) {
         if (isMounted) {
            console.error('[AuthContext] initAuth: Error:', err);
            setError(err instanceof Error ? err.message : 'Unknown authentication error');
            // Ensure loading stops on error if anonymous sign-in wasn't attempted/failed
             if (!didSignInAnonymously && isLoading) setIsLoading(false); 
         }
      } finally {
         // If we found a session initially OR anonymous sign-in was NOT attempted,
         // AND we are still loading, set loading false.
         // handleAnonymousSignIn sets its own loading state, so don't interfere if it ran.
         if (isMounted && !didSignInAnonymously && isLoading) {
             console.log('[AuthContext] initAuth finally: Setting loading false (no anon attempt or found session initially)');
             setIsLoading(false);
         }
      }
    };

    initAuth();

    // Subscribe to auth changes 
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
       if (!isMounted) return; // Avoid state updates if unmounted

       console.log('Auth state changed event:', _event, newSession?.user?.id);
       setSession(newSession);
       setUser(newSession ? convertUser(newSession.user) : null);
       setIsAnonymous(newSession?.user?.is_anonymous ?? false);
       setError(null); // Clear previous errors on auth change
       if (isLoading) setIsLoading(false); // Ensure loading is false after any auth state update, might be redundant but safe.

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
    isAnonymous,
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
