/**
 * UniverseScreen — Constellation + Shared Room merged view.
 *
 * Top ~40%: Animated star map with two orbiting partner stars (gold = Luminary, silver = Navigator)
 *           + constellation name + bonding strength ring overlay.
 * Bottom 60%: Partner cards side-by-side, room stats (ambience, decor, chapter).
 */
import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Animated,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, SPACING } from '../constants/theme';
import { supabase } from '../utils/supabase';
import { useAuth } from '../provider/AuthProvider';
import { getSharedRoomState } from '../services/roomService';
import { SharedRoomState, StarType } from '../types';

const { width: SCREEN_W } = Dimensions.get('window');
const MAP_H = 240;
const ORBIT_R = 82; // radius of each star's orbit

// ─── Types ────────────────────────────────────────────────────────────────────

interface PartnerInfo {
  name: string;
  starType: StarType | null;
  avatarUrl?: string | null;
}

// ─── Animated star dot ────────────────────────────────────────────────────────

interface StarDotProps {
  angle: Animated.AnimatedInterpolation<string | number>;
  orbitRadius: number;
  color: string;
  size?: number;
}

const ANGLE_INPUT = Array.from({ length: 361 }, (_, i) => i);

const StarDot: React.FC<StarDotProps> = ({ angle, orbitRadius, color, size = 14 }) => {
  const x = angle.interpolate({
    inputRange: ANGLE_INPUT,
    outputRange: Array.from({ length: 361 }, (_, i) => Math.cos((i * Math.PI) / 180) * orbitRadius),
  } as any);
  const y = angle.interpolate({
    inputRange: ANGLE_INPUT,
    outputRange: Array.from({ length: 361 }, (_, i) => Math.sin((i * Math.PI) / 180) * orbitRadius),
  } as any);

  return (
    <Animated.View
      style={[
        styles.starDot,
        { width: size, height: size, borderRadius: size / 2, backgroundColor: color },
        { transform: [{ translateX: x as any }, { translateY: y as any }] },
      ]}
    />
  );
};

// ─── Bonding strength arc (pure View-based) ───────────────────────────────────
// Simple implementation: a thin ring with a colored overlay for the filled portion.

const BondingRing: React.FC<{ value: number }> = ({ value }) => {
  // We render a simple circular progress made from two semicircle views
  const clamp = Math.min(Math.max(value, 0), 100);
  return (
    <View style={styles.ringWrapper}>
      <View style={styles.ringTrack} />
      <View style={[styles.ringFill, { borderColor: COLORS.accent, borderWidth: clamp > 0 ? 4 : 0 }]} />
      <View style={styles.ringCenter}>
        <Text style={styles.ringValue}>{clamp}%</Text>
        <Text style={styles.ringLabel}>bond</Text>
      </View>
    </View>
  );
};

// ─── Component ────────────────────────────────────────────────────────────────

const UniverseScreen: React.FC = () => {
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [constellationName, setConstellationName] = useState('Your Constellation');
  const [bondingStrength, setBondingStrength] = useState(0);
  const [roomState, setRoomState] = useState<SharedRoomState | null>(null);
  const [myInfo, setMyInfo] = useState<PartnerInfo>({ name: 'You', starType: null });
  const [partnerInfo, setPartnerInfo] = useState<PartnerInfo>({ name: 'Partner', starType: null });

  // Orbit animation values
  const angle1 = useRef(new Animated.Value(0)).current;
  const angle2 = useRef(new Animated.Value(180)).current;

  useEffect(() => {
    if (user) loadData();
    // Start orbit animations
    Animated.loop(
      Animated.timing(angle1, { toValue: 360, duration: 8000, useNativeDriver: false }),
    ).start();
    Animated.loop(
      Animated.timing(angle2, { toValue: 540, duration: 12000, useNativeDriver: false }),
    ).start();
  }, [user]);

  const loadData = async () => {
    if (!user) return;
    try {
      // User profile
      const { data: userData } = await supabase
        .from('profiles')
        .select('name, star_type, avatar_url')
        .eq('id', user.id)
        .maybeSingle();
      if (userData) {
        setMyInfo({ name: userData.name || 'You', starType: userData.star_type, avatarUrl: userData.avatar_url });
      }

      // Constellation membership
      const { data: memberData } = await supabase
        .from('constellation_members')
        .select('constellation_id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!memberData?.constellation_id) { setLoading(false); return; }
      const cid = memberData.constellation_id;

      // Constellation
      const { data: constData } = await supabase
        .from('constellations')
        .select('name, bonding_strength')
        .eq('id', cid)
        .maybeSingle();
      if (constData) {
        setConstellationName(constData.name || 'Your Constellation');
        setBondingStrength(constData.bonding_strength || 0);
      }

      // Partner
      const { data: partners } = await supabase
        .from('constellation_members')
        .select('user_id')
        .eq('constellation_id', cid)
        .neq('user_id', user.id);

      if (partners && partners.length > 0) {
        const { data: partnerData } = await supabase
          .from('profiles')
          .select('name, star_type, avatar_url')
          .eq('id', partners[0].user_id)
          .maybeSingle();
        if (partnerData) {
          setPartnerInfo({ name: partnerData.name || 'Partner', starType: partnerData.star_type, avatarUrl: partnerData.avatar_url });
        }
      }

      // Room state
      const room = await getSharedRoomState();
      if (room) setRoomState(room);
    } catch (err) {
      console.error('UniverseScreen loadData:', err);
    } finally {
      setLoading(false);
    }
  };

  // ── Star type helpers ─────────────────────────────────────────────
  const starColor = (t: StarType | null) => t === StarType.LUMINARY ? COLORS.luminary : t === StarType.NAVIGATOR ? COLORS.navigator : COLORS.accent;
  const starLabel = (t: StarType | null) => t === StarType.LUMINARY ? '✦ Luminary' : t === StarType.NAVIGATOR ? '✦ Navigator' : '✦ Unknown';

  if (loading) {
    return <View style={styles.loadingBox}><ActivityIndicator size="large" color={COLORS.primary} /></View>;
  }

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>

      {/* ── Star Map ── */}
      <View style={styles.starMap}>
        {/* Orbit rings */}
        <View style={[styles.orbitRing, { width: ORBIT_R * 2 + 14, height: ORBIT_R * 2 + 14, borderRadius: ORBIT_R + 7 }]} />
        <View style={[styles.orbitRing, { width: ORBIT_R * 1.4, height: ORBIT_R * 1.4, borderRadius: ORBIT_R * 0.7, opacity: 0.15 }]} />

        {/* Center glow */}
        <View style={styles.centerGlow} />
        <Text style={styles.centerLabel}>{constellationName}</Text>

        {/* Orbiting stars */}
        <View style={styles.orbitContainer}>
          <StarDot
            angle={angle1}
            orbitRadius={ORBIT_R}
            color={starColor(myInfo.starType)}
            size={16}
          />
          <StarDot
            angle={angle2}
            orbitRadius={ORBIT_R * 0.6}
            color={starColor(partnerInfo.starType)}
            size={12}
          />
        </View>

        {/* Bonding ring overlay bottom-right */}
        <View style={styles.bondingRingPosition}>
          <View style={styles.bondingPill}>
            <Ionicons name="heart" size={12} color={COLORS.accent} />
            <Text style={styles.bondingPillText}>{bondingStrength}% bonded</Text>
          </View>
        </View>
      </View>

      {/* ── Partner cards ── */}
      <View style={styles.partnerRow}>
        <PartnerCard info={myInfo} label="You" />
        <View style={styles.partnerDivider}>
          <Ionicons name="heart" size={16} color={COLORS.accent} />
        </View>
        <PartnerCard info={partnerInfo} label="Partner" />
      </View>

      {/* ── Room stats ── */}
      {roomState && (
        <View style={styles.roomCard}>
          <Text style={styles.roomCardTitle}>Shared Room</Text>
          <Text style={styles.roomName}>{roomState.roomName}</Text>
          <View style={styles.roomStatsRow}>
            <StatChip icon="moon-outline" label="Ambience" value={roomState.ambience} />
            <StatChip icon="star-outline" label="Decor" value={`Level ${roomState.decorLevel}`} />
            <StatChip icon="book-outline" label="Chapter" value={`#${roomState.chapterUnlocked}`} />
          </View>
          <View style={styles.bondingBarRow}>
            <Text style={styles.bondingBarLabel}>Bonding Strength</Text>
            <Text style={styles.bondingBarValue}>{bondingStrength}%</Text>
          </View>
          <View style={styles.bondingBarTrack}>
            <View style={[styles.bondingBarFill, { width: `${bondingStrength}%` as any }]} />
          </View>
        </View>
      )}

      <View style={{ height: 32 }} />
    </ScrollView>
  );
};

// ─── Partner card sub-component ───────────────────────────────────────────────

const PartnerCard: React.FC<{ info: PartnerInfo; label: string }> = ({ info, label }) => {
  const starColor = info.starType === StarType.LUMINARY ? COLORS.luminary : info.starType === StarType.NAVIGATOR ? COLORS.navigator : COLORS.accent;
  return (
    <View style={pcStyles.card}>
      <View style={[pcStyles.avatarRing, { borderColor: starColor }]}>
        <Text style={pcStyles.avatarInitial}>{(info.name[0] || '?').toUpperCase()}</Text>
      </View>
      <Text style={pcStyles.name} numberOfLines={1}>{info.name}</Text>
      <Text style={pcStyles.label}>{label}</Text>
      {info.starType && (
        <View style={[pcStyles.typeBadge, { borderColor: starColor + '66' }]}>
          <Text style={[pcStyles.typeText, { color: starColor }]}>
            {info.starType === StarType.LUMINARY ? '✦ Luminary' : '✦ Navigator'}
          </Text>
        </View>
      )}
    </View>
  );
};

const pcStyles = StyleSheet.create({
  card: { flex: 1, backgroundColor: '#111120', borderRadius: 16, padding: SPACING.m, alignItems: 'center', gap: 6, borderWidth: 1, borderColor: '#1F1F2E' },
  avatarRing: { width: 56, height: 56, borderRadius: 28, borderWidth: 2.5, alignItems: 'center', justifyContent: 'center', backgroundColor: '#1A1A2E' },
  avatarInitial: { color: COLORS.white, fontSize: FONTS.h3, fontWeight: '700' },
  name: { color: COLORS.white, fontSize: FONTS.body1, fontWeight: '700', textAlign: 'center' },
  label: { color: COLORS.gray600, fontSize: FONTS.caption },
  typeBadge: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  typeText: { fontSize: FONTS.caption, fontWeight: '600' },
});

// ─── Stat chip ────────────────────────────────────────────────────────────────

const StatChip: React.FC<{ icon: any; label: string; value: string }> = ({ icon, label, value }) => (
  <View style={chipStyles.chip}>
    <Ionicons name={icon} size={14} color={COLORS.accent} />
    <Text style={chipStyles.label}>{label}</Text>
    <Text style={chipStyles.value}>{value}</Text>
  </View>
);

const chipStyles = StyleSheet.create({
  chip: { flex: 1, backgroundColor: '#0D0D1A', borderRadius: 10, padding: 8, alignItems: 'center', gap: 3, borderWidth: 1, borderColor: '#2A2A45' },
  label: { color: COLORS.gray600, fontSize: 9, textTransform: 'uppercase', letterSpacing: 0.5 },
  value: { color: COLORS.white, fontSize: FONTS.caption, fontWeight: '600', textTransform: 'capitalize' },
});

// ─── Main styles ──────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0A0A12' },
  loadingBox: { flex: 1, backgroundColor: '#0A0A12', justifyContent: 'center', alignItems: 'center' },
  container: { paddingBottom: SPACING.l },

  // Star map
  starMap: {
    height: MAP_H,
    backgroundColor: '#030310',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    position: 'relative',
    borderBottomWidth: 1,
    borderBottomColor: '#1F1F2E',
  },
  orbitRing: {
    position: 'absolute',
    borderWidth: 1,
    borderColor: '#BFACE240',
    borderStyle: 'dashed',
  },
  centerGlow: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.accent,
    opacity: 0.25,
    position: 'absolute',
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 12,
    elevation: 8,
  },
  centerLabel: {
    position: 'absolute',
    bottom: 18,
    color: COLORS.accent,
    fontSize: FONTS.caption,
    fontWeight: '700',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    opacity: 0.9,
  },
  orbitContainer: {
    position: 'absolute',
    width: 0,
    height: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  starDot: {
    position: 'absolute',
    shadowColor: COLORS.luminary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 6,
    elevation: 6,
  },
  bondingRingPosition: {
    position: 'absolute',
    bottom: 12,
    right: 16,
  },
  bondingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#1A1A2E',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: COLORS.accent + '44',
  },
  bondingPillText: { color: COLORS.accent, fontSize: FONTS.caption, fontWeight: '600' },

  // Partner cards
  partnerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.s,
    padding: SPACING.m,
  },
  partnerDivider: { width: 24, alignItems: 'center' },

  // Room card
  roomCard: {
    marginHorizontal: SPACING.m,
    backgroundColor: '#111120',
    borderRadius: 18,
    padding: SPACING.m,
    borderWidth: 1,
    borderColor: '#1F1F2E',
    gap: SPACING.s,
  },
  roomCardTitle: { color: COLORS.gray500, fontSize: FONTS.caption, textTransform: 'uppercase', letterSpacing: 1 },
  roomName: { color: COLORS.white, fontSize: FONTS.h3, fontWeight: '700' },
  roomStatsRow: { flexDirection: 'row', gap: SPACING.s },
  bondingBarRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  bondingBarLabel: { color: COLORS.gray500, fontSize: FONTS.caption },
  bondingBarValue: { color: COLORS.accent, fontSize: FONTS.caption, fontWeight: '700' },
  bondingBarTrack: { height: 6, backgroundColor: '#1A1A2E', borderRadius: 3, overflow: 'hidden' },
  bondingBarFill: { height: '100%', backgroundColor: COLORS.accent, borderRadius: 3 },

  // Ring (unused, kept for reference)
  ringWrapper: { width: 80, height: 80, alignItems: 'center', justifyContent: 'center' },
  ringTrack: { position: 'absolute', width: 80, height: 80, borderRadius: 40, borderWidth: 6, borderColor: '#2A2A45' },
  ringFill: { position: 'absolute', width: 80, height: 80, borderRadius: 40 },
  ringCenter: { alignItems: 'center' },
  ringValue: { color: COLORS.white, fontSize: 16, fontWeight: '700' },
  ringLabel: { color: COLORS.gray500, fontSize: 10 },
});

export default UniverseScreen;
