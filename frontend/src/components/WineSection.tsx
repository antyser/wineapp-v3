import React from 'react';
import { StyleSheet, ScrollView, View } from 'react-native';
import { Text } from 'react-native-paper';
import WinePreviewCard from './WinePreviewCard';

/**
 * Defining the minimal wine interface needed for this component
 */
interface Wine {
  id: string;
  name: string;
  region?: string;
  vintage?: string | number;
  image_url?: string;
}

/**
 * WineSection Component
 * 
 * A horizontal scrollable section of wine preview cards, typically used on the home screen
 * or category pages to showcase collections or groups of wines.
 * 
 * Features:
 * - Section title
 * - Horizontal scrolling list of wine preview cards
 * - Each card is clickable to navigate to the wine detail page
 * 
 * Used in:
 * - Home screen for "Featured Wines", "Recently Viewed", etc.
 * - Category pages for grouped wine displays
 */
interface WineSectionProps {
  title: string;
  wines: Wine[];
  onWinePress: (id: string) => void;
}

const WineSection: React.FC<WineSectionProps> = ({ title, wines, onWinePress }) => {
  return (
    <View>
      <Text variant="titleLarge" style={styles.sectionTitle}>
        {title}
      </Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.cardsScroll}>
        {wines.map((wine) => (
          <WinePreviewCard
            key={wine.id}
            id={wine.id}
            name={wine.name}
            region={wine.region}
            vintage={wine.vintage}
            imageUrl={wine.image_url}
            onPress={onWinePress}
          />
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  sectionTitle: {
    marginLeft: 16,
    marginTop: 20,
    marginBottom: 10,
    color: '#000000',
    fontWeight: 'bold',
  },
  cardsScroll: {
    paddingLeft: 16,
  },
});

export default WineSection; 