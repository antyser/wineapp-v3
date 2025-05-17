import React, { useEffect, useState, useCallback } from 'react';
import { StyleSheet, View, FlatList, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { Text, Divider, Card, Icon } from 'react-native-paper';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { Wine, SearchHistoryItemResponse } from '../api';
import { formatTimeAgo } from '../utils/dateUtils';
import { getCountryFlagEmoji } from '../utils/countryUtils';
import { getFormattedWineName } from '../utils/wineUtils';
import { getSearchHistory } from '../api/services/searchService';
import { useAuth } from '../auth/AuthContext';
import { Image } from 'expo-image';

// Import default images
const redDefaultImage = require('../../assets/images/red_default_realistic.png');
const whiteDefaultImage = require('../../assets/images/white_default_realistic.png');
const winePlaceholder = require('../../assets/images/wine-placeholder.png');

interface SearchHistoryListProps {
  onSearchPress?: (query: string) => void;
  maxItems?: number;
  ListHeaderComponent?: React.ComponentType<any> | React.ReactElement | null | undefined;
  containerStyle?: object;
}

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const SearchHistoryList: React.FC<SearchHistoryListProps> = ({ 
  onSearchPress,
  maxItems = 5,
  ListHeaderComponent,
  containerStyle
}) => {
  const [history, setHistory] = useState<SearchHistoryItemResponse[]>([]);
  const [componentLoading, setComponentLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState('');
  const navigation = useNavigation<NavigationProp>();
  const { isLoading: isAuthLoading, isAuthenticated } = useAuth();

  const fetchSearchHistoryCallback = useCallback(async (currentOffset = 0) => {
    if (!isAuthenticated) {
      setError('Authentication required to view history.');
      setComponentLoading(false);
      setHistory([]); // Clear history if not authenticated
      return;
    }

    if (currentOffset === 0) {
      setComponentLoading(true);
    } else {
      setLoadingMore(true);
    }
    
    setError('');
    try {
      const historyItems = await getSearchHistory(maxItems, currentOffset);
      
      if (currentOffset === 0) {
        setHistory(historyItems);
      } else {
        setHistory(prevHistory => [...prevHistory, ...historyItems]);
      }
      
      setHasMore(historyItems.length === maxItems);
    } catch (err) {
      console.error('Error fetching search history:', err);
      setError('Failed to load search history');
    } finally {
      setComponentLoading(false);
      setLoadingMore(false);
    }
  }, [isAuthenticated, maxItems]);

  // Effect for initial load and auth changes
  useEffect(() => {
    if (!isAuthLoading) {
        fetchSearchHistoryCallback(0); // Initial fetch or when auth changes
    }
  }, [isAuthLoading, isAuthenticated, fetchSearchHistoryCallback]);

  // Effect for refreshing when the screen comes into focus
  useFocusEffect(
    useCallback(() => {
      if (!isAuthLoading && isAuthenticated) {
        // Fetch history from the beginning when screen is focused
        fetchSearchHistoryCallback(0);
      }
      // Optional: return a cleanup function if needed, though not strictly necessary for this fetch
      return () => {}; 
    }, [isAuthLoading, isAuthenticated, fetchSearchHistoryCallback])
  );

  const handleLoadMore = () => {
    if (!loadingMore && hasMore && isAuthenticated) { // Ensure authenticated before loading more
      const newOffset = offset + maxItems;
      setOffset(newOffset);
      fetchSearchHistoryCallback(newOffset);
    }
  };

  const handleSearchItemPress = (item: SearchHistoryItemResponse) => {
    const wines = item.wines;

    if (wines && wines.length > 0) {
      if (wines.length === 1) {
        navigation.navigate('WineDetail', { wineId: wines[0].id });
      } else {
        const source = item.search_type === 'image' ? 'scan' : 'search';
        navigation.navigate('SearchResults', { 
          wines: wines, 
          title: 'Search History Results',
          source: source
        });
      }
    } else if (item.search_type === 'text' && item.search_query && onSearchPress) {
      onSearchPress(item.search_query);
    } else {
      console.log("No actionable result for this history item:", item);
    }
  };

  const renderSearchItem = ({ item }: { item: SearchHistoryItemResponse }) => {
    const firstWine = item.wines?.[0];
    const isImageSearch = item.search_type === 'image';
    
    let imageSource: any = null;

    if (isImageSearch && item.search_query) {
      imageSource = { uri: item.search_query };
    } else if (firstWine?.image_url) {
      imageSource = { uri: firstWine.image_url };
    } else if (firstWine) {
      imageSource = firstWine.type && firstWine.type.toLowerCase() === 'red' ? redDefaultImage : whiteDefaultImage;
    } else if (isImageSearch) {
      // Fallback for image search if search_query (scanned image) is somehow null but we know it was an image search
      // Or if no wine was identified from the scan
      imageSource = whiteDefaultImage; // Or a more generic "scanned image placeholder"
    }

    return (
      <TouchableOpacity onPress={() => handleSearchItemPress(item)}>
        <Card style={styles.card}>
          <Card.Content style={styles.cardContent}>
            <View style={styles.imageContainer}>
              {imageSource ? (
                <Image 
                  source={imageSource} 
                  style={styles.image} 
                  resizeMode="cover" // cover might be better for cards, or contain if full bottle is desired
                  placeholder={winePlaceholder}
                  transition={300}
                />
              ) : (
                <View style={[styles.image, styles.imagePlaceholder]}>
                   <Icon source="text-search" size={30} color="#999" />
                </View>
              )}
            </View>
            
            <View style={styles.detailsContainer}>
              {firstWine ? (
                <View style={styles.infoContainer}>
                  <Text style={styles.wineName} numberOfLines={2}>
                    {getFormattedWineName(firstWine)}
                  </Text>
                  {(firstWine.region || firstWine.country) && (
                    <Text style={styles.wineRegion} numberOfLines={1}>
                      {firstWine.country && getCountryFlagEmoji(firstWine.country) + " "}
                      {firstWine.region || firstWine.country}
                    </Text>
                  )}
                </View>
              ) : (
                <View style={styles.infoContainer}>
                   <Text style={styles.queryText} numberOfLines={2}>
                     {isImageSearch ? "Scanned Image" : item.search_query || "Search"}
                   </Text>
                   {!isImageSearch && item.search_query && (
                    <Text style={styles.noWineFoundText}>No specific wine found in history</Text>
                   )}
                   {isImageSearch && (
                     <Text style={styles.noWineFoundText}>We're not sure about this wine</Text>
                   )}
                </View>
              )}
              
              <View style={styles.timestampContainer}>
                <Text style={styles.timestampText}>
                  {isImageSearch ? 'Scanned' : 'Searched'} {formatTimeAgo(item.created_at)}
                </Text>
              </View>
            </View>
          </Card.Content>
        </Card>
      </TouchableOpacity>
    );
  };

  const renderFooter = () => {
    if (!loadingMore) return null;
    
    return (
      <View style={styles.footer}>
        <ActivityIndicator size="small" />
      </View>
    );
  };

  if (componentLoading || isAuthLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text>{error}</Text>
      </View>
    );
  }

  if (history.length === 0) {
    return (
      <View style={styles.centered}>
        <Text>No search history yet</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={history}
      renderItem={renderSearchItem}
      keyExtractor={(item) => item.id}
      style={[styles.list, containerStyle]}
      ListHeaderComponent={ListHeaderComponent}
      ListFooterComponent={renderFooter}
      onEndReached={handleLoadMore}
      onEndReachedThreshold={0.3}
    />
  );
};

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  list: {
    flex: 1,
  },
  card: {
    borderRadius: 0,
    elevation: 0,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e0e0e0',
  },
  cardContent: {
    flexDirection: 'row',
    padding: 10,
    alignItems: 'center',
  },
  imageContainer: {
    width: 60,
    height: 80,
    borderRadius: 4,
    overflow: 'hidden',
    marginRight: 12,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#e9e9e9',
  },
  detailsContainer: {
    flex: 1,
    justifyContent: 'space-between',
    height: 80,
  },
  infoContainer: {
     flex: 1,
     justifyContent: 'center',
     paddingRight: 5,
  },
  wineName: {
    fontSize: 15,
    fontWeight: '500',
    marginBottom: 3,
  },
  wineRegion: {
    fontSize: 13,
    color: '#555',
  },
  queryText: {
    fontSize: 15,
    fontWeight: '500',
    marginBottom: 3,
  },
  noWineFoundText: {
    fontSize: 13,
    fontStyle: 'italic',
    color: '#777',
  },
  timestampContainer: {
  },
  timestampText: {
    fontSize: 12,
    color: '#888',
    textAlign: 'left',
  },
  footer: {
    padding: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default SearchHistoryList;