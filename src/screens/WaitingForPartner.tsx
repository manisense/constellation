import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Share,
  ActivityIndicator,
  Animated,
  Easing,
  Platform,
  Clipboard,
  Alert,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../types';
import { COLORS, FONTS, SPACING } from '../constants/theme';
import Screen from '../components/Screen';
import Button from '../components/Button';
import Card from '../components/Card';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../provider/AuthProvider';
import { supabase, signOut } from '../utils/supabase';

type WaitingForPartnerProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'WaitingForPartner'>;
  route: RouteProp<RootStackParamList, 'WaitingForPartner'>;
};

const WaitingForPartner: React.FC<WaitingForPartnerProps> = ({ navigation, route }) => {
  const { user, inviteCode: contextInviteCode, refreshUserStatus } = useAuth();
  const [copied, setCopied] = useState(false);
  const [subscription, setSubscription] = useState<any>(null);
  const [dots, setDots] = useState('.');
  const pulseAnim = new Animated.Value(1);
  
  // Get invite code from route params or context
  const inviteCode = route.params?.inviteCode || contextInviteCode;

  // Start pulsing animation
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.2,
          duration: 1000,
          easing: Easing.ease,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          easing: Easing.ease,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Animate the dots
    const dotsInterval = setInterval(() => {
      setDots(prev => {
        if (prev.length >= 3) return '.';
        return prev + '.';
      });
    }, 500);

    return () => clearInterval(dotsInterval);
  }, []);

  // Set up real-time subscription to check for partner joining
  useEffect(() => {
    if (!user) return;

    const setupSubscription = async () => {
      try {
        // Get user's constellation ID
        const { data: memberData, error: memberError } = await supabase
          .from('constellation_members')
          .select('constellation_id')
          .eq('user_id', user.id)
          .single();

        if (memberError || !memberData) {
          console.error('Error getting constellation membership:', memberError);
          return;
        }

        const constellationId = memberData.constellation_id;

        // Subscribe to changes in constellation_members table
        const newSubscription = supabase
          .channel(`constellation_members:constellation_id=eq.${constellationId}`)
          .on('postgres_changes', {
            event: 'INSERT',
            schema: 'public',
            table: 'constellation_members',
            filter: `constellation_id=eq.${constellationId}`
          }, (payload) => {
            // Check if a new member was added
            refreshUserStatus();
          })
          .subscribe();

        setSubscription(newSubscription);
      } catch (error) {
        console.error('Error setting up subscription:', error);
      }
    };

    setupSubscription();

    // Clean up subscription
    return () => {
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, [user]);

  // Periodically check status in case realtime fails
  useEffect(() => {
    const interval = setInterval(() => {
      refreshUserStatus();
    }, 10000); // Check every 10 seconds

    return () => clearInterval(interval);
  }, []);

  const handleCopyCode = () => {
    if (!inviteCode) return;
    
    if (Platform.OS === 'web') {
      navigator.clipboard.writeText(inviteCode);
    } else {
      Clipboard.setString(inviteCode);
    }
    
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShareCode = async () => {
    if (!inviteCode) return;
    
    try {
      await Share.share({
        message: `Join my constellation in the Constellation app! Use this invite code: ${inviteCode}`,
      });
    } catch (error) {
      console.error('Error sharing invite code:', error);
    }
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
      headerTitle="Waiting for Partner"
      showProfile={true}
      showNotification={true}
    >
      <View style={styles.container}>
        <View style={styles.content}>
          <Animated.View
            style={[
              styles.codeContainer,
              { transform: [{ scale: pulseAnim }] },
            ]}
          >
            <Card style={styles.codeCard}>
              <Text style={styles.codeLabel}>Your Invite Code</Text>
              <Text style={styles.code}>{inviteCode || '------'}</Text>
              <View style={styles.codeActions}>
                <TouchableOpacity
                  style={styles.codeAction}
                  onPress={handleCopyCode}
                >
                  <Ionicons
                    name={copied ? "checkmark-circle" : "copy-outline"}
                    size={20}
                    color={copied ? COLORS.success : COLORS.white}
                  />
                  <Text style={styles.codeActionText}>
                    {copied ? "Copied!" : "Copy"}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.codeAction}
                  onPress={handleShareCode}
                >
                  <Ionicons name="share-outline" size={20} color={COLORS.white} />
                  <Text style={styles.codeActionText}>Share</Text>
                </TouchableOpacity>
              </View>
            </Card>
          </Animated.View>

          <View style={styles.waitingContainer}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.waitingText}>
              Waiting for your partner to join{dots}
            </Text>
            <Text style={styles.waitingSubtext}>
              Once they join, you'll both take a personality quiz to discover your star types
            </Text>
          </View>
        </View>

        <View style={styles.footer}>
          <Button
            title="Refresh Status"
            onPress={refreshUserStatus}
            style={styles.refreshButton}
          />
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.navigate('CreateConstellation')}
          >
            <Text style={styles.backButtonText}>Create a Different Constellation</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Screen>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: SPACING.l,
    justifyContent: 'space-between',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  codeContainer: {
    width: '100%',
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  codeCard: {
    padding: SPACING.l,
    alignItems: 'center',
    width: '100%',
    maxWidth: 300,
  },
  codeLabel: {
    fontSize: FONTS.body2,
    color: COLORS.gray300,
    marginBottom: SPACING.s,
  },
  code: {
    fontSize: FONTS.h2,
    fontWeight: 'bold',
    color: COLORS.primary,
    letterSpacing: 4,
    marginBottom: SPACING.m,
  },
  codeActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
  },
  codeAction: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.s,
  },
  codeActionText: {
    color: COLORS.white,
    marginLeft: SPACING.xs,
    fontSize: FONTS.body2,
  },
  waitingContainer: {
    alignItems: 'center',
    marginTop: SPACING.xl,
  },
  waitingText: {
    fontSize: FONTS.h3,
    color: COLORS.white,
    marginTop: SPACING.m,
    marginBottom: SPACING.s,
    textAlign: 'center',
  },
  waitingSubtext: {
    fontSize: FONTS.body2,
    color: COLORS.gray300,
    textAlign: 'center',
    maxWidth: 300,
  },
  footer: {
    marginTop: SPACING.xl,
    alignItems: 'center',
  },
  refreshButton: {
    marginBottom: SPACING.m,
  },
  backButton: {
    padding: SPACING.s,
  },
  backButtonText: {
    color: COLORS.primary,
    fontSize: FONTS.body2,
  },
});

export default WaitingForPartner; 