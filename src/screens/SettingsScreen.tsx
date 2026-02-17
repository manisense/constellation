import React, { useEffect, useState } from 'react';
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
import {
  getNotificationPreferences,
  requestAccountDeletion,
  requestAccountExport,
  setNotificationPreferences,
} from '../utils/supabase';
import { Ionicons, MaterialIcons, Feather } from '@expo/vector-icons';
import { useAuth } from '../provider/AuthProvider';

type SettingsScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Settings'>;
};

const SettingsScreen: React.FC<SettingsScreenProps> = ({ navigation }) => {
  const [loading, setLoading] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(true);
  const [emailEnabled, setEmailEnabled] = useState(true);
  const { user, signOut } = useAuth();

  useEffect(() => {
    let isMounted = true;

    const loadNotificationPreferences = async () => {
      try {
        const data = await getNotificationPreferences();
        if (!isMounted) {
          return;
        }

        setPushEnabled(data.push_enabled);
        setEmailEnabled(data.email_enabled);
      } catch (error) {
        console.error('Failed to load notification preferences:', error);
      }
    };

    loadNotificationPreferences();

    return () => {
      isMounted = false;
    };
  }, []);

  const updateNotificationPreference = async (
    type: 'push' | 'email',
    nextValue: boolean
  ) => {
    try {
      setLoading(true);

      const data = await setNotificationPreferences({
        pushEnabled: type === 'push' ? nextValue : undefined,
        emailEnabled: type === 'email' ? nextValue : undefined,
      });

      setPushEnabled(data.push_enabled);
      setEmailEnabled(data.email_enabled);
    } catch (error) {
      console.error(`Failed to update ${type} notification preference:`, error);
      Alert.alert('Error', `Failed to update ${type} notifications. Please try again.`);
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

              await requestAccountDeletion();

              Alert.alert(
                'Deletion Requested',
                'Your account deletion request has been submitted and will be processed securely.'
              );
            } catch (error: any) {
              console.error('Account deletion error:', error);

              Alert.alert('Error', 'Failed to request account deletion. Please try again.');
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
            onPress={() => updateNotificationPreference('push', !pushEnabled)}
          >
            <View style={styles.optionRow}>
              <Ionicons name="notifications-outline" size={24} color={COLORS.white} style={styles.optionIcon} />
              <Text style={styles.optionText}>Push Notifications</Text>
            </View>
            <Text style={styles.statusText}>{pushEnabled ? 'On' : 'Off'}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.option}
            onPress={() => updateNotificationPreference('email', !emailEnabled)}
          >
            <View style={styles.optionRow}>
              <MaterialIcons name="mail-outline" size={24} color={COLORS.white} style={styles.optionIcon} />
              <Text style={styles.optionText}>Email Notifications</Text>
            </View>
            <Text style={styles.statusText}>{emailEnabled ? 'On' : 'Off'}</Text>
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

        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Privacy & Data</Text>
          <TouchableOpacity
            style={styles.option}
            onPress={async () => {
              try {
                setLoading(true);
                await requestAccountExport();
                Alert.alert('Export Requested', 'We will prepare your private data export and notify you when it is ready.');
              } catch (error) {
                Alert.alert('Error', 'Failed to request data export. Please try again.');
              } finally {
                setLoading(false);
              }
            }}
          >
            <View style={styles.optionRow}>
              <Feather name="download" size={24} color={COLORS.white} style={styles.optionIcon} />
              <Text style={styles.optionText}>Request Data Export</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={COLORS.gray300} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.option}
            onPress={handleDeleteAccount}
          >
            <View style={styles.optionRow}>
              <Feather name="trash-2" size={24} color={COLORS.error} style={styles.optionIcon} />
              <Text style={[styles.optionText, { color: COLORS.error }]}>Request Account Deletion</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={COLORS.gray300} />
          </TouchableOpacity>
        </Card>

        <View style={styles.bottomSection}>
          <TouchableOpacity
            style={styles.signOutButton}
            onPress={() => {
              setLoading(true);
              signOut(navigation)
                .catch(error => {
                  console.error('Error during sign out:', error);
                  Alert.alert('Error', 'Failed to sign out. Please try again.');
                })
                .finally(() => setLoading(false));
            }}
          >
            <Ionicons name="log-out-outline" size={20} color={COLORS.white} style={styles.buttonIcon} />
            <Text style={styles.signOutText}>Sign Out</Text>
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
  statusText: {
    fontSize: FONTS.body2,
    color: COLORS.gray300,
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