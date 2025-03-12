import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { COLORS, FONTS, SPACING, SIZES } from '../constants/theme';
import Screen from '../components/Screen';
import Card from '../components/Card';
import { signOut, supabase } from '../services/supabase';
import { Ionicons, MaterialIcons, Feather } from '@expo/vector-icons';
import { useAuth } from '../hooks/useAuth';

type SettingsScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Settings'>;
};

const SettingsScreen: React.FC<SettingsScreenProps> = ({ navigation }) => {
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  const handleSignOut = async () => {
    try {
      setLoading(true);
      const { error } = await signOut();
      if (error) throw error;
      
      // Use a timeout to ensure the signOut process completes
      setTimeout(() => {
        // Reset navigation to Welcome screen
        navigation.reset({
          index: 0,
          routes: [{ name: 'Welcome' }],
        });
      }, 500);
    } catch (error: any) {
      console.error('Sign out error:', error);
      Alert.alert(
        'Sign Out Error', 
        'Failed to sign out. Please try again. If the problem persists, restart the app.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'Are you sure you want to delete your account? This action cannot be undone.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              if (!user) {
                throw new Error('No user is currently signed in');
              }

              // Delete user data from Supabase profiles table
              const { error: profileError } = await supabase
                .from('profiles')
                .delete()
                .eq('id', user.id);
                
              if (profileError) {
                console.error('Error deleting user profile:', profileError);
                // Continue with account deletion even if profile deletion fails
              }

              // Delete the user account
              const { error } = await supabase.auth.admin.deleteUser(user.id);
              if (error) throw error;
              
              // Navigate to welcome screen
              navigation.reset({
                index: 0,
                routes: [{ name: 'Welcome' }],
              });
            } catch (error: any) {
              console.error('Account deletion error:', error);
              
              let errorMessage = 'Failed to delete account. Please try again.';
              if (error.message && error.message.includes('recent login')) {
                errorMessage = 'For security reasons, please sign out and sign in again before deleting your account.';
              }
              
              Alert.alert('Error', errorMessage);
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  return (
    <Screen showHeader={true} headerTitle="Settings">
      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      )}
      
      <View style={styles.container}>
        <Text style={styles.title}>Settings</Text>

        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          <TouchableOpacity
            style={styles.option}
            onPress={() => navigation.navigate('Profile')}
          >
            <View style={styles.optionRow}>
              <Ionicons name="person-outline" size={24} color={COLORS.white} style={styles.optionIcon} />
              <Text style={styles.optionText}>Edit Profile</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={COLORS.gray300} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.option}
            onPress={() => Alert.alert('Coming Soon', 'This feature will be available soon!')}
          >
            <View style={styles.optionRow}>
              <Ionicons name="key-outline" size={24} color={COLORS.white} style={styles.optionIcon} />
              <Text style={styles.optionText}>Change Password</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={COLORS.gray300} />
          </TouchableOpacity>
        </Card>

        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Notifications</Text>
          <TouchableOpacity
            style={styles.option}
            onPress={() => Alert.alert('Coming Soon', 'This feature will be available soon!')}
          >
            <View style={styles.optionRow}>
              <Ionicons name="notifications-outline" size={24} color={COLORS.white} style={styles.optionIcon} />
              <Text style={styles.optionText}>Push Notifications</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={COLORS.gray300} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.option}
            onPress={() => Alert.alert('Coming Soon', 'This feature will be available soon!')}
          >
            <View style={styles.optionRow}>
              <MaterialIcons name="mail-outline" size={24} color={COLORS.white} style={styles.optionIcon} />
              <Text style={styles.optionText}>Email Notifications</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={COLORS.gray300} />
          </TouchableOpacity>
        </Card>

        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Support</Text>
          <TouchableOpacity
            style={styles.option}
            onPress={() => Alert.alert('Coming Soon', 'This feature will be available soon!')}
          >
            <View style={styles.optionRow}>
              <Feather name="help-circle" size={24} color={COLORS.white} style={styles.optionIcon} />
              <Text style={styles.optionText}>Help Center</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={COLORS.gray300} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.option}
            onPress={() => Alert.alert('Coming Soon', 'This feature will be available soon!')}
          >
            <View style={styles.optionRow}>
              <Feather name="message-circle" size={24} color={COLORS.white} style={styles.optionIcon} />
              <Text style={styles.optionText}>Contact Us</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={COLORS.gray300} />
          </TouchableOpacity>
        </Card>

        <View style={styles.bottomSection}>
          <TouchableOpacity
            style={styles.signOutButton}
            onPress={handleSignOut}
          >
            <Ionicons name="log-out-outline" size={20} color={COLORS.white} style={styles.buttonIcon} />
            <Text style={styles.signOutText}>Sign Out</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.deleteAccountButton}
            onPress={handleDeleteAccount}
          >
            <Feather name="trash-2" size={20} color={COLORS.error} style={styles.buttonIcon} />
            <Text style={styles.deleteAccountText}>Delete Account</Text>
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
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  title: {
    fontSize: FONTS.h2,
    fontWeight: 'bold',
    color: COLORS.white,
    marginBottom: SPACING.xl,
  },
  section: {
    marginBottom: SPACING.l,
  },
  sectionTitle: {
    fontSize: FONTS.h4,
    fontWeight: 'bold',
    color: COLORS.white,
    marginBottom: SPACING.m,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING.m,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray700,
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
  deleteAccountButton: {
    flexDirection: 'row',
    backgroundColor: 'transparent',
    padding: SPACING.m,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.error,
  },
  deleteAccountText: {
    color: COLORS.error,
    fontSize: FONTS.body1,
    fontWeight: 'bold',
  },
});

export default SettingsScreen; 