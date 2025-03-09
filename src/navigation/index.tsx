import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { RootStackParamList } from '../types';

// Import screens (we'll create these next)
// Auth and Onboarding Screens
import WelcomeScreen from '../screens/WelcomeScreen';
import OnboardingScreen from '../screens/OnboardingScreen';
import CreateConstellationScreen from '../screens/CreateConstellationScreen';
import JoinConstellationScreen from '../screens/JoinConstellationScreen';
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
const BottomTabNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#121212',
          borderTopColor: '#2C2C2C',
        },
        tabBarActiveTintColor: '#3E54AC',
        tabBarInactiveTintColor: '#9E9E9E',
      }}
    >
      <Tab.Screen 
        name="Home" 
        component={HomeScreen} 
        options={{
          tabBarLabel: 'Home',
          // We'll add icons later
        }}
      />
      <Tab.Screen 
        name="Chat" 
        component={ChatScreen} 
        options={{
          tabBarLabel: 'Chat',
          // We'll add icons later
        }}
      />
      <Tab.Screen 
        name="ConstellationView" 
        component={ConstellationViewScreen} 
        options={{
          tabBarLabel: 'Constellation',
          // We'll add icons later
        }}
      />
      <Tab.Screen 
        name="Settings" 
        component={SettingsScreen} 
        options={{
          tabBarLabel: 'Settings',
          // We'll add icons later
        }}
      />
    </Tab.Navigator>
  );
};

// Main Navigation Container
const AppNavigator = () => {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Welcome"
        screenOptions={{
          headerShown: false,
        }}
      >
        {/* Auth and Onboarding Screens */}
        <Stack.Screen name="Welcome" component={WelcomeScreen} />
        <Stack.Screen name="Onboarding" component={OnboardingScreen} />
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Register" component={RegisterScreen} />
        <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
        <Stack.Screen name="CreateConstellation" component={CreateConstellationScreen} />
        <Stack.Screen name="JoinConstellation" component={JoinConstellationScreen} />
        <Stack.Screen name="Profile" component={ProfileScreen} />
        <Stack.Screen name="Quiz" component={QuizScreen} />
        <Stack.Screen name="StarReveal" component={StarRevealScreen} />
        
        {/* Main App Screens */}
        <Stack.Screen name="Home" component={BottomTabNavigator} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator; 