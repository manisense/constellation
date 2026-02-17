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
  ImageBackground,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { COLORS, FONTS, SPACING, SIZES } from '../constants/theme';
import Screen from '../components/Screen';
import Card, { TouchableCard } from '../components/Card';
import { supabase } from '../utils/supabase';
import { StarType } from '../types';
import { Ionicons, FontAwesome5, MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '../hooks/useAuth';

type HomeScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Home'>;
};

interface Activity {
  id: string;
  title: string;
  icon: React.ReactNode;
  screen: keyof RootStackParamList;
}

interface RecentActivity {
  id: string;
  type: 'quiz' | 'chat' | 'memory' | 'date';
  title: string;
  timestamp: string;
  icon: React.ReactNode;
}

const HomeScreen: React.FC<HomeScreenProps> = ({ navigation }) => {
  const { user } = useAuth();
  const [userName, setUserName] = useState('');
  const [partnerName, setPartnerName] = useState('');
  const [constellationName, setConstellationName] = useState('');
  const [bondingStrength, setBondingStrength] = useState(0);
  const [userStarType, setUserStarType] = useState<StarType | null>(null);
  const [partnerStarType, setPartnerStarType] = useState<StarType | null>(null);
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [constellationId, setConstellationId] = useState<string | null>(null);
  const [subscription, setSubscription] = useState<any>(null);

  useEffect(() => {
    if (user) {
      loadUserData();
      loadRecentActivities();
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
      setUserStarType(userData.star_type || null);

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
        setConstellationId(memberData.constellation_id);
        
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
            setPartnerStarType(partnerData.star_type || null);
          }
        }
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Error loading user data:', error);
      setError('Failed to load data. Please try again.');
      setLoading(false);
    }
  };

  const loadRecentActivities = async () => {
    try {
      // This would ideally come from the server, but for now we'll generate some sample activities
      const activities: RecentActivity[] = [
        {
          id: '1',
          type: 'quiz',
          title: 'Completed daily love quiz',
          timestamp: '2 hours ago',
          icon: <FontAwesome5 name="heart" size={20} color={COLORS.white} />
        },
        {
          id: '2',
          type: 'memory',
          title: 'Added new memory: "Stargazing Date"',
          timestamp: 'Yesterday',
          icon: <FontAwesome5 name="star" size={20} color={COLORS.white} />
        }
      ];

      setRecentActivities(activities);
    } catch (error) {
      console.error('Error loading recent activities:', error);
    }
  };

  const handleActivityPress = (activity: Activity) => {
    // Use explicit navigation based on activity type
    switch (activity.title) {
      case 'Love Quiz':
        navigation.navigate('Quiz');
        break;
      case 'Chat Room':
        navigation.navigate('Chat');
        break;
      case 'Date Plans':
        navigation.navigate('DatePlans');
        break;
      case 'Memories':
        navigation.navigate('Memories');
        break;
      default:
        console.warn(`Unknown activity: ${activity.title}`);
    }
  };

  const renderConstellationCard = () => {
    return (
      <ImageBackground
        source={require('../assets/images/night-sky.png')}
        style={styles.constellationBackground}
        resizeMode="cover"
      >
        <View style={styles.constellationContent}>
          <Text style={styles.constellationTitle}>Your Constellation</Text>
          <Text style={styles.constellationSubtitle}>Connected with {partnerName}</Text>
        </View>
      </ImageBackground>
    );
  };

  const renderDailyActivities = () => {
    const activities: Activity[] = [
      {
        id: '1',
        title: 'Love Quiz',
        icon: <FontAwesome5 name="heart" size={24} color={COLORS.white} />,
        screen: 'Quiz'
      },
      {
        id: '2',
        title: 'Chat Room',
        icon: <Ionicons name="chatbubble-outline" size={24} color={COLORS.white} />,
        screen: 'Chat'
      },
      {
        id: '3',
        title: 'Date Plans',
        icon: <FontAwesome5 name="calendar-alt" size={24} color={COLORS.white} />,
        screen: 'DatePlans'
      },
      {
        id: '4',
        title: 'Memories',
        icon: <MaterialIcons name="star-outline" size={24} color={COLORS.white} />,
        screen: 'Memories'
      }
    ];

    return (
      <View style={styles.activitiesContainer}>
        <Text style={styles.sectionTitle}>Daily Activities</Text>
        <View style={styles.activitiesGrid}>
          {activities.map((activity) => (
            <TouchableOpacity
              key={activity.id}
              style={styles.activityCard}
              onPress={() => handleActivityPress(activity)}
            >
              <View style={styles.activityIconContainer}>
                {activity.icon}
              </View>
              <Text style={styles.activityTitle}>{activity.title}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  };

  const renderConnectionStrength = () => {
    return (
      <Card style={styles.connectionCard}>
        <View style={styles.connectionHeader}>
          <Text style={styles.connectionTitle}>Connection Strength</Text>
          <View style={styles.connectionIconContainer}>
            <FontAwesome5 name="heart" size={24} color={COLORS.white} />
          </View>
        </View>
        <Text style={styles.connectionPercentage}>{bondingStrength}% Aligned</Text>
        <View style={styles.progressBarContainer}>
          <View 
            style={[
              styles.progressBar, 
              { width: `${bondingStrength}%` }
            ]} 
          />
        </View>
      </Card>
    );
  };

  const renderRecentActivities = () => {
    return (
      <View style={styles.recentActivitiesContainer}>
        <Text style={styles.sectionTitle}>Recent Activities</Text>
        {recentActivities.map((activity) => (
          <Card key={activity.id} style={styles.recentActivityCard}>
            <View style={styles.recentActivityIconContainer}>
              {activity.icon}
            </View>
            <View style={styles.recentActivityContent}>
              <Text style={styles.recentActivityTitle}>{activity.title}</Text>
              <Text style={styles.recentActivityTime}>{activity.timestamp}</Text>
            </View>
          </Card>
        ))}
      </View>
    );
  };

  if (loading) {
    return (
      <Screen showHeader={true} headerTitle="Constellation">
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen showHeader={true} headerTitle="Constellation">
      <ScrollView style={styles.container}>
        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}
        
        {renderConstellationCard()}
        {renderDailyActivities()}
        {renderConnectionStrength()}
        {renderRecentActivities()}
      </ScrollView>
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
  errorContainer: {
    backgroundColor: COLORS.error,
    padding: SPACING.m,
    borderRadius: 8,
    marginHorizontal: SPACING.l,
    marginTop: SPACING.m,
  },
  errorText: {
    color: COLORS.white,
    fontSize: FONTS.body2,
    textAlign: 'center',
  },
  constellationBackground: {
    width: '100%',
    height: 200,
    justifyContent: 'flex-end',
  },
  constellationContent: {
    padding: SPACING.l,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  constellationTitle: {
    fontSize: FONTS.h2,
    fontWeight: 'bold',
    color: COLORS.white,
    marginBottom: SPACING.xs,
  },
  constellationSubtitle: {
    fontSize: FONTS.body1,
    color: COLORS.white,
  },
  activitiesContainer: {
    padding: SPACING.l,
  },
  sectionTitle: {
    fontSize: FONTS.h3,
    fontWeight: 'bold',
    color: COLORS.white,
    marginBottom: SPACING.m,
  },
  activitiesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  activityCard: {
    width: '48%',
    backgroundColor: COLORS.card,
    borderRadius: SIZES.borderRadius,
    padding: SPACING.l,
    marginBottom: SPACING.m,
    alignItems: 'center',
  },
  activityIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: COLORS.gray800,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.m,
  },
  activityTitle: {
    fontSize: FONTS.body1,
    fontWeight: 'bold',
    color: COLORS.white,
    textAlign: 'center',
  },
  connectionCard: {
    marginHorizontal: SPACING.l,
    marginBottom: SPACING.l,
    padding: SPACING.l,
  },
  connectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.m,
  },
  connectionTitle: {
    fontSize: FONTS.h3,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  connectionIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  connectionPercentage: {
    fontSize: FONTS.body1,
    color: COLORS.gray300,
    marginBottom: SPACING.m,
  },
  progressBarContainer: {
    width: '100%',
    height: 8,
    backgroundColor: COLORS.gray700,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: COLORS.primary,
  },
  recentActivitiesContainer: {
    padding: SPACING.l,
    paddingTop: 0,
  },
  recentActivityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.m,
    marginBottom: SPACING.m,
  },
  recentActivityIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.gray800,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.m,
  },
  recentActivityContent: {
    flex: 1,
  },
  recentActivityTitle: {
    fontSize: FONTS.body2,
    fontWeight: 'bold',
    color: COLORS.white,
    marginBottom: SPACING.xs,
  },
  recentActivityTime: {
    fontSize: FONTS.caption,
    color: COLORS.gray500,
  },
});

export default HomeScreen; 