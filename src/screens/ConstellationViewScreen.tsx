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
import { db } from '../services/firebase';
import { doc, getDoc, collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { StarType } from '../types';

type ConstellationViewScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'ConstellationView'>;
};

const ConstellationViewScreen: React.FC<ConstellationViewScreenProps> = () => {
  const [constellationName, setConstellationName] = useState('');
  const [bondingStrength, setBondingStrength] = useState(0);
  const [userStarType, setUserStarType] = useState<StarType | null>(null);
  const [partnerStarType, setPartnerStarType] = useState<StarType | null>(null);
  const [userName, setUserName] = useState('');
  const [partnerName, setPartnerName] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadConstellationData();
  }, []);

  const loadConstellationData = async () => {
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
        
        setUserName(userData.name || 'You');
        setUserStarType(userData.starType);

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
            }
          }
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
    <Screen>
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