import React from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';
import { Card, Text } from 'react-native-paper';

interface WineCardProps {
  id: string;
  name: string;
  region?: string;
  vintage?: string | number;
  imageUrl?: string;
  onPress: (id: string) => void;
}

const WineCard: React.FC<WineCardProps> = ({
  id,
  name,
  region,
  vintage,
  imageUrl,
  onPress,
}) => {
  return (
    <TouchableOpacity onPress={() => onPress(id)}>
      <Card style={styles.card}>
        <Card.Cover 
          source={{ 
            uri: imageUrl || 'https://placehold.co/200x300/3498db/FFFFFF?text=No+Image'
          }} 
        />
        <Card.Content>
          <Text variant="titleMedium" style={styles.cardTitle}>{name}</Text>
          <Text variant="bodyMedium" style={styles.cardSubtitle}>
            {region} {vintage ? `- ${vintage}` : ''}
          </Text>
        </Card.Content>
      </Card>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    width: 180,
    marginRight: 16,
    marginBottom: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    elevation: 2,
  },
  cardTitle: {
    color: '#000000',
    fontWeight: 'bold',
  },
  cardSubtitle: {
    color: '#000000',
  },
});

export default WineCard; 