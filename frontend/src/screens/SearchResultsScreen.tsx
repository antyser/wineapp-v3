import React, { useEffect } from 'react';
import { StyleSheet, View, ScrollView } from 'react-native';
import { Appbar, Text, useTheme } from 'react-native-paper';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { Wine } from '../types/wine';
import WineSection from '../components/WineSection';

type SearchResultsScreenRouteProp = RouteProp<RootStackParamList, 'SearchResults'>;
type SearchResultsScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

const SearchResultsScreen = () => {
  const route = useRoute<SearchResultsScreenRouteProp>();
  const navigation = useNavigation<SearchResultsScreenNavigationProp>();
  const theme = useTheme();
  const { wines, title = 'Search Results', source = 'search' } = route.params;

  // Automatically navigate to wine detail if there's only one result
  useEffect(() => {
    if (wines && wines.length === 1) {
      const wine = wines[0];
      navigation.replace('WineDetail', {
        wineId: wine.id,
        wine: wine
      });
    }
  }, [wines, navigation]);

  const handleWinePress = (wineId: string) => {
    // Find the wine in the results
    const selectedWine = wines.find(wine => wine.id === wineId);
    if (selectedWine) {
      navigation.navigate('WineDetail', { 
        wineId: selectedWine.id,
        wine: selectedWine
      });
    }
  };

  return (
    <View style={styles.container}>
      <Appbar.Header style={styles.appbar}>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content title={title} />
      </Appbar.Header>

      <ScrollView style={styles.content}>
        {wines.length > 0 ? (
          <>
            <Text style={styles.resultsText}>
              {source === 'scan' 
                ? 'The following wines were identified from your scan:'
                : `Found ${wines.length} wines matching your search:`}
            </Text>
            <WineSection
              title=""
              wines={wines}
              onWinePress={handleWinePress}
            />
          </>
        ) : (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              No wines found. Please try again with a different {source === 'scan' ? 'image' : 'search term'}.
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  appbar: {
    backgroundColor: '#FFFFFF',
  },
  content: {
    flex: 1,
  },
  resultsText: {
    margin: 16,
    fontSize: 16,
    color: '#000000',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    textAlign: 'center',
    fontSize: 16,
    color: '#666666',
  },
});

export default SearchResultsScreen; 