import React from 'react';
import { StyleSheet, FlatList, View } from 'react-native';
import { Text, ActivityIndicator, FAB } from 'react-native-paper';
import { Cellar } from '../../api/generated';
import CellarCard from './CellarCard';

interface CellarListProps {
  cellars: Cellar[];
  cellarBottleCounts?: Record<string, number>;
  loading?: boolean;
  error?: string;
  onCellarPress?: (cellar: Cellar) => void;
  onEditCellar?: (cellar: Cellar) => void;
  onDeleteCellar?: (cellar: Cellar) => void;
  onAddCellar?: () => void;
}

const CellarList: React.FC<CellarListProps> = ({
  cellars,
  cellarBottleCounts = {},
  loading = false,
  error,
  onCellarPress,
  onEditCellar,
  onDeleteCellar,
  onAddCellar,
}) => {
  if (loading && cellars.length === 0) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" testID="loading-indicator" />
      </View>
    );
  }

  if (error && cellars.length === 0) {
    return (
      <View style={styles.centered}>
        <Text variant="bodyLarge">{error}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={cellars}
        keyExtractor={(item) => item.id}
        testID="cellar-flat-list"
        renderItem={({ item }) => (
          <CellarCard
            cellar={item}
            bottleCount={cellarBottleCounts[item.id] || 0}
            onPress={() => onCellarPress?.(item)}
            onEdit={() => onEditCellar?.(item)}
            onDelete={() => onDeleteCellar?.(item)}
          />
        )}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.centered} testID="empty-message">
            <Text variant="bodyLarge">No cellars found</Text>
            <Text variant="bodyMedium">Create your first cellar to get started</Text>
          </View>
        }
      />

      {onAddCellar && (
        <FAB
          icon="plus"
          style={styles.fab}
          onPress={onAddCellar}
          testID="add-cellar-button"
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  list: {
    padding: 16,
    paddingBottom: 80, // Extra space for the FAB
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
  },
});

export default CellarList;
