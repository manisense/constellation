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
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { COLORS, FONTS, SPACING } from '../constants/theme';
import Screen from '../components/Screen';
import { supabase } from '../utils/supabase';
import { useAuth } from '../hooks/useAuth';

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
          .order('created_at', { ascending: false });
        
        if (messageError) throw messageError;
        
        if (messageData) {
          setMessages(messageData.reverse());
        }
        
        // Subscribe to new messages
        const newSubscription = supabase
          .channel(`messages:constellation_id=eq.${memberData.constellation_id}`)
          .on('postgres_changes', { 
            event: 'INSERT', 
            schema: 'public', 
            table: 'messages',
            filter: `constellation_id=eq.${memberData.constellation_id}`
          }, (payload) => {
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
        
        if (partnersError) throw partnersError;
        
        if (partners && partners.length > 0) {
          const partnerId = partners[0].user_id;
          
          // Get partner profile
          const { data: partnerProfile, error: profileError } = await supabase
            .from('profiles')
            .select('name')
            .eq('id', partnerId)
            .single();
            
          if (!profileError && partnerProfile) {
            setPartnerName(partnerProfile.name || 'Partner');
          }
        }
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
      // Add message to Supabase
      const { error } = await supabase
        .from('messages')
        .insert([{
          constellation_id: constellationId,
          user_id: user.id,
          content: newMessage,
        }]);
      
      if (error) throw error;
      
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
    <Screen>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <FlatList
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.messageList}
        />

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
            style={styles.sendButton}
            onPress={handleSend}
            disabled={!newMessage.trim()}
          >
            <Text style={styles.sendButtonText}>Send</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  messageList: {
    padding: SPACING.m,
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
    backgroundColor: COLORS.card,
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
    backgroundColor: COLORS.background,
    borderTopWidth: 1,
    borderTopColor: COLORS.gray800,
  },
  input: {
    flex: 1,
    backgroundColor: COLORS.input,
    borderRadius: 20,
    paddingHorizontal: SPACING.m,
    paddingVertical: SPACING.s,
    color: COLORS.white,
    fontSize: FONTS.body1,
    maxHeight: 100,
  },
  sendButton: {
    marginLeft: SPACING.m,
    justifyContent: 'center',
  },
  sendButtonText: {
    color: COLORS.accent,
    fontSize: FONTS.body1,
    fontWeight: 'bold',
  },
});

export default ChatScreen; 