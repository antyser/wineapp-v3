import React, { useState, useEffect } from 'react';
import { StyleSheet, View, ScrollView } from 'react-native';
import { Text, Button, useTheme, Chip, FAB, Divider, Portal, Modal, ActivityIndicator } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { CellarList } from '../components/cellar';
import { api } from '../api';
import { Cellar } from '../api/generated';
import ConfirmDialog from '../components/common/ConfirmDialog';

const MyWinesScreen = () => {
  const theme = useTheme();
  const navigation = useNavigation();
  const [activeTab, setActiveTab] = useState('cellar');

  // Cellar state
  const [cellars, setCellars] = useState<Cellar[]>([]);
  const [cellarBottleCounts, setCellarBottleCounts] = useState<Record<string, number>>({});
  const [loadingCellars, setLoadingCellars] = useState(true);
  const [cellarError, setCellarError] = useState<string | null>(null);

  // Action modals
  const [confirmDeleteVisible, setConfirmDeleteVisible] = useState(false);
  const [cellarToDelete, setCellarToDelete] = useState<Cellar | null>(null);

  useEffect(() => {
    fetchCellars();
  }, []);

  const fetchCellars = async () => {
    try {
      setLoadingCellars(true);
      setCellarError(null);

      // In a real app, you'd filter by the current user's ID
      const result = await api.listCellarsApiV1CellarsGet();
      setCellars(result.data.items);

      // Fetch bottle counts for each cellar
      const counts: Record<string, number> = {};
      for (const cellar of result.data.items) {
        try {
          const stats = await api.getCellarStatisticsApiV1CellarsCellarIdStatisticsGet({
            path: { cellar_id: cellar.id }
          });
          counts[cellar.id] = stats.data.total_bottles;
        } catch (err) {
          console.error(`Failed to fetch statistics for cellar ${cellar.id}:`, err);
          counts[cellar.id] = 0;
        }
      }

      setCellarBottleCounts(counts);
    } catch (err) {
      console.error('Failed to fetch cellars:', err);
      setCellarError('Failed to load your cellars. Please try again.');
    } finally {
      setLoadingCellars(false);
    }
  };

  const handleCellarPress = (cellar: Cellar) => {
    navigation.navigate('CellarDetail', { cellarId: cellar.id });
  };

  const handleEditCellar = (cellar: Cellar) => {
    navigation.navigate('CellarForm', { cellar });
  };

  const handleDeleteCellar = (cellar: Cellar) => {
    setCellarToDelete(cellar);
    setConfirmDeleteVisible(true);
  };

  const confirmDeleteCellar = async () => {
    if (!cellarToDelete) return;

    try {
      await api.deleteCellarApiV1CellarsCellarIdDelete({
        path: { cellar_id: cellarToDelete.id }
      });
      setCellars(cellars.filter(c => c.id !== cellarToDelete.id));
      setConfirmDeleteVisible(false);
      setCellarToDelete(null);
    } catch (err) {
      console.error('Failed to delete cellar:', err);
      // Could show an error message here
    }
  };

  const handleAddCellar = () => {
    navigation.navigate('CellarForm');
  };

  const handleAddWine = () => {
    if (activeTab === 'cellar' && cellars.length > 0) {
      // Navigate to wine search with context about being in cellars tab
      navigation.navigate('WineSearch', {
        returnScreen: 'MyWines',
        context: 'cellar'
      });
    } else if (activeTab === 'wishlist') {
      // Navigate to wine search with wishlist context
      navigation.navigate('WineSearch', {
        returnScreen: 'MyWines',
        context: 'wishlist'
      });
    } else if (activeTab === 'tastings') {
      // Navigate to wine search with tasting note context
      navigation.navigate('WineSearch', {
        returnScreen: 'MyWines',
        context: 'tastingNote'
      });
    } else {
      // If in cellars tab but no cellars exist, create cellar first
      handleAddCellar();
    }
  };

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
        <View style={styles.content}>
          {cellars.length > 0 ? (
            <CellarList
              cellars={cellars}
              cellarBottleCounts={cellarBottleCounts}
              loading={loadingCellars}
              error={cellarError || undefined}
              onCellarPress={handleCellarPress}
              onEditCellar={handleEditCellar}
              onDeleteCellar={handleDeleteCellar}
              onAddCellar={handleAddCellar}
            />
          ) : loadingCellars ? (
            <View style={styles.centered}>
              <ActivityIndicator size="large" />
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Text variant="bodyLarge" style={styles.emptyText}>
                You don't have any cellars yet. Create one to get started!
              </Text>
              <Button
                mode="contained"
                onPress={handleAddCellar}
                style={styles.emptyButton}
              >
                Create Cellar
              </Button>
            </View>
          )}
        </View>
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
              onPress={handleAddWine}
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
              onPress={handleAddWine}
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
        onPress={handleAddWine}
      />

      <Portal>
        <Modal
          visible={confirmDeleteVisible}
          onDismiss={() => setConfirmDeleteVisible(false)}
          contentContainerStyle={styles.modalContent}
        >
          <Text variant="titleMedium" style={styles.modalTitle}>
            Delete Cellar
          </Text>
          <Text variant="bodyMedium" style={styles.modalText}>
            Are you sure you want to delete "{cellarToDelete?.name}"? This action cannot be undone.
          </Text>
          <View style={styles.modalActions}>
            <Button
              mode="outlined"
              onPress={() => setConfirmDeleteVisible(false)}
              style={styles.modalButton}
            >
              Cancel
            </Button>
            <Button
              mode="contained"
              onPress={confirmDeleteCellar}
              style={[styles.modalButton, styles.deleteButton]}
              buttonColor="#D32F2F"
            >
              Delete
            </Button>
          </View>
        </Modal>
      </Portal>
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
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionTitle: {
    marginBottom: 16,
    fontWeight: 'bold',
    paddingHorizontal: 16,
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
  modalContent: {
    backgroundColor: 'white',
    padding: 20,
    margin: 20,
    borderRadius: 8,
  },
  modalTitle: {
    marginBottom: 16,
    fontWeight: 'bold',
  },
  modalText: {
    marginBottom: 20,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  modalButton: {
    marginLeft: 10,
  },
  deleteButton: {
    backgroundColor: '#D32F2F',
  },
});

export default MyWinesScreen;
