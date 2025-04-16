import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Card, Text, IconButton } from 'react-native-paper';
import { Cellar } from '../../api/generated';

interface CellarCardProps {
  cellar: Cellar;
  bottleCount: number;
  onPress: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

const CellarCard: React.FC<CellarCardProps> = ({
  cellar,
  bottleCount,
  onPress,
  onEdit,
  onDelete,
}) => {
  return (
    <Card style={styles.card} onPress={onPress}>
      <Card.Content>
        <View style={styles.headerRow}>
          <Text variant="titleLarge">{cellar.name}</Text>
          <View style={styles.actionButtons}>
            {onEdit && (
              <IconButton
                icon="pencil"
                size={20}
                onPress={(e) => {
                  e.stopPropagation();
                  onEdit();
                }}
              />
            )}
            {onDelete && (
              <IconButton
                icon="delete"
                size={20}
                onPress={(e) => {
                  e.stopPropagation();
                  onDelete();
                }}
              />
            )}
          </View>
        </View>

        <Text variant="bodyMedium" style={styles.bottleCount}>
          {bottleCount} {bottleCount === 1 ? 'bottle' : 'bottles'}
        </Text>

        {cellar.sections && cellar.sections.length > 0 && (
          <View style={styles.sections}>
            <Text variant="bodySmall" style={styles.sectionsLabel}>
              Sections:
            </Text>
            <Text variant="bodySmall" style={styles.sectionsList}>
              {cellar.sections.join(', ')}
            </Text>
          </View>
        )}
      </Card.Content>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    marginBottom: 16,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  actionButtons: {
    flexDirection: 'row',
  },
  bottleCount: {
    marginTop: 8,
  },
  sections: {
    marginTop: 8,
    flexDirection: 'row',
  },
  sectionsLabel: {
    fontWeight: 'bold',
    marginRight: 4,
  },
  sectionsList: {
    flex: 1,
  },
});

export default CellarCard;
