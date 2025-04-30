import { useState } from 'react';
import { Alert, Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { useAuth } from '../auth/AuthContext';
import { uploadImage } from '../api/supabaseService';
import { searchWinesEndpointApiV1SearchPost } from '../api';


type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface UseImageSearchResult {
  searchWithImage: (useCamera: boolean) => Promise<void>;
  isLoading: boolean;
  error: string | null;
  imageUriBeingProcessed: string | null; // To show in loading modal
}

export const useImageSearch = (): UseImageSearchResult => {
  const navigation = useNavigation<NavigationProp>();
  const { user, isAuthenticated, isLoading: isAuthLoading, signInAnonymously } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imageUriBeingProcessed, setImageUriBeingProcessed] = useState<string | null>(null);

  const searchWithImage = async (useCamera: boolean): Promise<void> => {
    setIsLoading(true);
    setError(null);
    setImageUriBeingProcessed(null);
    let currentUserId: string | null = null;
    let pickedImageAsset: ImagePicker.ImagePickerAsset | null = null;

    try {
      // 1. Check Permissions & Pick Image
      const permissionType = useCamera ? 'Camera' : 'MediaLibrary';
      const requestMethod = useCamera
        ? ImagePicker.requestCameraPermissionsAsync
        : ImagePicker.requestMediaLibraryPermissionsAsync;
      const { status } = await requestMethod();
      if (status !== 'granted') {
        throw new Error(`Please grant ${permissionType.toLowerCase()} permissions to use this feature.`);
      }

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

      if (result.canceled || !result.assets || result.assets.length === 0) {
        console.log('Image picking cancelled or failed.');
        setIsLoading(false);
        return; // Exit if no image picked
      }
      
      pickedImageAsset = result.assets[0];
      setImageUriBeingProcessed(pickedImageAsset.uri); // Set URI for modal

      // 2. Authentication Check / Anonymous Sign-in
      if (isAuthLoading) {
        throw new Error('Authentication is still initializing. Please wait.');
      }

      if (isAuthenticated && user?.id) {
        console.log(`Authenticated user (${user.id}) performing image search...`);
        currentUserId = user.id;
      } else {
        console.log('User not authenticated, attempting anonymous sign-in via context...');
        const anonSuccess = await signInAnonymously();
        if (!anonSuccess) {
          // Error should be set within signInAnonymously context function
          throw new Error('Could not initiate an anonymous session. Please try again or sign in.');
        }
        // Re-fetch user from context after anonymous sign-in completes
        // This assumes useAuth provides the updated user state reactively
        // A brief delay or state check might be needed if context update isn't immediate
        // For simplicity, let's assume context updates reasonably fast.
        // We need the *new* anonymous user ID.
        // Re-accessing `user` from `useAuth` *should* give the updated one if context works.
        // Let's add a small safeguard / re-check:
        const updatedAuth = useAuth(); // Potentially re-trigger context value access
        if (updatedAuth.isAuthenticated && updatedAuth.user?.id && updatedAuth.user.isAnonymous) {
          console.log(`Anonymous user (${updatedAuth.user.id}) signed in.`);
          currentUserId = updatedAuth.user.id;
        } else {
            // If context didn't update or failed, error out
            throw new Error('Failed to retrieve anonymous user ID after sign-in.');
        }
      }

      if (!currentUserId) {
        throw new Error('Could not retrieve user ID.');
      }

      // 3. Upload Image using Service
      console.log('Uploading image via service...');
      const { publicUrl } = await uploadImage(pickedImageAsset, currentUserId);
      console.log('Image uploaded, public URL:', publicUrl);

      // 4. Call Backend API
      console.log('Calling API for wine recognition...');
      const { data: wines } = await searchWinesEndpointApiV1SearchPost({
        body: {
          text_input: null,
          image_url: publicUrl,
        },
      });

      // 5. Handle Results
      if (wines && wines.length > 0) {
        console.log(`Found ${wines.length} wines from API`);
        navigation.navigate('SearchResults', {
          wines: wines,
          title: 'Scan Results',
          source: 'scan',
        });
      } else {
        Alert.alert('No wines found', 'No wines could be identified in this image.');
      }
      setError(null); // Clear error on success

    } catch (err: any) {
      console.error('Error in useImageSearch:', err);
      const message = err.message || 'Failed to process image. Please try again.';
      setError(message);
      Alert.alert('Error', message); // Show user feedback
    } finally {
      setIsLoading(false);
      // Keep imageUriBeingProcessed until loading is fully done, 
      // or clear it here if modal should disappear instantly
      // Let's clear it after loading stops
      setImageUriBeingProcessed(null); 
    }
  };

  return {
    searchWithImage,
    isLoading,
    error,
    imageUriBeingProcessed,
  };
}; 