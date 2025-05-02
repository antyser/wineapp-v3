import React from 'react';
import { StyleSheet, FlatList, View, TouchableOpacity } from 'react-native';
import { Text, Card, ActivityIndicator, Chip, useTheme } from 'react-native-paper';
import { Wine } from '../../api';
import WineListItem from '../WineListItem';

interface WineListProps {
  wines: Wine[];
  loading?: boolean;
  error?: string;
  onWinePress: (wine: Wine) => void;
  onEndReached?: () => void;
  hasMore?: boolean;
  ListHeaderComponent?: React.ComponentType<any> | React.ReactElement | null;
  onEndReachedThreshold?: number;
}

const WineList: React.FC<WineListProps> = ({
  wines,
  loading = false,
  error,
  onWinePress,
  onEndReached,
  hasMore = false,
  ListHeaderComponent,
  onEndReachedThreshold = 0.5
}) => {
  if (loading && wines.length === 0) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#000000" testID="loading-indicator" />
      </View>
    );
  }

  if (error && wines.length === 0) {
    return (
      <View style={styles.centered}>
        <Text variant="bodyLarge" style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={wines}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <WineListItem wine={item} onPress={() => onWinePress(item)} />
      )}
      contentContainerStyle={styles.list}
      onEndReached={onEndReached}
      onEndReachedThreshold={onEndReachedThreshold}
      testID="wine-flat-list"
      ListFooterComponent={
        loading && hasMore ? (
          <ActivityIndicator style={styles.loadingMore} color="#000000" testID="loading-more-indicator" />
        ) : null
      }
      ListEmptyComponent={
        <View style={styles.centered}>
          <Text variant="bodyLarge" style={styles.emptyText}>No wines found</Text>
        </View>
      }
      ListHeaderComponent={ListHeaderComponent}
    />
  );
};

const styles = StyleSheet.create({
  list: {
    padding: 16,
    backgroundColor: '#FFFFFF',
  },
  itemContainer: {
    marginBottom: 16,
  },
  card: {
    elevation: 2,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
  },
  titleRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  vintage: {
    fontWeight: 'bold',
    marginRight: 8,
    color: '#000000',
  },
  name: {
    flex: 1,
    color: '#000000',
  },
  producer: {
    fontStyle: 'italic',
    marginBottom: 8,
    color: '#000000',
  },
  detailsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
    marginBottom: 8,
  },
  chip: {
    marginRight: 8,
    marginBottom: 4,
    backgroundColor: '#F0F0F0',
  },
  chipText: {
    color: '#000000',
  },
  price: {
    fontWeight: 'bold',
    marginTop: 4,
    color: '#000000',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFFFFF',
  },
  loadingMore: {
    marginVertical: 16,
  },
  errorText: {
    color: '#000000',
    textAlign: 'center',
  },
  emptyText: {
    color: '#000000',
    textAlign: 'center',
  },
});

export default WineList;
