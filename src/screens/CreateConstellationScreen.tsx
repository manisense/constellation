import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Animated,
  StatusBar,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { COLORS, FONTS, SPACING } from '../constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { createConstellation, getUserConstellationStatus } from '../utils/supabase';
import { useAuth } from '../provider/AuthProvider';

type CreateConstellationScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'CreateConstellation'>;
};

type ScreenState = 'checking' | 'already_exists' | 'form' | 'created';

// Small twinkling star dots scattered in background
const STARS = Array.from({ length: 28 }, (_, i) => ({
  id: i,
  top: Math.floor(Math.random() * 85) + '%',
  left: Math.floor(Math.random() * 95) + '%',
  size: [2, 2, 3, 2, 2, 4][i % 6],
  opacity: [0.3, 0.5, 0.7, 0.4, 0.6][i % 5],
}));

const CreateConstellationScreen: React.FC<CreateConstellationScreenProps> = ({ navigation }) => {
  const { user, refreshUserStatus, userStatus, inviteCode: existingInviteCode } = useAuth();

  const [screenState, setScreenState] = useState<ScreenState>('checking');
  const [constellationName, setConstellationName] = useState('');
  const [existingName, setExistingName] = useState('');
  const [createdInviteCode, setCreatedInviteCode] = useState('');
  const [loading, setLoading] = useState(false);

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.92)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!user) {
      navigation.reset({ index: 0, routes: [{ name: 'Welcome' }] });
      return;
    }
    checkExisting();
  }, [user]);

  useEffect(() => {
    if (screenState !== 'checking') {
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.spring(scaleAnim, { toValue: 1, friction: 7, useNativeDriver: true }),
      ]).start();
      // Glow pulse loop
      Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, { toValue: 1, duration: 2000, useNativeDriver: true }),
          Animated.timing(glowAnim, { toValue: 0, duration: 2000, useNativeDriver: true }),
        ])
      ).start();
    }
  }, [screenState]);

  const checkExisting = async () => {
    try {
      const { data } = await getUserConstellationStatus();
      if (data && (data.status === 'waiting_for_partner' || data.status === 'complete')) {
        setExistingName(data.constellation?.name || 'Your Constellation');
        setScreenState('already_exists');
      } else {
        setScreenState('form');
      }
    } catch {
      setScreenState('form');
    }
  };

  const goInside = async () => {
    setLoading(true);
    await refreshUserStatus();
    setLoading(false);
    // Root navigator auto-switches to AppStack → MainTabNavigator
  };

  const handleCreate = async () => {
    if (!constellationName.trim()) {
      Alert.alert('Name required', 'Give your constellation a name before creating it.');
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await createConstellation(constellationName.trim());
      if (error) throw error;
      if (data?.success) {
        setCreatedInviteCode(data.invite_code || '');
        setScreenState('created');
      } else if (data?.invite_code) {
        // direct insert fallback path
        setCreatedInviteCode(data.invite_code || '');
        setScreenState('created');
      } else if (error === null && data) {
        // some paths return the row directly
        setCreatedInviteCode(data.invite_code || '');
        setScreenState('created');
      } else {
        throw new Error(data?.message || 'Failed to create constellation');
      }
    } catch (err: any) {
      if (err?.message?.includes('already in a constellation')) {
        await checkExisting();
      } else {
        Alert.alert('Something went wrong', err?.message || 'Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const glowOpacity = glowAnim.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] });

  // ── Checking state ─────────────────────────────────────────────────────────
  if (screenState === 'checking') {
    return (
      <View style={styles.root}>
        <StatusBar barStyle="light-content" backgroundColor="#05050F" />
        <View style={styles.centerFull}>
          <ActivityIndicator size="large" color={COLORS.accent} />
          <Text style={styles.checkingText}>Scanning the cosmos…</Text>
        </View>
      </View>
    );
  }

  // ── Already exists state ───────────────────────────────────────────────────
  if (screenState === 'already_exists') {
    return (
      <View style={styles.root}>
        <StatusBar barStyle="light-content" backgroundColor="#05050F" />
        {STARS.map(s => (
          <View key={s.id} style={[styles.star, { top: s.top as any, left: s.left as any, width: s.size, height: s.size, opacity: s.opacity }]} />
        ))}
        <Animated.View style={[styles.content, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
          <Animated.View style={[styles.orb, { opacity: glowOpacity }]} />
          <View style={styles.orbInner}>
            <Ionicons name="planet-outline" size={52} color={COLORS.accent} />
          </View>

          <Text style={styles.tagline}>You already have a constellation</Text>
          <Text style={styles.existingName}>{existingName}</Text>
          <Text style={styles.existingHint}>
            Each user can belong to only one constellation.{'\n'}Step inside yours.
          </Text>

          <TouchableOpacity style={styles.primaryBtn} onPress={goInside} disabled={loading}>
            {loading
              ? <ActivityIndicator color="#fff" />
              : <>
                  <Ionicons name="home-outline" size={20} color="#fff" style={{ marginRight: 8 }} />
                  <Text style={styles.primaryBtnText}>Go Inside</Text>
                </>
            }
          </TouchableOpacity>
        </Animated.View>
      </View>
    );
  }

  // ── Created state ──────────────────────────────────────────────────────────
  if (screenState === 'created') {
    return (
      <View style={styles.root}>
        <StatusBar barStyle="light-content" backgroundColor="#05050F" />
        {STARS.map(s => (
          <View key={s.id} style={[styles.star, { top: s.top as any, left: s.left as any, width: s.size, height: s.size, opacity: s.opacity }]} />
        ))}
        <Animated.View style={[styles.content, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
          <Animated.View style={[styles.orb, styles.orbSuccess, { opacity: glowOpacity }]} />
          <View style={styles.orbInner}>
            <Ionicons name="star" size={52} color={COLORS.luminary} />
          </View>

          <Text style={styles.tagline}>Constellation Born ✨</Text>
          <Text style={styles.existingName}>{constellationName}</Text>
          <Text style={styles.existingHint}>Share this invite code with your partner</Text>

          <View style={styles.inviteBox}>
            <Text style={styles.inviteCode}>{createdInviteCode || existingInviteCode || '——'}</Text>
            <Text style={styles.inviteHint}>6-character code • share privately</Text>
          </View>

          <TouchableOpacity style={styles.primaryBtn} onPress={goInside} disabled={loading}>
            {loading
              ? <ActivityIndicator color="#fff" />
              : <>
                  <Ionicons name="home-outline" size={20} color="#fff" style={{ marginRight: 8 }} />
                  <Text style={styles.primaryBtnText}>Go Inside</Text>
                </>
            }
          </TouchableOpacity>
        </Animated.View>
      </View>
    );
  }

  // ── Form state ─────────────────────────────────────────────────────────────
  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#05050F" />
      {STARS.map(s => (
        <View key={s.id} style={[styles.star, { top: s.top as any, left: s.left as any, width: s.size, height: s.size, opacity: s.opacity }]} />
      ))}
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <Animated.View style={[styles.content, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>

            {/* Back */}
            <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
              <Ionicons name="chevron-back" size={22} color={COLORS.gray400} />
              <Text style={styles.backText}>Back</Text>
            </TouchableOpacity>

            {/* Orb */}
            <Animated.View style={[styles.orb, { opacity: glowOpacity }]} />
            <View style={styles.orbInner}>
              <Ionicons name="planet-outline" size={52} color={COLORS.accent} />
            </View>

            <Text style={styles.heading}>Create Your{'\n'}Constellation</Text>
            <Text style={styles.subheading}>
              Name the private world you'll share with your partner.{'\n'}You can only create one.
            </Text>

            {/* Input */}
            <View style={styles.inputWrap}>
              <Ionicons name="star-outline" size={16} color={COLORS.accent} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="e.g. Eternal Dawn, Nova & Lyra…"
                placeholderTextColor={'#3A3A5C'}
                value={constellationName}
                onChangeText={setConstellationName}
                maxLength={32}
                autoFocus
                returnKeyType="done"
                onSubmitEditing={handleCreate}
              />
            </View>
            <Text style={styles.charCount}>{constellationName.length}/32</Text>

            {/* Create button */}
            <TouchableOpacity
              style={[styles.primaryBtn, styles.createBtn, !constellationName.trim() && styles.btnDisabled]}
              onPress={handleCreate}
              disabled={loading || !constellationName.trim()}
            >
              {loading
                ? <ActivityIndicator color="#fff" />
                : <>
                    <Ionicons name="add-circle-outline" size={20} color="#fff" style={{ marginRight: 8 }} />
                    <Text style={styles.primaryBtnText}>Create Constellation</Text>
                  </>
              }
            </TouchableOpacity>

            {/* Join instead */}
            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or</Text>
              <View style={styles.dividerLine} />
            </View>
            <TouchableOpacity style={styles.ghostBtn} onPress={() => navigation.navigate('JoinConstellation')}>
              <Ionicons name="link-outline" size={18} color={COLORS.accent} style={{ marginRight: 6 }} />
              <Text style={styles.ghostBtnText}>Join with an invite code</Text>
            </TouchableOpacity>

          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

const ORB_SIZE = 180;

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#05050F',
  },
  star: {
    position: 'absolute',
    borderRadius: 99,
    backgroundColor: '#FFFFFF',
  },
  centerFull: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  checkingText: {
    color: COLORS.gray500,
    fontSize: FONTS.body2,
    letterSpacing: 0.5,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 40,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 28,
    paddingTop: 56,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginBottom: 32,
    gap: 4,
  },
  backText: {
    color: COLORS.gray400,
    fontSize: FONTS.body2,
  },
  // Glow orb
  orb: {
    position: 'absolute',
    top: 100,
    width: ORB_SIZE,
    height: ORB_SIZE,
    borderRadius: ORB_SIZE / 2,
    backgroundColor: COLORS.secondary,
    opacity: 0.18,
    transform: [{ scaleX: 1.6 }],
    // blur-like with nested shadow
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 48,
    elevation: 0,
  },
  orbSuccess: {
    backgroundColor: COLORS.luminary,
    shadowColor: COLORS.luminary,
  },
  orbInner: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#0F0F20',
    borderWidth: 1.5,
    borderColor: COLORS.accent + '55',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 28,
  },
  heading: {
    fontSize: 30,
    fontWeight: '800',
    color: COLORS.white,
    textAlign: 'center',
    lineHeight: 38,
    letterSpacing: -0.3,
    marginBottom: 12,
  },
  subheading: {
    fontSize: FONTS.body2,
    color: COLORS.gray500,
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: 36,
  },
  tagline: {
    fontSize: FONTS.h4,
    fontWeight: '700',
    color: COLORS.white,
    textAlign: 'center',
    marginBottom: 6,
  },
  existingName: {
    fontSize: 26,
    fontWeight: '800',
    color: COLORS.accent,
    textAlign: 'center',
    marginBottom: 10,
    letterSpacing: 0.4,
  },
  existingHint: {
    fontSize: FONTS.body2,
    color: COLORS.gray500,
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: 32,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    backgroundColor: '#0F0F22',
    borderWidth: 1.5,
    borderColor: COLORS.secondary + '88',
    borderRadius: 14,
    paddingHorizontal: 16,
    marginBottom: 6,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    height: 54,
    color: COLORS.white,
    fontSize: FONTS.body1,
    letterSpacing: 0.3,
  },
  charCount: {
    alignSelf: 'flex-end',
    fontSize: 11,
    color: COLORS.gray600 || COLORS.gray500,
    marginBottom: 28,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: 54,
    borderRadius: 14,
    backgroundColor: COLORS.secondary,
    shadowColor: COLORS.secondary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 16,
    elevation: 8,
  },
  createBtn: {
    backgroundColor: COLORS.primary,
    shadowColor: COLORS.primary,
  },
  btnDisabled: {
    opacity: 0.45,
  },
  primaryBtnText: {
    color: COLORS.white,
    fontSize: FONTS.body1,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginVertical: 20,
    gap: 10,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#1E1E34',
  },
  dividerText: {
    color: COLORS.gray500,
    fontSize: FONTS.caption,
    letterSpacing: 1,
  },
  ghostBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: 50,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: COLORS.accent + '55',
    backgroundColor: 'transparent',
  },
  ghostBtnText: {
    color: COLORS.accent,
    fontSize: FONTS.body2,
    fontWeight: '600',
  },
  // Invite code box
  inviteBox: {
    width: '100%',
    backgroundColor: '#0F0F22',
    borderWidth: 1.5,
    borderColor: COLORS.luminary + '55',
    borderRadius: 14,
    paddingVertical: 20,
    alignItems: 'center',
    marginBottom: 28,
  },
  inviteCode: {
    fontSize: 34,
    fontWeight: '800',
    color: COLORS.luminary,
    letterSpacing: 8,
    marginBottom: 6,
  },
  inviteHint: {
    fontSize: FONTS.caption,
    color: COLORS.gray500,
    letterSpacing: 0.4,
  },
});

export default CreateConstellationScreen;
