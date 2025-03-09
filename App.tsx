import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import AppNavigator from './src/navigation';
import { COLORS } from './src/constants/theme';

export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar style="light" backgroundColor={COLORS.background} />
      <AppNavigator />
    </SafeAreaProvider>
  );
}
