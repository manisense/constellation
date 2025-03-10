import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  FlatList,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { COLORS, FONTS, SPACING, SIZES } from '../constants/theme';
import Screen from '../components/Screen';
import Card, { TouchableCard } from '../components/Card';
import { supabase } from '../utils/supabase';
import { StarType } from '../types';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../hooks/useAuth';

type HomeScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Home'>;
};

interface DailyActivity {
  id: string;
  title: string;
  description: string;
  type: 'quiz' | 'chat' | 'activity';
  completed: boolean;
}

interface Message {
  id: string;
  content: string;
  user_id: string;
  created_at: string;
  sender_name?: string;
  profiles?: { name: string };
}

const HomeScreen: React.FC<HomeScreenProps> = ({ navigation }) => {
  const { user } = useAuth();
  const [userName, setUserName] = useState('');
  const [partnerName, setPartnerName] = useState('');
  const [constellationName, setConstellationName] = useState('');
  const [bondingStrength, setBondingStrength] = useState(0);
  const [userStarType, setUserStarType] = useState<StarType | null>(null);
  const [partnerStarType, setPartnerStarType] = useState<StarType | null>(null);
  const [dailyActivities, setDailyActivities] = useState<DailyActivity[]>([]);
  const [recentMessages, setRecentMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(true);
  const [subscription, setSubscription] = useState<any>(null);

  useEffect(() => {
    if (user) {
      loadUserData();
      generateDailyActivities();
    } else {
      navigation.reset({
        index: 0,
        routes: [{ name: 'Welcome' }],
      });
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
      setLoading(true);

      // Get user profile
      const { data: userData, error: userError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      
      if (userError) throw userError;
      
      setUserName(userData.name || 'User');
      setUserStarType(userData.starType || null);

      // Get user's constellation membership
      const { data: memberData, error: memberError } = await supabase
        .from('constellation_members')
        .select('constellation_id')
        .eq('user_id', user.id)
        .single();
      
      if (memberError) {
        // User doesn't have a constellation yet
        navigation.reset({
          index: 0,
          routes: [{ name: 'CreateConstellation' }],
        });
        return;
      }

      if (memberData && memberData.constellation_id) {
        // Get constellation data
        const { data: constellationData, error: constellationError } = await supabase
          .from('constellations')
          .select('*')
          .eq('id', memberData.constellation_id)
          .single();
        
        if (constellationError) throw constellationError;
        
        setConstellationName(constellationData.name || 'Your Constellation');
        setBondingStrength(constellationData.bonding_strength || 0);

        // Get partner data
        const { data: partners, error: partnersError } = await supabase
          .from('constellation_members')
          .select('user_id')
          .eq('constellation_id', memberData.constellation_id)
          .neq('user_id', user.id);
        
        if (partnersError) throw partnersError;
        
        if (partners && partners.length > 0) {
          const partnerId = partners[0].user_id;
          
          // Get partner profile
          const { data: partnerData, error: partnerError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', partnerId)
            .single();
            
          if (!partnerError && partnerData) {
            setPartnerName(partnerData.name || 'Partner');
            setPartnerStarType(partnerData.starType || null);
          }
        }

        // Get recent messages
        const { data: messages, error: messagesError } = await supabase
          .from('messages')
          .select(`
            id,
            content,
            user_id,
            created_at,
            profiles(name)
          `)
          .eq('constellation_id', memberData.constellation_id)
          .order('created_at', { ascending: false })
          .limit(5);
        
        if (!messagesError && messages) {
          const formattedMessages = messages.map((msg: any) => ({
            id: msg.id,
            content: msg.content,
            user_id: msg.user_id,
            created_at: msg.created_at,
            sender_name: msg.profiles?.name || 'Unknown'
          }));
          setRecentMessages(formattedMessages);
        }
        
        // Subscribe to new messages
        const newSubscription = supabase
          .channel(`messages:constellation_id=eq.${memberData.constellation_id}`)
          .on('postgres_changes', { 
            event: 'INSERT', 
            schema: 'public', 
            table: 'messages',
            filter: `constellation_id=eq.${memberData.constellation_id}`
          }, async (payload) => {
            // Get sender name
            const { data: senderData } = await supabase
              .from('profiles')
              .select('name')
              .eq('id', payload.new.user_id)
              .single();
            
            // Add new message to the list
            const newMessage = {
              ...payload.new,
              sender_name: senderData?.name || 'Unknown'
            } as Message;
            
            setRecentMessages(prevMessages => {
              const updatedMessages = [newMessage, ...prevMessages];
              return updatedMessages.slice(0, 5); // Keep only the 5 most recent
            });
          })
          .subscribe();
        
        setSubscription(newSubscription);
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Error loading user data:', error);
      setError('Failed to load data. Please try again.');
      setLoading(false);
    }
  };

  const generateDailyActivities = () => {
    // This would ideally come from the server, but for now we'll generate some sample activities
    const activities: DailyActivity[] = [
      {
        id: '1',
        title: 'Daily Connection Quiz',
        description: 'Take today\'s quiz to strengthen your bond',
        type: 'quiz',
        completed: false,
      },
      {
        id: '2',
        title: 'Send a Message',
        description: 'Share something meaningful with your partner',
        type: 'chat',
        completed: false,
      },
      {
        id: '3',
        title: 'Relationship Reflection',
        description: 'Reflect on a special memory together',
        type: 'activity',
        completed: false,
      },
    ];

    setDailyActivities(activities);
  };

  const handleActivityPress = (activity: DailyActivity) => {
    switch (activity.type) {
      case 'quiz':
        navigation.navigate('Quiz');
        break;
      case 'chat':
        navigation.navigate('Chat');
        break;
      case 'activity':
        Alert.alert('Activity', 'This feature is coming soon!');
        break;
    }
  };

  const renderConstellationCard = () => {
    return (
      <Card style={styles.constellationCard}>
        <View style={styles.constellationHeader}>
          <Text style={styles.constellationName}>{constellationName}</Text>
          <TouchableOpacity 
            style={styles.viewButton}
            onPress={() => navigation.navigate('ConstellationView')}
          >
            <Text style={styles.viewButtonText}>View</Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.starsContainer}>
          <View style={styles.starCard}>
            <Image 
              source={
                userStarType === StarType.LUMINARY 
                  ? require('../assets/images/luminary-star.png')
                  : require('../assets/images/navigator-star.png')
              }
              style={styles.starImage}
              resizeMode="contain"
            />
            <Text style={styles.starName}>{userName}</Text>
          </View>
          
          <View style={styles.connectionLine} />
          
          <View style={styles.starCard}>
            <Image 
              source={
                partnerStarType === StarType.LUMINARY 
                  ? require('../assets/images/luminary-star.png')
                  : require('../assets/images/navigator-star.png')
              }
              style={styles.starImage}
              resizeMode="contain"
            />
            <Text style={styles.starName}>{partnerName}</Text>
          </View>
        </View>
        
        <View style={styles.bondingContainer}>
          <Text style={styles.bondingText}>Bonding Strength: {bondingStrength}%</Text>
          <View style={styles.bondingBar}>
            <View 
              style={[
                styles.bondingProgress, 
                { width: `${bondingStrength}%` }
              ]} 
            />
          </View>
        </View>
      </Card>
    );
  };

  const renderActivityItem = ({ item }: { item: DailyActivity }) => {
    return (
      <TouchableCard 
        style={styles.activityCard}
        onPress={() => handleActivityPress(item)}
      >
        <View style={styles.activityContent}>
          <View style={styles.activityIconContainer}>
            {item.type === 'quiz' && (
              <Ionicons name="help-circle-outline" size={24} color={COLORS.primary} />
            )}
            {item.type === 'chat' && (
              <Ionicons name="chatbubble-outline" size={24} color={COLORS.primary} />
            )}
            {item.type === 'activity' && (
              <Ionicons name="heart-outline" size={24} color={COLORS.primary} />
            )}
          </View>
          <View style={styles.activityTextContainer}>
            <Text style={styles.activityTitle}>{item.title}</Text>
            <Text style={styles.activityDescription}>{item.description}</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={COLORS.gray500} />
        </View>
      </TouchableCard>
    );
  };

  const renderMessageItem = ({ item }: { item: Message }) => {
    const isCurrentUser = item.user_id === user?.id;
    const displayName = isCurrentUser ? 'You' : (item.sender_name || 'Partner');
    
    return (
      <View style={styles.messageItem}>
        <View style={styles.messageHeader}>
          <Text style={styles.messageSender}>{displayName}</Text>
          <Text style={styles.messageTime}>
            {new Date(item.created_at).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </Text>
        </View>
        <Text style={styles.messageText}>{item.content}</Text>
      </View>
    );
  };

  if (loading) {
    return (
      <Screen>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <ScrollView style={styles.container}>
        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}
        
        {renderConstellationCard()}
        
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Daily Activities</Text>
          <FlatList
            data={dailyActivities}
            renderItem={renderActivityItem}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
          />
        </View>
        
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Messages</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Chat')}>
              <Text style={styles.viewAllText}>View All</Text>
            </TouchableOpacity>
          </View>
          
          {recentMessages.length > 0 ? (
            <Card style={styles.messagesCard}>
              <FlatList
                data={recentMessages}
                renderItem={renderMessageItem}
                keyExtractor={(item) => item.id}
                scrollEnabled={false}
              />
            </Card>
          ) : (
            <Card style={styles.emptyMessagesCard}>
              <Text style={styles.emptyMessagesText}>
                No messages yet. Start a conversation with your partner!
              </Text>
              <TouchableOpacity
                style={styles.startChatButton}
                onPress={() => navigation.navigate('Chat')}
              >
                <Text style={styles.startChatButtonText}>Start Chat</Text>
              </TouchableOpacity>
            </Card>
          )}
        </View>
      </ScrollView>
    </Screen>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: SPACING.l,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    backgroundColor: COLORS.error,
    padding: SPACING.m,
    borderRadius: 8,
    marginBottom: SPACING.m,
  },
  errorText: {
    color: COLORS.white,
    fontSize: FONTS.body2,
    textAlign: 'center',
  },
  constellationCard: {
    marginBottom: SPACING.l,
    padding: SPACING.m,
  },
  constellationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.m,
  },
  constellationName: {
    fontSize: FONTS.h3,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  viewButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.m,
    paddingVertical: SPACING.xs,
    borderRadius: 16,
  },
  viewButtonText: {
    color: COLORS.white,
    fontSize: FONTS.caption,
    fontWeight: 'bold',
  },
  starsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.m,
  },
  starCard: {
    alignItems: 'center',
    width: '40%',
  },
  starImage: {
    width: 60,
    height: 60,
    marginBottom: SPACING.s,
  },
  starName: {
    fontSize: FONTS.body2,
    color: COLORS.white,
    textAlign: 'center',
  },
  connectionLine: {
    height: 2,
    backgroundColor: COLORS.accent,
    width: '15%',
  },
  bondingContainer: {
    alignItems: 'center',
  },
  bondingText: {
    fontSize: FONTS.body2,
    color: COLORS.gray300,
    marginBottom: SPACING.s,
  },
  bondingBar: {
    width: '100%',
    height: 6,
    backgroundColor: COLORS.gray700,
    borderRadius: 3,
    overflow: 'hidden',
  },
  bondingProgress: {
    height: '100%',
    backgroundColor: COLORS.accent,
  },
  section: {
    marginBottom: SPACING.l,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.m,
  },
  sectionTitle: {
    fontSize: FONTS.h4,
    fontWeight: 'bold',
    color: COLORS.white,
    marginBottom: SPACING.m,
  },
  viewAllText: {
    color: COLORS.primary,
    fontSize: FONTS.body2,
  },
  activityCard: {
    marginBottom: SPACING.m,
    padding: SPACING.m,
  },
  activityContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  activityIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.gray800,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.m,
  },
  activityTextContainer: {
    flex: 1,
  },
  activityTitle: {
    fontSize: FONTS.body1,
    fontWeight: 'bold',
    color: COLORS.white,
    marginBottom: SPACING.xs,
  },
  activityDescription: {
    fontSize: FONTS.body2,
    color: COLORS.gray300,
  },
  messagesCard: {
    padding: SPACING.m,
  },
  messageItem: {
    marginBottom: SPACING.m,
    paddingBottom: SPACING.m,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray700,
  },
  messageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.xs,
  },
  messageSender: {
    fontSize: FONTS.body2,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  messageTime: {
    fontSize: FONTS.caption,
    color: COLORS.gray500,
  },
  messageText: {
    fontSize: FONTS.body2,
    color: COLORS.gray300,
  },
  emptyMessagesCard: {
    padding: SPACING.l,
    alignItems: 'center',
  },
  emptyMessagesText: {
    fontSize: FONTS.body2,
    color: COLORS.gray300,
    textAlign: 'center',
    marginBottom: SPACING.m,
  },
  startChatButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.l,
    paddingVertical: SPACING.m,
    borderRadius: 8,
  },
  startChatButtonText: {
    color: COLORS.white,
    fontSize: FONTS.body2,
    fontWeight: 'bold',
  },
});

export default HomeScreen; 