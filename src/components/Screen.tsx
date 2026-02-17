import React from 'react';
import { View, SafeAreaView, StatusBar, KeyboardAvoidingView, ScrollView, Platform, StyleSheet } from 'react-native';
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
    <View className="flex-1 bg-background">
      <StatusBar
        barStyle="light-content"
        backgroundColor="#212121"
        translucent={true}
      />
      {/* SafeAreaView for top inset (status bar) */}
      <SafeAreaView className="flex-0 bg-gray-900 pt-0" />

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
      <SafeAreaView className="flex-1 bg-background">
        {renderContent()}
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
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