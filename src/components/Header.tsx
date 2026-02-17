import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
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
    <View className="flex-row justify-between items-center px-4 py-2 bg-gray-900 border-b border-gray-800 h-[60px] w-full z-50">
      <View className="flex-row items-center">
        {showLogo && <Logo size={32} />}
        {title && <Text className="text-white text-lg font-bold ml-2">{title}</Text>}
      </View>
      <View className="flex-row items-center">
        {showNotification && (
          <TouchableOpacity
            className="ml-2 p-1"
            onPress={handleNotificationPress}
            accessibilityLabel="Notifications"
          >
            <Ionicons name="notifications-outline" size={24} color="#fff" />
          </TouchableOpacity>
        )}
        {showProfile && (
          <TouchableOpacity
            className="ml-2 p-1"
            onPress={handleProfilePress}
            accessibilityLabel="Profile"
          >
            <Ionicons name="person-outline" size={24} color="#fff" />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

export default Header;