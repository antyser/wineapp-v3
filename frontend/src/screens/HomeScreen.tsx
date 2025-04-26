import React, { useState, useEffect } from 'react';
import { StyleSheet, View, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Text, Button, Card, Searchbar, ActivityIndicator, Portal, Modal } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../lib/supabase';
import { Wine } from '../types/wine';
import SearchBar from '../components/SearchBar';
import ActionButtons from '../components/ActionButtons';
import ImagePickerModal from '../components/ImagePickerModal';
import LoadingModal from '../components/LoadingModal';
import { useAuth } from '../auth/AuthContext';
import { searchWinesEndpointApiV1SearchPost } from '../api';
import SearchHistoryList from '../components/SearchHistoryList';

type HomeScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

const HomeScreen = () => {
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const { user, isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [showImageOptions, setShowImageOptions] = useState(false);
  const [showSignInModal, setShowSignInModal] = useState(false);

  const handleSignIn = () => {
    setShowSignInModal(false);
    navigation.navigate('Login');
  };

  const handleImagePick = async (useCamera: boolean) => {
    try {
      const permissionType = useCamera ? 'Camera' : 'MediaLibrary';
      const requestMethod = useCamera 
        ? ImagePicker.requestCameraPermissionsAsync 
        : ImagePicker.requestMediaLibraryPermissionsAsync;
      const { status } = await requestMethod();
      if (status !== 'granted') {
        Alert.alert('Permission needed', `Please grant ${permissionType.toLowerCase()} permissions to use this feature.`);
        return;
      }

      setShowImageOptions(false);
      setLoading(true);
      
      const result = await (useCamera
        ? ImagePicker.launchCameraAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [4, 3],
            quality: 0.8,
          })
        : ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [4, 3],
            quality: 0.8,
          }));

      if (!result.canceled && result.assets && result.assets.length > 0) {
        await handleImageSearch(result.assets[0]);
      } else {
        setLoading(false);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image. Please try again.');
      setLoading(false);
    }
  };

  const handleImageSearch = async (imageAsset: ImagePicker.ImagePickerAsset) => {
    let currentUserId: string | null = null;
    
    try {
      if (isAuthLoading) {
        Alert.alert('Please wait', 'Authentication is still initializing.');
        setLoading(false);
        return;
      }

      if (isAuthenticated && user?.id) {
        console.log(`Authenticated user (${user.id}) performing image search...`);
        currentUserId = user.id;
      } else {
        console.log("User not authenticated, attempting anonymous sign-in...");
        const { data: anonData, error: anonError } = await supabase.auth.signInAnonymously();
        
        if (anonError || !anonData?.user?.id) {
          console.error("Anonymous sign-in failed:", anonError);
          Alert.alert('Authentication Failed', 'Could not initiate an anonymous session. Please try again or sign in.');
          setLoading(false);
          return;
        }
        
        console.log(`Anonymous user (${anonData.user.id}) performing image search...`);
        currentUserId = anonData.user.id;
        // Note: The useAuth state might not update immediately after anonymous sign-in.
        // We use the directly obtained currentUserId for this operation.
      }
      
      if (!currentUserId) {
         // This should ideally not happen if anonymous sign-in succeeds
         Alert.alert('Error', 'Could not retrieve user ID.');
         setLoading(false);
         return;
      }

      const filename = `${Date.now()}-${Math.random().toString(36).substring(2, 7)}.jpg`;
      const photoUri = imageAsset.uri;

      console.log(`Uploading image to Supabase Storage: ${filename}`);
      const response = await fetch(photoUri);
      const blob = await response.blob();
      const bucketName = 'wines';
      
      // Create file path with user ID (authenticated or anonymous) as folder
      const filePath = `${currentUserId}/${filename}`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from(bucketName)
        .upload(filePath, blob, {
          contentType: imageAsset.mimeType || 'image/jpeg',
          upsert: false
        });

      if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);
      console.log('Image uploaded successfully, getting public URL...');

      // Get the public URL directly from supabase client instead of constructing it manually
      const { data: { publicUrl } } = supabase.storage
        .from(bucketName)
        .getPublicUrl(filePath);
        
      console.log('Constructed public URL:', publicUrl);

      console.log('Calling API for wine recognition...');
      try {
        const { data: wines } = await searchWinesEndpointApiV1SearchPost({
          body: {
            text_input: null,
            image_url: publicUrl
          }
        });
        
        if (wines && wines.length > 0) {
          console.log(`Found ${wines.length} wines from API`);
          navigation.navigate('SearchResults', {
            wines: wines,
            title: 'Scan Results',
            source: 'scan'
          });
        } else {
          Alert.alert('No wines found', 'No wines could be identified in this image.');
        }
      } catch (apiError: any) {
        console.error('API call error:', apiError);
        let errorMessage = 'Failed to process image via API';
        if (apiError.response?.data?.detail) errorMessage = apiError.response.data.detail;
        throw new Error(errorMessage);
      }

    } catch (error: any) {
      console.error('Error in image search process:', error);
      Alert.alert('Error', error.message || 'Failed to process image. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchPress = (query: string) => {
    navigation.navigate('WineSearch', { initialQuery: query });
  };

  const handleSearchSubmit = async () => {
    if (searchQuery.trim()) {
      try {
        setLoading(true);
        // Option 1: Direct search with results
        const { data: wines } = await searchWinesEndpointApiV1SearchPost({
          body: {
            text_input: searchQuery,
            image_url: null
          }
        });
        
        if (wines && wines.length > 0) {
          // If exactly one wine is found, go directly to wine detail
          if (wines.length === 1) {
            navigation.navigate('WineDetail', { wineId: wines[0].id });
          } else {
            // Otherwise show search results
            navigation.navigate('SearchResults', {
              wines,
              title: `Results for "${searchQuery}"`,
              source: 'search'
            });
          }
        } else {
          // If no results, go to search screen to try again
          navigation.navigate('WineSearch', { initialQuery: searchQuery });
        }
      } catch (error) {
        console.error('Search error:', error);
        // If there's an error, go to search screen
        navigation.navigate('WineSearch', { initialQuery: searchQuery });
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <SearchBar 
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          onSearch={handleSearchSubmit}
        />
      </View>

      <ScrollView style={styles.contentContainer}>
        <ActionButtons
          onScanPress={() => setShowImageOptions(true)}
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
        onCameraSelect={() => handleImagePick(true)}
        onGallerySelect={() => handleImagePick(false)}
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

      <LoadingModal visible={loading} message="Processing..." />
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
