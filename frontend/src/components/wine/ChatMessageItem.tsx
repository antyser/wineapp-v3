import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import Markdown from 'react-native-markdown-display';
import { UIMessage } from './WineChatView'; // Assuming UIMessage is exported from WineChatView or a types file

interface ChatMessageItemProps {
  item: UIMessage;
}

const ChatMessageItem: React.FC<ChatMessageItemProps> = ({ item }) => {
  const theme = useTheme(); // Or receive theme as a prop if preferred
  const isUser = item.role === 'user';
  const content = typeof item.content === 'string' ? item.content : '';
  const cleanContent = content.replace(/<\/?questions>/g, '').trim();

  if (!item.content && !item.isError) {
    return null;
  }

  // Styles for messages, adapted from WineChatView
  const userMessageBackgroundColor = '#F5F5F5'; // Light grey for user messages
  const assistantMessageTextColor = theme.colors.onSurface; // Or your default text color
  const userMessageTextColor = '#333333'; // Darker text for user messages on light background

  const markdownStyles = {
    body: { color: assistantMessageTextColor },
    heading1: { color: assistantMessageTextColor, fontSize: 24 },
    heading2: { color: assistantMessageTextColor, fontSize: 20 },
    link: { color: theme.colors.primary },
    // Add more markdown styles if needed
  };
  
  const messageSpecificStyle = isUser 
    ? [styles.userMessageBubble, { backgroundColor: userMessageBackgroundColor }] 
    : styles.assistantMessageContainer;

  return (
    <View style={[styles.messageContainer, messageSpecificStyle, { backgroundColor: isUser ? userMessageBackgroundColor : '#FFFFFF' }]}>
      {isUser ? (
        <Text style={[styles.messageText, { color: userMessageTextColor }]}>
          {item.isError ? '[Error]' : cleanContent}
        </Text>
      ) : cleanContent ? (
        <Markdown style={markdownStyles}>{cleanContent}</Markdown>
      ) : (
        <Text style={[styles.messageText, { color: assistantMessageTextColor }]}>
          {item.isError ? '[Error processing response]' : ''}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
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
    marginRight: 8,
    // backgroundColor is set dynamically
  },
  assistantMessageContainer: {
    alignSelf: 'flex-start',
    marginLeft: 8,
    // No specific background, relies on Markdown styling for text.
    // If assistant messages need a bubble, add similar styling to userMessageBubble.
  },
  messageText: { // General text style, color applied dynamically or by Markdown
    fontSize: 16,
  },
});

export default ChatMessageItem; 