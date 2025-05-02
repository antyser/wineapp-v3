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
import { Message, Note } from '../api/generated/types.gen';
import WineChatView from '../components/wine/WineChatView';
import { UIMessage } from '../components/wine/WineChatView';
import { apiClient } from '../api';

type WineDetailScreenRouteProp = RouteProp<RootStackParamList, 'WineDetail'>;
type WineDetailScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

const DEFAULT_MODEL = "gemini-2.5-flash-preview-04-17";

// Define the expected response structure from the backend chat endpoint
// (This might already exist in a service file or types, ensure consistency)
interface ChatApiResponse {
    response: {
        text: string;
    };
    followup_questions?: string[];
}

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

  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<UIMessage[]>([]);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [followUpQuestions, setFollowUpQuestions] = useState<string[]>([]);

  const getFormattedWineName = useCallback(() => {
    if (!wine) return '';
    if (wine.vintage && wine.vintage !== 1 && wine.name) {
      return `${wine.vintage} ${wine.name}`;
    }
    return wine.name || '';
  }, [wine]);
  
  useEffect(() => {
    if (wine) {
      let aboutText = wine.description ? `${wine.description}\n\n` : '';
      if (wine.food_pairings) {
        aboutText += `**Food Pairing:** ${wine.food_pairings}\n`;
      }
      if (wine.drinking_window) {
        aboutText += `**Drinking Window:** ${wine.drinking_window}\n`;
      }
      if (wine.abv) {
        aboutText += `**ABV:** ${wine.abv}\n`;
      }
      if (!aboutText.trim()) {
        aboutText = `Hello! I'm your wine assistant for the ${getFormattedWineName()}.\n`;
      }
      
      const initialMessageContent = `${aboutText.trim()}`;

      const initialFollowUps = [
        "What food would pair well with this wine?",
        "Tell me about the winery",
        "What is the drinking window?"
      ];
      
      setChatMessages([
        {
          id: '0',
          content: initialMessageContent,
          role: 'assistant',
          timestamp: new Date(),
          followup_questions: initialFollowUps,
        },
      ]);
      setFollowUpQuestions(initialFollowUps);
    } else {
      setChatMessages([]);
      setFollowUpQuestions([]);
    }
  }, [wine, getFormattedWineName]);

  const handleSendMessage = useCallback(async (text: string = chatInput) => {
    if (!text.trim() || !wine) return;

    const userMessage: UIMessage = {
      id: Date.now().toString(),
      content: text.trim(),
      role: 'user',
      timestamp: new Date(),
    };

    setChatMessages((prev) => [...prev, userMessage]);
    setChatInput('');
    setIsChatLoading(true);
    setFollowUpQuestions([]);

    try {
      const wineContext = `The user is asking about ${getFormattedWineName()}. Context: Region: ${wine.region || 'N/A'}, Country: ${wine.country || 'N/A'}, Varietal: ${wine.varietal || 'N/A'}, Winery: ${wine.winery || 'N/A'}, Description: ${wine.description || 'N/A'}`;
      let apiMessages: Message[] = [
        { role: 'assistant', content: { text: wineContext } }
      ];
      const history = chatMessages
        .filter(msg => msg.id !== '0')
        .map(msg => ({ role: msg.role, content: { text: msg.content } } as Message));
      apiMessages = [...apiMessages, ...history, { role: 'user', content: { text: userMessage.content } } as Message];

      const response = await apiClient.post<ChatApiResponse>('/api/v1/chat/wine', {
          messages: apiMessages,
          model: DEFAULT_MODEL
      });

      const chatApiResponse = response.data;

      console.log("[WineDetailScreen] Full API response:", chatApiResponse);

      if (chatApiResponse?.response?.text) {
        const responseText = chatApiResponse.response.text;
        const followup_questions = chatApiResponse.followup_questions || [];

        const assistantMessage: UIMessage = {
          id: Date.now().toString() + '-assistant',
          content: responseText,
          role: 'assistant',
          timestamp: new Date(),
          followup_questions: followup_questions.length > 0 ? followup_questions : undefined
        };
        setChatMessages((prev) => [...prev, assistantMessage]);
        setFollowUpQuestions(followup_questions);
      } else {
        console.error("[WineDetailScreen] Invalid or empty response from API:", chatApiResponse);
        throw new Error('Received an invalid response from the assistant.');
      }

    } catch (error: any) {
      console.error('[WineDetailScreen] Error sending message:', error);
      const errorMessage: UIMessage = {
          id: Date.now().toString() + '-error',
          content: error.response?.data?.detail || error.message || 'Sorry, I encountered an error.',
          role: 'assistant',
          timestamp: new Date(),
      };
      setChatMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsChatLoading(false);
    }
  }, [chatInput, chatMessages, wine, getFormattedWineName]);

  const handleFollowupQuestion = (question: string) => {
    handleSendMessage(question);
  };

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
