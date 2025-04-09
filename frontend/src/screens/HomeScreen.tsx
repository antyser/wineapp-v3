import React, { useState, useEffect } from 'react';
import { StyleSheet, View, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Text, Button, useTheme, Card, Searchbar, Portal, Modal, ActivityIndicator } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../lib/supabase';
import { Wine } from '../types/wine';
import SearchBar from '../components/SearchBar';
import ActionButtons from '../components/ActionButtons';
import WineSection from '../components/WineSection';
import ImagePickerModal from '../components/ImagePickerModal';
import LoadingModal from '../components/LoadingModal';
import WineRecognitionView from '../components/WineRecognitionView';
import { useAuth } from '../auth/AuthContext';

type HomeScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

const HomeScreen = () => {
  const theme = useTheme();
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const { user, isAuthenticated, signInAnonymously } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [showImageOptions, setShowImageOptions] = useState(false);
  const [recognitionMode, setRecognitionMode] = useState<'inactive' | 'active'>('inactive');
  const [selectedTab, setSelectedTab] = useState<'label' | 'list'>('label');

  const handleImagePick = async (useCamera: boolean) => {
    try {
      // Request permissions first
      if (useCamera) {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission needed', 'Please grant camera permissions to use this feature.');
          return;
        }
      } else {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission needed', 'Please grant photo library permissions to use this feature.');
          return;
        }
      }

      setShowImageOptions(false);
      setRecognitionMode('active');
      
      // Launch camera or image picker
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

      if (!result.canceled) {
        await handleImageSearch(result.assets[0]);
      } else {
        setRecognitionMode('inactive');
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image. Please try again.');
      setRecognitionMode('inactive');
    }
  };

  const handleImageSearch = async (imageAsset: ImagePicker.ImagePickerAsset) => {
    try {
      setLoading(true);
      
      // Check authentication status
      if (!isAuthenticated) {
        console.log('Not authenticated, attempting sign-in...');
        const success = await signInAnonymously();
        if (!success) {
          Alert.alert(
            'Authentication Error',
            'Cannot proceed without authentication. Please try again later.',
            [{ text: 'OK', onPress: () => setRecognitionMode('inactive') }]
          );
          return;
        }
      }
      
      console.log('Authentication status:', isAuthenticated ? 'Authenticated' : 'Not authenticated');
      console.log('User:', user?.id, 'Email:', user?.email);

      if (!user || !user.id) {
        throw new Error('User is not authenticated properly');
      }

      // First, upload the image to Supabase Storage in user-specific folder
      const filename = `${Date.now()}-${Math.random().toString(36).substring(7)}`;
      const filePath = `${filename}.jpg`;
      const photoUri = imageAsset.uri;

      console.log(`Uploading image to Supabase Storage in user folder (${user.id})...`);
      
      // Convert uri to blob
      const response = await fetch(photoUri);
      const blob = await response.blob();

      // Default bucket name
      const bucketName = 'storage';
      
      // Upload to Supabase Storage in user's folder
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from(bucketName)
        .upload(`${user.id}/${filePath}`, blob, {
          contentType: 'image/jpeg',
          upsert: true
        });

      if (uploadError) {
        console.error('Storage upload error:', uploadError);
        throw new Error(`Upload failed: ${uploadError.message}`);
      }

      console.log('Image uploaded successfully, getting public URL...');

      // Get the public URL
      const { data: publicUrlData } = supabase.storage
        .from(bucketName)
        .getPublicUrl(`${user.id}/${filePath}`);

      if (!publicUrlData?.publicUrl) {
        throw new Error('Failed to get public URL');
      }

      console.log('Got public URL:', publicUrlData.publicUrl);
      console.log('Calling API for wine recognition...');

      // Call the backend API with the image URL
      const apiUrl = process.env.EXPO_PUBLIC_API_URL;
      if (!apiUrl) {
        throw new Error('API URL is not defined in environment variables');
      }
      
      const searchEndpoint = `${apiUrl}/api/v1/wines/search`;
      console.log('Search endpoint:', searchEndpoint);
      
      const searchResponse = await fetch(searchEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(publicUrlData.publicUrl),
      });

      if (!searchResponse.ok) {
        const errorText = await searchResponse.text().catch(() => 'Unknown error');
        console.error('API error response:', errorText);
        throw new Error(`API call failed: ${searchResponse.status} ${searchResponse.statusText}`);
      }

      console.log('Received API response, processing results...');

      const wines = await searchResponse.json();
      
      // Navigate to the search results screen
      if (wines.length > 0) {
        console.log(`Found ${wines.length} wines`);
        navigation.navigate('SearchResults', {
          wines: wines,
          title: 'Scan Results',
          source: 'scan'
        });
      } else {
        Alert.alert('No wines found', 'No wines could be identified in this image.');
      }

    } catch (error) {
      console.error('Error in image search:', error);
      Alert.alert(
        'Error',
        'Failed to process image. Please try again.',
        [{ text: 'OK', onPress: () => setRecognitionMode('inactive') }]
      );
    } finally {
      setLoading(false);
      setRecognitionMode('inactive');
    }
  };

  const handleWinePress = (wineId: string) => {
    // Look in sample data
    const allSampleWines = [...recentlyViewedWines, ...recommendedWines];
    const sampleWine = allSampleWines.find(wine => wine.id === wineId);
    if (sampleWine) {
      navigation.navigate('WineDetail', { 
        wineId: sampleWine.id,
        wine: sampleWine  // Pass the entire wine object
      });
      return;
    }
    
    // Fallback to just passing the ID
    navigation.navigate('WineDetail', { wineId });
  };

  // Sample data for recently viewed and recommended wines
  const recentlyViewedWines = [
    { id: '1', name: 'Château Margaux', region: 'Bordeaux', vintage: '2018', image_url: 'https://placehold.co/200x300/3498db/FFFFFF?text=Wine+1' },
    { id: '2', name: 'Opus One', region: 'Napa Valley', vintage: '2019', image_url: 'https://placehold.co/200x300/e74c3c/FFFFFF?text=Wine+2' },
    { id: '3', name: 'Tignanello', region: 'Tuscany', vintage: '2017', image_url: 'https://placehold.co/200x300/2ecc71/FFFFFF?text=Wine+3' },
  ];

  const recommendedWines = [
    { id: '4', name: 'Penfolds Grange', region: 'Australia', vintage: '2016', image_url: 'https://placehold.co/200x300/9b59b6/FFFFFF?text=Wine+4' },
    { id: '5', name: 'Screaming Eagle', region: 'Napa Valley', vintage: '2018', image_url: 'https://placehold.co/200x300/f39c12/FFFFFF?text=Wine+5' },
    { id: '6', name: 'Dom Pérignon', region: 'Champagne', vintage: '2010', image_url: 'https://placehold.co/200x300/1abc9c/FFFFFF?text=Wine+6' },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        <View style={styles.header}>
          <Text variant="headlineMedium" style={styles.title}>
            Wine App
          </Text>
        </View>

        <SearchBar
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          onSearch={handleImagePick.bind(null, false)}
        />

        <ActionButtons
          onScanPress={() => setShowImageOptions(true)}
        />

        <WineSection
          title="Recently Viewed"
          wines={recentlyViewedWines}
          onWinePress={handleWinePress}
        />

        <WineSection
          title="Recommended for You"
          wines={recommendedWines}
          onWinePress={handleWinePress}
        />

        <ImagePickerModal
          visible={showImageOptions}
          onDismiss={() => setShowImageOptions(false)}
          onCameraSelect={() => handleImagePick(true)}
          onGallerySelect={() => handleImagePick(false)}
        />

        {/* Wine Recognition View */}
        {recognitionMode === 'active' && (
          <WineRecognitionView
            isLoading={loading}
            onScanMore={() => setShowImageOptions(true)}
            onCancel={() => {
              setRecognitionMode('inactive');
              setLoading(false);
            }}
            selectedTab={selectedTab}
            onTabChange={setSelectedTab}
          />
        )}

        <LoadingModal visible={loading && recognitionMode !== 'active'} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    padding: 16,
    marginBottom: 8,
  },
  title: {
    fontWeight: 'bold',
    color: '#000000',
  },
  searchBar: {
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: '#F0F0F0',
    borderRadius: 8,
  },
  searchInput: {
    color: '#000000',
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
  },
  actionButton: {
    flex: 1,
    marginHorizontal: 5,
    borderColor: '#000000',
  },
  buttonLabel: {
    color: '#000000',
  },
  sectionTitle: {
    marginLeft: 16,
    marginTop: 20,
    marginBottom: 10,
    color: '#000000',
    fontWeight: 'bold',
  },
  cardsScroll: {
    paddingLeft: 16,
  },
  card: {
    width: 180,
    marginRight: 16,
    marginBottom: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    elevation: 2,
  },
  cardTitle: {
    color: '#000000',
    fontWeight: 'bold',
  },
  cardSubtitle: {
    color: '#000000',
  },
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

export default HomeScreen;
