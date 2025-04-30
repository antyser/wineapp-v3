import React, { useRef, useEffect } from 'react';
import { StyleSheet, View, FlatList, ActivityIndicator, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { Text, TextInput, Chip, IconButton, MD3Colors, useTheme } from 'react-native-paper';
import Markdown from 'react-native-markdown-display';

// Define UIMessage interface locally
export interface UIMessage {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
  followup_questions?: string[];
}

interface WineChatViewProps {
  chatMessages: UIMessage[];
  chatInput: string;
  setChatInput: (text: string) => void;
  isChatLoading: boolean;
  followUpQuestions: string[];
  handleSendMessage: (text?: string) => void;
  handleFollowupQuestion: (question: string) => void;
  listHeaderComponent?: React.ComponentType<any> | React.ReactElement | null | undefined;
}

const WineChatView: React.FC<WineChatViewProps> = ({
  chatMessages,
  chatInput,
  setChatInput,
  isChatLoading,
  followUpQuestions,
  handleSendMessage,
  handleFollowupQuestion,
  listHeaderComponent,
}) => {
  const theme = useTheme();
  const flatListRef = useRef<FlatList<UIMessage>>(null);

  // Scroll to end when messages change
  useEffect(() => {
    const timer = setTimeout(() => {
      if (flatListRef.current) {
        flatListRef.current.scrollToEnd({ animated: true });
      }
    }, 100);
    return () => clearTimeout(timer);
  }, [chatMessages]);

  const renderChatMessage = ({ item }: { item: UIMessage }) => {
    const isUser = item.role === 'user';
    const cleanContent = item.content.replace(/<\/?questions>/g, '').trim();
    
    return (
      <View 
        style={[
          styles.messageContainer, 
          isUser ? 
            [styles.userMessageBubble, { backgroundColor: theme.colors.primary }] : 
            styles.assistantMessageContainer
        ]}
      >
         {isUser ? (
           <Text style={styles.userMessageText}>{cleanContent}</Text>
         ) : (
           <Markdown style={markdownStyles}>{cleanContent}</Markdown>
         )}
      </View>
    );
  };

  return (
    <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"} 
        style={styles.container}
        keyboardVerticalOffset={Platform.OS === "ios" ? 64 : 0} // Adjust as needed based on header height
    >
      <FlatList
        ref={flatListRef}
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContentContainer}
        data={chatMessages}
        renderItem={renderChatMessage}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={listHeaderComponent} // Render header passed from parent
        ListFooterComponent={isChatLoading ? <ActivityIndicator style={styles.chatLoadingIndicator} /> : null}
      />
        
      {/* Follow-up Questions Area */} 
      {followUpQuestions.length > 0 && !isChatLoading && (
        <View style={styles.followUpContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.followUpScroll}>
            {followUpQuestions.map((q, index) => (
              <Chip 
                key={index} 
                style={styles.followUpChip}
                onPress={() => handleFollowupQuestion(q)}
              >
                {q}
              </Chip>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Chat Input Area */} 
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.textInput}
          value={chatInput}
          onChangeText={setChatInput}
          placeholder="Ask about this wine..."
          multiline
          disabled={isChatLoading}
        />
        <IconButton
          icon="send"
          size={24}
          onPress={() => handleSendMessage()}
          disabled={isChatLoading || !chatInput.trim()}
          style={styles.sendButton}
      />
    </View>
    </KeyboardAvoidingView>
  );
};

// Styles moved from WineDetailScreen (or defined anew)
const styles = StyleSheet.create({
  container: {
    flex: 1, // Important for KAV
    backgroundColor: '#FFFFFF',
  },
  scrollView: {
    flex: 1,
  },
  scrollContentContainer: {
    paddingBottom: 10,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderTopWidth: 1,
    borderTopColor: MD3Colors.neutralVariant70,
    backgroundColor: '#FFFFFF',
  },
  textInput: {
    flex: 1,
    marginRight: 8,
    maxHeight: 60,
    backgroundColor: MD3Colors.neutralVariant95,
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingTop: 4,
    paddingBottom: 4,
    borderWidth: 0,
  },
  sendButton: {
    margin: 0,
  },
  messageContainer: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    marginVertical: 4,
    maxWidth: '95%',
  },
  userMessageBubble: { 
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 18,
    alignSelf: 'flex-end',
    maxWidth: '80%',
    marginRight: 8,
  },
  assistantMessageContainer: {
    alignSelf: 'flex-start',
    marginLeft: 8, 
  },
  userMessageText: {
    color: '#FFFFFF',
  },
  chatLoadingIndicator: {
    marginVertical: 10,
  },
  followUpContainer: {
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderTopWidth: 1,
      borderTopColor: MD3Colors.neutralVariant90, 
      backgroundColor: '#FFFFFF', 
  },
  followUpScroll: {
      paddingVertical: 4,
  },
  followUpChip: {
      marginRight: 8,
      backgroundColor: MD3Colors.neutralVariant95,
  }
});

const markdownStyles = {
  body: { color: '#000000' },
};

export default WineChatView; 