import React, { useState, useEffect } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { RootStackParamList } from '../types/index';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/theme';
import { useAuth } from '../hooks/useAuth';

// Import screens
// Auth and Onboarding Screens
import WelcomeScreen from '../screens/WelcomeScreen';
import OnboardingScreen from '../screens/OnboardingScreen';
import CreateConstellationScreen from '../screens/CreateConstellationScreen';
import JoinConstellationScreen from '../screens/JoinConstellationScreen';
import WaitingForPartnerScreen from '../screens/WaitingForPartner';
import ProfileScreen from '../screens/ProfileScreen';
import QuizScreen from '../screens/QuizScreen';
import StarRevealScreen from '../screens/StarRevealScreen';
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import ForgotPasswordScreen from '../screens/ForgotPasswordScreen';

// Main App Screens
import HomeScreen from '../screens/HomeScreen';
import ChatScreen from '../screens/ChatScreen';
import ConstellationViewScreen from '../screens/ConstellationViewScreen';
import SettingsScreen from '../screens/SettingsScreen';

// Create navigators
const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator();

// Bottom Tab Navigator
const MainTabNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#121212',
          borderTopColor: '#2C2C2C',
        },
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.gray500,
      }}
    >
      <Tab.Screen 
        name="HomeTab" 
        component={HomeScreen} 
        options={{
          tabBarLabel: 'Home',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home-outline" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen 
        name="ChatTab" 
        component={ChatScreen} 
        options={{
          tabBarLabel: 'Chat',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="chatbubble-outline" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen 
        name="ConstellationTab" 
        component={ConstellationViewScreen} 
        options={{
          tabBarLabel: 'Constellation',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="star-outline" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen 
        name="SettingsTab" 
        component={SettingsScreen} 
        options={{
          tabBarLabel: 'Settings',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="settings-outline" size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
};

// Auth Stack - This is shown first when no user is authenticated
const AuthStack = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
      initialRouteName="Welcome"
    >
      <Stack.Screen name="Welcome" component={WelcomeScreen} />
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
      <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
    </Stack.Navigator>
  );
};

// Onboarding Stack (only shown after authentication)
const OnboardingStack = () => {
  const { userStatus } = useAuth();
  
  // Determine initial route based on user status
  const initialRoute = userStatus === 'waiting_for_partner' ? 'WaitingForPartner' : 'Onboarding';
  
  console.log("OnboardingStack initialRoute:", initialRoute);
  
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
      initialRouteName={initialRoute}
    >
      <Stack.Screen name="Onboarding" component={OnboardingScreen} />
      <Stack.Screen name="CreateConstellation" component={CreateConstellationScreen} />
      <Stack.Screen name="JoinConstellation" component={JoinConstellationScreen} />
      <Stack.Screen name="WaitingForPartner" component={WaitingForPartnerScreen} />
      <Stack.Screen name="Profile" component={ProfileScreen} />
    </Stack.Navigator>
  );
};

// Quiz Stack (constellation formed but quiz not completed)
const QuizStack = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="Quiz" component={QuizScreen} />
      <Stack.Screen name="StarReveal" component={StarRevealScreen} />
    </Stack.Navigator>
  );
};

// App Stack (fully authenticated with constellation and quiz completed)
const AppStack = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="Home" component={MainTabNavigator} />
      <Stack.Screen name="Chat" component={ChatScreen} />
      <Stack.Screen name="ConstellationView" component={ConstellationViewScreen} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
      <Stack.Screen name="Profile" component={ProfileScreen} />
      <Stack.Screen name="Quiz" component={QuizScreen} />
      <Stack.Screen name="StarReveal" component={StarRevealScreen} />
    </Stack.Navigator>
  );
};

// Main Navigation Stack
const AppNavigator = () => {
  const { user, userStatus, loading, refreshUserStatus } = useAuth();
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Effect to handle null userStatus when user is authenticated
  useEffect(() => {
    const handleNullStatus = async () => {
      if (user && userStatus === null && !isRefreshing) {
        console.log("User is authenticated but status is null, refreshing status...");
        setIsRefreshing(true);
        await refreshUserStatus();
        setIsRefreshing(false);
      }
    };
    
    handleNullStatus();
  }, [user, userStatus, isRefreshing]);
  
  // If still loading or refreshing, show loading indicator
  if (loading || isRefreshing) {
    return null;
  }
  
  // First check if user is authenticated - this ensures auth screens come first
  if (!user) {
    console.log("No authenticated user, showing AuthStack");
    // If no user is logged in, show the auth stack (Welcome, Login, Register)
    return <AuthStack />;
  }
  
  console.log("User authenticated, status:", userStatus);
  
  // User is authenticated, now determine which screen to show next
  switch (userStatus) {
    case 'no_constellation':
      // User is authenticated but has no constellation yet
      console.log("User has no constellation, showing OnboardingStack");
      return <OnboardingStack />;
    case 'waiting_for_partner':
      // User created a constellation and is waiting for partner
      console.log("User waiting for partner, showing OnboardingStack");
      return <OnboardingStack />;
    case 'quiz_needed':
      // Both users joined but we're skipping the quiz now
      console.log("Quiz needed, but skipping to AppStack since star types are auto-assigned");
      return <AppStack />;
    case 'complete':
      // Constellation is complete, show main app
      console.log("Constellation complete, showing AppStack");
      return <AppStack />;
    case null:
      // If status is still null after refresh attempt, default to OnboardingStack
      console.log("Status is null, defaulting to OnboardingStack");
      return <OnboardingStack />;
    default:
      // Default to onboarding if status is not yet determined
      console.log("Default case, showing OnboardingStack");
      return <OnboardingStack />;
  }
};

export default AppNavigator; 