import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Text, Button, TextInput, Avatar } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';

const ChatScreen = () => {
  const [message, setMessage] = React.useState('');

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.chatContainer}>
        <View style={styles.messageContainer}>
          <View style={styles.botMessage}>
            <Avatar.Icon size={40} icon="robot" />
            <View style={styles.messageBubble}>
              <Text>
                Hello! I'm your wine assistant. Ask me anything about wines, food pairings, 
                or recommendations based on your preferences.
              </Text>
            </View>
          </View>
        </View>
      </View>

      <View style={styles.inputContainer}>
        <TextInput
          mode="outlined"
          placeholder="Type your message..."
          value={message}
          onChangeText={setMessage}
          style={styles.input}
        />
        <Button 
          mode="contained" 
          onPress={() => {}} 
          style={styles.sendButton}
          icon="send"
        >
          Send
        </Button>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9F9F9',
  },
  chatContainer: {
    flex: 1,
    padding: 16,
  },
  messageContainer: {
    marginBottom: 16,
  },
  botMessage: {
    flexDirection: 'row',
    marginBottom: 8,
    alignItems: 'flex-start',
  },
  messageBubble: {
    backgroundColor: '#EDF1F7',
    borderRadius: 16,
    padding: 12,
    marginLeft: 8,
    maxWidth: '80%',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E4E9F2',
    backgroundColor: '#FFFFFF',
  },
  input: {
    flex: 1,
    marginRight: 8,
  },
  sendButton: {
    justifyContent: 'center',
  },
});

export default ChatScreen; 