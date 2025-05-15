import React, { useCallback, useState, useRef, useEffect } from 'react';
import { StyleSheet, View, FlatList, ActivityIndicator, KeyboardAvoidingView, Platform, TouchableOpacity, ScrollView } from 'react-native';
import { Text, Button, TextInput, MD3Colors, Chip } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import Markdown from 'react-native-markdown-display';
import { useAuth } from '../auth/AuthContext';
import { Message, MessageContent } from '../api/generated/types.gen';
import { sendChatMessage, streamChatMessage } from '../api/services/chatService';

// Default model to use
const DEFAULT_MODEL = "gemini-2.5-flash-preview-04-17";

// For display in the UI
interface UIMessage {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
  followup_questions?: string[];
}

// Define the expected response structure from the backend chat endpoint
interface ChatApiResponse {
    response: {
        text: string;
    };
    followup_questions?: string[];
}

const ChatScreen = () => {
  const [inputText, setInputText] = useState('');
  const [messages, setMessages] = useState<UIMessage[]>([
    {
      id: '0',
      content: "Hello! I'm your wine assistant. Ask me anything about wines, food pairings, or recommendations based on your preferences.",
      role: 'assistant',
      timestamp: new Date(),
      followup_questions: [
        "food pairing",
        "the winery",
        "drinking window"
      ]
    },
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const { getToken } = useAuth();
  const flatListRef = useRef<FlatList>(null);
  // Reference to keep track of the current stream abort function
  const abortStreamRef = useRef<(() => void) | null>(null);
  // Reference to track if a streaming response is in progress
  const [currentStreamingMessageId, setCurrentStreamingMessageId] = useState<string | null>(null);

  useEffect(() => {
    // Delay scrolling slightly to ensure the list is fully rendered
    const timer = setTimeout(() => {
      if (flatListRef.current) {
        flatListRef.current.scrollToEnd({ animated: true });
      }
    }, 100);
    
    return () => clearTimeout(timer);
  }, [messages]);

  // Cleanup function to abort any ongoing streams when component unmounts
  useEffect(() => {
    return () => {
      if (abortStreamRef.current) {
        abortStreamRef.current();
        abortStreamRef.current = null;
      }
    };
  }, []);

  const sendMessage = useCallback(async (text: string = inputText) => {
    if (!text.trim()) return;

    // Abort any active stream before starting a new one
    if (abortStreamRef.current) {
      abortStreamRef.current();
      abortStreamRef.current = null;
      setCurrentStreamingMessageId(null);
    }

    const userMessage: UIMessage = {
      id: Date.now().toString(),
      content: text.trim(),
      role: 'user',
      timestamp: new Date(),
    };

    // Add user message to the chat
    setMessages((prev) => [...prev, userMessage]);
    setInputText('');
    setIsLoading(true);

    // Convert UI messages to the API message format for context
    // Exclude the initial greeting message (id '0') from history if desired
    const apiMessages: Message[] = messages
        .filter(msg => msg.id !== '0') // Filter out the initial message
        .map(msg => ({
            role: msg.role,
            content: { text: msg.content } as MessageContent // Assert type if necessary
    }));
    
    // Add the new user message to the API messages array
    apiMessages.push({
      role: 'user',
      content: { text: userMessage.content } as MessageContent
    });

    console.log("[ChatScreen] Sending messages to API:", apiMessages);

    try {
      // Create a placeholder message for the assistant's response that will be streamed
      const assistantMessageId = Date.now().toString() + '-assistant';
      const initialAssistantMessage: UIMessage = {
        id: assistantMessageId,
        content: '', // Empty initially, will be populated as content streams in
        role: 'assistant',
        timestamp: new Date(),
      };

      // Add the initial empty assistant message
      setMessages(prev => [...prev, initialAssistantMessage]);
      // Set the current streaming message ID
      setCurrentStreamingMessageId(assistantMessageId);

      // Use the streaming API
      abortStreamRef.current = streamChatMessage(
        apiMessages, 
        DEFAULT_MODEL,
        {
          onStart: () => {
            console.log("[ChatScreen] Stream started");
          },
          onContent: (content) => {
            // Update the assistant's message content as new tokens arrive
            setMessages(prev => {
              const updatedMessages = [...prev];
              const assistantMessageIndex = updatedMessages.findIndex(
                msg => msg.id === assistantMessageId
              );
              
              if (assistantMessageIndex !== -1) {
                // Append the new content to the existing message
                const currentMessage = updatedMessages[assistantMessageIndex];
                updatedMessages[assistantMessageIndex] = {
                  ...currentMessage,
                  content: currentMessage.content + content
                };
              }
              
              return updatedMessages;
            });
          },
          onFollowup: (followupQuestions) => {
            console.log("[ChatScreen] Received followup questions:", followupQuestions);
            // Update the assistant's message with follow-up questions
            setMessages(prev => {
              const updatedMessages = [...prev];
              const assistantMessageIndex = updatedMessages.findIndex(
                msg => msg.id === assistantMessageId
              );
              
              if (assistantMessageIndex !== -1) {
                // Add the followup questions to the message
                updatedMessages[assistantMessageIndex] = {
                  ...updatedMessages[assistantMessageIndex],
                  followup_questions: followupQuestions
                };
              }
              
              return updatedMessages;
            });
          },
          onError: (error) => {
            console.error('[ChatScreen] Stream error:', error);
            // Add an error message to the chat
            const errorMessage: UIMessage = {
              id: Date.now().toString() + '-error',
              content: error || 'Sorry, I encountered an error. Please try again.',
              role: 'assistant',
              timestamp: new Date(),
            };
            setMessages(prev => [...prev, errorMessage]);
          },
          onEnd: () => {
            console.log("[ChatScreen] Stream ended");
            setIsLoading(false);
            setCurrentStreamingMessageId(null);
            abortStreamRef.current = null;
          }
        }
      );

    } catch (error: any) {
      console.error('[ChatScreen] Error setting up stream:', error);

      const errorMessage = {
        id: Date.now().toString() + '-error',
        content: error.message || 'Sorry, I encountered an error. Please try again.',
        role: 'assistant' as const,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
      setIsLoading(false);
      setCurrentStreamingMessageId(null);
    }
  }, [inputText, messages]);

  const handleFollowupQuestion = (question: string) => {
    sendMessage(question);
  };

  const renderMessage = ({ item }: { item: UIMessage }) => {
    const isUser = item.role === 'user';
    const isStreaming = item.id === currentStreamingMessageId;
    
    console.log("Rendering message:", item);
    console.log("Has followup questions:", item.followup_questions ? "yes" : "no");
    
    if (item.followup_questions) {
      console.log("Followup questions:", item.followup_questions);
    }

    return (
      <View
        style={[
          styles.messageContainer,
          isUser ? styles.userMessageContainer : styles.assistantMessageContainer,
        ]}
      >
        {isUser ? (
          // User message with bubble
          <View style={styles.userBubble}>
            <Markdown style={markdownStyles}>{item.content}</Markdown>
          </View>
        ) : (
          // Assistant message
          <View style={styles.assistantContent}>
            <Markdown style={markdownStyles}>{item.content}</Markdown>
            {isStreaming && (
              <View style={styles.streamingIndicator}>
                <ActivityIndicator size="small" color={MD3Colors.primary40} />
              </View>
            )}
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <View style={styles.header}>
          <Text variant="headlineMedium">Wine Assistant</Text>
        </View>
        
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          style={styles.messageList}
          contentContainerStyle={styles.messageListContent}
        />

        {isLoading && !currentStreamingMessageId && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color={MD3Colors.primary40} />
            <Text style={styles.loadingText}>Thinking...</Text>
          </View>
        )}

        {/* Follow-up questions above input */}
        {messages.length > 0 && !isLoading && messages[messages.length - 1].followup_questions && 
         messages[messages.length - 1].followup_questions!.length > 0 && (
          <View style={styles.followupSuggestions}>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.followupScrollContent}
            >
              {messages[messages.length - 1].followup_questions!.map((question, index) => (
                <Chip
                  key={index}
                  mode="outlined"
                  style={styles.followupSuggestionChip}
                  onPress={() => handleFollowupQuestion(question)}
                >
                  {question}
                </Chip>
              ))}
            </ScrollView>
          </View>
        )}

        <View style={styles.inputContainer}>
          <TextInput
            mode="outlined"
            style={styles.input}
            placeholder="Ask about wines..."
            value={inputText}
            onChangeText={setInputText}
            multiline
            disabled={isLoading}
          />
          <Button
            mode="contained"
            onPress={() => sendMessage()}
            disabled={!inputText.trim() || isLoading}
            style={styles.sendButton}
          >
            Send
          </Button>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#EDF1F7',
    alignItems: 'center',
  },
  messageList: {
    flex: 1,
  },
  messageListContent: {
    padding: 16,
    gap: 16,
  },
  messageContainer: {
    marginBottom: 16,
  },
  userMessageContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'flex-start',
  },
  assistantMessageContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
    paddingRight: 24, // Add padding to make assistant messages not take full width
  },
  userBubble: {
    padding: 12,
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    borderBottomRightRadius: 4,
    maxWidth: '80%',
  },
  assistantContent: {
    padding: 12,
    position: 'relative', // For positioning the streaming indicator
  },
  streamingIndicator: {
    position: 'absolute',
    right: -24,
    bottom: 12,
  },
  loadingContainer: {
    flexDirection: 'row',
    padding: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginLeft: 8,
    color: MD3Colors.primary40,
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 8,
    borderTopWidth: 1,
    borderTopColor: '#EDF1F7',
    alignItems: 'flex-end',
  },
  input: {
    flex: 1,
    marginRight: 8,
    maxHeight: 120,
    backgroundColor: '#F5F5F5',
  },
  sendButton: {
    borderRadius: 20,
    paddingHorizontal: 16,
  },
  // Styles for follow-up suggestions
  followupSuggestions: {
    padding: 8,
    paddingBottom: 0,
  },
  followupScrollContent: {
    paddingVertical: 4,
    paddingHorizontal: 4,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  followupSuggestionChip: {
    marginRight: 8,
    backgroundColor: '#F5F5F5', // Light grey background
    borderColor: '#E0E0E0', // Light border
    color: '#333333', // Dark text
  },
});

const markdownStyles = {
  body: {
    fontSize: 16,
    lineHeight: 22,
  },
  heading1: {
    fontSize: 24,
    marginTop: 8,
    marginBottom: 8,
    fontWeight: 'bold',
  },
  heading2: {
    fontSize: 20,
    marginTop: 8,
    marginBottom: 8,
    fontWeight: 'bold',
  },
  heading3: {
    fontSize: 18,
    marginTop: 8,
    marginBottom: 8,
    fontWeight: 'bold',
  },
  link: {
    color: '#3366FF',
    textDecorationLine: 'underline' as const,
  },
  listItem: {
    marginBottom: 4,
  },
  paragraph: {
    marginBottom: 8,
  },
};

export default ChatScreen;
