import React from 'react';
import { StyleSheet, View, TouchableOpacity, Image, Text } from 'react-native';
import { Card, Badge } from 'react-native-paper';
import { Wine } from '../api';
import { getCountryFlagEmoji } from '../utils/countryUtils';
import { getFormattedWineName } from '../utils/wineUtils';

/**
 * WineListItem Component
 * 
 * A list item component for displaying wines in a vertical list format.
 * Optimized for compact presentation in scrollable lists like search results
 * or filtered collections. Shows key wine information with optional status badges.
 * 
 * Features:
 * - Horizontal layout with image on the left and details on the right
 * - Displays wine name, vintage, region, and country with flag emoji
 * - Supports optional status badges (e.g., "Tasted", "In Cellar", "Wishlist")
 * - Touchable for navigation to the wine detail screen
 * 
 * Used in:
 * - Search results screen
 * - Wine collection lists
 * - History items
 * - Filtered wine listings
 */
interface WineListItemProps {
  wine: Wine;
  badges?: string[]; // Optional badges like "Tasted", "Owned"
  onPress: () => void; 
}

const WineListItem: React.FC<WineListItemProps> = ({ wine, badges = [], onPress }) => {
  const { name, image_url, region, country, vintage, average_price } = wine;
  
  // Construct origin string
  const origin = [region, country].filter(Boolean).join(', ');
  const countryFlag = country ? getCountryFlagEmoji(country) : null;
  
  // Use the utility function to format the display name
  const displayName = getFormattedWineName(wine);

  // Format the price with currency symbol if available
  const formattedPrice = average_price ? `$${average_price.toFixed(2)}/750ml` : null;

  return (
    <TouchableOpacity 
      style={styles.listItemContainer}
      onPress={onPress} 
    >
      <Card style={styles.card}>
        <Card.Content style={styles.cardContent}>
          {/* Wine Image */}
          <View style={styles.imageContainer}>
            {image_url ? (
              <Image 
                source={{ uri: image_url }} 
                style={styles.wineImage} 
                resizeMode="contain" // Contain preserves aspect ratio
              />
            ) : (
              // Placeholder view if no image
              <View style={styles.imagePlaceholder} />
            )}
          </View>
          
          {/* Details Section */}
          <View style={styles.detailsContainer}>
            <Text style={styles.titleText} numberOfLines={3} ellipsizeMode='tail'>
              {displayName} 
            </Text>
            {origin && (
              <Text style={styles.subtitleText}>
                {countryFlag ? `${countryFlag}  ` : ''}From {origin}
              </Text>
            )}
            {formattedPrice && (
              <Text style={styles.priceText}>
                Avg. Price: {formattedPrice}
              </Text>
            )}
             {/* Optional Badges */}
            {badges.length > 0 && (
              <View style={styles.badgeContainer}>
                {badges.map((badgeText, index) => (
                  <Badge key={index} style={styles.statusBadge}>{badgeText}</Badge>
                ))}
              </View>
            )}
          </View>
        </Card.Content>
      </Card>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  listItemContainer: {
    marginBottom: 0,
  },
  card: {
    elevation: 0,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e0e0e0', 
    borderRadius: 0, // No rounding for flush list items
    backgroundColor: '#FFFFFF',
  },
  cardContent: {
    flexDirection: 'row',
    padding: 10, // Consistent padding
    alignItems: 'center', // Align items vertically
  },
  imageContainer: {
    width: 60, // Fixed width
    height: 80, // Fixed height for 3:4 ratio (60 * 4/3)
    borderRadius: 4, // Optional: Slight rounding
    overflow: 'hidden',
    marginRight: 12,
    backgroundColor: '#f0f0f0', // Placeholder background
    justifyContent: 'center',
    alignItems: 'center',
  },
  wineImage: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailsContainer: {
    flex: 1,
    justifyContent: 'flex-start', // Align details to top
    paddingTop: 2, // Add slight padding to align text better with top of image
  },
  titleText: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  subtitleText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 6, // Space before badges
  },
  priceText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
    marginBottom: 6, // Space before badges
  },
  badgeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap', // Allow badges to wrap
    marginTop: 4,
  },
  statusBadge: {
    marginRight: 6,
    marginBottom: 4,
    backgroundColor: '#f0f0f0', // Badge background
    color: '#333', // Badge text color
    fontWeight: '500',
    paddingHorizontal: 8,
    fontSize: 12,
  },
});

export default WineListItem; 