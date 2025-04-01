import React, { useEffect, useState } from 'react';
import { StyleSheet, View, ScrollView, ActivityIndicator } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Appbar, Divider, Text, Button, Chip, Portal, Dialog, useTheme } from 'react-native-paper';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import WineCard from '../components/wine/WineCard';
import { Wine, wineService } from '../api/wineService';

type WineDetailScreenRouteProp = RouteProp<RootStackParamList, 'WineDetail'>;
type WineDetailScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

const WineDetailScreen = () => {
  const route = useRoute<WineDetailScreenRouteProp>();
  const navigation = useNavigation<WineDetailScreenNavigationProp>();
  const theme = useTheme();
  const { wineId } = route.params;

  const [wine, setWine] = useState<Wine | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isInWishlist, setIsInWishlist] = useState(false);
  const [showCellarDialog, setShowCellarDialog] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    const fetchWineDetails = async () => {
      try {
        setLoading(true);
        setError('');
        console.log(`Fetching wine details for ID: ${wineId}`);
        const data = await wineService.getWine(wineId);
        console.log('Successfully retrieved wine data:', data?.name);
        setWine(data);
        // Here we would also check if the wine is in the user's wishlist
        // For now we'll just set it to false
        setIsInWishlist(false);
      } catch (err) {
        console.error('Error fetching wine details:', err);
        setError('Failed to load wine details. Using cached data if available.');
        // If we already have wine data from a previous attempt, keep it
        if (!wine) {
          // Try to load from mock data directly as a fallback
          try {
            // Find the wine in the mockWines array (implementation detail handled in wineService)
            const mockWine = await wineService.getWine(wineId);
            if (mockWine) {
              setWine(mockWine);
              setError(''); // Clear error if we succeeded with mock data
            }
          } catch (mockErr) {
            setError('Unable to load wine details. Please try again later.');
          }
        }
      } finally {
        setLoading(false);
      }
    };

    fetchWineDetails();
  }, [wineId, retryCount]);

  const handleRetry = () => {
    setRetryCount(prevCount => prevCount + 1);
  };

  const handleAddToWishlist = () => {
    // This would be connected to the API in the future
    setIsInWishlist(!isInWishlist);
  };

  const handleAddToCellar = () => {
    // Show dialog to select cellar
    setShowCellarDialog(true);
  };

  const handleAddNote = () => {
    if (wine) {
      navigation.navigate('AddTastingNote', { wineId: wine.id });
    }
  };

  const handleConsume = () => {
    // To be implemented - would navigate to a consumption screen
    console.log('Consume wine:', wineId);
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Appbar.Header style={styles.appbar}>
          <Appbar.BackAction onPress={() => navigation.goBack()} />
          <Appbar.Content title="Loading Wine Details" />
        </Appbar.Header>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#000000" />
          <Text style={styles.loadingText}>Loading wine details...</Text>
        </View>
      </View>
    );
  }

  if (error && !wine) {
    return (
      <View style={styles.container}>
        <Appbar.Header style={styles.appbar}>
          <Appbar.BackAction onPress={() => navigation.goBack()} />
          <Appbar.Content title="Error" />
        </Appbar.Header>
        <View style={styles.centered}>
          <Text variant="bodyLarge" style={styles.errorText}>{error}</Text>
          <View style={styles.buttonRow}>
            <Button
              mode="outlined"
              onPress={handleRetry}
              style={styles.button}
              labelStyle={styles.buttonLabel}
            >
              Retry
            </Button>
            <Button
              mode="outlined"
              onPress={() => navigation.goBack()}
              style={styles.button}
              labelStyle={styles.buttonLabel}
            >
              Go Back
            </Button>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Appbar.Header style={styles.appbar}>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content title="Wine Details" />
      </Appbar.Header>

      {error && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorBannerText}>{error}</Text>
          <Button
            mode="text"
            onPress={handleRetry}
            labelStyle={styles.errorButtonLabel}
            compact
          >
            Retry
          </Button>
        </View>
      )}

      <ScrollView style={styles.scrollView}>
        {wine && (
          <WineCard
            wine={wine}
            onAddToWishlist={handleAddToWishlist}
            onAddToCellar={handleAddToCellar}
            onAddNote={handleAddNote}
            onConsume={handleConsume}
            isInWishlist={isInWishlist}
          />
        )}

        {/* Additional wine details */}
        {wine && wine.description && (
          <View style={styles.section}>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              About This Wine
            </Text>
            <Divider style={styles.divider} />

            {wine.description ? (
              <Text variant="bodyMedium">{wine.description}</Text>
            ) : (
              <Text variant="bodyMedium" style={styles.emptyText}>
                No description available.
              </Text>
            )}
          </View>
        )}

        {/* AI Insights Section - Placeholder for future implementation */}
        <View style={styles.section}>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            AI Insights
          </Text>
          <Divider style={styles.divider} />

          <View style={styles.insightRow}>
            <Text variant="bodyMedium" style={styles.insightLabel}>
              Food Pairing:
            </Text>
            <Text variant="bodyMedium" style={styles.insightValue}>
              Pairs well with grilled meats, strong cheeses, and chocolate desserts.
            </Text>
          </View>

          <View style={styles.insightRow}>
            <Text variant="bodyMedium" style={styles.insightLabel}>
              Drinking Window:
            </Text>
            <Text variant="bodyMedium" style={styles.insightValue}>
              2023 - 2030
            </Text>
          </View>
        </View>

        {/* Previous Tasting Notes - Placeholder for future implementation */}
        <View style={styles.section}>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            Your Tasting Notes
          </Text>
          <Divider style={styles.divider} />

          <Text variant="bodyMedium" style={styles.emptyText}>
            You haven't added any tasting notes for this wine yet.
          </Text>

          <Button
            mode="outlined"
            style={styles.button}
            labelStyle={styles.buttonLabel}
            onPress={handleAddNote}
          >
            Add Tasting Note
          </Button>
        </View>
      </ScrollView>

      {/* Dialog for selecting a cellar */}
      <Portal>
        <Dialog visible={showCellarDialog} onDismiss={() => setShowCellarDialog(false)}>
          <Dialog.Title>Add to Cellar</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium">
              Select a cellar to add this wine to:
            </Text>
            {/* This would be replaced with a list of user's cellars */}
            <Text variant="bodyMedium" style={styles.emptyText}>
              You don't have any cellars yet.
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button
              onPress={() => setShowCellarDialog(false)}
              labelStyle={styles.buttonLabel}
            >
              Cancel
            </Button>
            <Button
              onPress={() => {
                // Navigate to create cellar form
                navigation.navigate('CellarForm', {});
                setShowCellarDialog(false);
              }}
              labelStyle={styles.buttonLabel}
            >
              Create Cellar
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollView: {
    flex: 1,
  },
  appbar: {
    backgroundColor: '#FFFFFF',
    elevation: 0,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFFFFF',
  },
  section: {
    padding: 16,
    marginBottom: 8,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  sectionTitle: {
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#000000',
  },
  divider: {
    marginBottom: 16,
    backgroundColor: '#E0E0E0',
    height: 1,
  },
  insightRow: {
    marginBottom: 12,
  },
  insightLabel: {
    fontWeight: 'bold',
    marginBottom: 4,
    color: '#000000',
  },
  insightValue: {
    lineHeight: 20,
    color: '#000000',
  },
  emptyText: {
    fontStyle: 'italic',
    marginBottom: 16,
    color: '#000000',
  },
  button: {
    marginTop: 8,
    borderColor: '#000000',
    marginHorizontal: 8,
  },
  buttonLabel: {
    color: '#000000',
  },
  errorBanner: {
    backgroundColor: '#F8F8F8',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  errorBannerText: {
    color: '#000000',
    flex: 1,
  },
  errorButtonLabel: {
    color: '#000000',
    fontWeight: 'bold',
  },
  buttonRow: {
    flexDirection: 'row',
    marginTop: 16,
  },
  errorText: {
    marginBottom: 16,
    textAlign: 'center',
    color: '#000000',
  },
  loadingText: {
    marginTop: 16,
    color: '#000000',
  },
});

export default WineDetailScreen;
