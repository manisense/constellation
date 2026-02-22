import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Clipboard, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Screen from '../components/Screen';
import Card from '../components/Card';
import { COLORS, FONTS, SPACING } from '../constants/theme';
import { RootStackParamList, SharedRoomState } from '../types';
import { getSharedRoomState } from '../services/roomService';
import { supabase } from '../utils/supabase';
import { useAuth } from '../hooks/useAuth';

type HomeScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Home'>;
};

const HomeScreen: React.FC<HomeScreenProps> = ({ navigation }) => {
  const { user, userStatus, inviteCode } = useAuth();
  const [roomState, setRoomState] = useState<SharedRoomState | null>(null);
  const [partnerName, setPartnerName] = useState('Your partner');
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  const handleCopyCode = () => {
    if (inviteCode) {
      Clipboard.setString(inviteCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const loadRoom = async () => {
    try {
      setLoading(true);
      const room = await getSharedRoomState();
      setRoomState(room);

      if (room?.constellationId && user) {
        const { data: partnerMember } = await supabase
          .from('constellation_members')
          .select('user_id')
          .eq('constellation_id', room.constellationId)
          .neq('user_id', user.id)
          .maybeSingle();

        if (partnerMember?.user_id) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('name')
            .eq('id', partnerMember.user_id)
            .maybeSingle();

          if (profile?.name) {
            setPartnerName(profile.name);
          }
        }
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRoom();
  }, [user?.id]);

  if (loading) {
    return (
      <Screen showHeader headerTitle="Our Room">
        <View style={styles.loadingContainer}>
          <ActivityIndicator color={COLORS.primary} size="large" />
        </View>
      </Screen>
    );
  }

  if (!roomState) {
    const isWaiting = userStatus === 'waiting_for_partner';
    return (
      <Screen showHeader headerTitle="Our Room">
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyTitle}>
            {isWaiting ? 'Waiting for your partner' : 'Your room appears after pairing'}
          </Text>
          <Text style={styles.emptyText}>
            {isWaiting
              ? 'Share your invite code with your partner to unlock your shared home.'
              : 'Create or join a private constellation to unlock your shared home.'}
          </Text>
          {isWaiting && inviteCode && (
            <TouchableOpacity style={styles.inviteCodeBox} onPress={handleCopyCode}>
              <Text style={styles.inviteCodeLabel}>Your invite code</Text>
              <Text style={styles.inviteCode}>{inviteCode}</Text>
              <Text style={styles.inviteCodeHint}>{copied ? 'Copied!' : 'Tap to copy'}</Text>
            </TouchableOpacity>
          )}
        </View>
      </Screen>
    );
  }

  return (
    <Screen showHeader headerTitle="Our Shared Room">
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Card style={styles.heroCard}>
          <Text style={styles.heroTitle}>{roomState.roomName}</Text>
          <Text style={styles.heroSubtitle}>With {partnerName}</Text>
          <Text style={styles.heroMeta}>Ambience: {roomState.ambience} · Decor Lv.{roomState.decorLevel}</Text>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${roomState.bondingStrength}%` }]} />
          </View>
          <Text style={styles.progressText}>{roomState.bondingStrength}% connection strength</Text>
        </Card>

        <View style={styles.grid}>
          <TouchableOpacity style={styles.tile} onPress={() => navigation.navigate('DailyRitual')}>
            <Text style={styles.tileTitle}>Daily Ritual</Text>
            <Text style={styles.tileText}>Check-in, prompt, gentle streak</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.tile} onPress={() => navigation.navigate('Timeline')}>
            <Text style={styles.tileTitle}>Love Timeline</Text>
            <Text style={styles.tileText}>Chapters and unlocks</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.tile} onPress={() => navigation.navigate('Chat')}>
            <Text style={styles.tileTitle}>Chat & Voice Notes</Text>
            <Text style={styles.tileText}>Text, media, audio moments</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.tile} onPress={() => navigation.navigate('VoiceCall')}>
            <Text style={styles.tileTitle}>Voice Call</Text>
            <Text style={styles.tileText}>Private 1:1 connection</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.tile} onPress={() => navigation.navigate('VideoCall')}>
            <Text style={styles.tileTitle}>Video Call</Text>
            <Text style={styles.tileText}>Face-to-face cozy time</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.tile} onPress={() => navigation.navigate('CoupleGame')}>
            <Text style={styles.tileTitle}>Couple Game</Text>
            <Text style={styles.tileText}>Co-op prompt play</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.tile} onPress={() => navigation.navigate('WatchTogether')}>
            <Text style={styles.tileTitle}>Watch Together</Text>
            <Text style={styles.tileText}>Private shared reactions</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.tile} onPress={() => navigation.navigate('DatePlans')}>
            <Text style={styles.tileTitle}>Date Plans</Text>
            <Text style={styles.tileText}>Plan upcoming moments</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.tile} onPress={() => navigation.navigate('Memories')}>
            <Text style={styles.tileTitle}>Memories</Text>
            <Text style={styles.tileText}>Capture your story</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </Screen>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    padding: SPACING.l,
    gap: SPACING.m,
    paddingBottom: SPACING.xl,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.l,
  },
  emptyTitle: {
    color: COLORS.white,
    fontSize: FONTS.h3,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: SPACING.s,
  },
  emptyText: {
    color: COLORS.gray300,
    textAlign: 'center',
    marginBottom: SPACING.l,
  },
  inviteCodeBox: {
    marginTop: SPACING.m,
    padding: SPACING.l,
    borderWidth: 1,
    borderColor: COLORS.primary,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: COLORS.card,
  },
  inviteCodeLabel: {
    color: COLORS.gray300,
    fontSize: FONTS.caption,
    marginBottom: SPACING.xs,
  },
  inviteCode: {
    color: COLORS.white,
    fontSize: FONTS.h2,
    fontWeight: '700',
    letterSpacing: 4,
    marginBottom: SPACING.xs,
  },
  inviteCodeHint: {
    color: COLORS.primary,
    fontSize: FONTS.caption,
  },
  heroCard: {
    padding: SPACING.l,
    gap: SPACING.s,
  },
  heroTitle: {
    color: COLORS.white,
    fontSize: FONTS.h2,
    fontWeight: '700',
  },
  heroSubtitle: {
    color: COLORS.highlight,
    fontSize: FONTS.body1,
  },
  heroMeta: {
    color: COLORS.gray300,
    fontSize: FONTS.body2,
  },
  progressTrack: {
    width: '100%',
    height: 8,
    borderRadius: 6,
    backgroundColor: COLORS.gray700,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 6,
    backgroundColor: COLORS.primary,
  },
  progressText: {
    color: COLORS.gray300,
    fontSize: FONTS.caption,
  },
  grid: {
    gap: SPACING.s,
  },
  tile: {
    borderWidth: 1,
    borderColor: COLORS.gray700,
    borderRadius: 12,
    padding: SPACING.m,
    backgroundColor: COLORS.card,
  },
  tileTitle: {
    color: COLORS.white,
    fontSize: FONTS.body1,
    fontWeight: '700',
    marginBottom: SPACING.xs,
  },
  tileText: {
    color: COLORS.gray300,
    fontSize: FONTS.body2,
  },
});

export default HomeScreen;
