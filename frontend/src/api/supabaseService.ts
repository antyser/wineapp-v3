import { supabase } from '../lib/supabase';
import { ImagePickerAsset } from 'expo-image-picker';

export const uploadImage = async (
  imageAsset: ImagePickerAsset,
  userId: string,
  bucketName: string = 'wines'
): Promise<{ filePath: string; publicUrl: string }> => {
  try {
    const filename = `${Date.now()}-${Math.random().toString(36).substring(2, 7)}.jpg`;
    const filePath = `${userId}/${filename}`;
    const photoUri = imageAsset.uri;

    console.log(`Uploading image to Supabase Storage: ${filePath}`);
    const response = await fetch(photoUri);
    const blob = await response.blob();

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(bucketName)
      .upload(filePath, blob, {
        contentType: imageAsset.mimeType || 'image/jpeg',
        upsert: false,
      });

    if (uploadError) {
      console.error('Supabase upload error:', uploadError);
      throw new Error(`Upload failed: ${uploadError.message}`);
    }
    console.log('Image uploaded successfully:', uploadData);

    // Get public URL
    const { data: urlData } = supabase.storage.from(bucketName).getPublicUrl(filePath);

    if (!urlData || !urlData.publicUrl) {
      console.warn('Could not get public URL for uploaded image immediately.');
      // Attempt to construct manually as a fallback, though less reliable
      // const fallbackUrl = `${supabase.storage.url}/object/public/${bucketName}/${filePath}`;
      // return { filePath, publicUrl: fallbackUrl }; 
      // For now, let's throw if Supabase doesn't give it back
       throw new Error('Failed to retrieve public URL after upload.');
    }

    console.log('Retrieved public URL:', urlData.publicUrl);
    return { filePath, publicUrl: urlData.publicUrl };
  } catch (error) {
    console.error('Error during image upload process:', error);
    // Re-throw the error to be caught by the calling function (e.g., the hook)
    throw error; 
  }
}; 