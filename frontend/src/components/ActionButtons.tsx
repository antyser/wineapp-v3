import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Button } from 'react-native-paper';

interface ActionButtonsProps {
  onScanPress: () => void;
  disabled?: boolean;
}

const ActionButtons: React.FC<ActionButtonsProps> = ({ onScanPress, disabled = false }) => {
  return (
    <View style={styles.actionsContainer}>
      <Button
        mode="outlined"
        icon="camera"
        onPress={onScanPress}
        style={styles.actionButton}
        labelStyle={styles.buttonLabel}
        disabled={disabled}
      >
        Scan Label
      </Button>
    </View>
  );
};

const styles = StyleSheet.create({
  actionsContainer: {
    padding: 16,
  },
  actionButton: {
    borderColor: '#000000',
  },
  buttonLabel: {
    color: '#000000',
  },
});

export default ActionButtons; 