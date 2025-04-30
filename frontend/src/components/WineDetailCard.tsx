import React from 'react';
import { StyleSheet, View, Image, TouchableOpacity } from 'react-native';
import { Card, Text, Button, IconButton, Chip, useTheme, Icon } from 'react-native-paper';
import { Wine } from '../types/wine';

/**
 * WineDetailCard Component
 * 
 * A comprehensive card component displaying detailed wine information and actions.
 * This component is specifically designed for the Wine Details screen, providing
 * a full view of wine information with interactive elements.
 * 
 * Features:
 * - Displays complete wine details (name, vintage, region, type, etc.)
 * - Shows wine image
 * - Provides action buttons for wine management (wishlist, cellar, notes, consumption)
 * - Handles interaction states (e.g., whether a wine is in a wishlist)
 * - Includes rating functionality with support for half-stars (fractional ratings)
 * - Supports like and wishlist toggles that save to user interactions
 * 
 * Used in:
 * - WineDetailScreen as the main content component
 * - Any screen requiring detailed wine information with actions
 */
interface WineDetailCardProps {
  wine: Wine;
  onAddToWishlist?: () => void;
  onLike?: () => void;
  onAddNote?: () => void;
  onRateWine?: (rating: number) => void;
  onBuyWine?: () => void;
  isInWishlist?: boolean;
  isLiked?: boolean;
  hasExistingNotes?: boolean;
  rating?: number;
  hasOffers?: boolean;
}

const WineDetailCard: React.FC<WineDetailCardProps> = ({
  wine,
  onAddToWishlist,
  onLike,
  onAddNote,
  onRateWine,
  onBuyWine,
  isInWishlist = false,
  isLiked = false,
  hasExistingNotes = false,
  rating = 0,
  hasOffers = false,
}) => {
  const theme = useTheme();

  // Helper function to determine which star icon to use
  const getStarIcon = (position: number, rating: number): string => {
    if (rating >= position) {
      return 'star'; // Full star
    } else if (rating >= position - 0.5) {
      return 'star-half-full'; // Half star
    } else {
      return 'star-outline'; // Empty star
    }
  };

  // Helper function to format rating display
  const formatRating = (rating: number): string => {
    // If it's a whole number, don't show decimal places
    return Number.isInteger(rating) ? rating.toString() : rating.toFixed(1);
  };

  // Function to render star rating
  const renderRating = () => {
    const stars = [];
    const maxRating = 5;
    
    for (let i = 1; i <= maxRating; i++) {
      stars.push(
        <IconButton
          key={i}
          icon={getStarIcon(i, rating)}
          iconColor={'#FFD700'}
          size={24}
          onPress={() => {
            // If clicking on a star that's already full or half, give a more precise rating
            if (i === Math.ceil(rating) && rating % 1 !== 0) {
              // Clicking on a half star makes it full
              console.log(`Clicked on half-star position ${i}, updating to full star: ${Math.floor(rating) + 1}`);
              onRateWine && onRateWine(Math.floor(rating) + 1);
            } else if (i === Math.floor(rating) && rating % 1 === 0) {
              // Clicking on a full star makes it half
              console.log(`Clicked on full star position ${i}, updating to half star: ${i - 0.5}`);
              onRateWine && onRateWine(i - 0.5);
            } else {
              // Normal case - full star
              console.log(`Setting new rating to: ${i}`);
              onRateWine && onRateWine(i);
            }
          }}
          style={styles.starIcon}
          testID={`star-${i}`}
        />
      );
    }
    
    return stars;
  };

  return (
    <Card style={styles.card}>
      {/* Horizontal layout with image on left, basic info on right */}
      <View style={styles.topContainer}>
        {/* Wine image on left */}
        <View style={styles.imageContainer}>
          {wine.image_url ? (
            <Image
              source={{ uri: wine.image_url }}
              style={styles.verticalImage}
              resizeMode="contain"
            />
          ) : (
            <View style={styles.placeholderImage}>
              <Text variant="bodyLarge" style={styles.placeholderText}>No image</Text>
            </View>
          )}
        </View>
        
        {/* Basic info on right */}
        <View style={styles.basicInfoContainer}>
          <View style={styles.titleContainer}>
            {wine.vintage && wine.vintage !== 1 && wine.vintage !== '1' && (
              <Text variant="titleLarge" style={styles.vintage}>
                {wine.vintage}
              </Text>
            )}
            <Text variant="titleLarge" style={styles.name}>
              {wine.name}
            </Text>
          </View>
          
          {wine.winery && (
            <Text variant="bodyMedium" style={styles.producer}>
              {wine.winery}
            </Text>
          )}

          <View style={styles.detailsRow}>
            {wine.region && (
              <Chip
                icon="map-marker"
                style={styles.chip}
                textStyle={styles.chipText}
              >
                {wine.region}
              </Chip>
            )}
            {wine.type && (
              <Chip
                icon="glass-wine"
                style={styles.chip}
                textStyle={styles.chipText}
              >
                {wine.type}
              </Chip>
            )}
          </View>
        </View>
      </View>
      
      <Card.Content>
        <View style={styles.infoContainer}>
          {wine.varietal && (
            <Text variant="bodyMedium" style={styles.grapesRow}>
              <Text style={styles.label}>Grapes: </Text>
              {wine.varietal}
            </Text>
          )}

          {wine.average_price && (
            <Text variant="bodyMedium" style={styles.price}>
              <Text style={styles.label}>Avg. Price: </Text>
              ${wine.average_price.toFixed(2)}
            </Text>
          )}

          {/* Rating component */}
          <View style={styles.ratingContainer}>
            <Text variant="bodyMedium" style={styles.label}>Your Rating: </Text>
            <View style={styles.ratingRow}>
              <View style={styles.starContainer}>
                {renderRating().map(star => star)}
              </View>
              {rating > 0 && (
                <Text variant="bodyMedium" style={styles.ratingText}>
                  ({formatRating(rating)})
                </Text>
              )}
            </View>
          </View>
        </View>
      </Card.Content>

      <View style={styles.actionsRow}>
        <TouchableOpacity 
          onPress={onLike}
          style={[styles.actionButton, isLiked && styles.activeActionButton]}
          testID="like-button"
        >
          <Icon source={isLiked ? 'thumb-up' : 'thumb-up-outline'} size={24} color={isLiked ? '#FFFFFF' : '#000000'} />
        </TouchableOpacity>
        
        <TouchableOpacity 
          onPress={onAddToWishlist}
          style={[styles.actionButton, isInWishlist && styles.activeActionButton]}
          testID="wishlist-button"
        >
          <Icon source={isInWishlist ? 'bookmark' : 'bookmark-outline'} size={24} color={isInWishlist ? '#FFFFFF' : '#000000'} />
        </TouchableOpacity>
        
        <Button
          mode="outlined"
          onPress={onAddNote}
          style={styles.textButton}
          labelStyle={styles.buttonLabel}
          icon={hasExistingNotes ? "note-edit-outline" : "note-plus-outline"}
        >
          {hasExistingNotes ? 'View/Edit Note' : 'Add Note'}
        </Button>
        
        <Button
          mode="outlined"
          onPress={onBuyWine}
          style={styles.textButton}
          labelStyle={styles.buttonLabel}
          icon="tag-outline"
          disabled={!hasOffers}
        >
          View Offers
        </Button>
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    marginVertical: 8,
    marginHorizontal: 16,
    elevation: 2,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
  },
  topContainer: {
    flexDirection: 'row',
    padding: 16,
    alignItems: 'flex-start',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  imageContainer: {
    width: 120,
    height: 180,
    backgroundColor: '#F9F9F9',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
    marginRight: 16,
  },
  verticalImage: {
    width: 100,
    height: 160,
  },
  placeholderImage: {
    width: 100,
    height: 160,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#EEEEEE',
    borderRadius: 8,
  },
  placeholderText: {
    color: '#999999',
    textAlign: 'center',
  },
  basicInfoContainer: {
    flex: 1,
    justifyContent: 'space-between',
    height: 180,
  },
  titleContainer: {
    marginBottom: 8,
  },
  vintage: {
    fontWeight: 'bold',
    color: '#000000',
  },
  name: {
    marginBottom: 4,
    color: '#000000',
    fontWeight: 'bold',
  },
  producer: {
    marginBottom: 8,
    fontStyle: 'italic',
    color: '#000000',
  },
  infoContainer: {
    marginBottom: 16,
  },
  detailsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
    marginBottom: 8,
  },
  chip: {
    marginRight: 8,
    marginBottom: 8,
    backgroundColor: '#F0F0F0',
  },
  chipText: {
    color: '#000000',
  },
  grapesRow: {
    marginBottom: 8,
    color: '#000000',
  },
  price: {
    marginBottom: 8,
    color: '#000000',
  },
  label: {
    fontWeight: 'bold',
    color: '#000000',
  },
  ratingContainer: {
    marginVertical: 8,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  starContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  starIcon: {
    margin: 0,
    padding: 0,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  actionButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  activeActionButton: {
    backgroundColor: '#000000',
    borderColor: '#000000',
  },
  textButton: {
    flex: 1,
    marginHorizontal: 4,
    borderColor: '#000000',
    height: 44,
    justifyContent: 'center',
  },
  disabledButton: {
    borderColor: '#CCCCCC',
    backgroundColor: '#F0F0F0',
  },
  buttonLabel: {
    color: '#000000',
    fontSize: 12,
  },
  disabledButtonLabel: {
    color: '#999999',
  },
  activeButtonLabel: {
    color: '#FFFFFF',
  },
  ratingText: {
    marginLeft: 8,
    color: '#000000',
  },
});

export default WineDetailCard; 