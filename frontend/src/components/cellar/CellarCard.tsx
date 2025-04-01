import React from 'react';
import { StyleSheet, View, TouchableOpacity } from 'react-native';
import { Card, Text, IconButton } from 'react-native-paper';
import { Cellar } from '../../api/cellarService';

interface CellarCardProps {
  cellar: Cellar;
  bottleCount?: number;
  onPress: (cellar: Cellar) => void;
  onEdit?: (cellar: Cellar) => void;
  onDelete?: (cellar: Cellar) => void;
}

const CellarCard: React.FC<CellarCardProps> = ({
  cellar,
  bottleCount = 0,
  onPress,
  onEdit,
  onDelete,
}) => {
  return (
    <TouchableOpacity onPress={() => onPress(cellar)} style={styles.cardContainer}>
      <Card style={styles.card}>
        {cellar.image_url && (
          <Card.Cover source={{ uri: cellar.image_url }} style={styles.image} />
        )}
        <Card.Content style={styles.content}>
          <View style={styles.header}>
            <Text variant="titleLarge">{cellar.name}</Text>
            <View style={styles.actions}>
              {onEdit && (
                <IconButton
                  icon="pencil"
                  size={20}
                  onPress={() => onEdit(cellar)}
                  testID="edit-button"
                />
              )}
              {onDelete && (
                <IconButton
                  icon="delete"
                  size={20}
                  onPress={() => onDelete(cellar)}
                  testID="delete-button"
                />
              )}
            </View>
          </View>

          <View style={styles.details}>
            <Text variant="bodyMedium">
              {bottleCount} {bottleCount === 1 ? 'bottle' : 'bottles'}
            </Text>

            {cellar.sections && cellar.sections.length > 0 && (
              <Text variant="bodyMedium">
                {cellar.sections.length} {cellar.sections.length === 1 ? 'section' : 'sections'}
              </Text>
            )}
          </View>
        </Card.Content>
      </Card>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    marginBottom: 16,
  },
  card: {
    elevation: 3,
  },
  image: {
    height: 120,
  },
  content: {
    paddingVertical: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  actions: {
    flexDirection: 'row',
  },
  details: {
    marginTop: 8,
  },
});

export default CellarCard;
