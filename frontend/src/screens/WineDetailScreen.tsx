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
import { Message } from '../api/generated/types.gen';
import WineChatView from '../components/wine/WineChatView';
import { UIMessage } from '../components/wine/WineChatView';

type WineDetailScreenRouteProp = RouteProp<RootStackParamList, 'WineDetail'>;
type WineDetailScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

const DEFAULT_MODEL = "gemini-2.5-flash-preview-04-17";

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
  } = useWineDetails(wineId, routeWine);

  const {
    isInWishlist,
    isLiked,
    userRating,
    hasExistingNotes,
    interactionError,
    toggleWishlist,
    toggleLike,
    rateWine,
    clearInteractionError,
  } = useWineInteractions(wineId, initialInteractionData);

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

  const readerRef = useRef<ReadableStreamDefaultReader<string> | null>(null);
  const closeEventStream = useCallback(() => {
      console.log("Stopping chat stream processing (if active).");
      if (readerRef.current) {
          readerRef.current.cancel('Component unmounted or new message sent').catch(e => console.warn('Error cancelling reader:', e));
          readerRef.current = null;
      }
      setIsChatLoading(false);
  }, []);

  const handleSendMessage = useCallback(async (text: string = chatInput) => {
    if (!text.trim() || !wine) return;

    closeEventStream();

    const userMessage: UIMessage = {
      id: Date.now().toString(),
      content: text.trim(),
      role: 'user',
      timestamp: new Date(),
    };

    const assistantPlaceholderId = (Date.now() + 1).toString();
    const assistantPlaceholder: UIMessage = {
      id: assistantPlaceholderId,
      content: '',
      role: 'assistant',
      timestamp: new Date(),
    };

    setChatMessages((prev) => [...prev, userMessage, assistantPlaceholder]);
    setChatInput('');
    setIsChatLoading(true);
    setFollowUpQuestions([]);

    try {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');

      const wineContext = `The user is asking about ${getFormattedWineName()}. Context: Region: ${wine.region || 'N/A'}, Country: ${wine.country || 'N/A'}, Varietal: ${wine.varietal || 'N/A'}, Winery: ${wine.winery || 'N/A'}, Description: ${wine.description || 'N/A'}`;

      let apiMessages: Message[] = [
        { role: 'assistant', content: { text: wineContext } }
      ];

      const history = chatMessages
        .filter(msg => msg.id !== '0' && msg.id !== assistantPlaceholderId)
        .map(msg => ({ role: msg.role, content: { text: msg.content } } as Message));
        
      apiMessages = [...apiMessages, ...history];
      apiMessages.push({ role: 'user', content: { text: userMessage.content } } as Message);

      const baseUrl = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000';
      const streamUrl = `${baseUrl}/api/v1/chat/wine/stream`;

      const response = await fetch(streamUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ messages: apiMessages, model: DEFAULT_MODEL }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      if (!response.body) {
        throw new Error('Response body is null');
      }

      const stream = response.body.pipeThrough(new TextDecoderStream());
      const reader = stream.getReader();
      readerRef.current = reader;
      let buffer = '';
      let currentAssistantContent = '';
      let currentFollowUps: string[] = [];

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        
        buffer += value;
        let boundary = buffer.indexOf('\n\n');

        while (boundary !== -1) {
          const message = buffer.substring(0, boundary);
          buffer = buffer.substring(boundary + 2);
          let eventType = 'message';
          let eventData = '';
          const lines = message.split('\n');

          lines.forEach(line => {
            if (line.startsWith('event:')) eventType = line.substring(6).trim();
            else if (line.startsWith('data:')) eventData += line.substring(5).trim();
          });

          if (eventData.trim()) {
            try {
              const parsedData = JSON.parse(eventData);
              if (eventType === 'content') {
                currentAssistantContent += (parsedData.text || '');
                setChatMessages(prev => prev.map(msg => msg.id === assistantPlaceholderId ? { ...msg, content: currentAssistantContent } : msg));
              } else if (eventType === 'followup') {
                currentFollowUps = parsedData.questions || [];
                setChatMessages(prev => prev.map(msg => msg.id === assistantPlaceholderId ? { ...msg, followup_questions: currentFollowUps } : msg));
                setFollowUpQuestions(currentFollowUps);
              } else if (eventType === 'error') {
                throw new Error(parsedData.error || 'Unknown stream error');
              } else if (eventType === 'end') {
                console.log('Received end event from stream.');
                reader.cancel();
                readerRef.current = null;
                setIsChatLoading(false);
                return;
              }
            } catch (e) {
              console.error('Error parsing SSE data:', e, 'Raw data:', eventData);
              setIsChatLoading(false);
              setChatMessages(prev => prev.map(msg => msg.id === assistantPlaceholderId ? { ...msg, content: msg.content + '\n\n[Error processing response]' } : msg));
              reader.cancel();
              readerRef.current = null;
              return;
            }
          }
          boundary = buffer.indexOf('\n\n');
        }
      }
      readerRef.current = null;

    } catch (error: any) {
      console.error('Error sending message:', error);
      setChatMessages(prev => prev.map(msg => msg.id === assistantPlaceholderId ? { ...msg, content: `Error: ${error.message}` } : msg));
    } finally {
      setIsChatLoading(false);
      if (readerRef.current) {
          readerRef.current.cancel().catch(e => console.warn('Error cancelling reader in finally:', e));
          readerRef.current = null;
      }
    }
  }, [chatInput, wine, getToken, chatMessages, closeEventStream, getFormattedWineName]);

  const handleFollowupQuestion = (question: string) => {
    handleSendMessage(question);
  };

  const displayError = detailsError || interactionError;

  const handleAddToWishlist = toggleWishlist;
  const handleLike = toggleLike;
  const handleRateWine = rateWine;

  const handleAddNote = () => {
    if (!wine) return;
    navigation.navigate('AddTastingNote', { 
      wineId: wine.id,
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
        <Appbar.BackAction onPress={() => { closeEventStream(); navigation.goBack(); }} />
        <Appbar.Content title={getFormattedWineName() || "Wine Details"} />
      </Appbar.Header>

      {showInteractionErrorBanner && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorBannerText}>{interactionError}</Text>
          <Button
            mode="text"
            onPress={clearInteractionError}
            labelStyle={styles.errorButtonLabel}
            compact
          >
            Dismiss
          </Button>
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
