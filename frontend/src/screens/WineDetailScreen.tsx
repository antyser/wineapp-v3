import React, { useEffect, useState } from 'react';
import { StyleSheet, View, ScrollView, ActivityIndicator } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Appbar, Divider, Text, Button, Chip, Portal, Dialog, useTheme } from 'react-native-paper';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import WineCard from '../components/wine/WineCard';
import { Wine } from '../types/wine';
import { wineService } from '../api/wineService';

type WineDetailScreenRouteProp = RouteProp<RootStackParamList, 'WineDetail'>;
type WineDetailScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

const WineDetailScreen = () => {
  const route = useRoute<WineDetailScreenRouteProp>();
  const navigation = useNavigation<WineDetailScreenNavigationProp>();
  const theme = useTheme();
  const { wineId, wine: routeWine } = route.params;

  const [wine, setWine] = useState<Wine | null>(routeWine || null);
  const [loading, setLoading] = useState(!routeWine);
  const [error, setError] = useState('');
  const [isInWishlist, setIsInWishlist] = useState(false);
  const [showCellarDialog, setShowCellarDialog] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    // If we already have the wine from route params, use it directly
    if (routeWine) {
      console.log('Using wine data from route params:', routeWine.name);
      setWine(routeWine);
      setLoading(false);
      return;
    }
    
    // Otherwise, fetch from API
    const fetchWineDetails = async () => {
      try {
        setLoading(true);
        setError('');
        console.log(`Fetching wine details for ID: ${wineId}`);
        const data = await wineService.getWineById(wineId);
        console.log('Successfully retrieved wine data:', data?.name);
        setWine(data);
        // Here we would also check if the wine is in the user's wishlist
        // For now we'll just set it to false
        setIsInWishlist(false);
      } catch (err) {
        console.error('Error fetching wine details:', err);
        setError('Failed to load wine details.');
      } finally {
        setLoading(false);
      }
    };

    fetchWineDetails();
  }, [wineId, routeWine, retryCount]);

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

        {/* AI Insights Section */}
        <View style={styles.section}>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            AI Insights
          </Text>
          <Divider style={styles.divider} />

          {wine?.food_pairings && (
            <View style={styles.insightRow}>
              <Text variant="bodyMedium" style={styles.insightLabel}>
                Food Pairing:
              </Text>
              <Text variant="bodyMedium" style={styles.insightValue}>
                {wine.food_pairings}
              </Text>
            </View>
          )}

          {wine?.drinking_window && (
            <View style={styles.insightRow}>
              <Text variant="bodyMedium" style={styles.insightLabel}>
                Drinking Window:
              </Text>
              <Text variant="bodyMedium" style={styles.insightValue}>
                {wine.drinking_window}
              </Text>
            </View>
          )}

          {wine?.abv && (
            <View style={styles.insightRow}>
              <Text variant="bodyMedium" style={styles.insightLabel}>
                ABV:
              </Text>
              <Text variant="bodyMedium" style={styles.insightValue}>
                {wine.abv}
              </Text>
            </View>
          )}

          {!wine?.food_pairings && !wine?.drinking_window && !wine?.abv && (
            <Text variant="bodyMedium" style={styles.emptyText}>
              No AI insights available for this wine.
            </Text>
          )}
        </View>

        {/* Winemaker Notes - New Section */}
        {wine?.winemaker_notes && (
          <View style={styles.section}>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              Winemaker Notes
            </Text>
            <Divider style={styles.divider} />
            <Text variant="bodyMedium">{wine.winemaker_notes}</Text>
          </View>
        )}

        {/* Professional Reviews - New Section */}
        {wine?.professional_reviews && (
          <View style={styles.section}>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              Professional Reviews
            </Text>
            <Divider style={styles.divider} />
            <Text variant="bodyMedium">{wine.professional_reviews}</Text>
          </View>
        )}

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
                // This would actually add the wine to the cellar
                setShowCellarDialog(false);
              }}
              labelStyle={styles.buttonLabel}
            >
              Confirm
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
  appbar: {
    backgroundColor: '#FFFFFF',
  },
  scrollView: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#000000',
  },
  errorText: {
    marginBottom: 16,
    textAlign: 'center',
    color: '#D32F2F',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 16,
  },
  button: {
    margin: 8,
    borderColor: '#000000',
  },
  buttonLabel: {
    color: '#000000',
  },
  errorBanner: {
    backgroundColor: '#FFEBEE',
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  errorBannerText: {
    color: '#D32F2F',
    flex: 1,
  },
  errorButtonLabel: {
    color: '#D32F2F',
  },
  section: {
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    color: '#000000',
    fontWeight: 'bold',
    marginBottom: 8,
  },
  divider: {
    backgroundColor: '#E0E0E0',
    marginBottom: 16,
  },
  emptyText: {
    fontStyle: 'italic',
    color: '#9E9E9E',
    marginBottom: 16,
  },
  insightRow: {
    marginBottom: 12,
  },
  insightLabel: {
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 4,
  },
  insightValue: {
    color: '#000000',
  },
});

export default WineDetailScreen;
