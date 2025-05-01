import React, { useCallback, useState, useRef, useEffect } from 'react';
import { StyleSheet, View, FlatList, ActivityIndicator, KeyboardAvoidingView, Platform, TouchableOpacity, ScrollView } from 'react-native';
import { Text, Button, TextInput, MD3Colors, Chip } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import Markdown from 'react-native-markdown-display';
import { useAuth } from '../auth/AuthContext';
import { Message, MessageContent } from '../api/generated/types.gen';
import { apiFetch } from '../lib/apiClient';

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
        "What food pairs well with this wine?",
        "Tell me about the winery",
        "What's the drinking window for this wine?"
      ]
    },
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const { getToken } = useAuth();
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    // Delay scrolling slightly to ensure the list is fully rendered
    const timer = setTimeout(() => {
      if (flatListRef.current) {
        flatListRef.current.scrollToEnd({ animated: true });
      }
    }, 100);
    
    return () => clearTimeout(timer);
  }, [messages]);

  const sendMessage = useCallback(async (text: string = inputText) => {
    if (!text.trim()) return;

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
      // NOTE: No need to manually get token here, apiFetch handles it.

      // Use apiFetch to make the API call
      const response = await apiFetch<ChatApiResponse>('/api/v1/chat/wine', {
        method: 'POST',
        body: JSON.stringify({
          messages: apiMessages,
          model: DEFAULT_MODEL
        })
      });

      console.log("[ChatScreen] Full API response:", response);

      if (response?.response?.text) { // Check if response and nested properties exist
        const responseText = response.response.text;
        const followup_questions = response.followup_questions || [];

        console.log("[ChatScreen] Follow-up questions:", followup_questions);

        const assistantMessage: UIMessage = {
          id: Date.now().toString() + '-assistant', // Ensure unique ID
          content: responseText,
          role: 'assistant',
          timestamp: new Date(),
          followup_questions: followup_questions.length > 0 ? followup_questions : undefined
        };

        console.log("[ChatScreen] Adding assistant message with followups:", assistantMessage);
        setMessages((prev) => [...prev, assistantMessage]);
      } else {
        // Handle cases where response is null or structure is unexpected
        console.error("[ChatScreen] Invalid or empty response from API:", response);
        throw new Error('Received an invalid response from the assistant.');
      }

    } catch (error: any) {
      console.error('[ChatScreen] Error sending message:', error);

      const errorMessage = {
        id: Date.now().toString() + '-error',
        content: error.message || 'Sorry, I encountered an error. Please try again.',
        role: 'assistant' as const,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  }, [inputText, getToken, messages]);

  const handleFollowupQuestion = (question: string) => {
    sendMessage(question);
  };

  const renderMessage = ({ item }: { item: UIMessage }) => {
    const isUser = item.role === 'user';
    
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
          // Assistant message without follow-up questions
          <View style={styles.assistantContent}>
            <Markdown style={markdownStyles}>{item.content}</Markdown>
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

        {isLoading && (
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
    backgroundColor: MD3Colors.primary95,
    borderRadius: 12,
    borderBottomRightRadius: 4,
    maxWidth: '80%',
  },
  assistantContent: {
    padding: 12,
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
