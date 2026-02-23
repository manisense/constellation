import React from 'react';
import { View, SafeAreaView, StatusBar, KeyboardAvoidingView, ScrollView, Platform, StyleSheet, ViewStyle } from 'react-native';
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
    <View className="flex-1 bg-background" style={styles.rootContainer}>
      <StatusBar
        barStyle="light-content"
        backgroundColor="#212121"
        translucent={true}
      />
      {/* Header handles its own top safe area inset internally */}
      {showHeader && (
        <Header
          title={headerTitle}
        />
      )}

      {/* Main content */}
      <SafeAreaView className="flex-1 bg-background" style={styles.contentSafeArea}>
        {renderContent()}
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  rootContainer: {
    flex: 1,
    backgroundColor: '#121212',
  },
  topSafeArea: {
    backgroundColor: '#212121',
  },
  contentSafeArea: {
    flex: 1,
    backgroundColor: '#121212',
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