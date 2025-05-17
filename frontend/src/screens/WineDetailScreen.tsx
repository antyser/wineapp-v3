import React, { useCallback, useState, useEffect, useRef, useMemo } from 'react';
import { StyleSheet, View, ActivityIndicator, NativeSyntheticEvent, NativeScrollEvent, Animated, FlatList, Platform, KeyboardAvoidingView, TouchableOpacity } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Appbar, Text, Button, useTheme, IconButton, FAB } from 'react-native-paper';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import WineDetailCard from '../components/WineDetailCard';
import { useWineDetails } from '../hooks/useWineDetails';
import { useWineInteractions } from '../hooks/useWineInteractions';
import WineChatView, { UIMessage } from '../components/wine/WineChatView';
import ChatMessageItem from '../components/wine/ChatMessageItem';
import { useWineChat } from '../hooks/useWineChat';
import { getFormattedWineName } from '../utils/wineUtils';
import { Note } from '../api';

type WineDetailScreenRouteProp = RouteProp<RootStackParamList, 'WineDetail'>;
type WineDetailScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

const AnimatedFlatList = Animated.createAnimatedComponent(FlatList<UIMessage>);

const WineDetailScreen = () => {
  const route = useRoute<WineDetailScreenRouteProp>();
  const navigation = useNavigation<WineDetailScreenNavigationProp>();
  const theme = useTheme();
  const { wineId, wine: routeWine } = route.params;

  const flatListRef = useRef<FlatList<UIMessage>>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);

  // Memoize wineId to prevent unnecessary hook reinitializations
  const memoizedWineId = useMemo(() => wineId, [wineId]);
  const memoizedRouteWine = useMemo(() => routeWine, [routeWine]);

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
  } = useWineDetails(memoizedWineId, memoizedRouteWine);

  // Memoize the wine and interaction data to prevent unnecessary hook reinitializations
  const memoizedInteractionData = useMemo(() => interactionData, [interactionData?.id]);

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
    memoizedWineId,
    memoizedInteractionData,
    onInteractionUpdate
  );

  // Memoize wine object for useWineChat to prevent unnecessary reinitializations
  const memoizedWine = useMemo(() => wine, [wine?.id]);

  const {
    chatMessages,
    chatInput,
    setChatInput,
    isChatLoading: isChatLoadingChat,
    followUpQuestions,
    handleSendMessage: originalHandleSendMessage,
    handleFollowupQuestion: originalHandleFollowupQuestion,
  } = useWineChat({ wineId: memoizedWineId, wine: memoizedWine });

  // Scroll to bottom function
  const scrollToBottom = useCallback(() => {
    if (flatListRef.current) {
      flatListRef.current.scrollToEnd({ animated: true });
    }
  }, []);

  // Add a scrollToTop function
  const scrollToTop = useCallback(() => {
    if (flatListRef.current) {
      flatListRef.current.scrollToOffset({ offset: 0, animated: true });
    }
  }, []);

  // Wrap the original handlers to also scroll to bottom
  const handleSendMessage = useCallback((text?: string) => {
    originalHandleSendMessage(text);
    // No need to scroll here as new message will trigger the useEffect below
  }, [originalHandleSendMessage]);

  const handleFollowupQuestion = useCallback((question: string) => {
    originalHandleFollowupQuestion(question);
    // Scroll to bottom after a brief delay to allow the new message to be added
    setTimeout(scrollToBottom, 100);
  }, [originalHandleFollowupQuestion, scrollToBottom]);

  // Scroll to end when messages change
  useEffect(() => {
    if (chatMessages.length > 0 && flatListRef.current) {
      const timer = setTimeout(() => {
        scrollToBottom();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [chatMessages, scrollToBottom]);

  const hasExistingNotes = notesData && notesData.length > 0;
  const noteToEdit = hasExistingNotes ? notesData![notesData!.length - 1] : undefined;

  const [optimisticNoteText, setOptimisticNoteText] = useState<string | undefined>(undefined);

  const [isScrolled, setIsScrolled] = useState(false);
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const headerBgOpacity = useRef(new Animated.Value(0)).current;
  const formattedWineName = wine ? getFormattedWineName(wine) : '';
  
  useEffect(() => {
    Animated.parallel([
      Animated.timing(titleOpacity, { toValue: isScrolled ? 1 : 0, duration: 200, useNativeDriver: true }),
      Animated.timing(headerBgOpacity, { toValue: isScrolled ? 1 : 0, duration: 200, useNativeDriver: false })
    ]).start();
  }, [isScrolled, titleOpacity, headerBgOpacity]);
  
  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const scrollY = event.nativeEvent.contentOffset.y;
    const layoutHeight = event.nativeEvent.layoutMeasurement.height;
    const contentHeight = event.nativeEvent.contentSize.height;
    
    // Update appbar animation state
    setIsScrolled(scrollY > 120);
    
    // Check if we're at the bottom (with a small threshold)
    const distanceFromBottom = contentHeight - layoutHeight - scrollY;
    setIsAtBottom(distanceFromBottom < 20); // 20px threshold
  };
  
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

  const renderListFooter = () => {
    if (!isChatLoadingChat || chatMessages.length === 0) return null;
    return <ActivityIndicator style={{ marginVertical: 10, paddingBottom: 10 }} />;
  };

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
          <TouchableOpacity 
            style={{ position: 'absolute', left: 0, right: 0, alignItems: 'center', justifyContent: 'center', height: '100%' }}
            onPress={scrollToTop}
            activeOpacity={0.7}
          >
            <Animated.View style={{ opacity: titleOpacity }}>
              <Text style={styles.centeredTitle} numberOfLines={1} ellipsizeMode="tail">
                {formattedWineName}
              </Text>
            </Animated.View>
          </TouchableOpacity>
          <View style={{ flex: 1 }} />
          {isDataAvailable && (
            <>
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

      <View style={{ flex: 1, backgroundColor: '#FFFFFF', marginTop: 56 }}>
        <KeyboardAvoidingView 
          behavior={Platform.OS === "ios" ? "padding" : "height"} 
          style={{ flex: 1, backgroundColor: '#FFFFFF' }}
          keyboardVerticalOffset={Platform.OS === "ios" ? 34 : 0}
        >
          <View style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
            <AnimatedFlatList
              ref={flatListRef}
              style={{ flex: 1, backgroundColor: '#FFFFFF' }}
              contentContainerStyle={styles.flatListContentContainer}
              data={chatMessages}
              renderItem={({ item }) => <ChatMessageItem item={item} />}
              keyExtractor={(item) => item.id}
              ListHeaderComponent={renderListHeader}
              ListFooterComponent={renderListFooter}
              onScroll={handleScroll}
              scrollEventThrottle={16}
              keyboardShouldPersistTaps="handled"
            />
          </View>
          
          <View style={styles.fixedInputContainer}>
            <WineChatView
              chatInput={chatInput}
              setChatInput={setChatInput}
              isChatLoading={isChatLoadingChat}
              followUpQuestions={followUpQuestions}
              handleSendMessage={handleSendMessage}
              handleFollowupQuestion={handleFollowupQuestion}
            />
          </View>
        </KeyboardAvoidingView>
        
        {/* FAB positioned outside KeyboardAvoidingView */}
        {!isAtBottom && chatMessages.length > 0 && (
          <FAB
            icon="chevron-down"
            style={styles.scrollToBottomFab}
            size="small"
            onPress={scrollToBottom}
            color="#000000"
          />
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
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
  flatListContentContainer: {
    paddingTop: 0,
    paddingBottom: 10,
  },
  fixedInputContainer: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    // Shadow for iOS
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    // Shadow for Android
    elevation: 5,
  },
  scrollToBottomFab: {
    position: 'absolute',
    right: undefined,
    left: '50%',
    transform: [{ translateX: -28 }],
    bottom: 140,
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    elevation: 5,
    zIndex: 20,
    // Add a border for better contrast against white backgrounds
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
});

export default WineDetailScreen;
