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
import {
  Message,
  getConstellationMessages,
  setupMessageSubscription,
  pickImage,
  sendMessage,
  getPartnerProfile,
  increaseBondingStrength
} from '../utils/clientFixes';

type ChatScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Chat'>;
};

const ChatScreen: React.FC<ChatScreenProps> = ({ navigation }) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [constellationId, setConstellationId] = useState<string | null>(null);
  const [partnerName, setPartnerName] = useState('Partner');
  const [partnerStarType, setPartnerStarType] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [showImageModal, setShowImageModal] = useState(false);
  const [viewingImage, setViewingImage] = useState<string | null>(null);
  const [bondingStrength, setBondingStrength] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    if (user) {
      loadUserData();
    }
    
    return () => {
      // Cleanup will be handled by the setupMessageSubscription function
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
        .maybeSingle();
      
      if (memberError) {
        console.error('Error getting constellation membership:', memberError);
        setLoading(false);
        return;
      }

      if (!memberData || !memberData.constellation_id) {
        console.log('No constellation membership found, running chat in solo mode');
        setConstellationId(null);
        setPartnerName('Testing Mode');
        setPartnerStarType(null);
        setMessages([]);
        setLoading(false);
        return;
      }
      
      if (memberData && memberData.constellation_id) {
        const constellationId = memberData.constellation_id;
        console.log("Found constellation ID:", constellationId);
        setConstellationId(constellationId);
        
        // Get initial messages using the improved function
        try {
          const messageData = await getConstellationMessages(constellationId);
          console.log(`Loaded ${messageData.length} messages`);
          setMessages(messageData);
        } catch (error) {
          console.error('Error fetching messages:', error);
        }
        
        // Subscribe to new messages using the improved function
        console.log("Setting up realtime subscription for messages...");
        const cleanup = setupMessageSubscription(constellationId, (newMessage) => {
          console.log("Received new message:", newMessage);
          // Add new message to the list
          setMessages(prevMessages => [...prevMessages, newMessage]);
          // Scroll to bottom
          setTimeout(() => {
            flatListRef.current?.scrollToEnd({ animated: true });
          }, 100);
        });
        
        // Get partner info using the improved function
        try {
          const partnerProfile = await getPartnerProfile(constellationId);
          if (partnerProfile) {
            console.log("Partner profile:", partnerProfile);
            setPartnerName(partnerProfile.name || 'Partner');
            setPartnerStarType(partnerProfile.star_type || null);
          } else {
            console.log("No partner found in constellation");
          }
        } catch (error) {
          console.error('Error fetching partner profile:', error);
        }
        
        // Get constellation data including bonding strength
        try {
          const { data: constellationData, error: constellationError } = await supabase
            .from('constellations')
            .select('bonding_strength')
            .eq('id', constellationId)
            .single();
            
          if (!constellationError && constellationData) {
            console.log("Constellation bonding strength:", constellationData.bonding_strength);
            setBondingStrength(constellationData.bonding_strength || 0);
          }
        } catch (error) {
          console.error('Error loading constellation data:', error);
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
      
      // Use the improved sendMessage function
      const success = await sendMessage(
        constellationId,
        newMessage.trim(),
        selectedImage
      );
      
      if (success) {
        console.log("Message sent successfully");
        
        // Clear input and selected image
        setNewMessage('');
        setSelectedImage(null);
        
        // Update bonding strength locally
        setBondingStrength(prev => Math.min(prev + 1, 100));
      } else {
        throw new Error('Failed to send message');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      Alert.alert('Error', 'Failed to send message. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const handlePickImage = async () => {
    const uri = await pickImage();
    if (uri) {
      setSelectedImage(uri);
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
          {new Date(item.created_at).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </Text>
      </View>
    );
  };

  const renderBondingStrength = () => {
    return (
      <View style={styles.bondingContainer}>
        <Text style={styles.bondingText}>Bonding Strength</Text>
        <View style={styles.bondingBarContainer}>
          <View 
            style={[
              styles.bondingBar, 
              { width: `${bondingStrength}%` }
            ]} 
          />
        </View>
        <Text style={styles.bondingValue}>{bondingStrength}%</Text>
      </View>
    );
  };

  if (loading) {
    return (
      <Screen showHeader headerTitle="Chat">
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading chat...</Text>
        </View>
      </Screen>
    );
  }

  return (
    <Screen showHeader headerTitle={`Chat with ${partnerName}`}>
      <View style={styles.container}>
        {renderBondingStrength()}
        
        {messages.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="chatbubble-outline" size={64} color={COLORS.gray500} />
            <Text style={styles.emptyText}>No messages yet</Text>
            <Text style={styles.emptySubtext}>
              {constellationId
                ? `Start a conversation with your ${partnerStarType === 'luminary' ? 'Luminary' : 'Navigator'} partner`
                : 'Join with a partner (or exit Solo Test Mode) to start messaging'}
            </Text>
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item) => item.id}
            renderItem={renderMessage}
            contentContainerStyle={styles.messagesList}
            onLayout={() => flatListRef.current?.scrollToEnd({ animated: false })}
          />
        )}
        
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={100}
          style={styles.inputContainer}
        >
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
          
          <View style={styles.inputRow}>
            <TouchableOpacity
              style={styles.attachButton}
              onPress={handlePickImage}
              disabled={sending}
            >
              <Ionicons name="image-outline" size={24} color={COLORS.primary} />
            </TouchableOpacity>
            
            <TextInput
              style={styles.input}
              placeholder="Type a message..."
              placeholderTextColor={COLORS.gray500}
              value={newMessage}
              onChangeText={setNewMessage}
              multiline
              maxLength={500}
              editable={!!constellationId}
            />
            
            <TouchableOpacity
              style={[
                styles.sendButton,
                (!newMessage.trim() && !selectedImage) || sending
                  ? styles.sendButtonDisabled
                  : {},
              ]}
              onPress={handleSend}
              disabled={(!newMessage.trim() && !selectedImage) || sending || !constellationId}
            >
              {sending ? (
                <ActivityIndicator size="small" color={COLORS.white} />
              ) : (
                <Ionicons name="send" size={20} color={COLORS.white} />
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
        
        <Modal
          visible={showImageModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowImageModal(false)}
        >
          <View style={styles.modalContainer}>
            <TouchableOpacity
              style={styles.closeModalButton}
              onPress={() => setShowImageModal(false)}
            >
              <Ionicons name="close" size={30} color={COLORS.white} />
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
      </View>
    </Screen>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
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
  messagesList: {
    padding: SPACING.m,
    paddingBottom: 100,
  },
  messageContainer: {
    maxWidth: '80%',
    padding: SPACING.s,
    borderRadius: 12,
    marginBottom: SPACING.s,
  },
  currentUserMessage: {
    alignSelf: 'flex-end',
    backgroundColor: COLORS.primary,
    borderBottomRightRadius: 0,
  },
  otherUserMessage: {
    alignSelf: 'flex-start',
    backgroundColor: COLORS.card,
    borderBottomLeftRadius: 0,
  },
  messageText: {
    color: COLORS.white,
    fontSize: FONTS.body1,
  },
  messageTime: {
    color: COLORS.gray500,
    fontSize: FONTS.caption,
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  messageImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginBottom: SPACING.s,
  },
  inputContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.card,
    borderTopWidth: 1,
    borderTopColor: COLORS.gray600,
    padding: SPACING.s,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    backgroundColor: COLORS.background,
    borderRadius: 20,
    paddingHorizontal: SPACING.m,
    paddingVertical: SPACING.s,
    maxHeight: 100,
    color: COLORS.white,
    fontSize: FONTS.body1,
  },
  attachButton: {
    padding: SPACING.s,
    marginRight: SPACING.s,
  },
  sendButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: SPACING.s,
  },
  sendButtonDisabled: {
    backgroundColor: COLORS.gray500,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.l,
  },
  emptyText: {
    color: COLORS.white,
    fontSize: FONTS.h3,
    marginTop: SPACING.m,
  },
  emptySubtext: {
    color: COLORS.gray500,
    fontSize: FONTS.body1,
    textAlign: 'center',
    marginTop: SPACING.s,
  },
  selectedImageContainer: {
    position: 'relative',
    marginBottom: SPACING.s,
    alignSelf: 'flex-start',
  },
  selectedImage: {
    width: 100,
    height: 100,
    borderRadius: 8,
  },
  removeImageButton: {
    position: 'absolute',
    top: -10,
    right: -10,
    backgroundColor: COLORS.error,
    borderRadius: 12,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullImage: {
    width: '90%',
    height: '80%',
  },
  closeModalButton: {
    position: 'absolute',
    top: 40,
    right: 20,
    zIndex: 10,
  },
  bondingContainer: {
    backgroundColor: COLORS.card,
    padding: SPACING.m,
    marginHorizontal: SPACING.m,
    marginTop: SPACING.m,
    borderRadius: 12,
    flexDirection: 'column',
    alignItems: 'center',
  },
  bondingText: {
    color: COLORS.white,
    fontSize: FONTS.h4,
    marginBottom: SPACING.s,
  },
  bondingBarContainer: {
    width: '100%',
    height: 10,
    backgroundColor: COLORS.background,
    borderRadius: 5,
    overflow: 'hidden',
  },
  bondingBar: {
    height: '100%',
    backgroundColor: COLORS.primary,
  },
  bondingValue: {
    color: COLORS.primary,
    fontSize: FONTS.body1,
    marginTop: SPACING.s,
  },
});

export default ChatScreen; 