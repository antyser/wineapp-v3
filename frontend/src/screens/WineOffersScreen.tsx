import React, { useMemo } from 'react';
import { StyleSheet, View, FlatList } from 'react-native';
import { Appbar, Text, Divider } from 'react-native-paper';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import WineOfferItem from '../components/WineOfferItem';
import { WineSearcherOffer } from '../api/generated/types.gen';

type WineOffersScreenRouteProp = RouteProp<RootStackParamList, 'WineOffers'>;
type WineOffersScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

const WineOffersScreen = () => {
  const route = useRoute<WineOffersScreenRouteProp>();
  const navigation = useNavigation<WineOffersScreenNavigationProp>();
  const { wineName, offers } = route.params;

  // Filter out offers that don't have both a seller name and URL
  const validOffers = useMemo(() => {
    return offers.filter(offer => offer.seller_name && offer.url);
  }, [offers]);

  return (
    <View style={styles.container}>
      <Appbar.Header style={styles.appbar}>
        <Appbar.BackAction onPress={() => navigation.goBack()} color="#000000" />
        <Appbar.Content title="Wine Offers" titleStyle={styles.headerTitle} />
      </Appbar.Header>

      <View style={styles.header}>
        <Text variant="headlineSmall" style={styles.title}>
          Buy {wineName}
        </Text>
      </View>

      <Divider style={styles.divider} />

      <FlatList
        data={validOffers}
        renderItem={({ item }) => <WineOfferItem offer={item} />}
        keyExtractor={(item, index) => `${item.seller_name || ''}-${index}`}
        contentContainerStyle={styles.offersList}
        ListEmptyComponent={
          <Text style={styles.emptyText}>
            {offers.length > 0 && validOffers.length === 0
              ? 'No valid offers available for this wine.'
              : 'No offers available for this wine.'}
          </Text>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  appbar: {
    backgroundColor: '#FFFFFF',
    elevation: 0,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  headerTitle: {
    color: '#000000', // Black for header title
    fontWeight: '600',
  },
  header: {
    padding: 16,
  },
  title: {
    fontWeight: 'bold',
    color: '#000000', // Black for title text
  },
  divider: {
    backgroundColor: '#E0E0E0',
    marginBottom: 8,
    height: 1,
  },
  offersList: {
    padding: 16,
  },
  emptyText: {
    fontStyle: 'italic',
    color: '#444444', // Darker gray for empty state text
    marginBottom: 16,
    textAlign: 'center',
    padding: 16,
  },
});

export default WineOffersScreen; 