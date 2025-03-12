/**
 * Fix for image upload functionality in the Constellation app
 * 
 * This file contains fixed functions for image uploading.
 * Add these functions to your utils or helpers directory.
 */

import * as FileSystem from 'expo-file-system';
import { decode as atob } from 'base64-js';
import uuid from 'react-native-uuid';
import { supabase } from '../utils/supabase'; // Update path if needed

/**
 * Upload an image to Supabase Storage
 * 
 * @param {string} uri - The local URI of the image
 * @param {string} constellationId - The constellation ID to use as folder name
 * @returns {Promise<string|null>} - The public URL of the uploaded image or null on error
 */
export const uploadImage = async (uri, constellationId) => {
  try {
    console.log(`Starting upload for image: ${uri}`);
    console.log(`Using constellation ID as folder: ${constellationId}`);
    
    if (!uri) {
      console.error('No image URI provided');
      return null;
    }
    
    if (!constellationId) {
      console.error('No constellation ID provided');
      return null;
    }
    
    // Generate a unique file name
    const fileExt = uri.split('.').pop();
    const fileName = `${uuid.v4()}.${fileExt}`;
    
    // Create a path using constellation ID as folder
    const filePath = `${constellationId}/${fileName}`;
    console.log(`Generated file path: ${filePath}`);
    
    // Read the file as base64
    let base64;
    try {
      // For iOS, the URI might already be in the correct format
      if (uri.startsWith('file://')) {
        base64 = await FileSystem.readAsStringAsync(uri, {
          encoding: FileSystem.EncodingType.Base64,
        });
      } else {
        // For other platforms or formats
        const response = await fetch(uri);
        const blob = await response.blob();
        
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            // Get only the base64 part, removing the data URL prefix
            const result = reader.result;
            if (typeof result === 'string') {
              base64 = result.split(',')[1];
              finishUpload(base64);
            } else {
              reject(new Error('FileReader result is not a string'));
            }
          };
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      }
    } catch (readError) {
      console.error('Error reading file:', readError);
      
      // Try with a direct fetch approach as fallback
      try {
        const response = await fetch(uri);
        const blob = await response.blob();
        
        const { data, error } = await supabase.storage
          .from('chat_images') // Make sure this matches your bucket name
          .upload(filePath, blob, {
            contentType: `image/${fileExt}`,
            upsert: true
          });
        
        if (error) {
          console.error('Error uploading image with blob:', error);
          return null;
        }
        
        console.log('Image uploaded successfully with blob');
        const { data: urlData } = supabase.storage
          .from('chat_images')
          .getPublicUrl(filePath);
          
        return urlData.publicUrl;
      } catch (fetchError) {
        console.error('Error with fetch fallback:', fetchError);
        return null;
      }
    }
    
    // Function to finish the upload with base64 data
    const finishUpload = async (base64Data) => {
      try {
        // Convert base64 to array buffer required by Supabase
        const byteArray = atob(base64Data);
        
        const { data, error } = await supabase.storage
          .from('chat_images') // Make sure this matches your bucket name
          .upload(filePath, byteArray, {
            contentType: `image/${fileExt}`,
            upsert: true
          });
        
        if (error) {
          console.error('Error uploading image:', error);
          return null;
        }
        
        console.log('Image uploaded successfully');
        const { data: urlData } = supabase.storage
          .from('chat_images')
          .getPublicUrl(filePath);
          
        return urlData.publicUrl;
      } catch (uploadError) {
        console.error('Error in finishUpload:', uploadError);
        return null;
      }
    };
    
    if (base64) {
      return await finishUpload(base64);
    }
    
    return null;
  } catch (error) {
    console.error('Error in uploadImage:', error);
    return null;
  }
};

/**
 * Send a message with optional image
 * 
 * @param {string} constellationId - The constellation ID
 * @param {string} content - The message content
 * @param {string|null} imageUri - Optional image URI to upload
 * @returns {Promise<boolean>} - Success status
 */
export const sendMessage = async (constellationId, content, imageUri = null) => {
  try {
    let imageUrl = null;
    
    // Upload image if provided
    if (imageUri) {
      console.log(`Uploading image: ${imageUri}`);
      imageUrl = await uploadImage(imageUri, constellationId);
      
      if (!imageUrl) {
        console.error('Failed to upload image');
        // Continue without image
      } else {
        console.log(`Image uploaded, URL: ${imageUrl}`);
      }
    }
    
    // Send message with or without image
    const { data, error } = await supabase.rpc('send_message', {
      constellation_id_param: constellationId,
      content_param: content,
      image_url_param: imageUrl
    });
    
    if (error) {
      console.error('Error sending message:', error);
      return false;
    }
    
    return data.success || false;
  } catch (error) {
    console.error('Error in sendMessage:', error);
    return false;
  }
};

/**
 * Get user's partner profile in a constellation
 * 
 * @param {string} constellationId - The constellation ID
 * @returns {Promise<object|null>} - Partner profile data or null
 */
export const getPartnerProfile = async (constellationId) => {
  try {
    console.log(`Getting partner profile for constellation: ${constellationId}`);
    
    const { data, error } = await supabase.rpc('get_partner_profile', {
      constellation_id_param: constellationId
    });
    
    if (error) {
      console.error('Error fetching partner profile:', error);
      return null;
    }
    
    if (!data.success) {
      console.log('No partner found or error:', data.error);
      return null;
    }
    
    return data.partner;
  } catch (error) {
    console.error('Error in getPartnerProfile:', error);
    return null;
  }
};

/**
 * Set up real-time subscription for new messages
 * 
 * @param {string} constellationId - The constellation ID to subscribe to
 * @param {Function} onNewMessage - Callback for new messages
 * @returns {Function} - Cleanup function to unsubscribe
 */
export const setupMessageSubscription = (constellationId, onNewMessage) => {
  console.log(`Setting up real-time subscription for messages in constellation: ${constellationId}`);
  
  const subscription = supabase
    .channel(`public:messages:constellation_id=eq.${constellationId}`)
    .on('postgres_changes', 
      { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'messages',
        filter: `constellation_id=eq.${constellationId}`
      }, 
      (payload) => {
        console.log('New message received:', payload);
        onNewMessage(payload.new);
      }
    )
    .subscribe();
  
  console.log('Message subscription set up successfully');
  
  // Return cleanup function
  return () => {
    console.log('Cleaning up message subscription');
    subscription.unsubscribe();
  };
}; 