import React from 'react';
import { StyleSheet, View, Image } from 'react-native';
import { Card, Text, Button, IconButton, Chip, useTheme } from 'react-native-paper';
import { Wine } from '../../types/wine';

interface WineCardProps {
  wine: Wine;
  onAddToWishlist?: () => void;
  onAddToCellar?: () => void;
  onAddNote?: () => void;
  onConsume?: () => void;
  isInWishlist?: boolean;
}

const WineCard: React.FC<WineCardProps> = ({
  wine,
  onAddToWishlist,
  onAddToCellar,
  onAddNote,
  onConsume,
  isInWishlist = false,
}) => {
  const theme = useTheme();

  return (
    <Card style={styles.card}>
      <Card.Content>
        <View style={styles.header}>
          <View style={styles.titleContainer}>
            {wine.vintage !== 1 && (
              <Text variant="titleLarge" style={styles.vintage}>
                {wine.vintage}
              </Text>
            )}
            <Text variant="titleLarge" style={styles.name}>
              {wine.name}
            </Text>
          </View>
          <IconButton
            icon={isInWishlist ? 'heart' : 'heart-outline'}
            iconColor={isInWishlist ? '#000000' : undefined}
            size={24}
            onPress={onAddToWishlist}
            testID="wishlist-button"
          />
        </View>

        <View style={styles.infoContainer}>
          {wine.producer && (
            <Text variant="bodyMedium" style={styles.producer}>
              {wine.producer}
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
            {wine.wine_type && (
              <Chip
                icon="glass-wine"
                style={styles.chip}
                textStyle={styles.chipText}
              >
                {wine.wine_type}
              </Chip>
            )}
          </View>

          {wine.grape_variety && (
            <Text variant="bodyMedium" style={styles.grapesRow}>
              <Text style={styles.label}>Grapes: </Text>
              {wine.grape_variety}
            </Text>
          )}

          {wine.average_price && (
            <Text variant="bodyMedium" style={styles.price}>
              <Text style={styles.label}>Avg. Price: </Text>
              ${wine.average_price.toFixed(2)}
            </Text>
          )}
        </View>
      </Card.Content>

      {wine.image_url && (
        <Card.Cover
          source={{ uri: wine.image_url }}
          style={styles.image}
          resizeMode="cover"
        />
      )}

      <Card.Actions style={styles.actions}>
        <Button
          mode="outlined"
          onPress={onAddToCellar}
          style={styles.actionButton}
          labelStyle={styles.buttonLabel}
        >
          Add to Cellar
        </Button>
        <Button
          mode="outlined"
          onPress={onAddNote}
          style={styles.actionButton}
          labelStyle={styles.buttonLabel}
        >
          Add Note
        </Button>
        <Button
          mode="outlined"
          onPress={onConsume}
          style={styles.actionButton}
          labelStyle={styles.buttonLabel}
        >
          Consume
        </Button>
      </Card.Actions>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  titleContainer: {
    flex: 1,
  },
  vintage: {
    fontWeight: 'bold',
    color: '#000000',
  },
  name: {
    marginBottom: 8,
    color: '#000000',
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
    marginTop: 4,
    marginBottom: 4,
    color: '#000000',
  },
  price: {
    marginTop: 4,
    marginBottom: 8,
    color: '#000000',
  },
  label: {
    fontWeight: 'bold',
    color: '#000000',
  },
  description: {
    marginTop: 12,
    color: '#000000',
  },
  image: {
    height: 200,
    marginBottom: 16,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    flexWrap: 'wrap',
    padding: 8,
  },
  actionButton: {
    marginHorizontal: 4,
    borderColor: '#000000',
  },
  buttonLabel: {
    color: '#000000',
    fontSize: 12,
  }
});

export default WineCard;
