import React, { useEffect } from 'react';
import { StyleSheet, View, ScrollView, KeyboardAvoidingView, Platform, Dimensions, TouchableWithoutFeedback, Keyboard, ActivityIndicator } from 'react-native';
import { Text, TextInput, IconButton, MD3Colors, useTheme, TouchableRipple } from 'react-native-paper';

// UIMessage interface should be moved to a types file or exported if ChatMessageItem needs it externally.
// For now, assuming ChatMessageItem imports it correctly.
export interface UIMessage { // Exporting UIMessage for ChatMessageItem
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
  followup_questions?: string[];
  isError?: boolean;
}

interface WineChatViewProps {
  chatInput: string;
  setChatInput: (text: string) => void;
  isChatLoading: boolean;
  followUpQuestions: string[];
  handleSendMessage: (text?: string) => void;
  handleFollowupQuestion: (question: string) => void;
}

const WineChatView: React.FC<WineChatViewProps> = ({
  chatInput,
  setChatInput,
  isChatLoading,
  followUpQuestions,
  handleSendMessage,
  handleFollowupQuestion,
}) => {
  // Log to debug the streaming state
  useEffect(() => {
    console.log("[WineChatView] isChatLoading:", isChatLoading, "followUpQuestions:", followUpQuestions.length);
  }, [isChatLoading, followUpQuestions]);

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <KeyboardAvoidingView 
          behavior={Platform.OS === "ios" ? "padding" : "height"} 
          style={[styles.container, { backgroundColor: '#FFFFFF' }]}
          keyboardVerticalOffset={Platform.OS === "ios" ? 64 : 0}
      >
        {/* FlatList for messages removed */} 
        
        {/* Follow-up Questions Area - Only show if not loading */} 
        {followUpQuestions.length > 0 && !isChatLoading && (
          <View style={styles.followUpContainer}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.followUpScroll}>
              {followUpQuestions.map((q, index) => (
                <TouchableRipple
                  key={index}
                  onPress={() => handleFollowupQuestion(q)}
                  style={styles.customFollowUpChipTouchable}
                  rippleColor="rgba(0, 0, 0, .32)"
                >
                  <View style={styles.customFollowUpChipView}>
                    <Text style={styles.customFollowUpChipText} numberOfLines={0}>{q || ''}</Text>
                  </View>
                </TouchableRipple>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Chat Input Area */} 
        <View style={[styles.inputContainer, { backgroundColor: '#FFFFFF' }]}>
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
        {/* Optional: General loading indicator for the input area if needed, 
            though isChatLoading on TextInput/Button might suffice. 
            The main list loading will be handled in WineDetailScreen's FlatList footer.
        */}
        {/* {isChatLoading && <ActivityIndicator style={styles.chatLoadingIndicator} />} */}
      </KeyboardAvoidingView>
    </TouchableWithoutFeedback>
  );
};

// Styles related to message rendering (messageContainer, userMessageBubble, etc.) can be removed if not used by other parts.
// Keeping input and follow-up styles.
const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    backgroundColor: '#FFFFFF',
  },
  textInput: {
    flex: 1,
    marginRight: 8,
    backgroundColor: '#F5F5F5',
    borderRadius: 16,
    paddingHorizontal: 12,
    fontSize: 16,
    paddingVertical: 8,
    minHeight: 30,
  },
  sendButton: {
    margin: 0,
  },
  chatLoadingIndicator: {
    marginVertical: 10,
    alignSelf: 'center',
  },
  followUpContainer: {
      paddingHorizontal: 8,
      paddingTop: 8, 
      paddingBottom: 4,
      backgroundColor: 'transparent', 
  },
  followUpScroll: {
      paddingVertical: 4,
  },
  customFollowUpChipTouchable: {
    marginRight: 8,
    borderRadius: 16, 
    maxWidth: (Dimensions.get('window').width * 2) / 3,
  },
  customFollowUpChipView: {
    backgroundColor: '#F5F5F5', 
    paddingVertical: 8,   
    paddingHorizontal: 12, 
    borderRadius: 16, 
  },
  customFollowUpChipText: {
    color: '#333333', 
    fontSize: 14, 
    textAlign: 'left',
  },
});

export default WineChatView; 