import React, { useState } from 'react';
import { StyleSheet, View, ScrollView, TouchableOpacity } from 'react-native';
import { Text, Button, useTheme, Card, Searchbar } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';

type HomeScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

const HomeScreen = () => {
  const theme = useTheme();
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearch = () => {
    if (searchQuery.trim()) {
      // If there's a search query, navigate directly to search with the query
      navigation.navigate('WineSearch', {
        initialQuery: searchQuery
      });
    } else {
      // Otherwise just navigate to the search screen
      navigation.navigate('WineSearch', {});
    }
  };

  const handleScanLabel = () => {
    navigation.navigate('ScanLabel');
  };

  const handleWinePress = (wineId: string) => {
    navigation.navigate('WineDetail', { wineId });
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        <View style={styles.header}>
          <Text variant="headlineMedium" style={styles.title}>
            Wine App
          </Text>
        </View>

        <Searchbar
          placeholder="Search for wines..."
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={styles.searchBar}
          iconColor="#000000"
          inputStyle={styles.searchInput}
          onSubmitEditing={handleSearch}
        />

        <View style={styles.actionsContainer}>
          <Button
            mode="outlined"
            icon="camera"
            onPress={handleScanLabel}
            style={styles.actionButton}
            labelStyle={styles.buttonLabel}
          >
            Scan Label
          </Button>
          <Button
            mode="outlined"
            icon="magnify"
            onPress={() => navigation.navigate('WineSearch', {})}
            style={styles.actionButton}
            labelStyle={styles.buttonLabel}
          >
            Browse Wines
          </Button>
        </View>

        <Text variant="titleLarge" style={styles.sectionTitle}>
          Recently Viewed
        </Text>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.cardsScroll}>
          {/* This would normally come from an API or local storage */}
          {[
            { id: '1', name: 'Château Margaux', region: 'Bordeaux', vintage: '2018', image: 'https://placehold.co/200x300/3498db/FFFFFF?text=Wine+1' },
            { id: '2', name: 'Opus One', region: 'Napa Valley', vintage: '2019', image: 'https://placehold.co/200x300/e74c3c/FFFFFF?text=Wine+2' },
            { id: '3', name: 'Tignanello', region: 'Tuscany', vintage: '2017', image: 'https://placehold.co/200x300/2ecc71/FFFFFF?text=Wine+3' },
          ].map((wine) => (
            <TouchableOpacity
              key={wine.id}
              onPress={() => handleWinePress(wine.id)}
            >
              <Card style={styles.card}>
                <Card.Cover source={{ uri: wine.image }} />
                <Card.Content>
                  <Text variant="titleMedium" style={styles.cardTitle}>{wine.name}</Text>
                  <Text variant="bodyMedium" style={styles.cardSubtitle}>{wine.region} - {wine.vintage}</Text>
                </Card.Content>
              </Card>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <Text variant="titleLarge" style={styles.sectionTitle}>
          Recommended for You
        </Text>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.cardsScroll}>
          {/* This would normally come from an API recommendation service */}
          {[
            { id: '4', name: 'Penfolds Grange', region: 'Australia', vintage: '2016', image: 'https://placehold.co/200x300/9b59b6/FFFFFF?text=Wine+4' },
            { id: '5', name: 'Screaming Eagle', region: 'Napa Valley', vintage: '2018', image: 'https://placehold.co/200x300/f39c12/FFFFFF?text=Wine+5' },
            { id: '6', name: 'Dom Pérignon', region: 'Champagne', vintage: '2010', image: 'https://placehold.co/200x300/1abc9c/FFFFFF?text=Wine+6' },
          ].map((wine) => (
            <TouchableOpacity
              key={wine.id}
              onPress={() => handleWinePress(wine.id)}
            >
              <Card style={styles.card}>
                <Card.Cover source={{ uri: wine.image }} />
                <Card.Content>
                  <Text variant="titleMedium" style={styles.cardTitle}>{wine.name}</Text>
                  <Text variant="bodyMedium" style={styles.cardSubtitle}>{wine.region} - {wine.vintage}</Text>
                </Card.Content>
              </Card>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    padding: 16,
    marginBottom: 8,
  },
  title: {
    fontWeight: 'bold',
    color: '#000000',
  },
  searchBar: {
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: '#F0F0F0',
    borderRadius: 8,
  },
  searchInput: {
    color: '#000000',
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
  },
  actionButton: {
    flex: 1,
    marginHorizontal: 5,
    borderColor: '#000000',
  },
  buttonLabel: {
    color: '#000000',
  },
  sectionTitle: {
    marginLeft: 16,
    marginTop: 20,
    marginBottom: 10,
    color: '#000000',
    fontWeight: 'bold',
  },
  cardsScroll: {
    paddingLeft: 16,
  },
  card: {
    width: 180,
    marginRight: 16,
    marginBottom: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    elevation: 2,
  },
  cardTitle: {
    color: '#000000',
    fontWeight: 'bold',
  },
  cardSubtitle: {
    color: '#000000',
  },
});

export default HomeScreen;
