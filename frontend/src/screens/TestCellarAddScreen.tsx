import React, { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Button, Card, TextInput, Title, Text, ActivityIndicator } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { api } from '../api';

const TestCellarAddScreen = () => {
  const navigation = useNavigation();
  const [cellarName, setCellarName] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const testGetCellars = async () => {
    setLoading(true);
    setResult(null);
    setError(null);

    try {
      console.log('[TestCellarAddScreen] Testing listCellarsApiV1CellarsGet()');
      
      const response = await api.listCellarsApiV1CellarsGet();
      console.log('[TestCellarAddScreen] API response:', response);
      
      if (response.error) {
        throw new Error(`API error: ${JSON.stringify(response.error)}`);
      }
      
      setResult({
        success: true, 
        data: response.data
      });
    } catch (err) {
      console.error('[TestCellarAddScreen] Error testing Get Cellars API:', err);
      setError(`Failed to get cellars: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setLoading(false);
    }
  };

  const testCreateCellar = async () => {
    if (!cellarName.trim()) {
      setError('Please enter a cellar name');
      return;
    }

    setLoading(true);
    setResult(null);
    setError(null);

    try {
      console.log(`[TestCellarAddScreen] Creating cellar with name: ${cellarName}`);
      
      const response = await api.createCellarApiV1CellarsPost({
        body: {
          name: cellarName,
          sections: ['Section A', 'Section B']
        }
      });
      
      console.log('[TestCellarAddScreen] API response:', response);
      
      if (response.error) {
        throw new Error(`API error: ${JSON.stringify(response.error)}`);
      }
      
      setResult({
        success: true, 
        data: response.data
      });
      setCellarName(''); // Clear input after successful creation
    } catch (err) {
      console.error('[TestCellarAddScreen] Error testing Create Cellar API:', err);
      setError(`Failed to create cellar: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Card style={styles.card}>
        <Card.Content>
          <Title>Test Cellars API</Title>
          <Text style={styles.description}>
            This screen is for testing the Cellars API endpoints.
          </Text>

          <View style={styles.testSection}>
            <Button 
              mode="contained" 
              onPress={testGetCellars}
              loading={loading}
              disabled={loading}
            >
              Test Get Cellars
            </Button>
          </View>

          <View style={styles.testSection}>
            <TextInput
              label="Cellar Name"
              value={cellarName}
              onChangeText={setCellarName}
              style={styles.input}
              disabled={loading}
            />
            <Button 
              mode="contained" 
              onPress={testCreateCellar}
              loading={loading}
              disabled={loading}
              style={styles.button}
            >
              Test Create Cellar
            </Button>
          </View>

          {loading && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" />
              <Text style={styles.loadingText}>Processing request...</Text>
            </View>
          )}

          {error && (
            <Card style={[styles.resultCard, styles.errorCard]}>
              <Card.Content>
                <Title>Error</Title>
                <Text>{error}</Text>
              </Card.Content>
            </Card>
          )}

          {result && (
            <Card style={styles.resultCard}>
              <Card.Content>
                <Title>API Response</Title>
                <ScrollView style={styles.jsonContainer}>
                  <Text>
                    {JSON.stringify(result, null, 2)}
                  </Text>
                </ScrollView>
              </Card.Content>
            </Card>
          )}
        </Card.Content>
      </Card>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  card: {
    marginBottom: 16,
  },
  description: {
    marginBottom: 16,
  },
  testSection: {
    marginVertical: 12,
  },
  input: {
    marginBottom: 12,
  },
  button: {
    marginTop: 8,
  },
  loadingContainer: {
    alignItems: 'center',
    marginVertical: 16,
  },
  loadingText: {
    marginTop: 8,
  },
  resultCard: {
    marginTop: 16,
  },
  errorCard: {
    backgroundColor: '#ffebee',
  },
  jsonContainer: {
    maxHeight: 300,
  },
});

export default TestCellarAddScreen;
