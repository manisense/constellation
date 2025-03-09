import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { COLORS, FONTS, SPACING, SIZES } from '../constants/theme';
import Screen from '../components/Screen';
import Card from '../components/Card';
import { db, auth, signOut } from '../services/firebase';
import { deleteUser } from 'firebase/auth';
import { doc, deleteDoc } from 'firebase/firestore';
import { Ionicons, MaterialIcons, Feather } from '@expo/vector-icons';

type SettingsScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Settings'>;
};

const SettingsScreen: React.FC<SettingsScreenProps> = ({ navigation }) => {
  const handleSignOut = async () => {
    try {
      await signOut(auth);
      navigation.reset({
        index: 0,
        routes: [{ name: 'Welcome' }],
      });
    } catch (error: any) {
      Alert.alert('Error', error.message);
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
              const user = auth.currentUser;
              if (user) {
                // Delete user data from Firestore
                await deleteDoc(doc(db, 'users', user.uid));
                
                // Delete user account
                await deleteUser(user);
                
                // Navigate to welcome screen
                navigation.reset({
                  index: 0,
                  routes: [{ name: 'Welcome' }],
                });
              }
            } catch (error: any) {
              Alert.alert('Error', error.message);
            }
          },
        },
      ]
    );
  };

  return (
    <Screen>
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
    borderRadius: SIZES.borderRadius,
    alignItems: 'center',
    justifyContent: 'center',
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
    padding: SPACING.m,
    borderRadius: SIZES.borderRadius,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteAccountText: {
    color: COLORS.error,
    fontSize: FONTS.body1,
    fontWeight: 'bold',
  },
});

export default SettingsScreen; 