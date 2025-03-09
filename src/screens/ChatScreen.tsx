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
import { db } from '../services/firebase';
import {
  collection,
  query,
  orderBy,
  limit,
  getDocs,
  addDoc,
  serverTimestamp,
  onSnapshot,
  getDoc,
  doc,
} from 'firebase/firestore';

type ChatScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Chat'>;
};

interface Message {
  id: string;
  text: string;
  senderId: string;
  createdAt: Date;
}

const ChatScreen: React.FC<ChatScreenProps> = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [constellationId, setConstellationId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [partnerName, setPartnerName] = useState('Partner');

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      // Get the current user ID from local storage
      // In a real app, we would use auth.currentUser.uid
      // For our demo, we'll use the latest user created
      const usersRef = collection(db, 'users');
      const q = query(usersRef, orderBy('createdAt', 'desc'), limit(1));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const userData = querySnapshot.docs[0].data();
        const userId = querySnapshot.docs[0].id;
        
        setUserId(userId);

        if (userData.constellationId) {
          setConstellationId(userData.constellationId);
          
          // Get constellation data
          const constellationRef = collection(db, 'constellations', userData.constellationId, 'messages');
          const messagesQuery = query(constellationRef, orderBy('createdAt', 'desc'));
          
          // Listen for messages
          const unsubscribe = onSnapshot(messagesQuery, (snapshot) => {
            const messageList: Message[] = [];
            snapshot.forEach((doc) => {
              const data = doc.data();
              messageList.push({
                id: doc.id,
                text: data.text,
                senderId: data.senderId,
                createdAt: data.createdAt?.toDate() || new Date(),
              });
            });
            setMessages(messageList.reverse());
            setLoading(false);
          });
          
          // Get partner name
          const constellationDoc = await getDoc(doc(db, 'constellations', userData.constellationId));
          if (constellationDoc.exists()) {
            const constellationData = constellationDoc.data();
            const partnerIds = constellationData.partnerIds || [];
            const partnerId = partnerIds.find((id: string) => id !== userId);
            
            if (partnerId) {
              const partnerDoc = await getDoc(doc(db, 'users', partnerId));
              if (partnerDoc.exists()) {
                const partnerData = partnerDoc.data();
                setPartnerName(partnerData.name || 'Partner');
              }
            }
          }
          
          return unsubscribe;
        }
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async () => {
    if (!newMessage.trim() || !constellationId || !userId) return;

    try {
      // Add message to Firestore
      await addDoc(collection(db, 'constellations', constellationId, 'messages'), {
        text: newMessage,
        senderId: userId,
        createdAt: serverTimestamp(),
      });
      
      // Clear input
      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isCurrentUser = item.senderId === userId;
    
    return (
      <View
        style={[
          styles.messageContainer,
          isCurrentUser ? styles.currentUserMessage : styles.otherUserMessage,
        ]}
      >
        <Text style={styles.messageText}>{item.text}</Text>
        <Text style={styles.messageTime}>
          {formatTime(item.createdAt)}
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
          inverted
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