import React from 'react';
import { StyleSheet, View, ScrollView } from 'react-native';
import { Text, Button, useTheme, Card, Searchbar } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';

const HomeScreen = () => {
  const theme = useTheme();
  const [searchQuery, setSearchQuery] = React.useState('');

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
        />
        
        <View style={styles.actionsContainer}>
          <Button 
            mode="contained" 
            icon="camera" 
            onPress={() => {}} 
            style={styles.actionButton}
          >
            Scan Label
          </Button>
          <Button 
            mode="contained" 
            icon="magnify" 
            onPress={() => {}} 
            style={styles.actionButton}
          >
            Browse Wines
          </Button>
        </View>
        
        <Text variant="titleLarge" style={styles.sectionTitle}>
          Recently Viewed
        </Text>
        
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.cardsScroll}>
          {[1, 2, 3].map((item) => (
            <Card key={item} style={styles.card}>
              <Card.Cover source={{ uri: 'https://placehold.co/200x300' }} />
              <Card.Content>
                <Text variant="titleMedium">Wine Name</Text>
                <Text variant="bodyMedium">Region - 2018</Text>
              </Card.Content>
            </Card>
          ))}
        </ScrollView>
        
        <Text variant="titleLarge" style={styles.sectionTitle}>
          Recommended for You
        </Text>
        
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.cardsScroll}>
          {[1, 2, 3].map((item) => (
            <Card key={item} style={styles.card}>
              <Card.Cover source={{ uri: 'https://placehold.co/200x300' }} />
              <Card.Content>
                <Text variant="titleMedium">Wine Name</Text>
                <Text variant="bodyMedium">Region - 2020</Text>
              </Card.Content>
            </Card>
          ))}
        </ScrollView>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9F9F9',
  },
  header: {
    padding: 16,
    marginBottom: 8,
  },
  title: {
    fontWeight: 'bold',
  },
  searchBar: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
  },
  actionButton: {
    flex: 1,
    marginHorizontal: 5,
  },
  sectionTitle: {
    marginLeft: 16,
    marginTop: 20,
    marginBottom: 10,
  },
  cardsScroll: {
    paddingLeft: 16,
  },
  card: {
    width: 180,
    marginRight: 16,
    marginBottom: 16,
  },
});

export default HomeScreen; 