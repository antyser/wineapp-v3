import React, { useCallback, useState, useRef, useEffect } from 'react';
import { StyleSheet, View, FlatList, ActivityIndicator, KeyboardAvoidingView, Platform, Modal, TouchableOpacity, ScrollView } from 'react-native';
import { Text, Button, TextInput, MD3Colors, IconButton, Chip } from 'react-native-paper';
import Markdown from 'react-native-markdown-display';
import { useAuth } from '../auth/AuthContext';
import { client } from '../api/generated/client.gen'; // Import base client for URL
import { Message } from '../api/generated/types.gen';

// Default model to use
const DEFAULT_MODEL = "gemini-2.5-flash-preview-04-17";

// For display in the UI
interface UIMessage {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
  followup_questions?: string[]; // Match API property name
}

interface ChatBoxProps {
  wineName?: string;
  initialContext?: string;
  isVisible: boolean;
  onClose: () => void;
}

const ChatBox: React.FC<ChatBoxProps> = ({ 
  wineName, 
  initialContext,
  isVisible, 
  onClose 
}) => {
  const initialMessage = `Hello! I'm your wine assistant. What would you like to know about ${wineName || 'this wine'}?`;
  
  const [inputText, setInputText] = useState('');
  const [messages, setMessages] = useState<UIMessage[]>([
    {
      id: '0',
      content: initialMessage,
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
  const readerRef = useRef<ReadableStreamDefaultReader<string> | null>(null);

  // Reset messages when the wine changes or modal becomes visible
  useEffect(() => {
    if (isVisible) {
      setMessages([{
        id: Date.now().toString(),
        content: initialMessage,
        role: 'assistant',
        timestamp: new Date(),
        followup_questions: [
          "What food pairs well with this wine?",
          "Tell me about the winery",
          "What's the drinking window for this wine?"
        ]
      }]);
    }
  }, [isVisible, wineName, initialMessage]);

  useEffect(() => {
    // Delay scrolling slightly to ensure the list is fully rendered
    const timer = setTimeout(() => {
      if (flatListRef.current) {
        flatListRef.current.scrollToEnd({ animated: true });
      }
    }, 100);
    
    return () => clearTimeout(timer);
  }, [messages]);

  const closeEventStream = useCallback(() => {
      // This function now primarily manages the isLoading state,
      // as the fetch stream closes itself or via reader.cancel()
      // if (eventSourceRef.current) { ... } // Removed EventSource logic
      console.log("Stream processing ended or cancelled.");
      setIsLoading(false);
  }, []);

  const sendMessage = useCallback(async (text: string = inputText) => {
    if (!text.trim()) return;

    // Now just resets loading state if somehow a stream was interrupted without finishing
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

    setMessages((prev) => [...prev, userMessage, assistantPlaceholder]);
    setInputText('');
    setIsLoading(true);
    let reader: ReadableStreamDefaultReader<string> | null = null; // Keep track of the reader to cancel if needed

    try {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');

      // Prepare context if available
      let apiMessages: Message[] = [];
      
      // Add initial context about the wine if provided
      if (initialContext) {
        apiMessages.push({
          role: 'assistant',
          content: { text: `The user is asking about ${wineName}. Here's some context about this wine: ${initialContext}` }
        });
      }
      
      // Add conversation history
      const historyMessages = messages.map(msg => ({
        role: msg.role,
        content: { text: msg.content }
      }));
      
      apiMessages = [...apiMessages, ...historyMessages];
      
      // Add the user message to the API messages
      apiMessages.push({
        role: 'user',
        content: { text: userMessage.content }
      });

      console.log("Sending messages to streaming API:", apiMessages);
      const baseUrl = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000'; 
      const streamUrl = `${baseUrl}/api/v1/chat/wine/stream`;
      console.log(`Connecting via fetch SSE: ${streamUrl}`);

      const requestBody = {
          messages: apiMessages,
          model: DEFAULT_MODEL
      };

      const requestHeaders = {
        'Content-Type': 'application/json',
        'Accept': 'text/event-stream',
        'Authorization': `Bearer ${token}`,
      };

      console.log("Fetch Request Headers:", requestHeaders); // Log headers
      console.log("Fetch Request Body:", JSON.stringify(requestBody)); // Log stringified body
      
      const response = await fetch(streamUrl, {
        method: 'POST',
        headers: requestHeaders,
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      if (!response.body) {
          throw new Error('Response body is null');
      }

      // Use TextDecoderStream for correct SSE parsing
      const stream = response.body.pipeThrough(new TextDecoderStream());
      reader = stream.getReader(); // Assign reader here
      let buffer = '';
      let shouldBreakOuterLoop = false;

      // eslint-disable-next-line no-constant-condition
      while (true) {
        const { value, done } = await reader.read(); // Read from the text stream reader
        
        if (done) {
            console.log('Stream finished.');
            break;
        }

        buffer += value; // value is now a string
        let boundary = buffer.indexOf('\n\n');
        
        while (boundary !== -1) {
            const message = buffer.substring(0, boundary);
            buffer = buffer.substring(boundary + 2);
            
            let eventType = 'message';
            let eventData = '';

            const lines = message.split('\n');
            lines.forEach(line => {
                if (line.startsWith('event:')) {
                    eventType = line.substring(6).trim();
                } else if (line.startsWith('data:')) {
                    // Handle potential multi-line data field concatenation
                    eventData += line.substring(5).trim(); 
                }
            });

            console.log("Received SSE:", { eventType, eventData });

            if (eventData) {
                try {
                    // Only attempt to parse if data is not just whitespace
                    if (eventData.trim()) { 
                      const parsedData = JSON.parse(eventData);
                      
                      // Process different event types
                      if (eventType === 'content') {
                          setMessages((prev) => prev.map((msg) =>
                              msg.id === assistantPlaceholderId
                                  ? { ...msg, content: msg.content + (parsedData.text || '') }
                                  : msg
                          ));
                      } else if (eventType === 'followup') {
                          setMessages((prev) => prev.map((msg) =>
                              msg.id === assistantPlaceholderId
                                  ? { ...msg, followup_questions: parsedData.questions || [] }
                                  : msg
                          ));
                      } else if (eventType === 'error') {
                          console.error('Stream error from backend:', parsedData.error);
                          setMessages((prev) => prev.map((msg) =>
                              msg.id === assistantPlaceholderId
                                  ? { ...msg, content: msg.content + `\n\nError: ${parsedData.error}` }
                                  : msg
                          ));
                          shouldBreakOuterLoop = true;
                          break; // Exit inner while loop
                      } else if (eventType === 'end') {
                          console.log('Received end event.');
                          shouldBreakOuterLoop = true;
                          break; // Exit inner while loop
                      }
                    }
                } catch (e) {
                    console.error('Error parsing SSE data:', e, "Raw Data:", eventData);
                }
            }
            // Find next message boundary
            boundary = buffer.indexOf('\n\n');
        } // end while boundary
        
        if (shouldBreakOuterLoop) break; // Exit outer while loop
      } // end while true

    } catch (error) {
      // Log the specific error object
      console.error('Detailed error in sendMessage:', error);
      if (error instanceof Error) {
          console.error('Error name:', error.name);
          console.error('Error message:', error.message);
          console.error('Error stack:', error.stack); 
      }
      
      console.error('Error sending/processing stream message:', error); // Keep original log
      setMessages((prev) => prev.map((msg) =>
        msg.id === assistantPlaceholderId
          ? { ...msg, content: msg.content + '\n\nSorry, I encountered an error. Please try again.' }
          : msg
      ));
    } finally {
      // Ensure isLoading is set to false regardless of success/error
      // Reader might be null if fetch failed early
      if (reader) {
          reader.releaseLock(); // Release lock on the stream
      }
      closeEventStream(); 
    }
  }, [inputText, getToken, messages, wineName, initialContext, closeEventStream]);

  // Handle followup question selection
  const handleFollowupQuestion = (question: string) => {
    sendMessage(question);
  };

  const renderMessage = ({ item }: { item: UIMessage }) => {
    const isUser = item.role === 'user';
    
    console.log("Rendering ChatBox message:", item);
    console.log("Message has followup questions:", item.followup_questions ? "yes" : "no");
    
    if (item.followup_questions) {
      console.log("ChatBox followup questions:", item.followup_questions);
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

  if (!isVisible) return null;

  return (
    <Modal
      visible={isVisible}
      onRequestClose={() => {
          // Attempt to cancel the stream if modal is closed prematurely
          readerRef.current?.cancel('Modal closed by user'); // readerRef needs to be created
          closeEventStream(); // Ensure loading state is reset
          onClose();
        }}
      animationType="slide"
      transparent={false}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <IconButton 
            icon="close" 
            onPress={() => {
              // Attempt to cancel the stream if modal is closed prematurely
              // readerRef.current?.cancel('Modal closed by user'); // readerRef needs to be created
              closeEventStream(); // Ensure loading state is reset
              onClose();
            }} 
            style={styles.closeButton}
          />
          <Text variant="headlineMedium">
            {wineName ? `About ${wineName}` : 'Wine Assistant'}
          </Text>
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

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
        >
          <View style={styles.inputContainer}>
            <TextInput
              mode="outlined"
              style={styles.input}
              placeholder={`Ask about ${wineName || 'this wine'}...`}
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
      </View>
    </Modal>
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
    flexDirection: 'row',
    justifyContent: 'center',
  },
  closeButton: {
    position: 'absolute',
    left: 8,
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

export default ChatBox; 