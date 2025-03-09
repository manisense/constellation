import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  Animated,
  Easing,
  Alert,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { COLORS, FONTS, SPACING, SIZES } from '../constants/theme';
import Screen from '../components/Screen';
import Button from '../components/Button';
import Card from '../components/Card';
import { db } from '../services/firebase';
import { doc, getDoc, updateDoc, collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { StarType } from '../types';

type StarRevealScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'StarReveal'>;
};

const StarRevealScreen: React.FC<StarRevealScreenProps> = ({ navigation }) => {
  const [starType, setStarType] = useState<StarType | null>(null);
  const [starName, setStarName] = useState('');
  const [partnerStarType, setPartnerStarType] = useState<StarType | null>(null);
  const [partnerStarName, setPartnerStarName] = useState('');
  const [partnerName, setPartnerName] = useState('');
  const [constellationName, setConstellationName] = useState('');
  const [loading, setLoading] = useState(true);
  const [bothCompleted, setBothCompleted] = useState(false);
  const [constellationId, setConstellationId] = useState<string | null>(null);

  // Animation values
  const userStarScale = new Animated.Value(0);
  const userStarOpacity = new Animated.Value(0);
  const textOpacity = new Animated.Value(0);
  const partnerStarOpacity = new Animated.Value(0);
  const partnerStarScale = new Animated.Value(0);
  const constellationOpacity = new Animated.Value(0);

  useEffect(() => {
    loadUserData();
  }, []);

  useEffect(() => {
    if (starType) {
      // Start animations
      Animated.sequence([
        Animated.timing(userStarOpacity, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.parallel([
          Animated.timing(userStarScale, {
            toValue: 1,
            duration: 1000,
            easing: Easing.bounce,
            useNativeDriver: true,
          }),
          Animated.timing(textOpacity, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ]),
      ]).start();

      // If partner has completed quiz, show their star too
      if (partnerStarType) {
        Animated.sequence([
          Animated.delay(2000),
          Animated.parallel([
            Animated.timing(partnerStarOpacity, {
              toValue: 1,
              duration: 1000,
              useNativeDriver: true,
            }),
            Animated.timing(partnerStarScale, {
              toValue: 1,
              duration: 1000,
              easing: Easing.bounce,
              useNativeDriver: true,
            }),
          ]),
          Animated.delay(1000),
          Animated.timing(constellationOpacity, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ]).start();
      }
    }
  }, [starType, partnerStarType]);

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
        
        setStarType(userData.starType);
        setStarName(userData.starName || '');
        setConstellationId(userData.constellationId);

        if (userData.constellationId) {
          // Get constellation data
          const constellationDoc = await getDoc(doc(db, 'constellations', userData.constellationId));
          if (constellationDoc.exists()) {
            const constellationData = constellationDoc.data();
            setConstellationName(constellationData.name || 'Your Constellation');
            
            // Find partner
            const partnerIds = constellationData.partnerIds || [];
            const partnerId = partnerIds.find((id: string) => id !== userId);
            
            if (partnerId) {
              // Get partner data
              const partnerDoc = await getDoc(doc(db, 'users', partnerId));
              if (partnerDoc.exists()) {
                const partnerData = partnerDoc.data();
                setPartnerStarType(partnerData.starType);
                setPartnerName(partnerData.name || 'Your Partner');
                
                // Check if both have completed the quiz
                if (userData.starType && partnerData.starType) {
                  setBothCompleted(true);
                  
                  // Generate constellation name
                  if (userData.starType && partnerData.starType) {
                    const name = generateConstellationName(userData.starType, partnerData.starType);
                    setConstellationName(name);
                    
                    // Update constellation name in Firestore
                    await updateDoc(doc(db, 'constellations', userData.constellationId), {
                      name,
                    });
                  }
                  
                  // Start animations
                  startAnimations();
                }
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateConstellationName = (userStarType: StarType, partnerStarType: StarType): string => {
    // Generate a constellation name based on star types
    if (userStarType === StarType.LUMINARY && partnerStarType === StarType.NAVIGATOR) {
      return 'Celestial Voyagers';
    } else if (userStarType === StarType.NAVIGATOR && partnerStarType === StarType.LUMINARY) {
      return 'Celestial Voyagers';
    } else if (userStarType === StarType.LUMINARY && partnerStarType === StarType.LUMINARY) {
      return 'Radiant Twins';
    } else {
      return 'Guiding Twins';
    }
  };

  const handleContinue = () => {
    navigation.navigate('Home');
  };

  const renderStarDescription = (type: StarType) => {
    if (type === StarType.LUMINARY) {
      return (
        <Text style={styles.starDescription}>
          As a <Text style={styles.highlightText}>Luminary</Text>, you shine with optimism and creativity. 
          You inspire others with your vision and bring warmth to your relationships.
        </Text>
      );
    } else {
      return (
        <Text style={styles.starDescription}>
          As a <Text style={styles.highlightText}>Navigator</Text>, you guide with wisdom and stability. 
          You provide direction and thoughtful analysis to help navigate life's journey.
        </Text>
      );
    }
  };

  const getStarImage = (type: StarType) => {
    if (type === StarType.LUMINARY) {
      return require('../assets/images/luminary-star.png');
    } else {
      return require('../assets/images/navigator-star.png');
    }
  };

  const renderYourStar = () => {
    if (!starType) return null;

    return (
      <View style={styles.starContainer}>
        <Animated.View
          style={[
            styles.starImageContainer,
            {
              opacity: userStarOpacity,
              transform: [{ scale: userStarScale.interpolate({
                inputRange: [0, 1],
                outputRange: [0.5, 1]
              }) }]
            }
          ]}
        >
          <Image
            source={getStarImage(starType)}
            style={[
              styles.starImage,
              { tintColor: starType === StarType.LUMINARY ? COLORS.luminary : COLORS.navigator }
            ]}
            resizeMode="contain"
          />
          <Text style={styles.starNameText}>{starName}</Text>
        </Animated.View>

        <Animated.View style={{ opacity: textOpacity }}>
          <Text style={styles.starTypeText}>
            You are a {starType === StarType.LUMINARY ? 'Luminary' : 'Navigator'}
          </Text>
          {renderStarDescription(starType)}
        </Animated.View>
      </View>
    );
  };

  const renderPartnerStar = () => {
    if (!partnerStarType) return null;

    return (
      <Animated.View
        style={[
          styles.partnerStarContainer,
          {
            opacity: partnerStarOpacity,
          }
        ]}
      >
        <Text style={styles.partnerLabel}>{partnerName}'s Star</Text>
        <Animated.View
          style={[
            styles.partnerStarImageContainer,
            {
              transform: [{ scale: partnerStarScale.interpolate({
                inputRange: [0, 1],
                outputRange: [0.5, 1]
              }) }]
            }
          ]}
        >
          <Image
            source={getStarImage(partnerStarType)}
            style={[
              styles.partnerStarImage,
              { tintColor: partnerStarType === StarType.LUMINARY ? COLORS.luminary : COLORS.navigator }
            ]}
            resizeMode="contain"
          />
          <Text style={styles.partnerStarNameText}>{partnerStarName}</Text>
        </Animated.View>
        <Text style={styles.partnerStarTypeText}>
          {partnerName} is a {partnerStarType === StarType.LUMINARY ? 'Luminary' : 'Navigator'}
        </Text>
      </Animated.View>
    );
  };

  const renderConstellation = () => {
    if (!bothCompleted) return null;

    return (
      <Animated.View
        style={[
          styles.constellationContainer,
          { opacity: constellationOpacity }
        ]}
      >
        <Text style={styles.constellationTitle}>Your Constellation</Text>
        <Text style={styles.constellationName}>{constellationName}</Text>
        <Image
          source={require('../assets/images/constellation.png')}
          style={styles.constellationImage}
          resizeMode="contain"
        />
        <Text style={styles.constellationDescription}>
          Together, you form a unique celestial bond that combines your strengths.
          Continue your journey to strengthen your constellation.
        </Text>
      </Animated.View>
    );
  };

  const renderWaitingForPartner = () => {
    if (bothCompleted || !starType) return null;

    return (
      <Card style={styles.waitingCard}>
        <Text style={styles.waitingTitle}>Waiting for Partner</Text>
        <Text style={styles.waitingDescription}>
          Your partner hasn't completed their quiz yet. Once they do,
          you'll be able to see your complete constellation.
        </Text>
      </Card>
    );
  };

  const startAnimations = () => {
    // Start animations
    Animated.sequence([
      Animated.parallel([
        Animated.timing(userStarScale, {
          toValue: 1,
          duration: 1000,
          easing: Easing.bounce,
          useNativeDriver: true,
        }),
        Animated.timing(userStarOpacity, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ]),
      Animated.delay(500),
      Animated.parallel([
        Animated.timing(partnerStarScale, {
          toValue: 1,
          duration: 1000,
          easing: Easing.bounce,
          useNativeDriver: true,
        }),
        Animated.timing(partnerStarOpacity, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ]),
      Animated.delay(1000),
      Animated.timing(constellationOpacity, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
    ]).start();
  };

  return (
    <Screen>
      <View style={styles.container}>
        <Text style={styles.title}>Your Star Type</Text>
        
        {renderYourStar()}
        {renderPartnerStar()}
        {renderConstellation()}
        {renderWaitingForPartner()}

        <View style={styles.buttonContainer}>
          <Button
            title="Continue to Home"
            onPress={handleContinue}
            style={styles.button}
          />
        </View>
      </View>
    </Screen>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: SPACING.l,
    alignItems: 'center',
  },
  title: {
    fontSize: FONTS.h2,
    fontWeight: 'bold',
    color: COLORS.white,
    marginBottom: SPACING.xl,
    textAlign: 'center',
  },
  starContainer: {
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  starImageContainer: {
    alignItems: 'center',
    marginBottom: SPACING.l,
  },
  starImage: {
    width: 120,
    height: 120,
  },
  starNameText: {
    fontSize: FONTS.body1,
    fontWeight: 'bold',
    color: COLORS.white,
    marginTop: SPACING.s,
  },
  starTypeText: {
    fontSize: FONTS.h3,
    fontWeight: 'bold',
    color: COLORS.white,
    marginBottom: SPACING.m,
    textAlign: 'center',
  },
  starDescription: {
    fontSize: FONTS.body1,
    color: COLORS.gray300,
    textAlign: 'center',
    paddingHorizontal: SPACING.l,
    lineHeight: 24,
  },
  highlightText: {
    color: COLORS.accent,
    fontWeight: 'bold',
  },
  partnerStarContainer: {
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  partnerLabel: {
    fontSize: FONTS.body2,
    color: COLORS.gray300,
    marginBottom: SPACING.s,
  },
  partnerStarImageContainer: {
    alignItems: 'center',
    marginBottom: SPACING.m,
  },
  partnerStarImage: {
    width: 80,
    height: 80,
  },
  partnerStarNameText: {
    fontSize: FONTS.body2,
    color: COLORS.white,
    marginTop: SPACING.xs,
  },
  partnerStarTypeText: {
    fontSize: FONTS.body1,
    color: COLORS.white,
    textAlign: 'center',
  },
  constellationContainer: {
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  constellationTitle: {
    fontSize: FONTS.body1,
    color: COLORS.gray300,
    marginBottom: SPACING.xs,
  },
  constellationName: {
    fontSize: FONTS.h3,
    fontWeight: 'bold',
    color: COLORS.accent,
    marginBottom: SPACING.m,
  },
  constellationImage: {
    width: '100%',
    height: 150,
    marginBottom: SPACING.m,
  },
  constellationDescription: {
    fontSize: FONTS.body2,
    color: COLORS.gray300,
    textAlign: 'center',
    paddingHorizontal: SPACING.l,
    lineHeight: 22,
  },
  waitingCard: {
    width: '100%',
    marginBottom: SPACING.xl,
    padding: SPACING.m,
  },
  waitingTitle: {
    fontSize: FONTS.body1,
    fontWeight: 'bold',
    color: COLORS.white,
    marginBottom: SPACING.s,
  },
  waitingDescription: {
    fontSize: FONTS.body2,
    color: COLORS.gray300,
    lineHeight: 20,
  },
  buttonContainer: {
    width: '100%',
    marginTop: 'auto',
  },
  button: {
    marginBottom: SPACING.m,
  },
});

export default StarRevealScreen; 