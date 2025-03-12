import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  Alert,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { COLORS, FONTS, SPACING } from '../constants/theme';
import Screen from '../components/Screen';
import Button from '../components/Button';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../provider/AuthProvider';
import { signOut } from '../utils/supabase';

type OnboardingScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Onboarding'>;
};

const OnboardingScreen: React.FC<OnboardingScreenProps> = ({ navigation }) => {
  const { user, refreshUserStatus } = useAuth();

  // Check if user is authenticated
  useEffect(() => {
    if (!user) {
      console.log("OnboardingScreen: No authenticated user, redirecting to Welcome");
      // Use navigate instead of reset to avoid navigation errors
      navigation.navigate('Welcome');
    } else {
      console.log("OnboardingScreen: User is authenticated");
    }
  }, [user, navigation]);

  const handleCreateConstellation = () => {
    if (!user) {
      console.log("Cannot create constellation: No authenticated user");
      navigation.navigate('Welcome');
      return;
    }
    navigation.navigate('CreateConstellation');
  };

  const handleJoinConstellation = () => {
    if (!user) {
      console.log("Cannot join constellation: No authenticated user");
      navigation.navigate('Welcome');
      return;
    }
    navigation.navigate('JoinConstellation');
  };

  const handleSignOut = async () => {
    Alert.alert(
      "Sign Out",
      "Are you sure you want to sign out?",
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        {
          text: "Sign Out",
          onPress: async () => {
            try {
              console.log("Signing out...");
              const { error } = await signOut();
              if (error) {
                console.error("Error signing out:", error);
                Alert.alert("Error", "Failed to sign out. Please try again.");
              } else {
                console.log("Successfully signed out");
                // Navigation will be handled by the AuthProvider
              }
            } catch (error) {
              console.error("Exception during sign out:", error);
              Alert.alert("Error", "An unexpected error occurred. Please try again.");
            }
          }
        }
      ]
    );
  };

  return (
    <Screen 
      showHeader={true} 
      headerTitle="Constellation"
      showProfile={true}
      showNotification={true}
      scrollable={true}
    >
      <View style={styles.container}>
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
      </View>
      <View style={styles.bottomSection}>
          <TouchableOpacity
            style={styles.signOutButton}
            onPress={handleSignOut}
          >
            <Ionicons name="log-out-outline" size={20} color={COLORS.white} style={styles.buttonIcon} />
            <Text style={styles.signOutText}>Sign Out</Text>
          </TouchableOpacity>
        </View>
    </Screen>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    marginTop: SPACING.xl,
    marginBottom: SPACING.xl,
    position: 'relative',
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
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  optionIcon: {
    marginRight: SPACING.m,
  },
  optionText: {
    fontSize: FONTS.body1,
    color: COLORS.white,
  },
  bottomSection: {
    marginTop: 'auto',
  },
  signOutButton: {
    flexDirection: 'row',
    backgroundColor: COLORS.primary,
    padding: SPACING.m,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.m,
  },
  buttonIcon: {
    marginRight: SPACING.s,
  },
  signOutText: {
    color: COLORS.white,
    fontSize: FONTS.body1,
    fontWeight: 'bold',
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