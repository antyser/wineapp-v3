import React, { useState, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { ActivityIndicator, Appbar, Button, Dialog, Portal, Text } from 'react-native-paper';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { api } from '../api';
import { CellarWineResponse, Cellar } from '../api/generated';
import { RootStackParamList } from '../navigation/types';
import CellarWineList from '../components/cellar/CellarWineList';

// Define valid status types
type WineStatus = 'in_stock' | 'consumed' | 'gifted' | 'sold';

const CellarDetailScreen = ({ route, navigation }: NativeStackScreenProps<RootStackParamList, 'CellarDetail'>) => {
  const { cellarId } = route.params;
  const [cellar, setCellar] = useState<Cellar | null>(null);
  const [wines, setWines] = useState<CellarWineResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    visible: boolean;
    wineId: string;
    action: string;
    newStatus: WineStatus;
  }>({
    visible: false,
    wineId: '',
    action: '',
    newStatus: 'in_stock'
  });

  useEffect(() => {
    fetchCellarDetails();
  }, [cellarId]);

  const fetchCellarDetails = async () => {
    try {
      setLoading(true);
      console.log(`Fetching cellar details for cellarId: ${cellarId}`);

      const cellarResponse = await api.getCellarApiV1CellarsCellarIdGet({
        path: { cellar_id: cellarId }
      });
      setCellar(cellarResponse.data);
      console.log('Cellar data loaded:', cellarResponse.data);

      const winesResponse = await api.listCellarWinesApiV1CellarsCellarIdWinesGet({
        path: { cellar_id: cellarId }
      });
      console.log('Wines data loaded:', winesResponse.data);

      setWines(winesResponse.data?.items || []);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch cellar details:', err);
      setError('Failed to load cellar details. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateQuantity = async (wine: CellarWineResponse, quantity: number) => {
    try {
      await api.updateCellarWineApiV1CellarsWinesCellarWineIdPatch({
        path: { cellar_wine_id: wine.id },
        body: { quantity }
      });

      // Update local state to reflect change
      setWines(wines.map(w => w.id === wine.id ? { ...w, quantity } : w));
    } catch (err) {
      console.error('Failed to update quantity:', err);
      // Show error toast or message
    }
  };

  // Accept string status to match component props, then validate inside
  const handleStatusChange = (wine: CellarWineResponse, status: string) => {
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
      
      await api.updateCellarWineApiV1CellarsWinesCellarWineIdPatch({
        path: { cellar_wine_id: wineId },
        body: { status: newStatus }
      });

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

  const handleWinePress = (wine: CellarWineResponse) => {
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
