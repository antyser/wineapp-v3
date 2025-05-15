import React, { useCallback, useState, useEffect, useRef } from 'react';
import { StyleSheet, View, ActivityIndicator, NativeSyntheticEvent, NativeScrollEvent, Animated } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Appbar, Text, Button, useTheme, IconButton } from 'react-native-paper';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import WineDetailCard from '../components/WineDetailCard';
import { useWineDetails } from '../hooks/useWineDetails';
import { useWineInteractions } from '../hooks/useWineInteractions';
import WineChatView from '../components/wine/WineChatView';
import { useWineChat } from '../hooks/useWineChat';
import { getFormattedWineName } from '../utils/wineUtils';
import { Note } from '../api';

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
    notesData,
    interactionData,
    isLoading: isLoadingDetails,
    error: detailsError,
    retry: retryDetailsFetch,
    onInteractionUpdate,
    onNoteChange,
  } = useWineDetails(wineId, routeWine);

  const {
    isInWishlist,
    isLiked,
    userRating,
    interactionError,
    isSaving: isSavingInteraction,
    toggleWishlist,
    toggleLike,
    rateWine,
  } = useWineInteractions(
    wineId,
    interactionData,
    onInteractionUpdate
  );

  const {
    chatMessages,
    chatInput,
    setChatInput,
    isChatLoading: isChatLoadingChat,
    followUpQuestions,
    handleSendMessage,
    handleFollowupQuestion,
  } = useWineChat({ wineId, wine });

  const hasExistingNotes = notesData && notesData.length > 0;
  const noteToEdit = hasExistingNotes ? notesData![notesData!.length - 1] : undefined;

  const [optimisticNoteText, setOptimisticNoteText] = useState<string | undefined>(undefined);

  // Add state for scroll position and animation
  const [isScrolled, setIsScrolled] = useState(false);
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const headerBgOpacity = useRef(new Animated.Value(0)).current;
  const formattedWineName = wine ? getFormattedWineName(wine) : '';
  
  // Animate the title and background opacity when scroll position changes
  useEffect(() => {
    Animated.parallel([
      Animated.timing(titleOpacity, {
        toValue: isScrolled ? 1 : 0,
        duration: 200,
        useNativeDriver: true
      }),
      Animated.timing(headerBgOpacity, {
        toValue: isScrolled ? 1 : 0,
        duration: 200,
        useNativeDriver: false // Background color animation can't use native driver
      })
    ]).start();
  }, [isScrolled, titleOpacity, headerBgOpacity]);
  
  // Handle scroll events
  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const scrollY = event.nativeEvent.contentOffset.y;
    // Update scroll state when passing the threshold
    setIsScrolled(scrollY > 120);
  };
  
  // Calculate background color based on scroll position
  const headerBackgroundColor = headerBgOpacity.interpolate({
    inputRange: [0, 1],
    outputRange: ['rgba(255, 255, 255, 0)', 'rgba(255, 255, 255, 1)']
  });

  useEffect(() => {
    const latestNoteFromHook = notesData && notesData.length > 0 ? notesData[notesData.length - 1] : undefined;
    setOptimisticNoteText(latestNoteFromHook?.note_text);
  }, [notesData]);

  const displayError = detailsError || interactionError;
  const isDataAvailable = !!wine;

  const handleNoteTextCommittedByChild = (committedNote: Note) => {
    console.log("[WineDetailScreen] Note text committed by child (useNote successful save). Note:", committedNote);
    setOptimisticNoteText(committedNote.note_text);

    if (onNoteChange) {
      onNoteChange({ 
        type: 'updated', 
        note: committedNote, 
        noteId: committedNote.id 
      });
    }
  };

  const handleAddNote = () => {
    if (!wine) return;
    navigation.navigate('AddTastingNote', {
      wineId: wine.id,
      wine: wine,
      note: noteToEdit,
      currentUserRating: userRating,
      onRateWine: rateWine,
      onNoteTextCommitted: handleNoteTextCommittedByChild,
    } as any);
  };

  const handleBuyWine = () => {
    if (!wine || !offers || offers.length === 0) {
        return;
    }
      navigation.navigate('WineOffers', {
        wineName: getFormattedWineName(wine),
        offers: offers
      });
  };

  const showInteractionErrorBanner = !!(interactionError && wine);

  const renderListHeader = () => (
    <>
      {wine && (
        <WineDetailCard
          wine={wine}
          rating={userRating === null ? undefined : userRating}
          noteText={optimisticNoteText}
        />
      )}
      {isDataAvailable && (
        <View style={styles.actionButtonsContainer}>
          <Button
            mode="outlined"
            onPress={handleBuyWine}
            style={styles.actionButton}
            labelStyle={styles.buttonLabel}
            icon="tag-outline"
            disabled={!offers || offers.length === 0}
          >
            View Offers
          </Button>
          <Button
            mode="outlined"
            onPress={handleAddNote}
            style={styles.actionButton}
            labelStyle={styles.buttonLabel}
            icon={hasExistingNotes ? "note-edit-outline" : "note-plus-outline"}
          >
            {hasExistingNotes ? 'Edit Note' : 'Add Note'}
          </Button>
        </View>
      )}
    </>
  );

  if (isLoadingDetails && !wine) {
    return (
      <View style={styles.container}>
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
      <Animated.View style={[styles.appbarContainer, { backgroundColor: headerBackgroundColor }]}>
        <Appbar.Header style={styles.appbar}>
          <Appbar.BackAction onPress={() => navigation.goBack()} />
          <View style={{ flex: 1 }} />
          <Animated.View style={{ opacity: titleOpacity, position: 'absolute', left: 0, right: 0, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={styles.centeredTitle} numberOfLines={1} ellipsizeMode="tail">
              {formattedWineName}
            </Text>
          </Animated.View>
          <View style={{ flex: 1 }} />
          {isDataAvailable && (
            <>
{/*               <IconButton
                icon={isLiked ? 'thumb-up' : 'thumb-up-outline'}
                iconColor={isLiked ? theme.colors.primary : theme.colors.onSurface}
                size={24}
                onPress={toggleLike}
                disabled={isSavingInteraction}
              />
              <IconButton
                icon={isInWishlist ? 'bookmark' : 'bookmark-outline'}
                iconColor={isInWishlist ? theme.colors.primary : theme.colors.onSurface}
                size={24}
                onPress={toggleWishlist}
                disabled={isSavingInteraction}
              /> */}
            </>
          )}
          {isSavingInteraction && !isDataAvailable && <ActivityIndicator color={theme.colors.primary} style={{ marginRight: 8}}/>}
        </Appbar.Header>
      </Animated.View>

      {showInteractionErrorBanner && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorBannerText}>{interactionError}</Text>
        </View>
      )}

      <WineChatView
        chatMessages={chatMessages}
        chatInput={chatInput}
        setChatInput={setChatInput}
        isChatLoading={isChatLoadingChat}
        followUpQuestions={followUpQuestions}
        handleSendMessage={handleSendMessage}
        handleFollowupQuestion={handleFollowupQuestion}
        listHeaderComponent={renderListHeader()}
        onScroll={handleScroll}
        scrollEventThrottle={16}
      />

    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContainer: {
    paddingBottom: 80, // Space for FAB
  },
  imageContainer: {
    width: '100%',
    aspectRatio: 3 / 4, // Enforce 3:4 aspect ratio
    backgroundColor: '#e0e0e0', // Placeholder background
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  wineImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  placeholderIcon: {
    // Styles for the placeholder icon if needed
  },
  contentContainer: {
    paddingHorizontal: 16,
  },
  appbar: {
    backgroundColor: 'transparent',
    elevation: 0,
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
  actionButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#e0e0e0',
    backgroundColor: '#FFFFFF', // Ensuring buttons have a background
  },
  actionButton: {
    marginHorizontal: 8,
    flex: 1, // Make buttons take equal width
    borderColor: '#000000',
  },
  appbarContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10, // Ensure it's above other content
  },
  centeredTitle: {
    fontSize: 18,
    fontWeight: '500',
    color: '#000000',
    textAlign: 'center',
    paddingHorizontal: 40, // Add padding to avoid overlap with back button and icons
  },
});

export default WineDetailScreen;
