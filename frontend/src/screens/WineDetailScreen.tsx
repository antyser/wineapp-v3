import React, { useEffect, useState, useRef, useCallback } from 'react';
import { StyleSheet, View, ActivityIndicator, Alert } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Appbar, Text, Button, useTheme } from 'react-native-paper';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import WineDetailCard from '../components/WineDetailCard';
import { useWineDetails } from '../hooks/useWineDetails';
import { useWineInteractions } from '../hooks/useWineInteractions';
import { useAuth } from '../auth/AuthContext';
import WineChatView from '../components/wine/WineChatView';
import { useWineChat } from '../hooks/useWineChat';

type WineDetailScreenRouteProp = RouteProp<RootStackParamList, 'WineDetail'>;
type WineDetailScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

const WineDetailScreen = () => {
  const route = useRoute<WineDetailScreenRouteProp>();
  const navigation = useNavigation<WineDetailScreenNavigationProp>();
  const theme = useTheme();
  const { wineId, wine: routeWine } = route.params;

  const {
    wine,
    offers,
    isLoading: isLoadingDetails,
    error: detailsError,
    retry: retryDetailsFetch,
    userInteractionData: initialInteractionData,
    notes,
  } = useWineDetails(wineId, routeWine);

  const {
    isInWishlist,
    isLiked,
    userRating,
    hasExistingNotes,
    latestNoteId,
    interactionError,
    toggleWishlist,
    toggleLike,
    rateWine,
  } = useWineInteractions(wineId, initialInteractionData, notes);

  const { getToken } = useAuth();

  const {
    chatMessages,
    chatInput,
    setChatInput,
    isChatLoading,
    followUpQuestions,
    handleSendMessage,
    handleFollowupQuestion,
  } = useWineChat({ wineId, wine });

  const getFormattedWineName = useCallback(() => {
    if (!wine) return '';
    if (wine.vintage && wine.vintage !== 1 && wine.name) {
      return `${wine.vintage} ${wine.name}`;
    }
    return wine.name || '';
  }, [wine]);
  
  const displayError = detailsError || interactionError;

  const handleAddToWishlist = toggleWishlist;
  const handleLike = toggleLike;
  const handleRateWine = rateWine;

  const handleAddNote = () => {
    if (!wine) return;
    const noteToPass = notes?.find(n => n.id === latestNoteId);
    navigation.navigate('AddTastingNote', {
      wineId: wine.id,
      wine: wine,
      note: noteToPass
    });
  };

  const handleBuyWine = () => {
    if (!wine || !offers || offers.length === 0) {
        console.warn('No offers available to buy.');
        return;
    }
      navigation.navigate('WineOffers', {
        wineName: getFormattedWineName(),
        offers: offers
      });
  };

  const showInteractionErrorBanner = interactionError && wine;

  const renderListHeader = () => (
    <>
      {wine && (
        <WineDetailCard
          wine={wine}
          onAddToWishlist={handleAddToWishlist}
          onLike={handleLike}
          onAddNote={handleAddNote}
          onRateWine={handleRateWine}
          onBuyWine={handleBuyWine}
          isInWishlist={isInWishlist}
          isLiked={isLiked}
          hasExistingNotes={hasExistingNotes}
          rating={userRating}
          hasOffers={offers && offers.length > 0}
        />
      )}
    </>
  );

  if (isLoadingDetails) {
    return (
      <View style={styles.container}>
        <Appbar.Header style={styles.appbar}>
          <Appbar.BackAction onPress={() => navigation.goBack()} />
          <Appbar.Content title="Loading Wine Details" />
        </Appbar.Header>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading wine details...</Text>
        </View>
      </View>
    );
  }

  if (detailsError && !wine) {
    return (
      <View style={styles.container}>
        <Appbar.Header style={styles.appbar}>
          <Appbar.BackAction onPress={() => navigation.goBack()} />
          <Appbar.Content title="Error" />
        </Appbar.Header>
        <View style={styles.centered}>
          <Text variant="bodyLarge" style={styles.errorText}>{detailsError}</Text>
          <View style={styles.buttonRow}>
            <Button
              mode="outlined"
              onPress={retryDetailsFetch}
              style={styles.button}
              labelStyle={styles.buttonLabel}
            >
              Retry
            </Button>
            <Button
              mode="outlined"
              onPress={() => navigation.goBack()}
              style={styles.button}
              labelStyle={styles.buttonLabel}
            >
              Go Back
            </Button>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Appbar.Header style={styles.appbar}>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content title={getFormattedWineName() || "Wine Details"} />
      </Appbar.Header>

      {showInteractionErrorBanner && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorBannerText}>{interactionError}</Text>
        </View>
      )}

      <WineChatView
        chatMessages={chatMessages}
        chatInput={chatInput}
        setChatInput={setChatInput}
        isChatLoading={isChatLoading}
        followUpQuestions={followUpQuestions}
        handleSendMessage={handleSendMessage}
        handleFollowupQuestion={handleFollowupQuestion}
        listHeaderComponent={renderListHeader()}
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
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#000000',
  },
  errorText: {
    marginBottom: 16,
    textAlign: 'center',
    color: '#D32F2F',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 16,
  },
  button: {
    margin: 8,
    borderColor: '#000000',
  },
  buttonLabel: {
    color: '#000000',
  },
  errorBanner: {
    backgroundColor: '#FFEBEE',
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  errorBannerText: {
    color: '#D32F2F',
    flex: 1,
  },
  errorButtonLabel: {
    color: '#D32F2F',
  },
});

export default WineDetailScreen;
