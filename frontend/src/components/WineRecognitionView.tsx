import React from 'react';
import { StyleSheet, View, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Text, Button } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';

interface WineRecognitionViewProps {
  isLoading: boolean;
  onScanMore: () => void;
  onCancel: () => void;
  selectedTab?: 'label' | 'list';
  onTabChange?: (tab: 'label' | 'list') => void;
}

const WineRecognitionView: React.FC<WineRecognitionViewProps> = ({
  isLoading,
  onScanMore,
  onCancel,
  selectedTab = 'label',
  onTabChange,
}) => {
  return (
    <SafeAreaView style={styles.container}>
      {/* Close button */}
      <TouchableOpacity style={styles.closeButton} onPress={onCancel}>
        <Text style={styles.closeButtonText}>✕</Text>
      </TouchableOpacity>

      {/* Center content */}
      <View style={styles.centerContent}>
        {isLoading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#8E2430" />
            <Text style={styles.loadingText}>Analyzing wine...</Text>
          </View>
        )}
      </View>

      {/* Bottom tab selector */}
      <View style={styles.tabContainer}>
        <View style={styles.tabSelector}>
          <TouchableOpacity
            style={[
              styles.tab,
              selectedTab === 'label' && styles.selectedTab
            ]}
            onPress={() => onTabChange && onTabChange('label')}
          >
            <Text style={[
              styles.tabText,
              selectedTab === 'label' && styles.selectedTabText
            ]}>Wine label</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[
              styles.tab,
              selectedTab === 'list' && styles.selectedTab,
              selectedTab !== 'list' && styles.unselectedTab
            ]}
            onPress={() => onTabChange && onTabChange('list')}
          >
            <Text style={[
              styles.tabText,
              selectedTab === 'list' && styles.selectedTabText,
              selectedTab !== 'list' && styles.unselectedTabText
            ]}>Wine list</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Scan more button */}
      {isLoading ? null : (
        <View style={styles.buttonContainer}>
          <Button 
            mode="outlined" 
            onPress={onScanMore}
            style={styles.scanButton}
            labelStyle={styles.scanButtonLabel}
          >
            Scan more wines
          </Button>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  closeButton: {
    position: 'absolute',
    top: 40,
    left: 20,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(40, 40, 40, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: {
    padding: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    alignItems: 'center',
    elevation: 8,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#000000',
    fontWeight: '500',
  },
  tabContainer: {
    width: '100%',
    alignItems: 'center',
    paddingBottom: 40,
  },
  tabSelector: {
    flexDirection: 'row',
    borderRadius: 30,
    overflow: 'hidden',
    backgroundColor: '#DDDDDD',
    borderWidth: 1,
    borderColor: 'rgba(100, 100, 100, 0.3)',
  },
  tab: {
    paddingVertical: 12,
    paddingHorizontal: 30,
  },
  selectedTab: {
    backgroundColor: '#FFFFFF',
  },
  unselectedTab: {
    backgroundColor: '#AAAAAA',
  },
  tabText: {
    fontWeight: '600',
  },
  selectedTabText: {
    color: '#000000',
  },
  unselectedTabText: {
    color: '#666666',
  },
  buttonContainer: {
    width: '100%',
    alignItems: 'center',
    paddingBottom: 40,
  },
  scanButton: {
    borderRadius: 25,
    backgroundColor: '#DDDDDD',
    borderColor: '#CCCCCC',
    paddingHorizontal: 30,
    paddingVertical: 12,
    elevation: 3,
  },
  scanButtonLabel: {
    color: '#444444',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default WineRecognitionView; 