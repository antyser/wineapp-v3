import React, { useMemo } from 'react';
import { StyleSheet, View, FlatList, SafeAreaView } from 'react-native';
import { Text, Divider } from 'react-native-paper';
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
    <SafeAreaView style={styles.container}>
      <View style={styles.contentContainer}>

        <FlatList
          data={validOffers}
          renderItem={({ item }) => <WineOfferItem offer={item} />}
          keyExtractor={(item, index) => `${item.seller_name || ''}-${index}`}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>
                {offers.length > 0 && validOffers.length === 0
                  ? 'No valid offers available for this wine.'
                  : 'No offers available for this wine.'}
              </Text>
            </View>
          }
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  contentContainer: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  titleHeaderContainer: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  title: {
    fontWeight: 'bold',
    color: '#000000',
  },
  emptyContainer: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 8,
    marginTop: 0,
    alignItems: 'center',
  },
  emptyText: {
    fontStyle: 'italic',
    color: '#444444',
    textAlign: 'center',
  },
});

export default WineOffersScreen; 