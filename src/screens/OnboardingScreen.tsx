import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { COLORS, FONTS, SPACING } from '../constants/theme';
import Screen from '../components/Screen';
import Button from '../components/Button';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../provider/AuthProvider';

type OnboardingScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Onboarding'>;
};

const OnboardingScreen: React.FC<OnboardingScreenProps> = ({ navigation }) => {
  const { user } = useAuth();

  // Check if user is authenticated
  useEffect(() => {
    if (!user) {
      console.log("OnboardingScreen: No authenticated user, redirecting to Welcome");
      navigation.reset({
        index: 0,
        routes: [{ name: 'Welcome' }],
      });
    } else {
      console.log("OnboardingScreen: User is authenticated");
    }
  }, [user, navigation]);

  const handleCreateConstellation = () => {
    if (!user) {
      console.log("Cannot create constellation: No authenticated user");
      navigation.reset({
        index: 0,
        routes: [{ name: 'Welcome' }],
      });
      return;
    }
    navigation.navigate('CreateConstellation');
  };

  const handleJoinConstellation = () => {
    if (!user) {
      console.log("Cannot join constellation: No authenticated user");
      navigation.reset({
        index: 0,
        routes: [{ name: 'Welcome' }],
      });
      return;
    }
    navigation.navigate('JoinConstellation');
  };

  return (
    <Screen>
      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
        <View style={styles.header}>
          <Text style={styles.title}>Welcome to Constellation</Text>
          <Text style={styles.subtitle}>
            Connect with your partner and discover your cosmic bond
          </Text>
        </View>

        <View style={styles.stepsContainer}>
          <View style={styles.step}>
            <View style={styles.stepIconContainer}>
              <Ionicons name="star" size={24} color={COLORS.primary} />
              <Text style={styles.stepNumber}>1</Text>
            </View>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>Discover Your Star Type</Text>
              <Text style={styles.stepDescription}>
                Take a personality quiz to find out if you're a Luminary (bright, energetic) 
                or Navigator (thoughtful, guiding).
              </Text>
            </View>
          </View>

          <View style={styles.step}>
            <View style={styles.stepIconContainer}>
              <Ionicons name="people" size={24} color={COLORS.primary} />
              <Text style={styles.stepNumber}>2</Text>
            </View>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>Form Your Constellation</Text>
              <Text style={styles.stepDescription}>
                Connect with your partner to create a unique constellation that 
                represents your relationship.
              </Text>
            </View>
          </View>

          <View style={styles.step}>
            <View style={styles.stepIconContainer}>
              <Ionicons name="heart" size={24} color={COLORS.primary} />
              <Text style={styles.stepNumber}>3</Text>
            </View>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>Strengthen Your Bond</Text>
              <Text style={styles.stepDescription}>
                Complete activities together, chat, and watch your constellation 
                grow brighter as your connection deepens.
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.imageContainer}>
          <Image
            source={require('../assets/images/constellation-preview.png')}
            style={styles.image}
            resizeMode="contain"
          />
        </View>

        <View style={styles.optionsContainer}>
          <Text style={styles.optionsTitle}>Ready to Begin?</Text>
          
          <Button
            title="Create a New Constellation"
            onPress={handleCreateConstellation}
            style={styles.createButton}
          />
          
          <Text style={styles.orText}>OR</Text>
          
          <Button
            title="Join with Invite Code"
            onPress={handleJoinConstellation}
            style={styles.joinButton}
          />
        </View>
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
  header: {
    alignItems: 'center',
    marginTop: SPACING.xl,
    marginBottom: SPACING.xl,
  },
  title: {
    fontSize: FONTS.h1,
    fontWeight: 'bold',
    color: COLORS.white,
    marginBottom: SPACING.s,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: FONTS.body1,
    color: COLORS.gray300,
    textAlign: 'center',
  },
  stepsContainer: {
    marginBottom: SPACING.xl,
  },
  step: {
    flexDirection: 'row',
    marginBottom: SPACING.l,
  },
  stepIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.gray800,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.m,
  },
  stepNumber: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: COLORS.accent,
    width: 20,
    height: 20,
    borderRadius: 10,
    textAlign: 'center',
    fontSize: FONTS.caption,
    fontWeight: 'bold',
    color: COLORS.white,
    lineHeight: 20,
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: FONTS.h4,
    fontWeight: 'bold',
    color: COLORS.white,
    marginBottom: SPACING.xs,
  },
  stepDescription: {
    fontSize: FONTS.body2,
    color: COLORS.gray300,
    lineHeight: 20,
  },
  imageContainer: {
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  image: {
    width: '100%',
    height: 200,
  },
  optionsContainer: {
    alignItems: 'center',
  },
  optionsTitle: {
    fontSize: FONTS.h3,
    fontWeight: 'bold',
    color: COLORS.white,
    marginBottom: SPACING.l,
    textAlign: 'center',
  },
  createButton: {
    marginBottom: SPACING.m,
    width: '100%',
  },
  orText: {
    fontSize: FONTS.body2,
    color: COLORS.gray300,
    marginVertical: SPACING.s,
  },
  joinButton: {
    marginTop: SPACING.s,
    width: '100%',
    backgroundColor: COLORS.secondary,
  },
});

export default OnboardingScreen; 