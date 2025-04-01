import React, { useState, useEffect } from 'react';
import { StyleSheet, View, ActivityIndicator } from 'react-native';
import { Text, Appbar, Portal, Dialog, Button } from 'react-native-paper';
import { useRoute, useNavigation } from '@react-navigation/native';
import { CellarWineList } from '../components/cellar';
import cellarService from '../api/cellarService';
import { CellarWine, Cellar } from '../api/cellarService';

// Define valid status types
type WineStatus = 'in_stock' | 'consumed' | 'gifted' | 'sold';

const CellarDetailScreen = () => {
  const route = useRoute();
  const navigation = useNavigation<any>(); // Use any for simplicity
  const { cellarId } = route.params as { cellarId: string };

  const [cellar, setCellar] = useState<Cellar | null>(null);
  const [wines, setWines] = useState<CellarWine[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirmDialog, setConfirmDialog] = useState({
    visible: false,
    wineId: '',
    action: '',
    newStatus: '' as WineStatus, // Type as WineStatus
  });

  useEffect(() => {
    fetchCellarDetails();
  }, [cellarId]);

  const fetchCellarDetails = async () => {
    try {
      setLoading(true);
      console.log(`Fetching cellar details for cellarId: ${cellarId}`);

      const cellarData = await cellarService.getCellarById(cellarId);
      setCellar(cellarData);
      console.log('Cellar data loaded:', cellarData);

      // Call the corrected endpoint (/wines)
      const winesResult = await cellarService.getBottlesByCellarId(cellarId);
      console.log('Wines data loaded:', winesResult);

      // Update this to match the actual response structure
      setWines(winesResult.cellarWines || []);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch cellar details:', err);
      setError('Failed to load cellar details. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateQuantity = async (wine: CellarWine, quantity: number) => {
    try {
      // Ensure we use the correct method `updateBottle`
      await cellarService.updateBottle(wine.cellar_id, wine.id, { quantity });

      // Update local state to reflect change
      setWines(wines.map(w => w.id === wine.id ? { ...w, quantity } : w));
    } catch (err) {
      console.error('Failed to update quantity:', err);
      // Show error toast or message
    }
  };

  // Accept string status to match component props, then validate inside
  const handleStatusChange = (wine: CellarWine, status: string) => {
    // Validate that status is a valid WineStatus
    if (status !== 'in_stock' && status !== 'consumed' && status !== 'gifted' && status !== 'sold') {
      console.error(`Invalid status: ${status}`);
      return;
    }

    // Now we know it's a valid WineStatus
    const validStatus = status as WineStatus;

    setConfirmDialog({
      visible: true,
      wineId: wine.id,
      action: validStatus === 'consumed' ? 'consume' : validStatus === 'gifted' ? 'mark as gifted' : 'mark as sold',
      newStatus: validStatus,
    });
  };

  const confirmStatusChange = async () => {
    try {
      const { wineId, newStatus } = confirmDialog;
      // Find the wine to get its cellar_id
      const wine = wines.find(w => w.id === wineId);
      if (!wine) {
        throw new Error('Wine not found');
      }

      // Ensure we use the correct method `updateBottle`
      await cellarService.updateBottle(wine.cellar_id, wineId, { status: newStatus });

      // Update local state
      setWines(wines.map(w => w.id === wineId ? { ...w, status: newStatus } : w));
      setConfirmDialog({ ...confirmDialog, visible: false });
    } catch (err) {
      console.error('Failed to update status:', err);
      // Show error toast or message
    }
  };

  const handleAddWine = () => {
    // Navigate to wine search screen with cellar context
    navigation.navigate('WineSearch', {
      returnScreen: 'CellarDetail',
      cellarId
    });
  };

  const handleWinePress = (wine: CellarWine) => {
    // Navigate to wine detail screen
    navigation.navigate('WineDetail', { wineId: wine.wine_id });
  };

  if (loading && !cellar) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (error && !cellar) {
    return (
      <View style={styles.centered}>
        <Text>{error}</Text>
        <Button mode="contained" onPress={fetchCellarDetails} style={styles.button}>
          Retry
        </Button>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Appbar.Header>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content title={cellar?.name || 'Cellar'} />
        <Appbar.Action icon="pencil" onPress={() => navigation.navigate('EditCellar', { cellar })} />
        <Appbar.Action icon="information" onPress={() => navigation.navigate('CellarStats', { cellarId })} />
      </Appbar.Header>

      <CellarWineList
        wines={wines}
        loading={loading}
        error={error || undefined}
        onWinePress={handleWinePress}
        onUpdateQuantity={handleUpdateQuantity}
        onStatusChange={handleStatusChange}
        cellarSections={cellar?.sections}
        onAddWine={handleAddWine}
      />

      <Portal>
        <Dialog visible={confirmDialog.visible} onDismiss={() => setConfirmDialog({ ...confirmDialog, visible: false })}>
          <Dialog.Title>Confirm</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium">
              Are you sure you want to {confirmDialog.action} this wine?
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setConfirmDialog({ ...confirmDialog, visible: false })}>Cancel</Button>
            <Button onPress={confirmStatusChange}>Confirm</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  button: {
    marginTop: 16,
  },
});

export default CellarDetailScreen;
