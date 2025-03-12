// Client-side fixes for Constellation app
// This file contains code snippets to fix common issues in the client code

// =============================================
// Fix 1: Improved Sign-out Functionality
// =============================================

// Add this to your authentication provider or where you handle sign-out
const handleSignOut = async (navigation) => {
  try {
    console.log('Signing out...');
    
    // Sign out from Supabase
    await supabase.auth.signOut();
    
    // Clear any local state or context
    // Example: setUser(null);
    
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
// Fix 2: Image Upload for Chat
// =============================================

// Add this to your ChatScreen component
const uploadImage = async (uri) => {
  try {
    console.log('Starting image upload process...');
    
    // Check if uri is valid
    if (!uri) {
      console.error('Invalid image URI');
      return null;
    }
    
    // Fetch the image as a blob
    const response = await fetch(uri);
    const blob = await response.blob();
    
    // Generate a unique filename
    const fileExt = uri.split('.').pop();
    const fileName = `${uuid.v4()}.${fileExt}`;
    const filePath = `${fileName}`;
    
    console.log(`Uploading image to path: ${filePath}`);
    
    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from('chat_images')
      .upload(filePath, blob, {
        contentType: `image/${fileExt}`,
        cacheControl: '3600',
      });
      
    if (error) {
      console.error('Error uploading image:', error);
      return null;
    }
    
    console.log('Image uploaded successfully, getting public URL...');
    
    // Get the public URL
    const { data: urlData } = supabase.storage
      .from('chat_images')
      .getPublicUrl(filePath);
      
    console.log(`Image public URL: ${urlData.publicUrl}`);
    
    return urlData.publicUrl;
  } catch (error) {
    console.error('Error in uploadImage:', error);
    return null;
  }
};

// Function to pick an image from the device
const pickImage = async () => {
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

// Function to send a message with an image
const sendMessageWithImage = async (constellationId, content, imageUri) => {
  try {
    let imageUrl = null;
    
    // Upload image if provided
    if (imageUri) {
      imageUrl = await uploadImage(imageUri);
      if (!imageUrl) {
        console.error('Failed to upload image');
        // Continue sending the message without the image
      }
    }
    
    // Send the message
    const { data, error } = await supabase.rpc('send_message', {
      constellation_id_param: constellationId,
      content_param: content,
      image_url_param: imageUrl
    });
    
    if (error) {
      console.error('Error sending message:', error);
      throw error;
    }
    
    return data;
  } catch (error) {
    console.error('Error in sendMessageWithImage:', error);
    throw error;
  }
};

// =============================================
// Fix 3: Profile Data Retrieval
// =============================================

// Function to get partner profile in a constellation
const getPartnerProfile = async (constellationId) => {
  try {
    console.log(`Getting partner profile for constellation: ${constellationId}`);
    
    // Call the RPC function
    const { data, error } = await supabase
      .rpc('get_partner_profile', { 
        constellation_id_param: constellationId 
      });
      
    if (error) {
      console.error('Error fetching partner profile:', error);
      return null;
    }
    
    if (!data || !data.success) {
      console.error('Failed to get partner profile:', data?.message || 'Unknown error');
      return null;
    }
    
    console.log('Partner profile retrieved successfully:', data.partner);
    return data.partner;
  } catch (error) {
    console.error('Error in getPartnerProfile:', error);
    return null;
  }
};

// Function to get constellation data including bonding strength
const getConstellationData = async (constellationId) => {
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
        constellation_id_param: constellationId 
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

// =============================================
// Fix 4: Real-time Message Subscription
// =============================================

// Add this to your ChatScreen component
const setupMessageSubscription = (constellationId, onNewMessage) => {
  console.log(`Setting up real-time subscription for messages in constellation: ${constellationId}`);
  
  // Create the subscription
  const subscription = supabase
    .channel(`messages:constellation_id=eq.${constellationId}`)
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'messages',
      filter: `constellation_id=eq.${constellationId}`
    }, (payload) => {
      console.log('New message received:', payload);
      
      // Get the sender name (since it's not included in the payload)
      getSenderName(payload.new.user_id).then(senderName => {
        // Call the callback with the new message
        onNewMessage({
          ...payload.new,
          sender_name: senderName
        });
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

// Helper function to get sender name
const getSenderName = async (userId) => {
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

// Export all functions
export {
  handleSignOut,
  uploadImage,
  pickImage,
  sendMessageWithImage,
  getPartnerProfile,
  getConstellationData,
  setupMessageSubscription
}; 