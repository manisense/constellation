import React from 'react';
import {
  View,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
} from 'react-native';
import { COLORS } from '../constants/theme';
import Header from './Header';
import { useAuth } from '../provider/AuthProvider';

interface ScreenProps {
  children: React.ReactNode;
  showHeader?: boolean;
  headerTitle?: string;
  showLogo?: boolean;
  showProfile?: boolean;
  showNotification?: boolean;
  scrollable?: boolean;
  keyboardAvoiding?: boolean;
  style?: any;
}

const Screen: React.FC<ScreenProps> = ({
  children,
  showHeader = true,
  headerTitle,
  showLogo = true,
  showProfile = true,
  showNotification = true,
  scrollable = false,
  keyboardAvoiding = false,
  style,
}) => {
  const { user } = useAuth();
  
  // Only show profile and notification buttons if user is authenticated
  const shouldShowProfile = showProfile && !!user;
  const shouldShowNotification = showNotification && !!user;

  const renderContent = () => {
    let content = <View style={[styles.contentContainer, style]}>{children}</View>;

    if (scrollable) {
      content = (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[styles.scrollContent, style]}
        >
          {children}
        </ScrollView>
      );
    }

    if (keyboardAvoiding) {
      return (
        <KeyboardAvoidingView
          style={styles.keyboardAvoidingView}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          {content}
        </KeyboardAvoidingView>
      );
    }

    return content;
  };

  return (
    <View style={styles.mainContainer}>
      <StatusBar
        barStyle="light-content"
        backgroundColor={COLORS.gray900}
        translucent={true}
      />
      {/* SafeAreaView for top inset (status bar) */}
      <SafeAreaView style={styles.safeAreaTop} />
      
      {/* Header */}
      {showHeader && (
        <Header
          title={headerTitle}
          showLogo={showLogo}
          showProfile={shouldShowProfile}
          showNotification={shouldShowNotification}
        />
      )}
      
      {/* Main content */}
      <SafeAreaView style={styles.safeAreaContent}>
        {renderContent()}
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  safeAreaTop: {
    flex: 0,
    backgroundColor: COLORS.gray900,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  safeAreaContent: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  contentContainer: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
});

export default Screen; 