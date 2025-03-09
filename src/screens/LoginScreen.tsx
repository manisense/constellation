import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { COLORS, FONTS, SPACING } from '../constants/theme';
import Screen from '../components/Screen';
import Input from '../components/Input';
import Button from '../components/Button';
import { 
  auth, 
  signInWithEmailAndPassword, 
  googleProvider, 
  signInWithPopup,
  signInWithCredential,
  db
} from '../services/firebase';
import { GoogleAuthProvider } from 'firebase/auth';
import { AntDesign } from '@expo/vector-icons';
import { doc, setDoc, serverTimestamp, getDoc } from 'firebase/firestore';

type LoginScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Login'>;
};

const LoginScreen: React.FC<LoginScreenProps> = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleEmailLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter both email and password');
      return;
    }

    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      // Check if user has a constellation
      const user = auth.currentUser;
      if (user) {
        // Navigate to appropriate screen based on user data
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists() && userDoc.data().constellationId) {
          navigation.reset({
            index: 0,
            routes: [{ name: 'Home' }],
          });
        } else {
          navigation.reset({
            index: 0,
            routes: [{ name: 'CreateConstellation' }],
          });
        }
      }
    } catch (error: any) {
      console.error('Login error:', error);
      Alert.alert('Login Failed', error.message || 'Failed to sign in with email and password');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      if (Platform.OS === 'web') {
        // Web implementation
        const result = await signInWithPopup(auth, googleProvider);
        const credential = GoogleAuthProvider.credentialFromResult(result);
        const user = result.user;
        
        if (credential && user) {
          await handleGoogleUserData(user);
        }
      } else {
        // For Expo Go, we can't use native Google Sign-In
        // Show a message to the user
        Alert.alert(
          'Google Sign-In Unavailable',
          'Google Sign-In requires a development build or production build. Please use email/password authentication in Expo Go.',
          [
            {
              text: 'OK',
              onPress: () => setLoading(false)
            }
          ]
        );
        return;
      }
    } catch (error: any) {
      console.error('Google login error:', error);
      Alert.alert('Login Failed', error.message || 'Failed to sign in with Google');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleUserData = async (user: any) => {
    try {
      // Check if user document exists
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      
      if (!userDoc.exists()) {
        // Create user document if it doesn't exist
        await setDoc(doc(db, 'users', user.uid), {
          id: user.uid,
          email: user.email,
          name: user.displayName || '',
          photoURL: user.photoURL || '',
          createdAt: serverTimestamp(),
          constellationId: null,
          about: '',
          interests: [],
          starName: '',
          starType: null,
        });
        
        // Navigate to create constellation screen for new users
        navigation.reset({
          index: 0,
          routes: [{ name: 'CreateConstellation' }],
        });
      } else if (userDoc.data()?.constellationId) {
        // Navigate to home screen for existing users with a constellation
        navigation.reset({
          index: 0,
          routes: [{ name: 'Home' }],
        });
      } else {
        // Navigate to create constellation screen for existing users without a constellation
        navigation.reset({
          index: 0,
          routes: [{ name: 'CreateConstellation' }],
        });
      }
    } catch (error) {
      console.error('Error handling Google user data:', error);
      throw error;
    }
  };

  return (
    <Screen>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.headerContainer}>
            <Text style={styles.title}>Welcome Back</Text>
            <Text style={styles.subtitle}>Sign in to continue your journey</Text>
          </View>

          <View style={styles.formContainer}>
            <Input
              label="Email"
              placeholder="Enter your email"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <Input
              label="Password"
              placeholder="Enter your password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
            <TouchableOpacity
              style={styles.forgotPasswordContainer}
              onPress={() => navigation.navigate('ForgotPassword')}
            >
              <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
            </TouchableOpacity>

            <Button
              title="Sign In"
              onPress={handleEmailLogin}
              loading={loading}
              style={styles.button}
            />

            <View style={styles.orContainer}>
              <View style={styles.divider} />
              <Text style={styles.orText}>OR</Text>
              <View style={styles.divider} />
            </View>

            <TouchableOpacity
              style={styles.googleButton}
              onPress={handleGoogleLogin}
              disabled={loading}
            >
              <AntDesign name="google" size={24} color="#DB4437" style={styles.googleIcon} />
              <Text style={styles.googleButtonText}>Sign in with Google</Text>
            </TouchableOpacity>
            
            {Platform.OS !== 'web' && (
              <Text style={styles.noteText}>
                Note: Google Sign-In requires a development build. In Expo Go, please use email/password.
              </Text>
            )}
          </View>

          <View style={styles.footerContainer}>
            <Text style={styles.footerText}>Don't have an account?</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Register')}>
              <Text style={styles.signUpText}>Sign Up</Text>
            </TouchableOpacity>
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
    marginBottom: SPACING.xl,
  },
  forgotPasswordContainer: {
    alignSelf: 'flex-end',
    marginBottom: SPACING.l,
  },
  forgotPasswordText: {
    color: COLORS.primary,
    fontSize: FONTS.body2,
  },
  button: {
    marginBottom: SPACING.l,
  },
  orContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: SPACING.m,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.gray700,
  },
  orText: {
    color: COLORS.gray300,
    marginHorizontal: SPACING.m,
    fontSize: FONTS.body2,
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.gray800,
    borderRadius: 8,
    padding: SPACING.m,
    borderWidth: 1,
    borderColor: COLORS.gray700,
  },
  googleIcon: {
    marginRight: SPACING.s,
  },
  googleButtonText: {
    color: COLORS.white,
    fontSize: FONTS.body1,
    fontWeight: '500',
  },
  noteText: {
    color: COLORS.gray300,
    fontSize: FONTS.body2,
    textAlign: 'center',
    marginTop: SPACING.m,
    fontStyle: 'italic',
  },
  footerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.l,
  },
  footerText: {
    color: COLORS.gray300,
    fontSize: FONTS.body2,
    marginRight: SPACING.xs,
  },
  signUpText: {
    color: COLORS.primary,
    fontSize: FONTS.body2,
    fontWeight: 'bold',
  },
});

export default LoginScreen; 