import React, { useState } from 'react';
import { StyleSheet, View, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { Text, TextInput, Button, HelperText, Portal, Dialog } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../auth/AuthContext';
import { NavigationProp, ParamListBase } from '@react-navigation/native';
import Constants from 'expo-constants';

interface LoginScreenProps {
  navigation: NavigationProp<ParamListBase>;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ navigation }) => {
  const [email, setEmail] = useState('test@example.com'); // Pre-filled with test user email
  const [password, setPassword] = useState('password123'); // Pre-filled with test password
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showDialog, setShowDialog] = useState(false);
  const [dialogMessage, setDialogMessage] = useState('');
  
  const { signInWithEmailAndPassword, user, error: authError } = useAuth();

  // Display configuration info for debugging
  const supabaseUrl = Constants.expoConfig?.extra?.supabaseUrl || process.env.SUPABASE_URL || 'unknown';

  const handleLogin = async () => {
    try {
      setLoading(true);
      setError('');

      if (!email || !password) {
        setError('Please enter both email and password');
        return;
      }

      console.log('Attempting login with:', email, password);
      console.log('Using Supabase URL from config:', supabaseUrl);
      
      // Use the contextual sign-in method
      const success = await signInWithEmailAndPassword(email, password);

      console.log('Login result:', success, 'Current user:', user);

      if (success) {
        // Successfully signed in
        setDialogMessage(`Successfully logged in as ${email}!`);
        setShowDialog(true);
        
        // Navigate to Home screen after showing the success dialog
        setTimeout(() => {
          setShowDialog(false);
          navigation.navigate('Main');
        }, 2000);
      } else {
        // Check for auth context error
        if (authError) {
          setError(authError);
        } else {
          setError('Failed to sign in. Please check your credentials.');
        }
      }
    } catch (err) {
      console.error('Login error:', err);
      setError(err instanceof Error ? err.message : 'Failed to sign in');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoid}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.content}>
            <Text variant="headlineLarge" style={styles.title}>
              Sign In
            </Text>
            <Text variant="bodyMedium" style={styles.subtitle}>
              Welcome to Wine App! Sign in with your test account.
            </Text>

            {authError ? (
              <View style={styles.errorContainer}>
                <Text variant="bodyMedium" style={styles.errorText}>
                  {authError}
                </Text>
              </View>
            ) : null}

            <View style={styles.form}>
              <TextInput
                label="Email"
                value={email}
                onChangeText={setEmail}
                mode="outlined"
                autoCapitalize="none"
                keyboardType="email-address"
                style={styles.input}
              />

              <TextInput
                label="Password"
                value={password}
                onChangeText={setPassword}
                mode="outlined"
                secureTextEntry
                style={styles.input}
              />

              {error ? (
                <HelperText type="error" visible={!!error}>
                  {error}
                </HelperText>
              ) : null}

              <Button
                mode="contained"
                onPress={handleLogin}
                loading={loading}
                disabled={loading}
                style={styles.button}
              >
                Sign In
              </Button>

              <View style={styles.testUserInfo}>
                <Text variant="bodySmall" style={styles.testUserText}>
                  For testing, use these credentials:
                </Text>
                <Text variant="bodySmall" style={styles.testUserText}>
                  Email: test@example.com
                </Text>
                <Text variant="bodySmall" style={styles.testUserText}>
                  Password: password123
                </Text>
                <Text variant="bodySmall" style={styles.testUserText}>
                  Supabase URL: {supabaseUrl}
                </Text>
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <Portal>
        <Dialog visible={showDialog} onDismiss={() => setShowDialog(false)}>
          <Dialog.Title>Success</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium">{dialogMessage}</Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowDialog(false)}>OK</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  keyboardAvoid: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
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
  form: {
    width: '100%',
  },
  input: {
    marginBottom: 16,
  },
  button: {
    marginTop: 8,
    marginBottom: 24,
  },
  testUserInfo: {
    marginTop: 24,
    padding: 16,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
  },
  testUserText: {
    textAlign: 'center',
    marginBottom: 4,
  },
  errorContainer: {
    backgroundColor: '#FFEBEE',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  errorText: {
    color: '#D32F2F',
  },
});

export default LoginScreen; 