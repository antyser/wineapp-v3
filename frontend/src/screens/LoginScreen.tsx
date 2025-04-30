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
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);

  // If user becomes authenticated, navigate away (e.g., back to Main)
  React.useEffect(() => {
    // Check specifically if the user is NOT anonymous
    if (isAuthenticated && user && !user.isAnonymous) {
      console.log('User authenticated (non-anonymous), navigating away from LoginScreen');
      // Optional: Navigate back or to a specific screen upon successful login
      if (navigation.canGoBack()) {
        navigation.goBack();
      } else {
        // If cannot go back (e.g., app started here), navigate to main
        navigation.replace('Main', { screen: 'Home' }); // Use replace to avoid back button to login
      }
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

  const handleSendOtp = async () => {
    if (!email) {
      return;
    }
    await signInWithEmailOtp(email);
    
    if (!error) {
      setOtpSent(true);
    } else {
      setOtpSent(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otp) {
      return;
    }
    const success = await verifyEmailOtp(email, otp);
    // Auth context handles state update on success
    if (!success) {
       // Error state should already be set by the context
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

        {!otpSent ? (
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
            
            {/* --- Email OTP Input --- */} 
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
              onPress={handleSendOtp}
              style={styles.button}
              disabled={isLoading || !email}
              labelStyle={styles.buttonLabel}
            >
              Send Login Code
            </Button>
          </>
        ) : (
          <> 
            {/* --- OTP Verification --- */} 
            <Text style={styles.infoText}>
              Enter the 6-digit code sent to {email}
            </Text>
            <TextInput
              label="OTP Code"
              value={otp}
              onChangeText={setOtp}
              mode="outlined"
              style={styles.input}
              keyboardType="number-pad"
              maxLength={6}
              disabled={isLoading}
            />
            <Button
              mode="contained"
              onPress={handleVerifyOtp}
              style={styles.button}
              disabled={isLoading || !otp || otp.length !== 6}
              labelStyle={styles.buttonLabel}
            >
              Verify Code & Sign In
            </Button>
             <Button
              mode="text"
              onPress={() => { setOtpSent(false); setOtp(''); }} 
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
  },
  linkButton: {
    marginTop: 8,
    marginBottom: 24,
  },
});

export default LoginScreen; 