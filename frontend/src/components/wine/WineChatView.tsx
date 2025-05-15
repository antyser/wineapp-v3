import React, { useRef, useEffect } from 'react';
import { StyleSheet, View, FlatList, ActivityIndicator, ScrollView, KeyboardAvoidingView, Platform, Dimensions } from 'react-native';
import { Text, TextInput, IconButton, MD3Colors, useTheme, TouchableRipple } from 'react-native-paper';
import Markdown from 'react-native-markdown-display';

// Define UIMessage interface locally
export interface UIMessage {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
  followup_questions?: string[];
  isError?: boolean; // Add optional error flag
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
  const paperTheme = useTheme();
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
    const content = typeof item.content === 'string' ? item.content : '';
    const cleanContent = content.replace(/<\/?questions>/g, '').trim();

    if (!item.content && !item.isError) {
        return null; 
    }

    // Use a fixed light grey color for user messages
    const userMessageBackgroundColor = '#F5F5F5';
    
    return (
      <View 
        style={[
          styles.messageContainer, 
          isUser ? 
            [styles.userMessageBubble, { backgroundColor: userMessageBackgroundColor }] : 
            styles.assistantMessageContainer
        ]}
      >
         {isUser ? (
           <Text style={styles.userMessageText}>{item.isError ? '[Error]' : cleanContent}</Text> 
         ) : (
           cleanContent ? <Markdown style={markdownStyles}>{cleanContent}</Markdown> : <Text>{item.isError ? '[Error processing response]' : ''}</Text>
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
              <TouchableRipple
                key={index}
                onPress={() => handleFollowupQuestion(q)}
                style={styles.customFollowUpChipTouchable} // Style for the touchable area
                rippleColor="rgba(0, 0, 0, .32)" // Standard ripple color
              >
                <View style={styles.customFollowUpChipView}> {/* Style for the visual chip body */}
                  <Text style={styles.customFollowUpChipText} numberOfLines={0}>{q || ''}</Text>
                </View>
              </TouchableRipple>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Chat Input Area */} 
      <View style={styles.inputContainer}>
        <TextInput
          dense
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
    backgroundColor: '#F5F5F5',
    borderRadius: 20,
    paddingHorizontal: 16,
    fontSize: 16,
    paddingVertical: 6,
    minHeight: 30,
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
    backgroundColor: '#F5F5F5', // Light grey background
  },
  assistantMessageContainer: {
    alignSelf: 'flex-start',
    marginLeft: 8, 
  },
  userMessageText: {
    color: '#333333', // Dark text color for contrast on light background
  },
  chatLoadingIndicator: {
    marginVertical: 10,
  },
  followUpContainer: {
      paddingHorizontal: 8,
      paddingTop: 8, // Give some space from content above
      paddingBottom: 4,
      // Ensure no top border for the container itself
      // borderTopWidth: 0, (or simply not define it)
      backgroundColor: '#FFFFFF', 
  },
  followUpScroll: {
      paddingVertical: 4,
  },

  // Styles for the custom chip-like component
  customFollowUpChipTouchable: {
    marginRight: 8,
    borderRadius: 16, // Typical chip border radius
    maxWidth: (Dimensions.get('window').width * 2) / 3,
  },
  customFollowUpChipView: {
    backgroundColor: '#F5F5F5', // Light grey background for follow-up questions
    paddingVertical: 8,   // Vertical padding for the chip content
    paddingHorizontal: 12, // Horizontal padding for the chip content
    borderRadius: 16, // Match TouchableRipple for consistent shape
    // height: undefined is implicit for View, it will grow with content
  },
  customFollowUpChipText: {
    color: '#333333', // Dark text for follow-up questions
    fontSize: 14, 
    textAlign: 'left',
  },
  // Remove or comment out the old followUpChip style if it exists
  /* followUpChip: {
      marginRight: 8,
      backgroundColor: MD3Colors.neutralVariant95,
      maxWidth: (Dimensions.get('window').width * 2) / 3,
      height: undefined, 
  },*/
});

const markdownStyles = {
  body: { color: '#000000' },
};

export default WineChatView; 