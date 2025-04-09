import React from 'react';
import { StyleSheet } from 'react-native';
import { Modal, Portal, Text, ActivityIndicator } from 'react-native-paper';

interface LoadingModalProps {
  visible: boolean;
  message?: string;
}

const LoadingModal: React.FC<LoadingModalProps> = ({ 
  visible, 
  message = 'Processing image...' 
}) => {
  return (
    <Portal>
      <Modal
        visible={visible}
        dismissable={false}
        contentContainerStyle={styles.loadingModal}
      >
        <ActivityIndicator size="large" color="#000000" />
        <Text style={styles.loadingText}>{message}</Text>
      </Modal>
    </Portal>
  );
};

const styles = StyleSheet.create({
  loadingModal: {
    backgroundColor: 'white',
    padding: 20,
    margin: 40,
    borderRadius: 8,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: '#000000',
  },
});

export default LoadingModal; 