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
import { supabase } from '../utils/supabase';
import { StarType } from '../types';
import { useAuth } from '../hooks/useAuth';

type StarRevealScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'StarReveal'>;
};

const StarRevealScreen: React.FC<StarRevealScreenProps> = ({ navigation }) => {
  const { user } = useAuth();
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
    if (user) {
      loadUserData();
    }
  }, [user]);

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
    if (!user) return;
    
    try {
      // Get user profile data
      const { data: userData, error: userError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      
      if (userError) throw userError;
      
      setStarType(userData.starType);
      setStarName(userData.starName || '');
      
      // Get user's constellation membership
      const { data: memberData, error: memberError } = await supabase
        .from('constellation_members')
        .select('constellation_id')
        .eq('user_id', user.id)
        .single();
      
      if (memberError) {
        // User doesn't have a constellation yet
        setLoading(false);
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
            setPartnerStarType(partnerData.starType);
            setPartnerName(partnerData.name || 'Your Partner');
            
            // Check if both have completed the quiz
            if (userData.starType && partnerData.starType) {
              setBothCompleted(true);
              
              // Generate constellation name
              if (userData.starType && partnerData.starType) {
                const name = generateConstellationName(userData.starType, partnerData.starType);
                setConstellationName(name);
                
                // Update constellation name in Supabase
                await supabase
                  .from('constellations')
                  .update({ name })
                  .eq('id', memberData.constellation_id);
              }
              
              // Start animations
              startAnimations();
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