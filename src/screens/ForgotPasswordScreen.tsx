import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { COLORS, FONTS, SPACING } from '../constants/theme';
import Screen from '../components/Screen';
import Input from '../components/Input';
import Button from '../components/Button';
import { supabase } from '../utils/supabase';

type ForgotPasswordScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'ForgotPassword'>;
};

const ForgotPasswordScreen: React.FC<ForgotPasswordScreenProps> = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  const handleResetPassword = async () => {
    if (!email) {
      Alert.alert('Error', 'Please enter your email address');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: 'constellation://reset-password',
      });
      
      if (error) throw error;
      
      setResetSent(true);
    } catch (error: any) {
      console.error('Password reset error:', error);
      Alert.alert('Error', error.message || 'Failed to send password reset email');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen showHeader={true} headerTitle="Reset Password" showLogo={true}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <View style={styles.headerContainer}>
          <Text style={styles.title}>Reset Password</Text>
          <Text style={styles.subtitle}>
            {resetSent
              ? 'Check your email for reset instructions'
              : 'Enter your email to receive a password reset link'}
          </Text>
        </View>

        {!resetSent ? (
          <View style={styles.formContainer}>
            <Input
              label="Email"
              placeholder="Enter your email"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <Button
              title="Reset Password"
              onPress={handleResetPassword}
              loading={loading}
              style={styles.button}
            />
          </View>
        ) : (
          <View style={styles.successContainer}>
            <Text style={styles.successText}>
              We've sent a password reset link to your email. Please check your inbox and follow the instructions.
            </Text>
            <Button
              title="Back to Login"
              onPress={() => navigation.navigate('Login')}
              style={styles.button}
            />
          </View>
        )}

        <View style={styles.footerContainer}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.backText}>Back to Login</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: SPACING.l,
    justifyContent: 'space-between',
  },
  headerContainer: {
    marginTop: SPACING.xl,
    marginBottom: SPACING.xl,
  },
  title: {
    fontSize: FONTS.h1,
    fontWeight: 'bold',
    color: COLORS.white,
    marginBottom: SPACING.xs,
  },
  subtitle: {
    fontSize: FONTS.body1,
    color: COLORS.gray300,
  },
  formContainer: {
    flex: 1,
    justifyContent: 'flex-start',
  },
  successContainer: {
    flex: 1,
    justifyContent: 'flex-start',
  },
  successText: {
    fontSize: FONTS.body1,
    color: COLORS.white,
    marginBottom: SPACING.xl,
    lineHeight: 24,
  },
  button: {
    marginTop: SPACING.l,
  },
  footerContainer: {
    alignItems: 'center',
    marginBottom: SPACING.l,
  },
  backText: {
    color: COLORS.primary,
    fontSize: FONTS.body2,
    fontWeight: 'bold',
  },
});

export default ForgotPasswordScreen; 