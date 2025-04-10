import React, { useState, useEffect } from 'react';
import { StyleSheet, View, TouchableOpacity } from 'react-native';
import { Appbar, Searchbar, Text, Button, Chip } from 'react-native-paper';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import WineList from '../components/wine/WineList';
import { Wine } from '../types/wine';
import { wineService } from '../api/wineService';
import { supabase } from '../lib/supabase';
import { apiClient } from '../api/apiClient';

type WineSearchScreenRouteProp = RouteProp<RootStackParamList, 'WineSearch'>;
type WineSearchScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

// Filter options for the search
const filterOptions = {
  wineTypes: ['Red', 'White', 'Rosé', 'Sparkling', 'Dessert'],
  regions: ['France', 'Italy', 'Spain', 'United States', 'Australia', 'Other'],
};

const WineSearchScreen = () => {
  const navigation = useNavigation<WineSearchScreenNavigationProp>();
  const route = useRoute<WineSearchScreenRouteProp>();

  // Initialize search query from route params if available
  const [searchQuery, setSearchQuery] = useState(route.params?.initialQuery || '');
  const [searchResults, setSearchResults] = useState<Wine[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(1);
  const [activeFilters, setActiveFilters] = useState<{
    wineType?: string;
    region?: string;
  }>({});
  const [noResults, setNoResults] = useState(false);

  // Perform initial search if initialQuery is provided
  useEffect(() => {
    if (route.params?.initialQuery) {
      performSearch(true);
    }
  }, []);

  const performSearch = async (newSearch = true) => {
    try {
      if (newSearch) {
        setLoading(true);
        setPage(1);
      }

      // Make sure we have a search query
      if (!searchQuery.trim()) {
        setError('Please enter a search term');
        setLoading(false);
        return;
      }

      setError('');
      
      try {
        // Use wineService.searchWines function to search for wines
        const wines = await wineService.searchWines(searchQuery);
        
        // Navigate appropriately based on results
        if (wines && wines.length > 0) {
          // If exactly one wine is found, go directly to wine detail
          if (wines.length === 1) {
            navigation.navigate('WineDetail', { wineId: wines[0].id });
          } else {
            // Otherwise show search results
            navigation.navigate('SearchResults', {
              wines,
              title: `Results for "${searchQuery}"`,
              source: 'search'
            });
          }
        } else {
          setNoResults(true);
        }
      } catch (error) {
        console.error('Error searching wines:', error);
        setError('Failed to search for wines. Please try again.');
      }
    } catch (error) {
      console.error('Search error:', error);
      setError('Failed to search for wines. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle search submission
  const handleSearch = () => {
    if (searchQuery.trim()) {
      performSearch(true);
    }
  };

  // Handle load more when reaching end of list
  const handleLoadMore = () => {
    // Currently not applicable with the new API 
    // Could be implemented later if the API supports pagination
  };

  // Handle wine selection
  const handleWinePress = (wine: Wine) => {
    navigation.navigate('WineDetail', { wineId: wine.id });
  };

  // Handle filter toggle
  const toggleFilter = (type: 'wineType' | 'region', value: string) => {
    setActiveFilters(prev => {
      const newFilters = { ...prev };

      if (newFilters[type] === value) {
        // If the same filter is selected, remove it
        delete newFilters[type];
      } else {
        // Otherwise set the new filter
        newFilters[type] = value;
      }

      return newFilters;
    });
  };

  // Apply filters
  useEffect(() => {
    if (searchQuery.trim()) {
      performSearch(true);
    }
  }, [activeFilters]);

  // Handle type filter
  const renderTypeFilters = () => (
    <View style={styles.filterRow}>
      <Text variant="bodyMedium" style={styles.filterLabel}>Type:</Text>
      <View style={styles.chipContainer}>
        {filterOptions.wineTypes.map(type => (
          <Chip
            key={type}
            mode={activeFilters.wineType === type ? 'flat' : 'outlined'}
            selected={activeFilters.wineType === type}
            onPress={() => toggleFilter('wineType', type)}
            style={styles.filterChip}
          >
            {type}
          </Chip>
        ))}
      </View>
    </View>
  );

  // Handle region filter
  const renderRegionFilters = () => (
    <View style={styles.filterRow}>
      <Text variant="bodyMedium" style={styles.filterLabel}>Region:</Text>
      <View style={styles.chipContainer}>
        {filterOptions.regions.map(region => (
          <Chip
            key={region}
            mode={activeFilters.region === region ? 'flat' : 'outlined'}
            selected={activeFilters.region === region}
            onPress={() => toggleFilter('region', region)}
            style={styles.filterChip}
          >
            {region}
          </Chip>
        ))}
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <Appbar.Header>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content title="Search Wines" />
        <Appbar.Action icon="camera" onPress={() => navigation.navigate('ScanLabel')} />
        <Appbar.Action icon="plus" onPress={() => navigation.navigate('AddWine')} />
      </Appbar.Header>

      <View style={styles.searchContainer}>
        <Searchbar
          placeholder="Search by wine name, producer, region..."
          onChangeText={setSearchQuery}
          value={searchQuery}
          onSubmitEditing={handleSearch}
          style={styles.searchBar}
        />
      </View>

      <View style={styles.filtersContainer}>
        {renderTypeFilters()}
        {renderRegionFilters()}
      </View>

      {searchResults.length > 0 ? (
        <WineList
          wines={searchResults}
          loading={loading}
          error={error}
          onWinePress={handleWinePress}
          onEndReached={handleLoadMore}
          hasMore={hasMore}
        />
      ) : (
        <View style={styles.emptyContainer}>
          {error ? (
            <Text variant="bodyLarge">{error}</Text>
          ) : searchQuery.trim() && !loading ? (
            <Text variant="bodyLarge">No wines found. Try a different search.</Text>
          ) : (
            <Text variant="bodyLarge">
              Search for wines by name, producer, region, or grape variety.
            </Text>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchContainer: {
    padding: 12,
  },
  searchBar: {
    elevation: 2,
  },
  filtersContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  filterRow: {
    marginBottom: 12,
  },
  filterLabel: {
    fontWeight: 'bold',
    marginBottom: 8,
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  filterChip: {
    marginRight: 8,
    marginBottom: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
});

export default WineSearchScreen;
