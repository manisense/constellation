import { Alert, Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { decode } from 'base64-arraybuffer';
import uuid from 'react-native-uuid';
import { supabase } from './supabase';
import { NavigationProp } from '@react-navigation/native';
import * as FileSystem from 'expo-file-system';


// =============================================
// Types
// =============================================

export interface Message {
  id: string;
  constellation_id: string;
  user_id: string;
  content: string;
  created_at: string;
  sender_name?: string;
  image_url?: string;
}

export interface PartnerProfile {
  id: string;
  name: string;
  avatar_url?: string;
  star_type?: string;
  star_name?: string;
}

export interface ConstellationData {
  id: string;
  name: string;
  invite_code: string;
  created_at: string;
  bonding_strength: number;
}

// =============================================
// Authentication Fixes
// =============================================

/**
 * Improved sign-out function with proper navigation handling
 */
export const handleSignOut = async (navigation: NavigationProp<any>) => {
  try {
    console.log('Signing out...');
    
    // Sign out from Supabase
    await supabase.auth.signOut();
    
    console.log('Sign out successful, preparing to navigate...');
    
    // Add delay to ensure sign-out completes before navigation
    setTimeout(() => {
      // Reset navigation stack to Welcome screen
      navigation.reset({
        index: 0,
        routes: [{ name: 'Welcome' }],
      });
      console.log('Navigation reset completed');
    }, 500); // 500ms delay
  } catch (error) {
    console.error('Error signing out:', error);
    Alert.alert('Error', 'Failed to sign out. Please try again.');
  }
};

// =============================================
// Chat & Image Handling Fixes
// =============================================

/**
 * Upload an image to Supabase Storage
 */

export const uploadImage = async (uri: string, constellationId: string): Promise<string | null> => {
  try {
    // Validate inputs
    if (!uri || !uri.startsWith('file://')) {
      throw new Error('Invalid image URI format');
    }
    if (!constellationId) throw new Error('Missing constellation ID');

    // Get current session
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Not authenticated');

    // Read file data
    const response = await fetch(uri);
    const blob = await response.blob();
    
    // Convert to base64
    const reader = new FileReader();
    const base64Data = await new Promise<string>((resolve, reject) => {
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });

    // Extract pure base64 without prefix
    const pureBase64 = base64Data.split(',')[1];

    // Generate unique filename
    const fileExt = uri.split('.').pop()?.toLowerCase() || 'jpeg';
    const fileName = `${uuid.v4()}.${fileExt}`;
    const filePath = `${constellationId}/${fileName}`;

    // Upload with explicit auth headers
    const { error } = await supabase.storage
      .from('chat-images')
      .upload(filePath, decode(pureBase64), {
        contentType: blob.type || `image/${fileExt}`,
        cacheControl: '3600',
        upsert: false,
        // Add these headers explicitly
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'X-Client-Info': 'constellation-app/1.0',
          'Content-Type': 'application/json'
        }
      });

    if (error) throw error;

    return supabase.storage
      .from('chat-images')
      .getPublicUrl(filePath).data.publicUrl;
  } catch (error) {
    console.error('Upload failed:', JSON.stringify(error, null, 2));
    Alert.alert(
      'Upload Error',
      error instanceof Error ? error.message : 'Failed to upload image'
    );
    return null;
  }
};

// Helper function to get MIME type from extension
const getMimeType = (extension: string): string => {
  const mimeTypes: { [key: string]: string } = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    webp: 'image/webp',
  };
  return mimeTypes[extension] || 'image/jpeg';
};

/**
 * Pick an image from the device's media library
 */
export const pickImage = async (): Promise<string | null> => {
  try {
    // Request permissions
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please grant permission to access your photos');
      return null;
    }
    
    // Launch image picker
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });
    
    if (!result.canceled && result.assets && result.assets.length > 0) {
      console.log('Image selected:', result.assets[0].uri);
      return result.assets[0].uri;
    }
    
    return null;
  } catch (error) {
    console.error('Error picking image:', error);
    return null;
  }
};

/**
 * Send a message with optional image
 */
export const sendMessage = async (
  constellationId: string,
  content: string,
  imageUri?: string | null
): Promise<boolean> => {
  try {
    console.log(`Sending message to constellation ${constellationId}`);

        // Verify user session first
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

            // Verify constellation membership
    const { count } = await supabase
    .from('constellation_members')
    .select('*', { count: 'exact', head: true })
    .eq('constellation_id', constellationId)
    .eq('user_id', user.id);

  if (count === 0) throw new Error('User not in constellation');
    
    let imageUrl = null;
    
    // Upload image if provided
    if (imageUri) {
      imageUrl = await uploadImage(imageUri, constellationId);
      if (!imageUrl) {
        console.error('Failed to upload image');
        // Continue sending the message without the image
      }
    }
    
    // Use the RPC function to send the message
    const { data, error } =  await supabase.rpc('send_message', {
      constellation_id: constellationId,
      content: content || (imageUrl ? '📷 Image' : ''),
      image_url: imageUrl
    });
    
    if (error) {
      console.error('Error sending message:', error);
      throw error;
    }
    
    console.log('Message sent successfully:', data);
    return true;
  } catch (error) {
    console.error('Error in sendMessage:', error);
    return false;
  }
};

/**
 * Set up real-time subscription for new messages
 */
export const setupMessageSubscription = (
  constellationId: string,
  onNewMessage: (message: Message) => void
): (() => void) => {
  console.log(`Setting up real-time subscription for messages in constellation: ${constellationId}`);
  
  // Create the subscription
  const subscription = supabase
    .channel(`messages:constellation_id=eq.${constellationId}`)
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'messages',
      filter: `constellation_id=eq.${constellationId}`
    }, async (payload) => {
      console.log('New message received:', payload.new);
      
      // Get the sender name
      const message = payload.new as Message;
      const senderName = await getSenderName(message.user_id);
      
      // Call the callback with the new message
      onNewMessage({
        ...message,
        sender_name: senderName
      });
    })
    .subscribe();
    
  console.log('Message subscription set up successfully');
  
  // Return a function to clean up the subscription
  return () => {
    console.log('Cleaning up message subscription');
    supabase.removeChannel(subscription);
  };
};

/**
 * Get all messages for a constellation
 */
export const getConstellationMessages = async (constellationId: string): Promise<Message[]> => {
  try {
    console.log(`Getting messages for constellation: ${constellationId}`);
    
    // Use the RPC function to get messages
    const { data, error } = await supabase.rpc('get_constellation_messages', {
      constellation_id: constellationId
    });
    
    if (error) {
      console.error('Error getting messages:', error);
      throw error;
    }
    
    console.log(`Retrieved ${data.length} messages`);
    return data;
  } catch (error) {
    console.error('Error in getConstellationMessages:', error);
    return [];
  }
};

// =============================================
// Profile & Constellation Data Fixes
// =============================================

/**
 * Get the name of a user by their ID
 */
export const getSenderName = async (userId: string): Promise<string> => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('name')
      .eq('id', userId)
      .single();
      
    if (error) {
      console.error('Error getting sender name:', error);
      return 'Unknown';
    }
    
    return data.name || 'Unknown';
  } catch (error) {
    console.error('Error in getSenderName:', error);
    return 'Unknown';
  }
};

/**
 * Get the partner's profile in a constellation
 */
export const getPartnerProfile = async (constellationId: string): Promise<PartnerProfile | null> => {
  try {
    console.log(`Getting partner profile for constellation: ${constellationId}`);
    
    // First try using the RPC function
    try {
      const { data, error } = await supabase.rpc('get_partner_profile', { 
        constellation_id: constellationId 
      });
        
      if (error) {
        console.error('Error fetching partner profile via RPC:', error);
        throw error;
      }
      
      if (!data || !data.success) {
        console.error('Failed to get partner profile:', data?.message || 'Unknown error');
        throw new Error(data?.message || 'Unknown error');
      }
      
      console.log('Partner profile retrieved successfully via RPC:', data.partner);
      return data.partner;
    } catch (rpcError) {
      console.log('Falling back to direct query for partner profile');
      
      // Get the current user ID
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData.user) {
        console.error('Error getting current user:', userError);
        throw userError || new Error('No authenticated user found');
      }
      
      const userId = userData.user.id;
      
      // Get the partner's user ID from constellation members
      const { data: memberData, error: memberError } = await supabase
        .from('constellation_members')
        .select('user_id')
        .eq('constellation_id', constellationId)
        .neq('user_id', userId)
        .limit(1)
        .single();
        
      if (memberError) {
        console.error('Error getting partner member data:', memberError);
        throw memberError;
      }
      
      if (!memberData) {
        console.error('No partner found in constellation');
        return null;
      }
      
      // Get the partner's profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id, name, photo_url, avatar_url, star_name, star_type')
        .eq('id', memberData.user_id)
        .single();
        
      if (profileError) {
        console.error('Error getting partner profile data:', profileError);
        throw profileError;
      }
      
      // Get the partner's star type from constellation members
      const { data: starTypeData, error: starTypeError } = await supabase
        .from('constellation_members')
        .select('star_type')
        .eq('constellation_id', constellationId)
        .eq('user_id', memberData.user_id)
        .single();
        
      if (starTypeError) {
        console.error('Error getting partner star type:', starTypeError);
        // Continue without star type
      }
      
      const partnerProfile: PartnerProfile = {
        id: profileData.id,
        name: profileData.name || 'Partner',
        avatar_url: profileData.avatar_url || profileData.photo_url,
        star_name: profileData.star_name,
        star_type: starTypeData?.star_type || profileData.star_type
      };
      
      console.log('Partner profile retrieved successfully via direct query:', partnerProfile);
      return partnerProfile;
    }
  } catch (error) {
    console.error('Error in getPartnerProfile:', error);
    // Don't show an alert here, let the calling code handle the error
    return null;
  }
};

/**
 * Get constellation data including bonding strength
 */
export const getConstellationData = async (constellationId: string): Promise<ConstellationData | null> => {
  try {
    console.log(`Getting constellation data for: ${constellationId}`);
    
    // Get basic constellation info
    const { data: constellationData, error: constellationError } = await supabase
      .from('constellations')
      .select('*')
      .eq('id', constellationId)
      .single();
      
    if (constellationError) {
      console.error('Error loading constellation data:', constellationError);
      return null;
    }
    
    // Get bonding strength
    const { data: bondingData, error: bondingError } = await supabase
      .rpc('get_bonding_strength', { 
        constellation_id: constellationId 
      });
      
    if (bondingError) {
      console.error('Error getting bonding strength:', bondingError);
      // Continue with basic constellation data
    }
    
    // Combine the data
    const combinedData = {
      ...constellationData,
      bonding_strength: bondingData?.bonding_strength || constellationData.bonding_strength || 0
    };
    
    console.log('Constellation data retrieved:', combinedData);
    return combinedData;
  } catch (error) {
    console.error('Error in getConstellationData:', error);
    return null;
  }
};

/**
 * Manually increase bonding strength
 */
export const increaseBondingStrength = async (
  constellationId: string,
  amount: number = 5
): Promise<boolean> => {
  try {
    console.log(`Increasing bonding strength for constellation ${constellationId} by ${amount}`);
    
    const { data, error } = await supabase.rpc('increase_bonding_strength', {
      constellation_id: constellationId,
      amount
    });
    
    if (error) {
      console.error('Error increasing bonding strength:', error);
      return false;
    }
    
    console.log('Bonding strength increased successfully:', data);
    return true;
  } catch (error) {
    console.error('Error in increaseBondingStrength:', error);
    return false;
  }
};

// Export all functions
export default {
  handleSignOut,
  uploadImage,
  pickImage,
  sendMessage,
  setupMessageSubscription,
  getConstellationMessages,
  getSenderName,
  getPartnerProfile,
  getConstellationData,
  increaseBondingStrength
}; 