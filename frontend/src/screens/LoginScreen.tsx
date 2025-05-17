import React, { useState } from 'react';
import { StyleSheet, View, ScrollView, Platform } from 'react-native';
import { Text, Button, TextInput, ActivityIndicator, useTheme } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../auth/AuthContext';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';

const LoginScreen = () => {
  const { 
    signInWithGoogle,
    signInWithApple,
    signInWithEmailOtp,
    verifyEmailOtp,
    isLoading,
    error,
    isAuthenticated,
    user
  } = useAuth();
  
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const theme = useTheme();

  const [email, setEmail] = useState('');
  const [emailLinkSent, setEmailLinkSent] = useState(false);

  // If user becomes authenticated, navigate away (e.g., back to Main)
  React.useEffect(() => {
    // Check specifically if the user is NOT anonymous
    if (isAuthenticated && user && !user.isAnonymous) {
      console.log('User authenticated (non-anonymous), navigating away from LoginScreen');
      // Navigate to home screen upon successful login
      navigation.replace('Main', { screen: 'Home' }); // Use replace to avoid back button to login
    }
  }, [isAuthenticated, user, navigation]);

  const handleGoogleSignIn = async () => {
    await signInWithGoogle();
    // Auth context handles state update and navigation via useEffect
  };

  const handleAppleSignIn = async () => {
    await signInWithApple();
    // Auth context handles state update and navigation via useEffect
  };

  const handleSendEmailLink = async () => {
    if (!email) {
      return;
    }
    await signInWithEmailOtp(email);
    
    if (!error) {
      setEmailLinkSent(true);
    } else {
      setEmailLinkSent(false);
    }
  };
  
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView contentContainerStyle={styles.contentContainer}>
        <Text variant="headlineMedium" style={styles.title}>Welcome Back</Text>
        <Text variant="bodyMedium" style={styles.subtitle}>Sign in or create an account</Text>
        
        {/* Global Error Display */}       
        {error && (
           <Text style={styles.errorText}>{error}</Text>
        )}
        
        {/* Loading Indicator */} 
        {isLoading && (
          <ActivityIndicator animating={true} size="large" style={styles.loadingIndicator} />
        )}

        {!emailLinkSent ? (
          <>
            {/* --- Social Logins --- */} 
            <Button
              mode="outlined"
              onPress={handleGoogleSignIn}
              style={styles.button}
              icon="google"
              disabled={isLoading}
              textColor={theme.colors.onSurface}
              labelStyle={styles.buttonLabel}
            >
              Sign in with Google
            </Button>
            
            {Platform.OS === 'ios' && ( // Apple Sign in only on iOS
              <Button
                mode="outlined"
                onPress={handleAppleSignIn}
                style={styles.button}
                icon="apple"
                disabled={isLoading}
                textColor={theme.colors.onSurface}
                labelStyle={styles.buttonLabel}
              >
                Sign in with Apple
              </Button>
            )}
            
            {/* --- Divider --- */} 
            <View style={styles.dividerContainer}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>OR</Text>
                <View style={styles.dividerLine} />
            </View>
            
            {/* --- Email Input --- */} 
            <TextInput
              label="Email Address"
              value={email}
              onChangeText={setEmail}
              mode="outlined"
              style={styles.input}
              keyboardType="email-address"
              autoCapitalize="none"
              disabled={isLoading}
            />
            <Button
              mode="contained"
              onPress={handleSendEmailLink}
              style={styles.button}
              disabled={isLoading || !email}
              labelStyle={styles.buttonLabel}
            >
              Send Login Link
            </Button>
          </>
        ) : (
          <> 
            {/* --- Email Link Instructions --- */} 
            <Text style={styles.infoText}>
              We've sent a login link to {email}
            </Text>
            <Text style={styles.instructionText}>
              Please check your email and click the link to sign in.
            </Text>
            <Text style={styles.instructionText}>
              You'll be automatically redirected to the app.
            </Text>
            <Button
              mode="text"
              onPress={() => { setEmailLinkSent(false); }} 
              style={styles.linkButton}
              disabled={isLoading}
            >
              Use a different email
            </Button>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  contentContainer: {
    flexGrow: 1,
    padding: 24,
    justifyContent: 'center',
  },
  title: {
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    marginBottom: 24,
    color: '#666666',
    textAlign: 'center',
  },
  errorText: {
    color: '#D32F2F',
    marginBottom: 16,
  },
  loadingIndicator: {
    marginBottom: 16,
  },
  button: {
    marginTop: 8,
    marginBottom: 24,
  },
  buttonLabel: {
    fontWeight: 'bold',
  },
  input: {
    marginBottom: 16,
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#666666',
  },
  dividerText: {
    marginHorizontal: 16,
    color: '#666666',
  },
  infoText: {
    marginBottom: 16,
    color: '#666666',
    textAlign: 'center',
    fontWeight: 'bold',
  },
  instructionText: {
    marginBottom: 8,
    color: '#666666',
    textAlign: 'center',
  },
  linkButton: {
    marginTop: 24,
    marginBottom: 24,
  },
});

export default LoginScreen; 