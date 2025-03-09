import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  FlatList,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { COLORS, FONTS, SPACING, SIZES } from '../constants/theme';
import Screen from '../components/Screen';
import Card, { TouchableCard } from '../components/Card';
import { auth, db } from '../services/firebase';
import { 
  doc, 
  getDoc, 
  collection, 
  query, 
  where, 
  getDocs, 
  orderBy, 
  limit,
  onSnapshot,
  Timestamp,
} from 'firebase/firestore';
import { StarType } from '../types';

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

const HomeScreen: React.FC<HomeScreenProps> = ({ navigation }) => {
  const [userName, setUserName] = useState('');
  const [partnerName, setPartnerName] = useState('');
  const [constellationName, setConstellationName] = useState('');
  const [bondingStrength, setBondingStrength] = useState(0);
  const [userStarType, setUserStarType] = useState<StarType | null>(null);
  const [partnerStarType, setPartnerStarType] = useState<StarType | null>(null);
  const [dailyActivities, setDailyActivities] = useState<DailyActivity[]>([]);
  const [recentMessages, setRecentMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [constellationId, setConstellationId] = useState('');

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
        
        setUserName(userData.name || 'User');
        setUserStarType(userData.starType);
        setConstellationId(userData.constellationId);

        if (userData.constellationId) {
          // Get constellation data
          const constellationDoc = await getDoc(doc(db, 'constellations', userData.constellationId));
          if (constellationDoc.exists()) {
            const constellationData = constellationDoc.data();
            setConstellationName(constellationData.name || 'Your Constellation');
            setBondingStrength(constellationData.bondingStrength || 0);
            
            // Find partner
            const partnerIds = constellationData.partnerIds || [];
            const partnerId = partnerIds.find((id: string) => id !== userId);
            
            if (partnerId) {
              // Get partner data
              const partnerDoc = await getDoc(doc(db, 'users', partnerId));
              if (partnerDoc.exists()) {
                const partnerData = partnerDoc.data();
                setPartnerName(partnerData.name || 'Partner');
                setPartnerStarType(partnerData.starType);
              }
              
              // Listen for recent messages
              listenForRecentMessages(userData.constellationId);
            }
          }
        }
        
        // Generate daily activities
        setDailyActivities(generateDailyActivities());
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const listenForRecentMessages = (constellationId: string) => {
    const messagesRef = collection(db, 'messages');
    const q = query(
      messagesRef,
      where('constellationId', '==', constellationId),
      orderBy('createdAt', 'desc'),
      limit(3)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const messages: any[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        messages.push({
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate() || new Date(),
        });
      });
      setRecentMessages(messages);
    });

    return unsubscribe;
  };

  const generateDailyActivities = () => {
    // In a real app, these would come from the backend
    const activities: DailyActivity[] = [
      {
        id: '1',
        title: 'Daily Connection Quiz',
        description: 'Take a quick quiz together to strengthen your bond',
        type: 'quiz',
        completed: false,
      },
      {
        id: '2',
        title: 'Share a Memory',
        description: 'Send your partner a photo of a special memory',
        type: 'chat',
        completed: false,
      },
      {
        id: '3',
        title: 'Appreciation Message',
        description: 'Tell your partner something you appreciate about them',
        type: 'chat',
        completed: false,
      },
    ];
    
    return activities;
  };

  const handleActivityPress = (activity: DailyActivity) => {
    if (activity.type === 'quiz') {
      navigation.navigate('Quiz');
    } else if (activity.type === 'chat') {
      navigation.navigate('Chat');
    }
  };

  const renderConstellationCard = () => {
    return (
      <TouchableCard
        style={styles.constellationCard}
        onPress={() => navigation.navigate('ConstellationView')}
      >
        <View style={styles.constellationHeader}>
          <View>
            <Text style={styles.constellationTitle}>{constellationName}</Text>
            <Text style={styles.constellationSubtitle}>
              Bonding Strength: {bondingStrength}%
            </Text>
          </View>
          <View style={styles.strengthIndicator}>
            <View 
              style={[
                styles.strengthFill, 
                { width: `${bondingStrength}%` }
              ]} 
            />
          </View>
        </View>
        
        <View style={styles.starsContainer}>
          <View style={styles.starItem}>
            <Image
              source={userStarType === StarType.LUMINARY 
                ? require('../assets/images/luminary-star.png')
                : require('../assets/images/navigator-star.png')}
              style={[
                styles.starImage,
                { tintColor: userStarType === StarType.LUMINARY ? COLORS.luminary : COLORS.navigator }
              ]}
              resizeMode="contain"
            />
            <Text style={styles.starName}>{userName}</Text>
            <Text style={styles.starType}>
              {userStarType === StarType.LUMINARY ? 'Luminary' : 'Navigator'}
            </Text>
          </View>
          
          <View style={styles.connectionLine} />
          
          <View style={styles.starItem}>
            <Image
              source={partnerStarType === StarType.LUMINARY 
                ? require('../assets/images/luminary-star.png')
                : require('../assets/images/navigator-star.png')}
              style={[
                styles.starImage,
                { tintColor: partnerStarType === StarType.LUMINARY ? COLORS.luminary : COLORS.navigator }
              ]}
              resizeMode="contain"
            />
            <Text style={styles.starName}>{partnerName}</Text>
            <Text style={styles.starType}>
              {partnerStarType === StarType.LUMINARY ? 'Luminary' : 'Navigator'}
            </Text>
          </View>
        </View>
        
        <Text style={styles.viewDetails}>View Constellation Details</Text>
      </TouchableCard>
    );
  };

  const renderDailyActivities = () => {
    return (
      <View style={styles.sectionContainer}>
        <Text style={styles.sectionTitle}>Daily Activities</Text>
        <Text style={styles.sectionSubtitle}>
          Complete these together to strengthen your bond
        </Text>
        
        {dailyActivities.map((activity) => (
          <TouchableCard
            key={activity.id}
            style={styles.activityCard}
            onPress={() => handleActivityPress(activity)}
          >
            <View style={styles.activityContent}>
              <View style={styles.activityInfo}>
                <Text style={styles.activityTitle}>{activity.title}</Text>
                <Text style={styles.activityDescription}>
                  {activity.description}
                </Text>
              </View>
              <View 
                style={[
                  styles.activityStatus,
                  activity.completed ? styles.activityCompleted : styles.activityPending
                ]}
              >
                <Text style={styles.activityStatusText}>
                  {activity.completed ? 'Done' : 'To Do'}
                </Text>
              </View>
            </View>
          </TouchableCard>
        ))}
      </View>
    );
  };

  const renderRecentMessages = () => {
    if (recentMessages.length === 0) {
      return (
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Recent Messages</Text>
          <Card style={styles.emptyMessagesCard}>
            <Text style={styles.emptyMessagesText}>
              No recent messages. Start a conversation with your partner!
            </Text>
          </Card>
        </View>
      );
    }

    return (
      <View style={styles.sectionContainer}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Messages</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Chat')}>
            <Text style={styles.viewAllText}>View All</Text>
          </TouchableOpacity>
        </View>
        
        {recentMessages.map((message) => (
          <Card key={message.id} style={styles.messageCard}>
            <View style={styles.messageHeader}>
              <Text style={styles.messageSender}>
                {message.senderId === auth.currentUser?.uid ? 'You' : partnerName}
              </Text>
              <Text style={styles.messageTime}>
                {formatMessageTime(message.createdAt)}
              </Text>
            </View>
            <Text style={styles.messageText}>{message.text}</Text>
          </Card>
        ))}
      </View>
    );
  };

  const formatMessageTime = (date: Date) => {
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffInHours < 48) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  return (
    <Screen
      header={{
        title: 'Home',
        rightIcon: (
          <TouchableOpacity onPress={() => navigation.navigate('Settings')}>
            <Image
              source={require('../assets/images/settings-icon.png')}
              style={styles.settingsIcon}
            />
          </TouchableOpacity>
        ),
      }}
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.greeting}>Welcome back, {userName}!</Text>
        
        {renderConstellationCard()}
        {renderDailyActivities()}
        {renderRecentMessages()}
      </ScrollView>
    </Screen>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: SPACING.l,
    paddingBottom: SPACING.xxl,
  },
  greeting: {
    fontSize: FONTS.h3,
    fontWeight: 'bold',
    color: COLORS.white,
    marginBottom: SPACING.l,
  },
  settingsIcon: {
    width: 24,
    height: 24,
    tintColor: COLORS.white,
  },
  constellationCard: {
    marginBottom: SPACING.l,
    padding: SPACING.l,
  },
  constellationHeader: {
    marginBottom: SPACING.m,
  },
  constellationTitle: {
    fontSize: FONTS.h3,
    fontWeight: 'bold',
    color: COLORS.white,
    marginBottom: SPACING.xs,
  },
  constellationSubtitle: {
    fontSize: FONTS.body2,
    color: COLORS.gray300,
    marginBottom: SPACING.s,
  },
  strengthIndicator: {
    height: 6,
    backgroundColor: COLORS.gray700,
    borderRadius: 3,
    overflow: 'hidden',
    marginTop: SPACING.xs,
  },
  strengthFill: {
    height: '100%',
    backgroundColor: COLORS.accent,
  },
  starsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: SPACING.m,
  },
  starItem: {
    alignItems: 'center',
    flex: 1,
  },
  starImage: {
    width: 60,
    height: 60,
    marginBottom: SPACING.xs,
  },
  starName: {
    fontSize: FONTS.body2,
    fontWeight: 'bold',
    color: COLORS.white,
    marginBottom: SPACING.xs,
  },
  starType: {
    fontSize: FONTS.caption,
    color: COLORS.gray300,
  },
  connectionLine: {
    height: 2,
    backgroundColor: COLORS.gray700,
    width: '20%',
  },
  viewDetails: {
    fontSize: FONTS.body2,
    color: COLORS.accent,
    textAlign: 'center',
    marginTop: SPACING.s,
  },
  sectionContainer: {
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
    marginBottom: SPACING.xs,
  },
  sectionSubtitle: {
    fontSize: FONTS.body2,
    color: COLORS.gray300,
    marginBottom: SPACING.m,
  },
  viewAllText: {
    fontSize: FONTS.body2,
    color: COLORS.accent,
  },
  activityCard: {
    marginBottom: SPACING.m,
  },
  activityContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  activityInfo: {
    flex: 1,
    marginRight: SPACING.m,
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
  activityStatus: {
    paddingHorizontal: SPACING.m,
    paddingVertical: SPACING.xs,
    borderRadius: SIZES.borderRadius,
  },
  activityPending: {
    backgroundColor: COLORS.primary,
  },
  activityCompleted: {
    backgroundColor: COLORS.success,
  },
  activityStatusText: {
    fontSize: FONTS.caption,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  messageCard: {
    marginBottom: SPACING.m,
  },
  messageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  messageSender: {
    fontSize: FONTS.body2,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  messageTime: {
    fontSize: FONTS.caption,
    color: COLORS.gray400,
  },
  messageText: {
    fontSize: FONTS.body2,
    color: COLORS.gray200,
  },
  emptyMessagesCard: {
    padding: SPACING.m,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyMessagesText: {
    fontSize: FONTS.body2,
    color: COLORS.gray300,
    textAlign: 'center',
  },
});

export default HomeScreen; 