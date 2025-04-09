import React from 'react';
import { StyleSheet, ScrollView, View } from 'react-native';
import { Text } from 'react-native-paper';
import WineCard from './WineCard';

interface Wine {
  id: string;
  name: string;
  region?: string;
  vintage?: string | number;
  image_url?: string;
}

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
          <WineCard
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