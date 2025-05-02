import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, View, ScrollView, TouchableOpacity, Alert, Keyboard, Platform } from 'react-native';
import { Text, Button, Card, Searchbar, ActivityIndicator, Portal, Modal } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { SearchRequest, Wine } from '../api';
import SearchBar from '../components/SearchBar';
import ActionButtons from '../components/ActionButtons';
import ImagePickerModal from '../components/ImagePickerModal';
import LoadingModal from '../components/LoadingModal';
import { useAuth } from '../auth/AuthContext';
import SearchHistoryList from '../components/SearchHistoryList';
import { useImageSearch } from '../hooks/useImageSearch';
import { searchWines } from '../api/services/searchService';

// --- Helper function for Text Search Logic ---
const performTextSearch = async (
  query: string,
  setLoading: (loading: boolean) => void,
  navigation: HomeScreenNavigationProp,
  setError: (error: string) => void
) => {
  if (!query.trim()) {
    return;
  }
  Keyboard.dismiss();
  setLoading(true);
  setError('');
  try {
    const searchPayload: SearchRequest = {
      text_input: query,
      image_url: null 
    };
    const wines = await searchWines(searchPayload);
    
    console.log('Search successful:', wines);

    if (wines && wines.length > 0) {
      if (wines.length === 1) {
        navigation.navigate('WineDetail', { wineId: wines[0].id });
      } else {
        navigation.navigate('SearchResults', { 
          wines: wines, 
          title: `Results for "${query}"`,
          source: 'search'
        });
      }
    } else {
      Alert.alert('No Results', 'No wines found matching your search.');
    }
  } catch (error) {
    console.error('Search error:', error);
    setError('Could not perform search. Please try again.');
    Alert.alert('Search Failed', 'Could not perform search. Please check your connection and try again.');
  } finally {
    setLoading(false);
  }
};
// --- End Helper Function ---

type HomeScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

const HomeScreen = () => {
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const { user, isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const {
    searchWithImage,
    isLoading: isImageSearchLoading,
    error: imageSearchError,
    imageUriBeingProcessed,
  } = useImageSearch();

  const [searchQuery, setSearchQuery] = useState('');
  const [showImageOptions, setShowImageOptions] = useState(false);
  const [showSignInModal, setShowSignInModal] = useState(false);

  const [isTextSearchLoading, setIsTextSearchLoading] = useState(false);
  const [errorTextSearch, setErrorTextSearch] = useState('');

  const handleSignIn = () => {
    setShowSignInModal(false);
    navigation.navigate('Login');
  };

  const handleCameraSelect = () => {
    setShowImageOptions(false);
    searchWithImage(true);
  };

  const handleGallerySelect = () => {
    setShowImageOptions(false);
    searchWithImage(false);
  };

  const handleSearchPress = (query: string) => {
    navigation.navigate('WineSearch', { initialQuery: query });
  };

  const handleSearchSubmit = () => {
    performTextSearch(searchQuery, setIsTextSearchLoading, navigation, setErrorTextSearch);
  };

  const displayLoading = isImageSearchLoading || isTextSearchLoading;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <SearchBar 
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          onSearch={handleSearchSubmit}
          disabled={displayLoading}
        />
      </View>

      <ScrollView style={styles.contentContainer}>
        <ActionButtons
          onScanPress={() => setShowImageOptions(true)}
          disabled={displayLoading}
        />
        
        <View style={styles.historySection}>
          <Text style={styles.sectionTitle}>Recent Searches</Text>
          <SearchHistoryList 
            onSearchPress={handleSearchPress}
            maxItems={5}
          />
        </View>
      </ScrollView>

      <ImagePickerModal
        visible={showImageOptions}
        onDismiss={() => setShowImageOptions(false)}
        onCameraSelect={handleCameraSelect}
        onGallerySelect={handleGallerySelect}
      />

      <Portal>
        <Modal 
          visible={showSignInModal} 
          onDismiss={() => setShowSignInModal(false)}
          contentContainerStyle={styles.signInModal}
        >
          <Text style={styles.modalTitle}>Authentication Required</Text>
          <Text style={styles.modalText}>
            You need to be signed in to use this feature.
          </Text>
          <Button 
            mode="contained" 
            onPress={handleSignIn}
            style={styles.signInButton}
          >
            Sign In / Sign Up
          </Button>
          <Button
            mode="text"
            onPress={() => setShowSignInModal(false)}
          >
            Cancel
          </Button>
        </Modal>
      </Portal>

      <LoadingModal 
        visible={isImageSearchLoading} 
        message="Processing Image..." 
        imageUri={imageUriBeingProcessed} 
      />
      
      {isTextSearchLoading && <LoadingModal visible={true} message="Searching..." />}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  contentContainer: {
    flex: 1,
  },
  historySection: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  signInModal: {
    backgroundColor: 'white',
    padding: 20,
    margin: 20,
    borderRadius: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  modalText: {
    marginBottom: 20,
    textAlign: 'center',
  },
  signInButton: {
    marginBottom: 10,
  },
});

export default HomeScreen;
