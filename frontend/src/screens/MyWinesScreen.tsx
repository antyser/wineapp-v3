import React, { useState, useEffect } from 'react';
import { StyleSheet, View, ScrollView, FlatList } from 'react-native';
import { Text, Button, useTheme, Chip, Searchbar, Divider, ActivityIndicator } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';

// Define a placeholder type for user wine data - replace with actual schema later
type UserWine = {
  id: string;
  name: string;
  vintage?: string;
  // Add other relevant fields later
};

const MyWinesScreen = () => {
  const theme = useTheme();
  const navigation = useNavigation();

  // New state for search, filters, and wine data
  const [searchQuery, setSearchQuery] = useState('');
  const [userWines, setUserWines] = useState<UserWine[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Replace fetchCellars with fetchUserWines
    fetchUserWines();
  }, []); // Add dependencies later for search, sort, filter

  // Placeholder function for fetching user wines
  const fetchUserWines = async () => {
    setIsLoading(true);
    setError(null);
    try {
      // TODO: Implement API call to fetch user wines based on searchQuery, sort, filters
      // For now, simulate fetching with a delay and empty data
      await new Promise(resolve => setTimeout(resolve, 1000));
      setUserWines([]); // Start with empty data or mock data
      console.log("Fetching user wines with query:", searchQuery); // Placeholder log
    } catch (err) {
      console.error('Failed to fetch user wines:', err);
      setError('Failed to load your wines. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    // TODO: Debounce this call in a real implementation
    fetchUserWines();
  };

  const handleSortPress = () => {
    // TODO: Implement sort modal/screen navigation
    console.log("Sort pressed");
  };

  const handleFilterPress = () => {
    // TODO: Implement filter modal/screen navigation
    console.log("Filter pressed");
  };

  const handleQuickFilterPress = (filterType: string) => {
    // TODO: Implement quick filter logic
    console.log("Quick filter pressed:", filterType);
    // Potentially update filter state and call fetchUserWines()
  };

  const renderWineItem = ({ item }: { item: UserWine }) => (
    <View style={styles.wineItem}>
      <Text>{item.name} {item.vintage ? `(${item.vintage})` : ''}</Text>
      {/* Add more details later */}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header: Search, Sort, Filter */}
      <View style={styles.headerContainer}>
        <Searchbar
          placeholder="Search your wines..."
          onChangeText={handleSearch}
          value={searchQuery}
          style={styles.searchBar}
        />
        <View style={styles.actionsContainer}>
          <Button onPress={handleSortPress} icon="sort">Sort</Button>
          <Button onPress={handleFilterPress} icon="filter-variant">Filter</Button>
        </View>
      </View>

      {/* Quick Filters */}
      <View style={styles.quickFilterContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <Chip style={styles.chip} onPress={() => handleQuickFilterPress('Red')}>Red</Chip>
          <Chip style={styles.chip} onPress={() => handleQuickFilterPress('White')}>White</Chip>
          <Chip style={styles.chip} onPress={() => handleQuickFilterPress('Sparkling')}>Sparkling</Chip>
          <Chip style={styles.chip} onPress={() => handleQuickFilterPress('France')}>🇫🇷 France</Chip>
          {/* Add more quick filters later, potentially dynamically */}
        </ScrollView>
      </View>

      <Divider />

      {/* Main Content: Wine List */}
      <View style={styles.content}>
        {isLoading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" />
          </View>
        ) : error ? (
          <View style={styles.centered}>
            <Text style={styles.errorText}>{error}</Text>
            <Button onPress={fetchUserWines}>Retry</Button>
          </View>
        ) : userWines.length > 0 ? (
          <FlatList
            data={userWines}
            renderItem={renderWineItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
          />
        ) : (
          <View style={styles.emptyState}>
            <Text variant="bodyLarge" style={styles.emptyText}>
              No wines found matching your criteria.
            </Text>
            {/* Optional: Add a button to clear filters or search */}
          </View>
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9F9F9', // Slightly off-white background
  },
  headerContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  searchBar: {
    marginBottom: 8,
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-start', // Align actions to the start
    alignItems: 'center',
    gap: 8, // Add gap between buttons
  },
  quickFilterContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  chip: {
    marginRight: 8, // Space between chips
  },
  content: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  errorText: {
    color: 'red',
    marginBottom: 16,
    textAlign: 'center',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 16, // Add padding at the bottom of the list
  },
  wineItem: {
    backgroundColor: 'white',
    padding: 16,
    marginBottom: 12, // Space between items
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#eee', // Subtle border
  },
  emptyState: {
    flex: 1, // Take remaining space
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  emptyText: {
    textAlign: 'center',
    marginBottom: 16,
    color: '#666', // Lighter text for empty state
  },
});

export default MyWinesScreen;
