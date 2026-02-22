import React, { useRef, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  FlatList,
  Animated,
  Dimensions,
  Alert,
  StatusBar,
  SafeAreaView,
  Platform,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { COLORS, FONTS, SPACING } from '../constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../provider/AuthProvider';
import { signOut } from '../utils/supabase';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface Slide {
  id: string;
  image: any;
  eyebrow: string;
  title: string;
  subtitle: string;
  accentColor: string;
}

const SLIDES: Slide[] = [
  {
    id: '1',
    image: require('../assets/images/onboarding-1.png'),
    eyebrow: 'Just the two of you',
    title: 'Your private\nuniverse',
    subtitle: 'A sacred space built only for you and your person — no feeds, no noise, just your world.',
    accentColor: '#BFACE2',
  },
  {
    id: '2',
    image: require('../assets/images/onboarding-2.png'),
    eyebrow: 'Stay close, always',
    title: 'Moments that\nmatter',
    subtitle: 'Share memories, daily rituals, and whispers across the distance. Every day, closer.',
    accentColor: '#7C9EFF',
  },
  {
    id: '3',
    image: require('../assets/images/onboarding-3.png'),
    eyebrow: 'Your story begins here',
    title: 'Name your\nconstellation',
    subtitle: 'Create your shared home or join your partner\'s constellation with an invite code.',
    accentColor: '#FFD700',
  },
];

type OnboardingScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Onboarding'>;
};

const DOT_SIZE = 8;
const DOT_SPACING = 6;

const OnboardingScreen: React.FC<OnboardingScreenProps> = ({ navigation }) => {
  const { user } = useAuth();
  const [activeIndex, setActiveIndex] = useState(0);
  const scrollX = useRef(new Animated.Value(0)).current;
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    if (!user) {
      navigation.navigate('Welcome');
    }
  }, [user, navigation]);

  const handleNext = () => {
    if (activeIndex < SLIDES.length - 1) {
      flatListRef.current?.scrollToIndex({ index: activeIndex + 1, animated: true });
    }
  };

  const handleSkip = () => {
    flatListRef.current?.scrollToIndex({ index: SLIDES.length - 1, animated: true });
  };

  const handleCreateConstellation = () => {
    if (!user) { navigation.navigate('Welcome'); return; }
    navigation.navigate('CreateConstellation');
  };

  const handleJoinConstellation = () => {
    if (!user) { navigation.navigate('Welcome'); return; }
    navigation.navigate('JoinConstellation');
  };

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          try {
            await signOut();
          } catch (e) {
            Alert.alert('Error', 'Failed to sign out. Please try again.');
          }
        },
      },
    ]);
  };

  const isLastSlide = activeIndex === SLIDES.length - 1;

  const renderSlide = ({ item, index }: { item: Slide; index: number }) => {
    const isLast = index === SLIDES.length - 1;
    return (
      <View style={styles.slide}>
        {/* Glow behind image */}
        <View style={[styles.imageGlow, { backgroundColor: item.accentColor + '18' }]} />

        <View style={styles.imageWrapper}>
          <Image
            source={item.image}
            style={styles.slideImage}
            resizeMode="contain"
          />
        </View>

        <View style={styles.textBlock}>
          <Text style={[styles.eyebrow, { color: item.accentColor }]}>{item.eyebrow}</Text>
          <Text style={styles.slideTitle}>{item.title}</Text>
          <Text style={styles.slideSubtitle}>{item.subtitle}</Text>
        </View>

        {isLast && (
          <View style={styles.ctaContainer}>
            {/* Create button */}
            <TouchableOpacity
              style={styles.primaryCta}
              onPress={handleCreateConstellation}
              activeOpacity={0.85}
            >
              <View style={styles.ctaIconWrap}>
                <Ionicons name="star" size={20} color="#121212" />
              </View>
              <Text style={styles.primaryCtaText}>Create a new constellation</Text>
              <Ionicons name="chevron-forward" size={18} color="#121212" style={{ opacity: 0.6 }} />
            </TouchableOpacity>

            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerLabel}>or</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Join button */}
            <TouchableOpacity
              style={styles.secondaryCta}
              onPress={handleJoinConstellation}
              activeOpacity={0.85}
            >
              <View style={[styles.ctaIconWrap, styles.ctaIconWrapOutline]}>
                <Ionicons name="link" size={20} color={COLORS.accent} />
              </View>
              <Text style={styles.secondaryCtaText}>Join with an invite code</Text>
              <Ionicons name="chevron-forward" size={18} color={COLORS.accent} style={{ opacity: 0.6 }} />
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {/* Top bar */}
      <SafeAreaView style={styles.topBar}>
        <TouchableOpacity onPress={handleSignOut} style={styles.signOutBtn}>
          <Ionicons name="log-out-outline" size={20} color={COLORS.gray500} />
        </TouchableOpacity>
        {!isLastSlide && (
          <TouchableOpacity onPress={handleSkip} style={styles.skipBtn}>
            <Text style={styles.skipText}>Skip</Text>
          </TouchableOpacity>
        )}
      </SafeAreaView>

      {/* Slides */}
      <Animated.FlatList
        ref={flatListRef}
        data={SLIDES}
        renderItem={renderSlide}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { x: scrollX } } }],
          { useNativeDriver: false }
        )}
        onMomentumScrollEnd={(e) => {
          const newIndex = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
          setActiveIndex(newIndex);
        }}
        scrollEventThrottle={16}
        style={styles.flatList}
      />

      {/* Bottom nav */}
      <SafeAreaView style={styles.bottomNav}>
        {/* Dots */}
        <View style={styles.dotsRow}>
          {SLIDES.map((_, i) => {
            const inputRange = [
              (i - 1) * SCREEN_WIDTH,
              i * SCREEN_WIDTH,
              (i + 1) * SCREEN_WIDTH,
            ];
            const dotWidth = scrollX.interpolate({
              inputRange,
              outputRange: [DOT_SIZE, DOT_SIZE * 3, DOT_SIZE],
              extrapolate: 'clamp',
            });
            const opacity = scrollX.interpolate({
              inputRange,
              outputRange: [0.35, 1, 0.35],
              extrapolate: 'clamp',
            });
            return (
              <Animated.View
                key={i}
                style={[styles.dot, { width: dotWidth, opacity }]}
              />
            );
          })}
        </View>

        {/* Next button – only on first 2 slides */}
        {!isLastSlide && (
          <TouchableOpacity style={styles.nextBtn} onPress={handleNext} activeOpacity={0.85}>
            <Ionicons name="arrow-forward" size={22} color="#121212" />
          </TouchableOpacity>
        )}
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  topBar: {
    position: 'absolute',
    top: Platform.OS === 'android' ? 36 : 0,
    left: 0,
    right: 0,
    zIndex: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.l,
    paddingTop: SPACING.s,
  },
  signOutBtn: {
    padding: SPACING.s,
    opacity: 0.6,
  },
  skipBtn: {
    padding: SPACING.s,
  },
  skipText: {
    color: COLORS.gray400,
    fontSize: FONTS.body2,
    letterSpacing: 0.4,
  },
  flatList: {
    flex: 1,
  },

  // ─── Slide ───────────────────────────────────────────────
  slide: {
    width: SCREEN_WIDTH,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 100,
  },
  imageGlow: {
    position: 'absolute',
    top: SCREEN_HEIGHT * 0.08,
    width: SCREEN_WIDTH * 0.72,
    height: SCREEN_WIDTH * 0.72,
    borderRadius: SCREEN_WIDTH * 0.36,
    alignSelf: 'center',
  },
  imageWrapper: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT * 0.42,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.xl,
  },
  slideImage: {
    width: SCREEN_WIDTH * 0.78,
    height: '100%',
  },
  textBlock: {
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
    marginBottom: SPACING.xl,
  },
  eyebrow: {
    fontSize: FONTS.caption,
    fontWeight: '700',
    letterSpacing: 2.5,
    textTransform: 'uppercase',
    marginBottom: SPACING.s,
    opacity: 0.9,
  },
  slideTitle: {
    fontSize: 34,
    fontWeight: '800',
    color: COLORS.white,
    textAlign: 'center',
    lineHeight: 42,
    marginBottom: SPACING.m,
    letterSpacing: -0.5,
  },
  slideSubtitle: {
    fontSize: FONTS.body1,
    color: COLORS.gray400,
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: SPACING.s,
  },

  // ─── CTA (last slide) ────────────────────────────────────
  ctaContainer: {
    width: SCREEN_WIDTH - SPACING.xl * 2,
    gap: 0,
  },
  primaryCta: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.accent,
    borderRadius: 16,
    paddingVertical: SPACING.m + 2,
    paddingHorizontal: SPACING.m,
    marginBottom: SPACING.m,
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  ctaIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.m,
  },
  primaryCtaText: {
    flex: 1,
    fontSize: FONTS.body1,
    fontWeight: '700',
    color: '#121212',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.m,
    paddingHorizontal: SPACING.s,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.gray800,
  },
  dividerLabel: {
    color: COLORS.gray600,
    fontSize: FONTS.caption,
    marginHorizontal: SPACING.m,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  secondaryCta: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E1E2E',
    borderRadius: 16,
    paddingVertical: SPACING.m + 2,
    paddingHorizontal: SPACING.m,
    borderWidth: 1,
    borderColor: '#2E2E4E',
  },
  ctaIconWrapOutline: {
    backgroundColor: 'rgba(191,172,226,0.12)',
  },
  secondaryCtaText: {
    flex: 1,
    fontSize: FONTS.body1,
    fontWeight: '700',
    color: COLORS.accent,
  },

  // ─── Bottom nav ──────────────────────────────────────────
  bottomNav: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.l,
    paddingBottom: Platform.OS === 'android' ? SPACING.xl : SPACING.l,
  },
  dotsRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  dot: {
    height: DOT_SIZE,
    borderRadius: DOT_SIZE / 2,
    backgroundColor: COLORS.accent,
    marginRight: DOT_SPACING,
  },
  nextBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 6,
  },
});

export default OnboardingScreen;
