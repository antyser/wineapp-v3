import React from 'react';
import { StyleSheet, View, ScrollView } from 'react-native';
import { Text, Button, useTheme, Card, Chip, FAB, Divider } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';

const MyWinesScreen = () => {
  const theme = useTheme();
  const [activeTab, setActiveTab] = React.useState('cellar');

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.tabContainer}>
        <Chip
          selected={activeTab === 'cellar'}
          onPress={() => setActiveTab('cellar')}
          style={styles.tab}
          selectedColor={theme.colors.primary}
        >
          My Cellar
        </Chip>
        <Chip
          selected={activeTab === 'wishlist'}
          onPress={() => setActiveTab('wishlist')}
          style={styles.tab}
          selectedColor={theme.colors.primary}
        >
          Wishlist
        </Chip>
        <Chip
          selected={activeTab === 'tastings'}
          onPress={() => setActiveTab('tastings')}
          style={styles.tab}
          selectedColor={theme.colors.primary}
        >
          Tastings
        </Chip>
      </View>
      
      <Divider />
      
      {activeTab === 'cellar' && (
        <ScrollView style={styles.content}>
          <Text variant="titleLarge" style={styles.sectionTitle}>
            My Cellar
          </Text>
          
          {/* Empty state for now */}
          <View style={styles.emptyState}>
            <Text variant="bodyLarge" style={styles.emptyText}>
              Your cellar is empty. Add wines to get started!
            </Text>
            <Button 
              mode="contained" 
              onPress={() => {}} 
              style={styles.emptyButton}
            >
              Add Wine
            </Button>
          </View>
        </ScrollView>
      )}
      
      {activeTab === 'wishlist' && (
        <ScrollView style={styles.content}>
          <Text variant="titleLarge" style={styles.sectionTitle}>
            Wishlist
          </Text>
          
          {/* Empty state for now */}
          <View style={styles.emptyState}>
            <Text variant="bodyLarge" style={styles.emptyText}>
              Your wishlist is empty. Add wines you want to try!
            </Text>
            <Button 
              mode="contained" 
              onPress={() => {}} 
              style={styles.emptyButton}
            >
              Add to Wishlist
            </Button>
          </View>
        </ScrollView>
      )}
      
      {activeTab === 'tastings' && (
        <ScrollView style={styles.content}>
          <Text variant="titleLarge" style={styles.sectionTitle}>
            Tasting Notes
          </Text>
          
          {/* Empty state for now */}
          <View style={styles.emptyState}>
            <Text variant="bodyLarge" style={styles.emptyText}>
              You haven't added any tasting notes yet.
            </Text>
            <Button 
              mode="contained" 
              onPress={() => {}} 
              style={styles.emptyButton}
            >
              Add Tasting Note
            </Button>
          </View>
        </ScrollView>
      )}
      
      <FAB
        icon="plus"
        style={styles.fab}
        onPress={() => {}}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9F9F9',
  },
  tabContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 16,
  },
  tab: {
    marginHorizontal: 4,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  sectionTitle: {
    marginBottom: 16,
    fontWeight: 'bold',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    marginTop: 40,
  },
  emptyText: {
    textAlign: 'center',
    marginBottom: 16,
  },
  emptyButton: {
    marginTop: 8,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    backgroundColor: '#8E2430',
  },
});

export default MyWinesScreen; 