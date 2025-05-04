import React from 'react';
import { StyleSheet, View, FlatList } from 'react-native';
import { Text, Appbar } from 'react-native-paper';
import { useRoute, RouteProp, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { Wine } from '../api';
import WineListItem from '../components/WineListItem';
import { getFormattedWineName } from '../utils/wineUtils';

type SearchResultsRouteProp = RouteProp<RootStackParamList, 'SearchResults'>;

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const SearchResultsScreen = () => {
  const route = useRoute<SearchResultsRouteProp>();
  const navigation = useNavigation<NavigationProp>();
  const { wines, title = 'Search Results', source = 'search' } = route.params;

  const handleWinePress = (wineId: string) => {
    navigation.navigate('WineDetail', { wineId });
  };

  const renderWineItem = ({ item }: { item: Wine }) => (
    <WineListItem 
      wine={item} 
      onPress={() => handleWinePress(item.id)} 
    />
  );

  return (
    <View style={styles.container}>
      <Appbar.Header>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content title={title} />
      </Appbar.Header>
      
      {source === 'scan' && (
        <Text style={styles.subtitle}>The following wines were identified from your scan:</Text>
      )}
      {source === 'search' && (
        <Text style={styles.subtitle}>Showing results for your search:</Text>
      )}
      {source === 'history' && (
        <Text style={styles.subtitle}>Wines found in this search history item:</Text>
      )}

      {wines.length === 0 ? (
        <View style={styles.centered}>
          <Text>No wines found.</Text>
        </View>
      ) : (
        <FlatList
          data={wines}
          renderItem={renderWineItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  subtitle: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    fontSize: 14,
    color: '#666',
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default SearchResultsScreen; 