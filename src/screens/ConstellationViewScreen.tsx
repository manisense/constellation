import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  ScrollView,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { COLORS, FONTS, SPACING } from '../constants/theme';
import Screen from '../components/Screen';
import Card from '../components/Card';
import { supabase } from '../utils/supabase';
import { StarType } from '../types';
import { useAuth } from '../hooks/useAuth';

type ConstellationViewScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'ConstellationView'>;
};

const ConstellationViewScreen: React.FC<ConstellationViewScreenProps> = () => {
  const { user } = useAuth();
  const [constellationName, setConstellationName] = useState('');
  const [bondingStrength, setBondingStrength] = useState(0);
  const [userStarType, setUserStarType] = useState<StarType | null>(null);
  const [partnerStarType, setPartnerStarType] = useState<StarType | null>(null);
  const [userName, setUserName] = useState('');
  const [partnerName, setPartnerName] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadConstellationData();
    }
  }, [user]);

  const loadConstellationData = async () => {
    if (!user) return;
    
    try {
      // Get user profile from Supabase
      const { data: userData, error: userError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      
      if (userError) throw userError;
      
      setUserName(userData.name || 'You');
      setUserStarType(userData.starType);

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
        // Get constellation data
        const { data: constellationData, error: constellationError } = await supabase
          .from('constellations')
          .select('*')
          .eq('id', memberData.constellation_id)
          .single();
        
        if (constellationError) throw constellationError;
        
        setConstellationName(constellationData.name || 'Your Constellation');
        setBondingStrength(constellationData.bonding_strength || 0);
        
        // Find partner (other members of the constellation)
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
            
          if (partnerError) throw partnerError;
          
          setPartnerName(partnerData.name || 'Partner');
          setPartnerStarType(partnerData.starType);
        }
      }
    } catch (error) {
      console.error('Error loading constellation data:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderStarDescription = (type: StarType) => {
    if (type === StarType.LUMINARY) {
      return 'Luminaries are natural leaders who inspire and energize others. They bring creativity and optimism to relationships.';
    } else {
      return 'Navigators are thoughtful guides who provide stability and wisdom. They excel at analyzing situations and finding solutions.';
    }
  };

  return (
    <Screen showHeader={true} headerTitle="Constellation">
      <ScrollView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>{constellationName}</Text>
          <Text style={styles.subtitle}>
            Bonding Strength: {bondingStrength}%
          </Text>
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
          <Card style={styles.starCard}>
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
            <Text style={styles.starDescription}>
              {userStarType && renderStarDescription(userStarType)}
            </Text>
          </Card>

          <Card style={styles.starCard}>
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
            <Text style={styles.starDescription}>
              {partnerStarType && renderStarDescription(partnerStarType)}
            </Text>
          </Card>
        </View>

        <Card style={styles.infoCard}>
          <Text style={styles.infoTitle}>Your Celestial Bond</Text>
          <Text style={styles.infoText}>
            Together, you form a unique constellation that combines your individual strengths.
            Complete daily activities and maintain regular communication to strengthen your bond.
          </Text>
        </Card>
      </ScrollView>
    </Screen>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: SPACING.l,
    alignItems: 'center',
  },
  title: {
    fontSize: FONTS.h2,
    fontWeight: 'bold',
    color: COLORS.white,
    marginBottom: SPACING.xs,
  },
  subtitle: {
    fontSize: FONTS.body1,
    color: COLORS.gray300,
    marginBottom: SPACING.m,
  },
  strengthIndicator: {
    width: '100%',
    height: 8,
    backgroundColor: COLORS.gray700,
    borderRadius: 4,
    overflow: 'hidden',
  },
  strengthFill: {
    height: '100%',
    backgroundColor: COLORS.accent,
  },
  starsContainer: {
    padding: SPACING.l,
  },
  starCard: {
    marginBottom: SPACING.l,
    alignItems: 'center',
    padding: SPACING.l,
  },
  starImage: {
    width: 100,
    height: 100,
    marginBottom: SPACING.m,
  },
  starName: {
    fontSize: FONTS.h3,
    fontWeight: 'bold',
    color: COLORS.white,
    marginBottom: SPACING.xs,
  },
  starType: {
    fontSize: FONTS.body1,
    color: COLORS.accent,
    marginBottom: SPACING.m,
  },
  starDescription: {
    fontSize: FONTS.body2,
    color: COLORS.gray300,
    textAlign: 'center',
    lineHeight: 22,
  },
  infoCard: {
    margin: SPACING.l,
    padding: SPACING.l,
  },
  infoTitle: {
    fontSize: FONTS.h4,
    fontWeight: 'bold',
    color: COLORS.white,
    marginBottom: SPACING.m,
    textAlign: 'center',
  },
  infoText: {
    fontSize: FONTS.body2,
    color: COLORS.gray300,
    textAlign: 'center',
    lineHeight: 22,
  },
});

export default ConstellationViewScreen; 