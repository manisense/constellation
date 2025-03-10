import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { COLORS, FONTS, SPACING } from '../constants/theme';
import { signUpWithEmail } from '../utils/supabase';
import { Ionicons } from '@expo/vector-icons';
import Screen from '../components/Screen';
import { useAuth } from '../provider/AuthProvider';

type RegisterScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Register'>;
};

const RegisterScreen: React.FC<RegisterScreenProps> = ({ navigation }) => {
  const { refreshUserStatus } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const validateForm = () => {
    if (!name || !email || !password || !confirmPassword) {
      Alert.alert('Error', 'Please fill in all fields');
      return false;
    }
    
    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return false;
    }
    
    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return false;
    }
    
    return true;
  };

  const handleEmailRegister = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      console.log("Starting registration process for:", email);
      
      // Register with email and password
      const userData = {
        name,
        email,
      };
      
      const { data, error } = await signUpWithEmail(email, password, userData);
      
      if (error) {
        console.error("Registration error details:", error);
        
        // Handle specific error messages
        let errorMessage = "Failed to register";
        
        // Try to extract the error message
        if (typeof error === 'object') {
          if ('message' in error) {
            errorMessage = (error as { message: string }).message;
          } else if ('error_description' in error) {
            errorMessage = (error as { error_description: string }).error_description;
          }
        } else if (typeof error === 'string') {
          errorMessage = error;
        }
        
        if (errorMessage.includes("Database error saving new user")) {
          throw new Error("Registration failed. This email may already be in use.");
        }
        
        throw new Error(errorMessage);
      }
      
      if (data && data.user) {
        console.log('User registered successfully:', data.user.id);
        
        // Show success message
        Alert.alert(
          'Registration Successful',
          'Your account has been created. You can now create or join a constellation.',
          [
            {
              text: 'OK',
              onPress: async () => {
                try {
                  // Refresh user status to determine next screen
                  await refreshUserStatus();
                  // Navigation will be handled by the AppNavigator based on user status
                } catch (refreshError) {
                  console.error("Error refreshing user status:", refreshError);
                  // Navigate to login as fallback
                  navigation.navigate('Login');
                }
              },
            },
          ]
        );
      } else {
        console.error("Registration succeeded but no user data returned");
        Alert.alert(
          'Registration Status',
          'Your account may have been created. Please check your email for confirmation and try logging in.',
          [
            {
              text: 'OK',
              onPress: () => navigation.navigate('Login'),
            },
          ]
        );
      }
    } catch (error: any) {
      console.error('Registration error:', error);
      Alert.alert('Registration Error', error.message || 'Failed to register. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {loading && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="large" color={COLORS.primary} />
            </View>
          )}
          
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>Sign up to get started</Text>
          
          <View style={styles.form}>
            <View style={styles.inputContainer}>
              <Ionicons name="person-outline" size={20} color={COLORS.gray500} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Full Name"
                placeholderTextColor={COLORS.gray500}
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
              />
            </View>
            
            <View style={styles.inputContainer}>
              <Ionicons name="mail-outline" size={20} color={COLORS.gray500} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Email"
                placeholderTextColor={COLORS.gray500}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
              />
            </View>
            
            <View style={styles.inputContainer}>
              <Ionicons name="lock-closed-outline" size={20} color={COLORS.gray500} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Password"
                placeholderTextColor={COLORS.gray500}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity 
                onPress={() => setShowPassword(!showPassword)}
                style={styles.passwordToggle}
              >
                <Ionicons 
                  name={showPassword ? "eye-off-outline" : "eye-outline"} 
                  size={20} 
                  color={COLORS.gray500} 
                />
              </TouchableOpacity>
            </View>
            
            <View style={styles.inputContainer}>
              <Ionicons name="lock-closed-outline" size={20} color={COLORS.gray500} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Confirm Password"
                placeholderTextColor={COLORS.gray500}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={!showConfirmPassword}
              />
              <TouchableOpacity 
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                style={styles.passwordToggle}
              >
                <Ionicons 
                  name={showConfirmPassword ? "eye-off-outline" : "eye-outline"} 
                  size={20} 
                  color={COLORS.gray500} 
                />
              </TouchableOpacity>
            </View>
            
            <TouchableOpacity
              style={styles.registerButton}
              onPress={handleEmailRegister}
              disabled={loading}
            >
              <Text style={styles.registerButtonText}>Sign Up</Text>
            </TouchableOpacity>
            
            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or</Text>
              <View style={styles.dividerLine} />
            </View>
            
            <View style={styles.loginContainer}>
              <Text style={styles.loginText}>Already have an account? </Text>
              <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                <Text style={styles.loginLink}>Sign In</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: SPACING.l,
    justifyContent: 'center',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.white,
    marginBottom: SPACING.s,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.gray400,
    marginBottom: SPACING.xxl,
  },
  form: {
    width: '100%',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.gray800,
    borderRadius: 8,
    marginBottom: SPACING.m,
    paddingHorizontal: SPACING.m,
    height: 56,
  },
  inputIcon: {
    marginRight: SPACING.s,
  },
  input: {
    flex: 1,
    color: COLORS.white,
    fontSize: 16,
    height: '100%',
  },
  passwordToggle: {
    padding: SPACING.s,
  },
  registerButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.l,
  },
  registerButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.l,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.gray700,
  },
  dividerText: {
    color: COLORS.gray500,
    paddingHorizontal: SPACING.m,
    fontSize: 14,
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: SPACING.l,
  },
  loginText: {
    color: COLORS.gray400,
    fontSize: 14,
  },
  loginLink: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: 'bold',
  },
});

export default RegisterScreen; 