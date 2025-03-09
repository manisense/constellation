import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
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
  createUserWithEmailAndPassword, 
  googleProvider, 
  signInWithPopup,
  signInWithCredential,
  db
} from '../services/firebase';
import { GoogleAuthProvider } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { AntDesign } from '@expo/vector-icons';

type RegisterScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Register'>;
};

const RegisterScreen: React.FC<RegisterScreenProps> = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const validateForm = () => {
    if (!email || !password || !confirmPassword) {
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

  const createUserDocument = async (userId: string, email: string, displayName?: string, photoURL?: string) => {
    try {
      await setDoc(doc(db, 'users', userId), {
        id: userId,
        email: email,
        name: displayName || '',
        photoURL: photoURL || '',
        createdAt: serverTimestamp(),
        constellationId: null,
        about: '',
        interests: [],
        starName: '',
        starType: null,
      });
    } catch (error) {
      console.error('Error creating user document:', error);
      throw error;
    }
  };

  const handleEmailRegister = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      // Create user document in Firestore
      await createUserDocument(user.uid, email);
      
      // Navigate to create constellation screen
      navigation.reset({
        index: 0,
        routes: [{ name: 'CreateConstellation' }],
      });
    } catch (error: any) {
      console.error('Registration error:', error);
      Alert.alert('Registration Failed', error.message || 'Failed to create account');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleRegister = async () => {
    setLoading(true);
    try {
      if (Platform.OS === 'web') {
        // Web implementation
        const result = await signInWithPopup(auth, googleProvider);
        const credential = GoogleAuthProvider.credentialFromResult(result);
        const user = result.user;
        
        if (credential && user) {
          // Create user document in Firestore
          await createUserDocument(user.uid, user.email || '', user.displayName || undefined, user.photoURL || undefined);
          
          // Navigate to create constellation screen
          navigation.reset({
            index: 0,
            routes: [{ name: 'CreateConstellation' }],
          });
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
      console.error('Google registration error:', error);
      Alert.alert('Registration Failed', error.message || 'Failed to sign up with Google');
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
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.headerContainer}>
            <Text style={styles.title}>Create Account</Text>
            <Text style={styles.subtitle}>Sign up to start your journey</Text>
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
              placeholder="Create a password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
            <Input
              label="Confirm Password"
              placeholder="Confirm your password"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
            />

            <Button
              title="Create Account"
              onPress={handleEmailRegister}
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
              onPress={handleGoogleRegister}
              disabled={loading}
            >
              <AntDesign name="google" size={24} color="#DB4437" style={styles.googleIcon} />
              <Text style={styles.googleButtonText}>Sign up with Google</Text>
            </TouchableOpacity>
            
            {Platform.OS !== 'web' && (
              <Text style={styles.noteText}>
                Note: Google Sign-In requires a development build. In Expo Go, please use email/password.
              </Text>
            )}
          </View>

          <View style={styles.footerContainer}>
            <Text style={styles.footerText}>Already have an account?</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={styles.signInText}>Sign In</Text>
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
  button: {
    marginTop: SPACING.m,
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
  signInText: {
    color: COLORS.primary,
    fontSize: FONTS.body2,
    fontWeight: 'bold',
  },
});

export default RegisterScreen; 