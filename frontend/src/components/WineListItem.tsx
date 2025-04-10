import React from 'react';
import { StyleSheet, View, TouchableOpacity, Image, Text } from 'react-native';
import { Card, Badge } from 'react-native-paper';
import { Wine } from '../types/wine';
import { getCountryFlagEmoji } from '../utils/countryUtils';

// Props for displaying a single wine item based on the target image layout
interface WineListItemProps {
  wine: Wine;
  badges?: string[]; // Optional badges like "Tasted", "Owned"
  onPress: () => void; 
}

const WineListItem: React.FC<WineListItemProps> = ({ wine, badges = [], onPress }) => {
  const { name, image_url, region, country, vintage } = wine;
  
  // Construct origin string
  const origin = [region, country].filter(Boolean).join(', ');
  const countryFlag = country ? getCountryFlagEmoji(country) : null;
  
  // Combine vintage and name if vintage exists
  const displayName = vintage ? `${vintage} ${name}` : name;

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
    marginBottom: 12,
  },
  card: {
    borderRadius: 8,
    backgroundColor: '#fff',
    elevation: 1,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'flex-start', // Align items to the top
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  imageContainer: {
    marginRight: 12,
    width: 60, // Width for the image container
    height: 80, // Height for the image container (adjust aspect ratio as needed)
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden', // Ensures image stays within bounds
    // backgroundColor: '#f0f0f0', // Placeholder bg
  },
  wineImage: {
    width: '100%',
    height: '100%',
    // borderRadius: 4, // Can remove if using contain resizeMode
  },
  imagePlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
  },
  detailsContainer: {
    flex: 1,
    justifyContent: 'flex-start', // Align details to top
    paddingTop: 2, // Add slight padding to align text better with top of image
  },
  titleText: {
    fontSize: 16, // Slightly larger title
    fontWeight: '500',
    marginBottom: 4, // Increased space 
  },
  subtitleText: {
    fontSize: 14,
    color: '#666',
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