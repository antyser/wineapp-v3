import React, { useEffect, useState } from 'react';
import { StyleSheet, View, FlatList, TouchableOpacity, Alert, ActivityIndicator, Image } from 'react-native';
import { Text, Divider, Card } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { Wine, SearchHistoryItemResponse } from '../api';
import WineListItem from './WineListItem';
import { formatTimeAgo } from '../utils/dateUtils';
import { getCountryFlagEmoji } from '../utils/countryUtils';
import { getFormattedWineName } from '../utils/wineUtils';
import { getSearchHistory } from '../api/services/searchService';
import { useAuth } from '../auth/AuthContext';

interface SearchHistoryListProps {
  onSearchPress?: (query: string) => void;
  maxItems?: number;
  ListHeaderComponent?: React.ComponentType<any> | React.ReactElement | null | undefined;
}

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const SearchHistoryList: React.FC<SearchHistoryListProps> = ({ 
  onSearchPress,
  maxItems = 10,
  ListHeaderComponent
}) => {
  const [history, setHistory] = useState<SearchHistoryItemResponse[]>([]);
  const [componentLoading, setComponentLoading] = useState(true);
  const [error, setError] = useState('');
  const navigation = useNavigation<NavigationProp>();
  const { isLoading: isAuthLoading, isAuthenticated } = useAuth();

  useEffect(() => {
    if (!isAuthLoading && isAuthenticated) {
      fetchSearchHistory();
    } else if (!isAuthLoading && !isAuthenticated) {
      setError('Authentication required to view history.');
      setComponentLoading(false);
    }
  }, [isAuthLoading, isAuthenticated, maxItems]);

  const fetchSearchHistory = async () => {
    setComponentLoading(true);
    setError('');
    try {
      const historyItems = await getSearchHistory(maxItems, 0);
      setHistory(historyItems);
    } catch (err) {
      console.error('Error fetching search history:', err);
      setError('Failed to load search history');
    } finally {
      setComponentLoading(false);
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
      if(item.search_type === 'image') {
        Alert.alert("No Results", "No wines were found for this image search.");
      }
    }
  };

  const renderTextSearchItem = (item: SearchHistoryItemResponse) => {
    const firstWine = item.wines?.[0];
    
    if (!firstWine) {
      return (
        <TouchableOpacity 
          style={styles.textHistoryItem}
          onPress={() => handleSearchItemPress(item)}
        >
          <Text style={styles.textQuery}>{item.search_query}</Text>
          <Text style={styles.textTimestamp}>{formatTimeAgo(item.created_at)}</Text>
        </TouchableOpacity>
      );
    }
    
    return (
      <WineListItem 
        wine={firstWine}
        onPress={() => handleSearchItemPress(item)}
      />
    );
  }

  const renderImageSearchItem = (item: SearchHistoryItemResponse) => {
    const firstWine = item.wines?.[0];
    
    // Use scan file URL if available, otherwise check if first wine has an image
    const imageUrl = item.search_type === 'image' ? item.search_query : (firstWine?.image_url || null);
    
    return (
      <TouchableOpacity onPress={() => handleSearchItemPress(item)}>
        <Card style={styles.imageSearchCard}>
          <Card.Content style={styles.imageSearchContent}>
            <View style={styles.scanImageContainer}>
              {imageUrl ? (
                <Image 
                  source={{ uri: imageUrl }} 
                  style={styles.scanImage} 
                  resizeMode="cover"
                />
              ) : (
                <View style={styles.scanImagePlaceholder} />
              )}
            </View>
            
            <View style={styles.imageSearchDetails}>
              {firstWine ? (
                <View style={styles.wineFoundContainer}>
                  <Text style={styles.wineFoundName} numberOfLines={2}>
                    {getFormattedWineName(firstWine)}
                  </Text>
                  {firstWine.region && (
                    <Text style={styles.wineFoundRegion}>
                      {firstWine.country && getCountryFlagEmoji(firstWine.country) + " "}
                      From {firstWine.region || firstWine.country || "Unknown region"}
                    </Text>
                  )}
                </View>
              ) : (
                <View style={styles.noWineFoundContainer}>
                  <Text style={styles.noWineFoundText}>
                    We're not sure about this wine
                  </Text>
                </View>
              )}
              
              <View style={styles.scannedContainer}>
                <Text style={styles.scannedText}>Scanned</Text>
                <Text style={styles.scannedTimestamp}>{formatTimeAgo(item.created_at)}</Text>
              </View>
            </View>
          </Card.Content>
        </Card>
      </TouchableOpacity>
    );
  }

  const renderSearchItem = ({ item }: { item: SearchHistoryItemResponse }) => {
    if (item.search_type === 'text') {
      return renderTextSearchItem(item);
    } else { // image search
      return renderImageSearchItem(item);
    }
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
      ItemSeparatorComponent={() => <Divider style={styles.divider}/>}
      contentContainerStyle={styles.listContainer}
      ListHeaderComponent={ListHeaderComponent}
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
  listContainer: {
    paddingBottom: 8,
  },
  textHistoryItem: {
    paddingVertical: 12,
    paddingHorizontal: 4,
  },
  textQuery: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  textTimestamp: {
    fontSize: 13,
    color: '#666',
  },
  divider: {
    marginVertical: 8,
  },
  imageSearchCard: {
    marginVertical: 8,
    borderRadius: 8,
    elevation: 2,
  },
  imageSearchContent: {
    flexDirection: 'row',
    padding: 12,
  },
  scanImageContainer: {
    width: 80,
    height: 80,
    borderRadius: 6,
    overflow: 'hidden',
    marginRight: 12,
  },
  scanImage: {
    width: '100%',
    height: '100%',
  },
  scanImagePlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#e0e0e0',
  },
  imageSearchDetails: {
    flex: 1,
    justifyContent: 'space-between',
  },
  wineFoundContainer: {
    flex: 1,
    justifyContent: 'center',
    marginBottom: 8,
  },
  wineFoundName: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  wineFoundRegion: {
    fontSize: 14,
    color: '#666',
  },
  noWineFoundContainer: {
    flex: 1,
    justifyContent: 'center',
    marginBottom: 8,
  },
  noWineFoundText: {
    fontSize: 15,
    fontStyle: 'italic',
    color: '#666',
  },
  scannedContainer: {
    marginTop: 6,
  },
  scannedText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  scannedTimestamp: {
    fontSize: 12,
    color: '#999',
  }
});

export default SearchHistoryList;