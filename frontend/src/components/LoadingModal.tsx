import React from 'react';
import { View, StyleSheet, Image } from 'react-native';
import { Modal, Portal, Text, ActivityIndicator } from 'react-native-paper';

interface LoadingModalProps {
  visible: boolean;
  message?: string;
  imageUri?: string | null;
}

const LoadingModal: React.FC<LoadingModalProps> = ({ 
  visible, 
  message = 'Loading...', 
  imageUri
}) => {
  return (
    <Portal>
      <Modal
        visible={visible}
        dismissable={false}
        contentContainerStyle={styles.modalContainer}
      >
        <View style={styles.content}>
          {imageUri && (
            <Image source={{ uri: imageUri }} style={styles.imagePreview} />
          )}
          <ActivityIndicator animating={true} size="large" style={styles.activityIndicator} />
          <Text style={styles.messageText}>{message}</Text>
        </View>
      </Modal>
    </Portal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    backgroundColor: 'white',
    padding: 30,
    margin: 40,
    borderRadius: 8,
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
  },
  activityIndicator: {
    marginBottom: 16,
  },
  messageText: {
    fontSize: 16,
    textAlign: 'center',
  },
  imagePreview: {
    width: 100,
    height: 100,
    borderRadius: 8,
    marginBottom: 16,
    resizeMode: 'cover',
  },
});

export default LoadingModal; 