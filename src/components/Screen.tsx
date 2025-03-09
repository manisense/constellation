import React from 'react';
import {
  View,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  ViewStyle,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { COLORS } from '../constants/theme';
import Header from './Header';

interface ScreenProps {
  children: React.ReactNode;
  style?: ViewStyle;
  header?: {
    title: string;
    leftIcon?: React.ReactNode;
    rightIcon?: React.ReactNode;
    onLeftPress?: () => void;
    onRightPress?: () => void;
    showBorder?: boolean;
  };
  scrollable?: boolean;
  keyboardAvoiding?: boolean;
  statusBarColor?: string;
  statusBarStyle?: 'light-content' | 'dark-content';
}

const Screen: React.FC<ScreenProps> = ({
  children,
  style,
  header,
  scrollable = false,
  keyboardAvoiding = false,
  statusBarColor = COLORS.background,
  statusBarStyle = 'light-content',
}) => {
  const renderContent = () => {
    const content = (
      <View style={[styles.container, style]}>
        {header && (
          <Header
            title={header.title}
            leftIcon={header.leftIcon}
            rightIcon={header.rightIcon}
            onLeftPress={header.onLeftPress}
            onRightPress={header.onRightPress}
            showBorder={header.showBorder}
          />
        )}
        {scrollable ? (
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollViewContent}
            showsVerticalScrollIndicator={false}
          >
            {children}
          </ScrollView>
        ) : (
          children
        )}
      </View>
    );

    if (keyboardAvoiding) {
      return (
        <KeyboardAvoidingView
          style={styles.keyboardAvoidingView}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        >
          {content}
        </KeyboardAvoidingView>
      );
    }

    return content;
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar
        backgroundColor={statusBarColor}
        barStyle={statusBarStyle}
      />
      {renderContent()}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    flexGrow: 1,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
});

export default Screen; 