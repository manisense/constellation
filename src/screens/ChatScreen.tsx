import React, { useState, useEffect } from 'react';
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
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { COLORS, FONTS, SPACING } from '../constants/theme';
import Screen from '../components/Screen';
import { supabase } from '../utils/supabase';
import { useAuth } from '../provider/AuthProvider';
import { Ionicons } from '@expo/vector-icons';

type ChatScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Chat'>;
};

interface Message {
  id: string;
  content: string;
  user_id: string;
  created_at: string;
}

const ChatScreen: React.FC<ChatScreenProps> = () => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [constellationId, setConstellationId] = useState<string | null>(null);
  const [partnerName, setPartnerName] = useState('Partner');
  const [subscription, setSubscription] = useState<any>(null);

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
            created_at
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
    if (!newMessage.trim() || !constellationId || !user) return;

    try {
      console.log("Sending message:", newMessage);
      // Add message to Supabase
      const { data, error } = await supabase
        .from('messages')
        .insert([{
          constellation_id: constellationId,
          user_id: user.id,
          content: newMessage,
        }])
        .select();
      
      if (error) {
        console.error('Error sending message:', error);
        throw error;
      }
      
      console.log("Message sent successfully:", data);
      
      // Clear input
      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
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
              data={messages}
              renderItem={renderMessage}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.messageList}
              inverted={false}
            />
          )}

          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              value={newMessage}
              onChangeText={setNewMessage}
              placeholder="Type a message..."
              placeholderTextColor={COLORS.gray500}
              multiline
            />
            <TouchableOpacity
              style={[
                styles.sendButton,
                !newMessage.trim() && styles.sendButtonDisabled
              ]}
              onPress={handleSend}
              disabled={!newMessage.trim()}
            >
              <Ionicons 
                name="send" 
                size={24} 
                color={!newMessage.trim() ? COLORS.gray500 : COLORS.white} 
              />
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      )}
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
    color: COLORS.gray300,
    fontSize: FONTS.body1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl,
  },
  emptyText: {
    marginTop: SPACING.m,
    color: COLORS.white,
    fontSize: FONTS.h3,
    fontWeight: 'bold',
  },
  emptySubtext: {
    marginTop: SPACING.s,
    color: COLORS.gray300,
    fontSize: FONTS.body1,
    textAlign: 'center',
  },
  messageList: {
    padding: SPACING.m,
    flexGrow: 1,
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
  },
  otherUserMessage: {
    alignSelf: 'flex-start',
    backgroundColor: COLORS.gray800,
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
  inputContainer: {
    flexDirection: 'row',
    padding: SPACING.m,
    borderTopWidth: 1,
    borderTopColor: COLORS.gray800,
    backgroundColor: COLORS.background,
  },
  input: {
    flex: 1,
    backgroundColor: COLORS.gray800,
    borderRadius: 20,
    paddingHorizontal: SPACING.m,
    paddingVertical: SPACING.s,
    color: COLORS.white,
    fontSize: FONTS.body1,
    maxHeight: 100,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: SPACING.s,
  },
  sendButtonDisabled: {
    backgroundColor: COLORS.gray700,
  },
  sendButtonText: {
    color: COLORS.white,
    fontWeight: 'bold',
  },
});

export default ChatScreen; 