import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Image,
  Alert,
  Modal,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { COLORS, FONTS, SPACING } from '../constants/theme';
import Screen from '../components/Screen';
import { supabase } from '../utils/supabase';
import { useAuth } from '../provider/AuthProvider';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { decode } from 'base64-arraybuffer';
import uuid from 'react-native-uuid';

type ChatScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Chat'>;
};

interface Message {
  id: string;
  content: string;
  user_id: string;
  created_at: string;
  image_url?: string;
}

const ChatScreen: React.FC<ChatScreenProps> = () => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [constellationId, setConstellationId] = useState<string | null>(null);
  const [partnerName, setPartnerName] = useState('Partner');
  const [subscription, setSubscription] = useState<any>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [showImageModal, setShowImageModal] = useState(false);
  const [viewingImage, setViewingImage] = useState<string | null>(null);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    if (user) {
      loadUserData();
    }
    
    return () => {
      // Clean up subscription
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, [user]);

  const loadUserData = async () => {
    if (!user) return;
    
    try {
      console.log("Loading user data for chat...");
      // Get user's constellation membership
      const { data: memberData, error: memberError } = await supabase
        .from('constellation_members')
        .select('constellation_id')
        .eq('user_id', user.id)
        .single();
      
      if (memberError) {
        console.error('Error getting constellation membership:', memberError);
        setLoading(false);
        return;
      }
      
      if (memberData && memberData.constellation_id) {
        console.log("Found constellation ID:", memberData.constellation_id);
        setConstellationId(memberData.constellation_id);
        
        // Get initial messages
        const { data: messageData, error: messageError } = await supabase
          .from('messages')
          .select(`
            id,
            content,
            user_id,
            created_at,
            image_url
          `)
          .eq('constellation_id', memberData.constellation_id)
          .order('created_at', { ascending: false })
          .limit(50);
        
        if (messageError) {
          console.error('Error fetching messages:', messageError);
          throw messageError;
        }
        
        if (messageData) {
          console.log(`Loaded ${messageData.length} messages`);
          setMessages(messageData.reverse());
        }
        
        // Subscribe to new messages
        console.log("Setting up realtime subscription for messages...");
        const newSubscription = supabase
          .channel(`messages:constellation_id=eq.${memberData.constellation_id}`)
          .on('postgres_changes', { 
            event: 'INSERT', 
            schema: 'public', 
            table: 'messages',
            filter: `constellation_id=eq.${memberData.constellation_id}`
          }, (payload) => {
            console.log("Received new message:", payload.new);
            // Add new message to the list
            setMessages(prevMessages => [...prevMessages, payload.new as Message]);
            // Scroll to bottom
            setTimeout(() => {
              flatListRef.current?.scrollToEnd({ animated: true });
            }, 100);
          })
          .subscribe();
        
        setSubscription(newSubscription);
        
        // Get partner info using a separate query
        const { data: partners, error: partnersError } = await supabase
          .from('constellation_members')
          .select('user_id')
          .eq('constellation_id', memberData.constellation_id)
          .neq('user_id', user.id);
        
        if (partnersError) {
          console.error('Error fetching partner info:', partnersError);
          throw partnersError;
        }
        
        if (partners && partners.length > 0) {
          const partnerId = partners[0].user_id;
          console.log("Found partner ID:", partnerId);
          
          // Get partner profile
          const { data: partnerProfile, error: profileError } = await supabase
            .from('profiles')
            .select('name')
            .eq('id', partnerId)
            .single();
            
          if (!profileError && partnerProfile) {
            console.log("Partner name:", partnerProfile.name);
            setPartnerName(partnerProfile.name || 'Partner');
          } else {
            console.error('Error fetching partner profile:', profileError);
          }
        } else {
          console.log("No partner found in constellation");
        }
      } else {
        console.log("No constellation found for user");
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async () => {
    if ((!newMessage.trim() && !selectedImage) || !constellationId || !user) return;
    
    try {
      setSending(true);
      let imageUrl = null;
      
      // Upload image if selected
      if (selectedImage) {
        const imageId = uuid.v4() as string;
        const fileExt = selectedImage.split('.').pop();
        const fileName = `${imageId}.${fileExt}`;
        const filePath = `${constellationId}/${fileName}`;
        
        // Convert image to base64 and upload
        const response = await fetch(selectedImage);
        const blob = await response.blob();
        const reader = new FileReader();
        
        // Convert blob to base64
        const base64Promise = new Promise<string>((resolve) => {
          reader.onloadend = () => {
            const base64data = reader.result as string;
            resolve(base64data.split(',')[1]);
          };
        });
        
        reader.readAsDataURL(blob);
        const base64data = await base64Promise;
        
        // Upload to Supabase Storage
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('chat_images')
          .upload(filePath, decode(base64data), {
            contentType: `image/${fileExt}`,
          });
        
        if (uploadError) {
          console.error('Error uploading image:', uploadError);
          Alert.alert('Error', 'Failed to upload image. Please try again.');
          setSending(false);
          return;
        }
        
        // Get public URL
        const { data: publicUrlData } = supabase.storage
          .from('chat_images')
          .getPublicUrl(filePath);
        
        imageUrl = publicUrlData.publicUrl;
      }
      
      console.log("Sending message:", newMessage, "Image URL:", imageUrl);
      
      // Add message to Supabase
      const { data, error } = await supabase
        .from('messages')
        .insert([{
          constellation_id: constellationId,
          user_id: user.id,
          content: newMessage.trim() || '📷 Image',
          image_url: imageUrl,
        }])
        .select();
      
      if (error) {
        console.error('Error sending message:', error);
        throw error;
      }
      
      console.log("Message sent successfully:", data);
      
      // Clear input and selected image
      setNewMessage('');
      setSelectedImage(null);
      
      // Increase bonding strength
      try {
        await supabase.rpc('increase_bonding_strength', {
          constellation_id_param: constellationId,
          amount: 1
        });
      } catch (error) {
        console.error('Error increasing bonding strength:', error);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      Alert.alert('Error', 'Failed to send message. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const pickImage = async () => {
    try {
      // Request permissions
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please allow access to your photo library to share images.');
        return;
      }
      
      // Launch image picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });
      
      if (!result.canceled && result.assets && result.assets.length > 0) {
        setSelectedImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image. Please try again.');
    }
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isCurrentUser = item.user_id === user?.id;
    
    return (
      <View
        style={[
          styles.messageContainer,
          isCurrentUser ? styles.currentUserMessage : styles.otherUserMessage,
        ]}
      >
        {item.image_url && (
          <TouchableOpacity
            onPress={() => {
              setViewingImage(item.image_url || null);
              setShowImageModal(true);
            }}
          >
            <Image
              source={{ uri: item.image_url }}
              style={styles.messageImage}
              resizeMode="cover"
            />
          </TouchableOpacity>
        )}
        <Text style={styles.messageText}>{item.content}</Text>
        <Text style={styles.messageTime}>
          {formatTime(new Date(item.created_at))}
        </Text>
      </View>
    );
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <Screen showHeader={true} headerTitle={`Chat with ${partnerName}`}>
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading messages...</Text>
        </View>
      ) : (
        <KeyboardAvoidingView
          style={styles.container}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
        >
          {messages.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="chatbubble-outline" size={64} color={COLORS.gray500} />
              <Text style={styles.emptyText}>No messages yet</Text>
              <Text style={styles.emptySubtext}>Start the conversation with your partner!</Text>
            </View>
          ) : (
            <FlatList
              ref={flatListRef}
              data={messages}
              renderItem={renderMessage}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.messageList}
              inverted={false}
              onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
              onLayout={() => flatListRef.current?.scrollToEnd({ animated: false })}
            />
          )}

          {selectedImage && (
            <View style={styles.selectedImageContainer}>
              <Image
                source={{ uri: selectedImage }}
                style={styles.selectedImage}
                resizeMode="cover"
              />
              <TouchableOpacity
                style={styles.removeImageButton}
                onPress={() => setSelectedImage(null)}
              >
                <Ionicons name="close-circle" size={24} color={COLORS.white} />
              </TouchableOpacity>
            </View>
          )}

          <View style={styles.inputContainer}>
            <TouchableOpacity
              style={styles.attachButton}
              onPress={pickImage}
              disabled={sending}
            >
              <Ionicons name="image-outline" size={24} color={COLORS.accent} />
            </TouchableOpacity>
            
            <TextInput
              style={styles.input}
              value={newMessage}
              onChangeText={setNewMessage}
              placeholder="Type a message..."
              placeholderTextColor={COLORS.gray500}
              multiline
              editable={!sending}
            />
            
            <TouchableOpacity
              style={[
                styles.sendButton,
                (!newMessage.trim() && !selectedImage) || sending
                  ? styles.sendButtonDisabled
                  : {},
              ]}
              onPress={handleSend}
              disabled={(!newMessage.trim() && !selectedImage) || sending}
            >
              {sending ? (
                <ActivityIndicator size="small" color={COLORS.white} />
              ) : (
                <Ionicons name="send" size={20} color={COLORS.white} />
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      )}

      {/* Image Viewer Modal */}
      <Modal
        visible={showImageModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowImageModal(false)}
      >
        <View style={styles.modalContainer}>
          <TouchableOpacity
            style={styles.closeModalButton}
            onPress={() => setShowImageModal(false)}
          >
            <Ionicons name="close" size={28} color={COLORS.white} />
          </TouchableOpacity>
          
          {viewingImage && (
            <Image
              source={{ uri: viewingImage }}
              style={styles.fullImage}
              resizeMode="contain"
            />
          )}
        </View>
      </Modal>
    </Screen>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: SPACING.m,
    color: COLORS.white,
    fontSize: FONTS.body1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl,
  },
  emptyText: {
    fontSize: FONTS.h3,
    fontWeight: 'bold',
    color: COLORS.white,
    marginTop: SPACING.l,
  },
  emptySubtext: {
    fontSize: FONTS.body1,
    color: COLORS.gray500,
    textAlign: 'center',
    marginTop: SPACING.s,
  },
  messageList: {
    padding: SPACING.m,
    paddingBottom: SPACING.xl,
  },
  messageContainer: {
    maxWidth: '80%',
    padding: SPACING.m,
    borderRadius: 16,
    marginBottom: SPACING.m,
  },
  currentUserMessage: {
    alignSelf: 'flex-end',
    backgroundColor: COLORS.primary,
    borderBottomRightRadius: 4,
  },
  otherUserMessage: {
    alignSelf: 'flex-start',
    backgroundColor: COLORS.gray800,
    borderBottomLeftRadius: 4,
  },
  messageText: {
    color: COLORS.white,
    fontSize: FONTS.body1,
  },
  messageTime: {
    color: COLORS.gray300,
    fontSize: FONTS.caption,
    marginTop: SPACING.xs,
    alignSelf: 'flex-end',
  },
  messageImage: {
    width: 200,
    height: 150,
    borderRadius: 8,
    marginBottom: SPACING.s,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.m,
    backgroundColor: COLORS.gray900,
    borderTopWidth: 1,
    borderTopColor: COLORS.gray800,
  },
  attachButton: {
    padding: SPACING.s,
    marginRight: SPACING.s,
  },
  input: {
    flex: 1,
    backgroundColor: COLORS.gray800,
    borderRadius: 20,
    paddingHorizontal: SPACING.m,
    paddingVertical: SPACING.s,
    color: COLORS.white,
    maxHeight: 100,
  },
  sendButton: {
    backgroundColor: COLORS.primary,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: SPACING.s,
  },
  sendButtonDisabled: {
    backgroundColor: COLORS.gray700,
  },
  selectedImageContainer: {
    padding: SPACING.s,
    backgroundColor: COLORS.gray800,
    borderTopWidth: 1,
    borderTopColor: COLORS.gray700,
    position: 'relative',
  },
  selectedImage: {
    height: 100,
    borderRadius: 8,
  },
  removeImageButton: {
    position: 'absolute',
    top: SPACING.s,
    right: SPACING.s,
    backgroundColor: COLORS.gray900,
    borderRadius: 12,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullImage: {
    width: '100%',
    height: '80%',
  },
  closeModalButton: {
    position: 'absolute',
    top: 40,
    right: 20,
    zIndex: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 20,
    padding: SPACING.xs,
  },
});

export default ChatScreen; 