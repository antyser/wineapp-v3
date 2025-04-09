import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Modal, Portal, Text, Button } from 'react-native-paper';

interface ImagePickerModalProps {
  visible: boolean;
  onDismiss: () => void;
  onCameraSelect: () => void;
  onGallerySelect: () => void;
}

const ImagePickerModal: React.FC<ImagePickerModalProps> = ({
  visible,
  onDismiss,
  onCameraSelect,
  onGallerySelect,
}) => {
  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onDismiss}
        contentContainerStyle={styles.modal}
      >
        <View>
          <Text variant="titleLarge" style={styles.modalTitle}>
            Choose Image Source
          </Text>
          <Button
            mode="outlined"
            icon="camera"
            onPress={onCameraSelect}
            style={styles.modalButton}
          >
            Take Photo
          </Button>
          <Button
            mode="outlined"
            icon="image"
            onPress={onGallerySelect}
            style={styles.modalButton}
          >
            Choose from Gallery
          </Button>
          <Button mode="text" onPress={onDismiss}>
            Cancel
          </Button>
        </View>
      </Modal>
    </Portal>
  );
};

const styles = StyleSheet.create({
  modal: {
    backgroundColor: 'white',
    padding: 20,
    margin: 20,
    borderRadius: 8,
  },
  modalTitle: {
    textAlign: 'center',
    marginBottom: 20,
    color: '#000000',
  },
  modalButton: {
    marginBottom: 10,
    borderColor: '#000000',
  },
});

export default ImagePickerModal; 