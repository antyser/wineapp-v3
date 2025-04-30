import React from 'react';
import { StyleSheet, View, Linking } from 'react-native';
import { Card, Text, Chip, TouchableRipple } from 'react-native-paper';
import { WineSearcherOffer } from '../api/generated/types.gen';

interface WineOfferItemProps {
  offer: WineSearcherOffer;
}

const WineOfferItem: React.FC<WineOfferItemProps> = ({ offer }) => {
  // If there's no seller name or URL, don't render this offer
  if (!offer.seller_name || !offer.url) {
    return null;
  }
  
  const openUrl = async (url: string) => {
    try {
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
      } else {
        console.error('Cannot open URL:', url);
      }
    } catch (error) {
      console.error('Error opening URL:', error);
    }
  };

  const getLocationString = () => {
    const parts = [];
    
    if (offer.seller_address_region) {
      parts.push(offer.seller_address_region);
    }
    
    if (offer.seller_address_country) {
      parts.push(offer.seller_address_country);
    }
    
    return parts.join(', ');
  };

  const location = getLocationString();

  return (
    <TouchableRipple
      onPress={() => offer.url && openUrl(offer.url)}
      style={styles.offerItem}
    >
      <Card style={styles.offerCard}>
        <Card.Content>
          <View style={styles.offerContent}>
            <View style={styles.offerDetails}>
              <Text variant="titleMedium" style={styles.offerPrice}>
                ${offer.price ? offer.price.toFixed(2) : 'N/A'}
              </Text>
              {offer.name && (
                <Text variant="bodySmall" style={styles.offerName} numberOfLines={1}>
                  {offer.name}
                </Text>
              )}
              <Text variant="bodyMedium" style={styles.offerSeller}>
                {offer.seller_name}
              </Text>
              {offer.description && (
                <Text variant="bodySmall" style={styles.offerDescription}>
                  {offer.description}
                </Text>
              )}
              {location && (
                <Chip icon="map-marker" style={styles.offerChip} textStyle={styles.chipText} compact>
                  {location}
                </Chip>
              )}
            </View>
          </View>
        </Card.Content>
      </Card>
    </TouchableRipple>
  );
};

const styles = StyleSheet.create({
  offerItem: {
    marginBottom: 8,
  },
  offerCard: {
    elevation: 1,
    backgroundColor: '#FFFFFF',
  },
  offerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  offerDetails: {
    flex: 1,
  },
  offerPrice: {
    fontWeight: 'bold',
    fontSize: 18,
    color: '#000000',
    marginBottom: 2,
  },
  offerName: {
    fontSize: 13,
    color: '#444444',
    marginBottom: 4,
  },
  offerSeller: {
    marginBottom: 6,
    color: '#222222',
    fontWeight: '500',
  },
  offerDescription: {
    fontSize: 13,
    color: '#555555',
    marginBottom: 8,
  },
  offerChip: {
    alignSelf: 'flex-start',
    backgroundColor: '#F0F0F0',
  },
  chipText: {
    color: '#222222',
  },
});

export default WineOfferItem; 