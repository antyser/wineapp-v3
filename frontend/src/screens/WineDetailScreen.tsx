import React, { useEffect, useState } from 'react';
import { StyleSheet, View, ScrollView, ActivityIndicator } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Appbar, Divider, Text, Button, Chip, Portal, Dialog, useTheme } from 'react-native-paper';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import WineDetailCard from '../components/WineDetailCard';
import { Wine } from '../types/wine';
import { 
  getOneWineApiV1WinesWineIdGet,
  getWineForUserApiV1WinesUserWineIdGet,
  toggleInteractionApiV1InteractionsWineWineIdToggleActionPost,
  rateWineApiV1InteractionsWineWineIdRatePost,
  getNotesByWineApiV1NotesWineWineIdGet
} from '../api';

type WineDetailScreenRouteProp = RouteProp<RootStackParamList, 'WineDetail'>;
type WineDetailScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

// Helper function to convert API wine type to our local Wine type
const mapApiWineToLocalWine = (apiWine: any): Wine => {
  return {
    id: apiWine.id,
    name: apiWine.name,
    vintage: apiWine.vintage || undefined,
    region: apiWine.region || undefined,
    country: apiWine.country || undefined,
    winery: apiWine.producer || apiWine.winery || undefined,
    type: apiWine.wine_type || apiWine.type || undefined,
    varietal: apiWine.grape_variety || apiWine.varietal || undefined,
    image_url: apiWine.image_url || undefined,
    average_price: apiWine.average_price || undefined,
    description: apiWine.description || undefined,
    wine_searcher_id: apiWine.wine_searcher_id || undefined,
    // Add AI fields if available
    drinking_window: apiWine.drinking_window || undefined,
    food_pairings: apiWine.food_pairings || undefined,
    abv: apiWine.abv || undefined,
    winemaker_notes: apiWine.winemaker_notes || undefined,
    professional_reviews: apiWine.professional_reviews || undefined,
    tasting_notes: apiWine.tasting_notes || undefined,
  };
};

const WineDetailScreen = () => {
  const route = useRoute<WineDetailScreenRouteProp>();
  const navigation = useNavigation<WineDetailScreenNavigationProp>();
  const theme = useTheme();
  const { wineId, wine: routeWine } = route.params;

  const [wine, setWine] = useState<Wine | null>(routeWine || null);
  const [loading, setLoading] = useState(!routeWine);
  const [error, setError] = useState('');
  const [isInWishlist, setIsInWishlist] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [isTasted, setIsTasted] = useState(false);
  const [userRating, setUserRating] = useState(0);
  const [hasExistingNotes, setHasExistingNotes] = useState(false);
  const [showCellarDialog, setShowCellarDialog] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    // If we already have the wine from route params, use it directly
    if (routeWine) {
      console.log('Using wine data from route params:', routeWine.name);
      setWine(routeWine);
      // We still need to fetch user interaction data
      fetchUserInteractions(routeWine.id);
      // Check for existing notes
      checkExistingNotes(routeWine.id);
      setLoading(false);
      return;
    }
    
    // Otherwise, fetch from API
    fetchWineDetails();
  }, [wineId, routeWine, retryCount]);

  const fetchWineDetails = async () => {
    try {
      setLoading(true);
      setError('');
      console.log(`Fetching wine details for ID: ${wineId}`);
      
      // Attempt to get the wine with user data
      try {
        const userWineResponse = await getWineForUserApiV1WinesUserWineIdGet({
          path: { wine_id: wineId }
        });
        
        if (userWineResponse.data) {
          console.log('Successfully retrieved user wine data');
          const apiWineData = userWineResponse.data.wine;
          const interaction = userWineResponse.data.interaction;
          
          if (apiWineData) {
            // Convert API wine to our local Wine type
            setWine(mapApiWineToLocalWine(apiWineData));
          }
          
          if (interaction) {
            setIsInWishlist(interaction.wishlist || false);
            setIsLiked(interaction.liked || false);
            setIsTasted(interaction.tasted || false);
            setUserRating(interaction.rating || 0);
          }
          
          // Check for existing notes
          if (apiWineData) {
            checkExistingNotes(apiWineData.id);
          }
          
          setLoading(false);
          return;
        }
      } catch (userWineError) {
        console.warn('Failed to get user wine data, falling back to regular wine fetch', userWineError);
      }
      
      // Fall back to regular wine fetch
      const response = await getOneWineApiV1WinesWineIdGet({
        path: { wine_id: wineId }
      });
      
      if (response.data) {
        console.log('Successfully retrieved wine data:', response.data.name);
        // Convert the API wine type to our local Wine type
        setWine(mapApiWineToLocalWine(response.data));
      } else {
        throw new Error('No wine data returned from API');
      }
    } catch (err) {
      console.error('Error fetching wine details:', err);
      setError('Failed to load wine details.');
    } finally {
      setLoading(false);
    }
  };

  const fetchUserInteractions = async (wineId: string) => {
    try {
      console.log('Fetching user interactions for wine ID:', wineId);
      
      const userWineResponse = await getWineForUserApiV1WinesUserWineIdGet({
        path: { wine_id: wineId }
      });
      
      if (userWineResponse.data && userWineResponse.data.interaction) {
        const interaction = userWineResponse.data.interaction;
        console.log('Received interaction data:', interaction);
        
        setIsInWishlist(interaction.wishlist || false);
        setIsLiked(interaction.liked || false);
        setIsTasted(interaction.tasted || false);
        setUserRating(interaction.rating || 0);
        
        console.log('Updated state - isTasted:', interaction.tasted, 'rating:', interaction.rating);
      } else {
        console.log('No interaction data received');
      }
    } catch (error) {
      console.error('Error fetching user interactions:', error);
    }
  };

  const checkExistingNotes = async (wineId: string) => {
    try {
      const notesResponse = await getNotesByWineApiV1NotesWineWineIdGet({
        path: { wine_id: wineId }
      });
      
      const hasNotes = !!(notesResponse.data && notesResponse.data.length > 0);
      setHasExistingNotes(hasNotes);
    } catch (error) {
      console.error('Error checking for existing notes:', error);
      setHasExistingNotes(false);
    }
  };

  const handleRetry = () => {
    setRetryCount(prevCount => prevCount + 1);
  };

  const handleAddToWishlist = async () => {
    if (!wine) return;
    
    try {
      const newWishlistState = !isInWishlist;
      // Optimistically update UI
      setIsInWishlist(newWishlistState);
      
      // Call API to toggle wishlist state
      const response = await toggleInteractionApiV1InteractionsWineWineIdToggleActionPost({
        path: { 
          wine_id: wine.id,
          action: 'wishlist'
        }
      });
      
      console.log('Wishlist toggled:', response.data);
    } catch (error) {
      console.error('Error toggling wishlist:', error);
      // Revert on error
      setIsInWishlist(!isInWishlist);
      setError('Failed to update wishlist. Please try again.');
    }
  };

  const handleLike = async () => {
    if (!wine) return;
    
    try {
      const newLikedState = !isLiked;
      // Optimistically update UI
      setIsLiked(newLikedState);
      
      // Call API to toggle liked state
      const response = await toggleInteractionApiV1InteractionsWineWineIdToggleActionPost({
        path: { 
          wine_id: wine.id,
          action: 'liked'
        }
      });
      
      console.log('Like toggled:', response.data);
    } catch (error) {
      console.error('Error toggling like:', error);
      // Revert on error
      setIsLiked(!isLiked);
      setError('Failed to update like status. Please try again.');
    }
  };

  const handleRateWine = async (rating: number) => {
    if (!wine) return;
    
    try {
      console.log('Setting wine rating to:', rating);
      
      // Optimistically update UI
      setUserRating(rating);
      
      // Call API to set rating
      const response = await rateWineApiV1InteractionsWineWineIdRatePost({
        path: { wine_id: wine.id },
        query: { rating }
      });
      
      console.log('Wine rated, response:', response.data);
      
      // Update from response if available
      if (response.data && typeof response.data.rating === 'number') {
        setUserRating(response.data.rating);
      }
    } catch (error) {
      console.error('Error rating wine:', error);
      setUserRating(0); // Reset on error
      setError('Failed to rate wine. Please try again.');
    }
  };

  const handleAddToCellar = () => {
    // Show dialog to select cellar
    setShowCellarDialog(true);
  };

  const handleToggleTasted = async () => {
    if (!wine) return;
    
    try {
      // Toggle tasted status in API
      const response = await toggleInteractionApiV1InteractionsWineWineIdToggleActionPost({
        path: { 
          wine_id: wine.id,
          action: 'tasted'
        }
      });
      
      console.log('Tasted status toggled, response:', response.data);
      
      // Update state directly from response instead of fetching again
      if (response.data && typeof response.data.tasted === 'boolean') {
        setIsTasted(response.data.tasted);
      } else {
        // Fallback to toggling the current state
        setIsTasted(!isTasted);
      }
    } catch (error) {
      console.error('Error toggling tasted status:', error);
      setError('Failed to update tasted status. Please try again.');
    }
  };

  const handleAddNote = async () => {
    if (!wine) return;
    
    try {
      // Check if there are existing notes
      const notesResponse = await getNotesByWineApiV1NotesWineWineIdGet({
        path: { wine_id: wine.id }
      });
      
      // If there are notes, get the ID of the first one
      let firstNoteId = undefined;
      if (notesResponse.data && notesResponse.data.length > 0) {
        const firstNote = notesResponse.data[0];
        if (firstNote && typeof firstNote === 'object' && 'id' in firstNote) {
          firstNoteId = String(firstNote.id);
        }
      }
      
      // Navigate to AddTastingNote screen with the note ID if available
      navigation.navigate('AddTastingNote', { 
        wineId: wine.id,
        noteId: firstNoteId 
      });
    } catch (error) {
      console.error('Error handling note:', error);
      setError('Failed to handle note. Please try again.');
    }
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
            onPress={() => setError('')}
            labelStyle={styles.errorButtonLabel}
            compact
          >
            Dismiss
          </Button>
        </View>
      )}

      <ScrollView style={styles.scrollView}>
        {wine && (
          <WineDetailCard
            wine={wine}
            onAddToWishlist={handleAddToWishlist}
            onLike={handleLike}
            onAddToCellar={handleAddToCellar}
            onAddNote={handleAddNote}
            onToggleTasted={handleToggleTasted}
            onRateWine={handleRateWine}
            isInWishlist={isInWishlist}
            isLiked={isLiked}
            isTasted={isTasted}
            rating={userRating}
          />
        )}

        {/* About This Wine Section */}
        <View style={styles.section}>
          <Text variant="titleMedium" style={styles.sectionTitle}>
              About This Wine
          </Text>
          <Divider style={styles.divider} />
          
          {wine && wine.description && (
            <Text variant="bodyMedium" style={styles.paragraphText}>{wine.description}</Text>
          )}

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

          {!wine?.description && !wine?.food_pairings && !wine?.drinking_window && !wine?.abv && (
            <Text variant="bodyMedium" style={styles.emptyText}>
              No information available for this wine.
            </Text>
          )}
        </View>

        {/* Winemaker Notes Section */}
        {wine?.winemaker_notes && (
          <View style={styles.section}>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              Winemaker Notes
            </Text>
            <Divider style={styles.divider} />
            <Text variant="bodyMedium">{wine.winemaker_notes}</Text>
          </View>
        )}

        {/* Tasting Notes Section */}
        {wine?.tasting_notes && (
          <View style={styles.section}>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              Tasting Notes
            </Text>
            <Divider style={styles.divider} />
            <Text variant="bodyMedium">{wine.tasting_notes}</Text>
          </View>
        )}

        {/* Professional Reviews Section */}
        {wine?.professional_reviews && (
          <View style={styles.section}>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              Professional Reviews
            </Text>
            <Divider style={styles.divider} />
            <Text variant="bodyMedium">{wine.professional_reviews}</Text>
          </View>
        )}

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
    marginBottom: 8,
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
  paragraphText: {
    marginBottom: 16,
    lineHeight: 20,
  },
  compactHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  inlineDivider: {
    backgroundColor: '#E0E0E0',
    height: 1,
    flex: 1,
    marginLeft: 12,
  },
  compactText: {
    marginBottom: 8,
    fontSize: 14,
    lineHeight: 20,
    fontStyle: 'italic',
  },
  compactSection: {
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 8,
    backgroundColor: '#F8F8F8',
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#E0E0E0',
  },
  compactSectionTitle: {
    color: '#000000',
    fontWeight: 'bold',
    fontSize: 16,
  },
});

export default WineDetailScreen;
