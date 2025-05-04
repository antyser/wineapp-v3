import { supabase } from '../lib/supabase';
import { ImagePickerAsset } from 'expo-image-picker';
import { Platform } from 'react-native';

export const uploadImage = async (
  imageAsset: ImagePickerAsset,
  userId: string,
  bucketName: string = 'wines'
): Promise<{ filePath: string; publicUrl: string }> => {
  try {
    const originalFilename = imageAsset.fileName || `${Date.now()}.jpg`;
    const fileExt = originalFilename.split('.').pop()?.toLowerCase() || 'jpg';
    const safeFilename = `${Date.now()}-${Math.random().toString(36).substring(2, 7)}.${fileExt}`;
    const filePath = `${userId}/${safeFilename}`;
    const photoUri = imageAsset.uri;
    const mimeType = imageAsset.mimeType || 'image/jpeg';

    console.log(`Preparing FormData for upload: ${filePath}, URI: ${photoUri}, Type: ${mimeType}`);

    const formData = new FormData();
    formData.append('file', {
      uri: Platform.OS === 'ios' ? photoUri.replace('file://', '') : photoUri,
      name: safeFilename,
      type: mimeType,
    } as any);

    console.log(`Uploading image via Supabase client with FormData: ${filePath}`);

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(bucketName)
      .upload(filePath, formData, {
        upsert: false,
      });

    if (uploadError) {
      console.error('Supabase upload error:', uploadError);
      throw new Error(`Upload failed: ${uploadError.message}`);
    }
    console.log('Image uploaded successfully:', uploadData);

    const { data: urlData } = supabase.storage.from(bucketName).getPublicUrl(filePath);

    if (!urlData || !urlData.publicUrl) {
      console.warn('Could not get public URL for uploaded image immediately.');
      throw new Error('Failed to retrieve public URL after upload.');
    }

    console.log('Retrieved public URL:', urlData.publicUrl);
    return { filePath, publicUrl: urlData.publicUrl };
  } catch (error) {
    console.error('Error during image upload process:', error);
    throw error; 
  }
}; 