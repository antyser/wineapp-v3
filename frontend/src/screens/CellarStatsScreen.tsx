import React, { useState, useEffect } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { ActivityIndicator, Appbar, Card, Divider, Text } from 'react-native-paper';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { api } from '../api';
import { CellarStatistics } from '../api/generated';
import { RootStackParamList } from '../navigation/types';
import { PieChart } from 'react-native-chart-kit';
import { Dimensions } from 'react-native';

type Props = NativeStackScreenProps<RootStackParamList, 'CellarStats'>;

const chartConfig = {
  backgroundGradientFrom: "#ffffff",
  backgroundGradientTo: "#ffffff",
  color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
  strokeWidth: 2,
  barPercentage: 0.5,
  useShadowColorFromDataset: false
};

const CellarStatsScreen = ({ route, navigation }: Props) => {
  const { cellarId } = route.params;
  const [statistics, setStatistics] = useState<CellarStatistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const screenWidth = Dimensions.get("window").width - 40; // Account for padding

  useEffect(() => {
    fetchStatistics();
  }, [cellarId]);

  const fetchStatistics = async () => {
    try {
      setLoading(true);
      console.log(`Fetching statistics for cellarId: ${cellarId}`);

      const response = await api.getCellarStatisticsApiV1CellarsCellarIdStatisticsGet({
        path: { cellar_id: cellarId }
      });
      setStatistics(response.data);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch cellar statistics:', err);
      setError('Failed to load cellar statistics. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getWineTypeData = () => {
    if (!statistics?.bottles_by_type) return [];
    
    // Get entries and sort by bottle count descending
    const entries = Object.entries(statistics.bottles_by_type)
      .sort((a, b) => b[1] - a[1]);
    
    // Generate colors based on index
    return entries.map(([name, value], index) => ({
      name,
      bottles: value,
      color: `rgba(0, 0, 0, ${Math.max(0.3, 1 - index * 0.15)})`,
      legendFontColor: "#000000",
      legendFontSize: 12
    }));
  };

  const getRegionData = () => {
    if (!statistics?.bottles_by_region) return [];
    
    // Get entries and sort by bottle count descending
    const entries = Object.entries(statistics.bottles_by_region)
      .sort((a, b) => b[1] - a[1]);
    
    // Generate colors based on index (using a different shade pattern)
    return entries.map(([name, value], index) => ({
      name,
      bottles: value,
      color: `rgba(50, 50, 50, ${Math.max(0.3, 1 - index * 0.1)})`,
      legendFontColor: "#000000",
      legendFontSize: 12
    }));
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Appbar.Header>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content title="Cellar Statistics" />
      </Appbar.Header>

      <ScrollView contentContainerStyle={styles.content}>
        {error ? (
          <Text style={styles.error}>{error}</Text>
        ) : statistics ? (
          <>
            <Card style={styles.card}>
              <Card.Content>
                <Text variant="titleLarge" style={styles.cardTitle}>Overview</Text>
                <View style={styles.statsRow}>
                  <View style={styles.statItem}>
                    <Text variant="headlineMedium">{statistics.total_bottles}</Text>
                    <Text variant="bodyMedium">Total Bottles</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text variant="headlineMedium">${statistics.total_value.toFixed(2)}</Text>
                    <Text variant="bodyMedium">Estimated Value</Text>
                  </View>
                </View>
              </Card.Content>
            </Card>

            {getWineTypeData().length > 0 && (
              <Card style={styles.card}>
                <Card.Content>
                  <Text variant="titleLarge" style={styles.cardTitle}>Bottles by Type</Text>
                  <PieChart
                    data={getWineTypeData()}
                    width={screenWidth}
                    height={200}
                    chartConfig={chartConfig}
                    accessor="bottles"
                    backgroundColor="transparent"
                    paddingLeft="15"
                    absolute
                  />
                </Card.Content>
              </Card>
            )}

            {getRegionData().length > 0 && (
              <Card style={styles.card}>
                <Card.Content>
                  <Text variant="titleLarge" style={styles.cardTitle}>Bottles by Region</Text>
                  <PieChart
                    data={getRegionData()}
                    width={screenWidth}
                    height={200}
                    chartConfig={chartConfig}
                    accessor="bottles"
                    backgroundColor="transparent"
                    paddingLeft="15"
                    absolute
                  />
                </Card.Content>
              </Card>
            )}
          </>
        ) : null}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    padding: 16,
  },
  card: {
    marginBottom: 16,
    elevation: 2,
  },
  cardTitle: {
    marginBottom: 12,
    fontWeight: 'bold',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 8,
  },
  statItem: {
    alignItems: 'center',
  },
  error: {
    color: 'red',
    textAlign: 'center',
    margin: 16,
  },
});

export default CellarStatsScreen;
