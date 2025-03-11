import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ViewStyle,
  TextStyle,
  Image,
  Platform,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, SPACING, SIZES } from '../constants/theme';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { RootStackParamList } from '../types';
import Logo from './Logo';

interface HeaderProps {
  title?: string;
  showLogo?: boolean;
  showProfile?: boolean;
  showNotification?: boolean;
}

const Header: React.FC<HeaderProps> = ({
  title,
  showLogo = true,
  showProfile = true,
  showNotification = true,
}) => {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();

  const handleProfilePress = () => {
    // Try to navigate to Profile, but catch any errors
    try {
      // @ts-ignore - We're handling the error if this fails
      navigation.navigate('Profile');
    } catch (error) {
      console.log('Cannot navigate to Profile from current stack');
      // If we're in a nested navigator, try to navigate to the root navigator first
      try {
        // @ts-ignore - We're handling the error if this fails
        navigation.navigate('Home', { screen: 'Profile' });
      } catch (nestedError) {
        console.log('Cannot navigate to Profile from any stack');
      }
    }
  };

  const handleNotificationPress = () => {
    // Placeholder for notification functionality
    console.log('Notification pressed');
  };

  return (
    <View style={styles.container}>
      <View style={styles.leftContainer}>
        {showLogo && (
          <Logo size={32} />
        )}
        {title && <Text style={styles.title}>{title}</Text>}
      </View>

      <View style={styles.rightContainer}>
        {showNotification && (
          <TouchableOpacity
            style={styles.iconButton}
            onPress={handleNotificationPress}
            accessibilityLabel="Notifications"
          >
            <Ionicons name="notifications-outline" size={24} color={COLORS.white} />
          </TouchableOpacity>
        )}
        {showProfile && (
          <TouchableOpacity
            style={styles.iconButton}
            onPress={handleProfilePress}
            accessibilityLabel="Profile"
          >
            <Ionicons name="person-outline" size={24} color={COLORS.white} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.m,
    paddingVertical: SPACING.s,
    backgroundColor: COLORS.gray900,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray800,
    height: 60,
    width: '100%',
    paddingTop: Platform.OS === 'android' ? SPACING.m : SPACING.s,
    zIndex: 1000,
  },
  leftContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rightContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logo: {
    width: 32,
    height: 32,
    marginRight: SPACING.s,
  },
  title: {
    fontSize: FONTS.h4,
    fontWeight: 'bold',
    color: COLORS.white,
    marginLeft: SPACING.s,
  },
  iconButton: {
    padding: SPACING.xs,
    marginLeft: SPACING.s,
  },
});

export default Header; 