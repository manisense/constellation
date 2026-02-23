import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

import { COLORS, FONTS } from '../constants/theme';
import { RootStackParamList } from '../types/index';
import { useAuth } from '../hooks/useAuth';
import AppHeader from '../components/Header';

// ── Auth / Onboarding screens
import WelcomeScreen from '../screens/WelcomeScreen';
import OnboardingScreen from '../screens/OnboardingScreen';
import CreateConstellationScreen from '../screens/CreateConstellationScreen';
import JoinConstellationScreen from '../screens/JoinConstellationScreen';
import WaitingForPartnerScreen from '../screens/WaitingForPartner';
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import ForgotPasswordScreen from '../screens/ForgotPasswordScreen';
import ProfileScreen from '../screens/ProfileScreen';
import QuizScreen from '../screens/QuizScreen';
import StarRevealScreen from '../screens/StarRevealScreen';

// ── 5 Tab screens (new)
import ChatScreen from '../screens/ChatScreen';
import TogetherScreen from '../screens/TogetherScreen';
import MemoriesTabScreen from '../screens/MemoriesTabScreen';
import PlayScreen from '../screens/PlayScreen';
import UniverseScreen from '../screens/UniverseScreen';

// ── Stack-only feature screens
import SettingsScreen from '../screens/SettingsScreen';
import HomeScreen from '../screens/HomeScreen';
import ConstellationViewScreen from '../screens/ConstellationViewScreen';
import DatePlansScreen from '../screens/DatePlansScreen';
import MemoriesScreen from '../screens/MemoriesScreen';
import DailyRitualScreen from '../screens/DailyRitualScreen';
import TimelineScreen from '../screens/TimelineScreen';
import VoiceCallScreen from '../screens/VoiceCallScreen';
import VideoCallScreen from '../screens/VideoCallScreen';
import CoupleGameScreen from '../screens/CoupleGameScreen';
import WatchTogetherScreen from '../screens/WatchTogetherScreen';

// ─── Navigators ───────────────────────────────────────────────────────────────

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator();

// ─── Tab screens wrapped with the shared header ────────────────────────────────

const TabWrapper: React.FC<{ title: string; Screen: React.FC }> = ({ title, Screen }) => (
  <View style={{ flex: 1, backgroundColor: '#0D0D0D' }}>
    <AppHeader title={title} />
    <Screen />
  </View>
);

const withHeader = (title: string, Component: React.FC) => () =>
  <TabWrapper title={title} Screen={Component} />;

const ChatTab = withHeader('Chat', ChatScreen);
const TogetherTab = withHeader('Together', TogetherScreen);
const MemoriesTab = withHeader('Memories', MemoriesTabScreen);
const PlayTab = withHeader('Play', PlayScreen);
const UniverseTab = withHeader('Universe', UniverseScreen);

// ─── Bottom Tab Navigator ─────────────────────────────────────────────────────

const MainTabNavigator = () => (
  <Tab.Navigator
    screenOptions={{
      headerShown: false,
      tabBarStyle: {
        backgroundColor: '#0D0D0D',
        borderTopColor: '#1F1F2E',
        borderTopWidth: 1,
        height: 62,
        paddingBottom: 8,
        paddingTop: 6,
      },
      tabBarActiveTintColor: COLORS.accent,
      tabBarInactiveTintColor: '#55556A',
      tabBarLabelStyle: {
        fontSize: 10,
        fontWeight: '600',
        letterSpacing: 0.2,
      },
    }}
  >
    <Tab.Screen
      name="ChatTab"
      component={ChatTab}
      options={{
        tabBarLabel: 'Chat',
        tabBarIcon: ({ color, size }) => (
          <Ionicons name="chatbubble-ellipses-outline" size={size} color={color} />
        ),
      }}
    />
    <Tab.Screen
      name="TogetherTab"
      component={TogetherTab}
      options={{
        tabBarLabel: 'Together',
        tabBarIcon: ({ color, size }) => (
          <Ionicons name="heart-outline" size={size} color={color} />
        ),
      }}
    />
    <Tab.Screen
      name="MemoriesTab"
      component={MemoriesTab}
      options={{
        tabBarLabel: 'Memories',
        tabBarIcon: ({ color, size }) => (
          <Ionicons name="albums-outline" size={size} color={color} />
        ),
      }}
    />
    <Tab.Screen
      name="PlayTab"
      component={PlayTab}
      options={{
        tabBarLabel: 'Play',
        tabBarIcon: ({ color, size }) => (
          <Ionicons name="game-controller-outline" size={size} color={color} />
        ),
      }}
    />
    <Tab.Screen
      name="UniverseTab"
      component={UniverseTab}
      options={{
        tabBarLabel: 'Universe',
        tabBarIcon: ({ color, size }) => (
          <Ionicons name="planet-outline" size={size} color={color} />
        ),
      }}
    />
  </Tab.Navigator>
);

// ─── Auth Stack ───────────────────────────────────────────────────────────────

const AuthStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }} initialRouteName="Welcome">
    <Stack.Screen name="Welcome" component={WelcomeScreen} />
    <Stack.Screen name="Login" component={LoginScreen} />
    <Stack.Screen name="Register" component={RegisterScreen} />
    <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
  </Stack.Navigator>
);

// ─── Onboarding Stack ─────────────────────────────────────────────────────────

const OnboardingStack = () => {
  const { userStatus } = useAuth();
  const initialRoute = userStatus === 'waiting_for_partner' ? 'WaitingForPartner' : 'Onboarding';
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }} initialRouteName={initialRoute}>
      <Stack.Screen name="Onboarding" component={OnboardingScreen} />
      <Stack.Screen name="CreateConstellation" component={CreateConstellationScreen} />
      <Stack.Screen name="JoinConstellation" component={JoinConstellationScreen} />
      <Stack.Screen name="WaitingForPartner" component={WaitingForPartnerScreen} />
      <Stack.Screen name="Profile" component={ProfileScreen} />
    </Stack.Navigator>
  );
};

// ─── App Stack ────────────────────────────────────────────────────────────────

const AppStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    {/* Tab root */}
    <Stack.Screen name="Home" component={MainTabNavigator} />

    {/* Header-icon destinations */}
    <Stack.Screen name="Profile" component={ProfileScreen} />
    <Stack.Screen name="Settings" component={SettingsScreen} />

    {/* Post-signup / quiz */}
    <Stack.Screen name="Quiz" component={QuizScreen} />
    <Stack.Screen name="StarReveal" component={StarRevealScreen} />

    {/* Legacy / detail screens reachable from within tabs */}
    <Stack.Screen name="Chat" component={ChatScreen} />
    <Stack.Screen name="ConstellationView" component={ConstellationViewScreen} />
    <Stack.Screen name="DatePlans" component={DatePlansScreen} />
    <Stack.Screen name="Memories" component={MemoriesScreen} />
    <Stack.Screen name="DailyRitual" component={DailyRitualScreen} />
    <Stack.Screen name="Timeline" component={TimelineScreen} />
    <Stack.Screen name="VoiceCall" component={VoiceCallScreen} />
    <Stack.Screen name="VideoCall" component={VideoCallScreen} />
    <Stack.Screen name="CoupleGame" component={CoupleGameScreen} />
    <Stack.Screen name="WatchTogether" component={WatchTogetherScreen} />
  </Stack.Navigator>
);

// ─── Root Navigator ────────────────────────────────────────────────────────────

const AppNavigator = () => {
  const { user, userStatus, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background }}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (!user) return <AuthStack />;

  switch (userStatus) {
    case 'no_constellation':
      return <OnboardingStack />;
    case 'waiting_for_partner':
    case 'complete':
      return <AppStack />;
    case null:
    default:
      return <OnboardingStack />;
  }
};

export default AppNavigator;
