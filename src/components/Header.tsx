import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { RootStackParamList } from '../types';
import { COLORS, FONTS, SPACING } from '../constants/theme';
import { supabase } from '../utils/supabase';
import { useAuth } from '../provider/AuthProvider';

interface HeaderProps {
  title?: string;
  showBack?: boolean;
  rightContent?: React.ReactNode;
}

const AppHeader: React.FC<HeaderProps> = ({ title, showBack = false, rightContent }) => {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const { user } = useAuth();
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [initials, setInitials] = useState('?');

  useEffect(() => {
    if (!user) return;
    supabase
      .from('profiles')
      .select('name, avatar_url')
      .eq('id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.avatar_url) setAvatarUrl(data.avatar_url);
        if (data?.name) {
          const parts = data.name.trim().split(' ');
          setInitials(parts.length >= 2 ? parts[0][0] + parts[1][0] : parts[0][0] || '?');
        }
      });
  }, [user]);

  const navigate = (screen: keyof RootStackParamList) => {
    try {
      // @ts-ignore
      navigation.navigate(screen);
    } catch (_) {}
  };

  return (
    <View style={styles.container}>
      {/* Left: back arrow OR logo mark */}
      {showBack ? (
        <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={24} color={COLORS.white} />
        </TouchableOpacity>
      ) : (
        <View style={styles.logoMark}>
          <Ionicons name="planet-outline" size={22} color={COLORS.accent} />
        </View>
      )}

      {/* Center: tab title */}
      {title ? (
        <Text style={styles.title} numberOfLines={1}>{title}</Text>
      ) : (
        <Text style={styles.appName}>OurSpace</Text>
      )}

      {/* Right: notifications + settings + avatar */}
      {rightContent ?? (
        <View style={styles.rightGroup}>
          <TouchableOpacity style={styles.iconBtn} onPress={() => navigate('Settings')} accessibilityLabel="Settings">
            <Ionicons name="settings-outline" size={22} color={COLORS.gray400} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconBtn} onPress={() => console.log('Notifications')} accessibilityLabel="Notifications">
            <Ionicons name="notifications-outline" size={22} color={COLORS.gray400} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigate('Profile')} accessibilityLabel="Profile">
            {avatarUrl ? (
              <Image source={{ uri: avatarUrl }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarFallback}>
                <Text style={styles.avatarInitials}>{initials.toUpperCase()}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.m,
    paddingVertical: SPACING.s,
    backgroundColor: '#0D0D0D',
    borderBottomWidth: 1,
    borderBottomColor: '#1F1F2E',
    height: 60,
  },
  logoMark: {
    width: 36,
    alignItems: 'flex-start',
  },
  iconBtn: {
    padding: 6,
  },
  title: {
    flex: 1,
    color: COLORS.white,
    fontSize: FONTS.h4,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  appName: {
    flex: 1,
    color: COLORS.accent,
    fontSize: FONTS.h4,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: 1,
  },
  rightGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: COLORS.accent,
    marginLeft: 4,
  },
  avatarFallback: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 4,
    borderWidth: 2,
    borderColor: COLORS.accent,
  },
  avatarInitials: {
    color: COLORS.white,
    fontSize: 11,
    fontWeight: '700',
  },
});

export default AppHeader;