import React from 'react';
import './global.css';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { ActivityIndicator, View } from 'react-native';
import { COLORS } from './src/constants/theme';
import { AuthProvider, useAuth } from './src/provider/AuthProvider';
import AppNavigator from './src/navigation';

// Loading component
const LoadingScreen = () => (
  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background }}>
    <ActivityIndicator size="large" color={COLORS.primary} />
  </View>
);

// Main app component with navigation
const MainApp = () => {
  const { loading } = useAuth();

  // Show loading screen while initializing
  if (loading) {
    return <LoadingScreen />;
  }
  
  // AppNavigator will first check if user is authenticated
  // If not authenticated, it will show auth screens (Welcome, Login, Register)
  // Only after authentication will it show constellation creation/joining screens
  return (
    <NavigationContainer>
      <StatusBar style="light" backgroundColor={COLORS.background} />
      <AppNavigator />
    </NavigationContainer>
  );
};

// Root component with providers
export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <MainApp />
      </AuthProvider>
    </SafeAreaProvider>
  );
}
