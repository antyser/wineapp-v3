import React, { useState, useEffect } from 'react';
import { StyleSheet, View, ScrollView, Alert } from 'react-native';
import { Appbar, Text, Button, Snackbar } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { CellarForm } from '../components/cellar';
import { cellarService } from '../api/cellarService';
import { apiClient } from '../api/apiClient';

// Log the environment on component load
console.log('[TestCellarAddScreen] Component loaded');
console.log('[TestCellarAddScreen] cellarService:', cellarService);
console.log('[TestCellarAddScreen] apiClient baseURL:', apiClient.defaults.baseURL);

const TestCellarAddScreen = () => {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [snackbar, setSnackbar] = useState({ visible: false, message: '' });

  // Add test function to check connection
  const testConnection = async () => {
    try {
      setLoading(true);
      setError(null);

      // First, log what we're about to do
      console.log('[TestConnection] Testing connection to:', apiClient.defaults.baseURL);
      Alert.alert('Testing Connection', `Connecting to: ${apiClient.defaults.baseURL}`);

      // Try a direct API call to the health endpoint
      const response = await apiClient.get('/health/');
      console.log('[TestConnection] Health check response:', response.data);

      // Show response in UI and alert
      setResponse(response.data);
      setSnackbar({ visible: true, message: 'Connection successful! Server is healthy.' });
      Alert.alert('Connection Success', `Server responded: ${JSON.stringify(response.data)}`);
    } catch (err: any) {
      console.error('[TestConnection] Connection failed:', err);
      console.error('[TestConnection] Error details:', {
        message: err.message,
        response: err.response?.data,
        status: err.response?.status,
      });

      // Show error in UI and alert
      setError(err.message || 'Connection failed');
      setSnackbar({ visible: true, message: `Connection failed: ${err.message}` });
      Alert.alert('Connection Failed', err.message || 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Test cellarService on component mount
    console.log('[TestCellarAddScreen] Component mounted');
    console.log('[TestCellarAddScreen] Testing cellarService.getCellars()');

    const testCellarService = async () => {
      try {
        const result = await cellarService.getCellars();
        console.log('[TestCellarAddScreen] getCellars result:', result);
        Alert.alert('getCellars Success', `Found ${result.items?.length || 0} cellars`);
      } catch (err) {
        console.error('[TestCellarAddScreen] getCellars error:', err);
        Alert.alert('getCellars Error', err.message || 'Unknown error');
      }
    };

    testCellarService();
  }, []);

  const handleSubmit = async (values: { name: string; sections: string[] }) => {
    console.log('[TestCellarAddScreen] Submit button clicked', values);
    try {
      setLoading(true);
      setError(null);

      // Create a new cellar
      // This is a test user ID - in a real app, you'd get this from authentication
      const testUserId = '443ce2fe-1d5b-48af-99f3-15329714b63d';

      console.log('[TestCellarAddScreen] Sending request to createCellar with data:', {
        name: values.name,
        sections: values.sections,
        user_id: testUserId,
      });

      Alert.alert('Creating Cellar', `Creating cellar: ${values.name}`);

      const result = await cellarService.createCellar({
        name: values.name,
        sections: values.sections,
        user_id: testUserId,
      });

      console.log('[TestCellarAddScreen] Cellar created successfully:', result);
      setResponse(result);
      setSnackbar({ visible: true, message: 'Cellar created successfully!' });
      Alert.alert('Success', `Cellar created with ID: ${result.id}`);
    } catch (err: any) {
      console.error('[TestCellarAddScreen] Failed to create cellar:', err);
      console.error('[TestCellarAddScreen] Error details:', {
        message: err.message,
        stack: err.stack,
        response: err.response?.data
      });
      setError(err.message || 'An error occurred');
      setSnackbar({ visible: true, message: `Failed to create cellar: ${err.message}` });
      Alert.alert('Error', `Failed to create cellar: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Appbar.Header>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content title="Test Cellar Add" />
      </Appbar.Header>

      <ScrollView style={styles.content}>
        <Text variant="headlineMedium" style={styles.title}>
          Add Cellar to Dev Database
        </Text>

        <Button
          mode="contained"
          onPress={() => Alert.alert('Test', 'Button Click Test')}
          style={styles.testButton}
        >
          Test Alert
        </Button>

        <Button
          mode="contained"
          onPress={testConnection}
          loading={loading}
          style={styles.connectionButton}
        >
          Test API Connection
        </Button>

        <CellarForm
          onSubmit={handleSubmit}
          loading={loading}
          title="New Test Cellar"
        />

        {response && (
          <View style={styles.responseContainer}>
            <Text variant="titleMedium" style={styles.responseTitle}>Successfully Created:</Text>
            <Text>ID: {response.id}</Text>
            <Text>Name: {response.name}</Text>
            <Text>Sections: {response.sections?.join(', ') || 'None'}</Text>
            <Text>Created at: {new Date(response.created_at).toLocaleString()}</Text>
          </View>
        )}

        {error && (
          <View style={styles.errorContainer}>
            <Text variant="titleMedium" style={styles.errorTitle}>Error:</Text>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}
      </ScrollView>

      <Snackbar
        visible={snackbar.visible}
        onDismiss={() => setSnackbar({ ...snackbar, visible: false })}
        duration={3000}
      >
        {snackbar.message}
      </Snackbar>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  title: {
    marginBottom: 24,
  },
  testButton: {
    marginBottom: 16,
  },
  connectionButton: {
    marginBottom: 24,
    backgroundColor: '#4CAF50', // Green color for connection test
  },
  responseContainer: {
    marginTop: 24,
    padding: 16,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
  },
  responseTitle: {
    marginBottom: 8,
    color: 'green',
  },
  errorContainer: {
    marginTop: 24,
    padding: 16,
    backgroundColor: '#fee',
    borderRadius: 8,
  },
  errorTitle: {
    marginBottom: 8,
    color: 'red',
  },
  errorText: {
    color: 'red',
  },
});

export default TestCellarAddScreen;
