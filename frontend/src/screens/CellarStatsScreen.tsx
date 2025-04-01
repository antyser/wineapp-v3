import React, { useState, useEffect } from 'react';
import { StyleSheet, View, ScrollView } from 'react-native';
import { Text, Appbar, Card, ActivityIndicator, Button, Divider } from 'react-native-paper';
import { useRoute, useNavigation } from '@react-navigation/native';
import { cellarService, CellarStatistics } from '../api/services';

const StatsSection = ({ title, data }: { title: string; data: Record<string, number> }) => {
  // Sort the data by count (descending)
  const sortedEntries = Object.entries(data).sort((a, b) => b[1] - a[1]);

  return (
    <Card style={styles.card}>
      <Card.Title title={title} />
      <Card.Content>
        {sortedEntries.length > 0 ? (
          sortedEntries.map(([key, value], index) => (
            <View key={key} style={styles.statRow}>
              <Text variant="bodyMedium">{key}</Text>
              <Text variant="bodyMedium">{value}</Text>
            </View>
          ))
        ) : (
          <Text variant="bodyMedium">No data available</Text>
        )}
      </Card.Content>
    </Card>
  );
};

const CellarStatsScreen = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const { cellarId } = route.params as { cellarId: string };

  const [stats, setStats] = useState<CellarStatistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchCellarStats();
  }, [cellarId]);

  const fetchCellarStats = async () => {
    try {
      setLoading(true);
      const statistics = await cellarService.getCellarStatistics(cellarId);
      setStats(statistics);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch cellar statistics:', err);
      setError('Failed to load statistics. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Appbar.Header>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content title="Cellar Statistics" />
      </Appbar.Header>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" />
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <Text style={styles.errorText}>{error}</Text>
          <Button mode="contained" onPress={fetchCellarStats} style={styles.button}>
            Retry
          </Button>
        </View>
      ) : stats ? (
        <ScrollView contentContainerStyle={styles.content}>
          <Card style={styles.summaryCard}>
            <Card.Title title="Cellar Summary" />
            <Card.Content>
              <View style={styles.summaryRow}>
                <Text variant="titleMedium">Total Bottles</Text>
                <Text variant="titleMedium">{stats.total_bottles}</Text>
              </View>
              <Divider style={styles.divider} />
              <View style={styles.summaryRow}>
                <Text variant="titleMedium">Total Value</Text>
                <Text variant="titleMedium">${stats.total_value.toFixed(2)}</Text>
              </View>
            </Card.Content>
          </Card>

          <StatsSection title="Bottles by Type" data={stats.bottles_by_type} />
          <StatsSection title="Bottles by Region" data={stats.bottles_by_region} />
          <StatsSection title="Bottles by Vintage" data={stats.bottles_by_vintage} />
        </ScrollView>
      ) : (
        <View style={styles.centered}>
          <Text>No statistics available</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  content: {
    padding: 16,
  },
  card: {
    marginBottom: 16,
  },
  summaryCard: {
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  divider: {
    marginVertical: 8,
  },
  errorText: {
    marginBottom: 16,
    color: 'red',
  },
  button: {
    marginTop: 8,
  },
});

export default CellarStatsScreen;
