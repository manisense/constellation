import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  ActivityIndicator,
  TouchableOpacity,
  TextInput,
  Platform,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../types';
import { COLORS, FONTS, SPACING } from '../constants/theme';
import Screen from '../components/Screen';
import Input from '../components/Input';
import Button from '../components/Button';
import { auth, db } from '../services/firebase';
import { 
  PhoneAuthProvider,
  signInWithCredential,
} from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';

type PhoneAuthScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'PhoneAuth'>;
  route: RouteProp<RootStackParamList, 'PhoneAuth'>;
};

const PhoneAuthScreen: React.FC<PhoneAuthScreenProps> = ({ navigation, route }) => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [verificationId, setVerificationId] = useState('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'phone' | 'code'>('phone');
  const constellationId = route.params?.constellationId;

  // Function to handle phone number input, limiting to 10 digits
  const handlePhoneNumberChange = (text: string) => {
    // Remove any non-digit characters
    const cleaned = text.replace(/\D/g, '');
    
    // Limit to 10 digits
    if (cleaned.length <= 10) {
      setPhoneNumber(cleaned);
    }
  };

  const handleSendCode = async () => {
    if (phoneNumber.length !== 10) {
      Alert.alert('Error', 'Please enter a valid 10-digit phone number');
      return;
    }

    setLoading(true);
    try {
      // Format phone number with country code
      const formattedPhoneNumber = '+91' + phoneNumber;
      
      // For development/testing purposes only
      // In a real app, you would use Firebase's phone auth with proper RecaptchaVerifier
      // This is a simplified approach for development
      
      // Simulate verification ID for development
      const mockVerificationId = 'dev-verification-id-' + Date.now();
      setVerificationId(mockVerificationId);
      setStep('code');
      
      Alert.alert(
        'Development Mode', 
        'In development mode, any 6-digit code will work. In production, you would receive an actual SMS.'
      );
    } catch (error: any) {
      console.error('Error sending verification code:', error);
      Alert.alert(
        'Error', 
        'Failed to send verification code. Please try again later.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!verificationCode.trim() || verificationCode.length !== 6) {
      Alert.alert('Error', 'Please enter a valid 6-digit verification code');
      return;
    }

    setLoading(true);
    try {
      // In development mode, we'll simulate a successful verification
      // In production, you would use PhoneAuthProvider.credential and signInWithCredential
      
      // Generate a random user ID for development
      const mockUserId = 'dev-user-' + Date.now();
      
      // Create or update user document in Firestore
      await setDoc(doc(db, 'users', mockUserId), {
        id: mockUserId,
        phoneNumber: '+91' + phoneNumber,
        createdAt: serverTimestamp(),
        constellationId: constellationId || null,
        // Add other default fields
        name: '',
        email: '',
        photoURL: '',
        about: '',
        interests: [],
        starName: '',
        starType: null,
      }, { merge: true });
      
      // Navigate based on whether user is joining or creating
      if (constellationId) {
        navigation.reset({
          index: 0,
          routes: [{ name: 'Profile' }],
        });
      } else {
        navigation.reset({
          index: 0,
          routes: [{ name: 'CreateConstellation' }],
        });
      }
    } catch (error: any) {
      console.error('Error verifying code:', error);
      Alert.alert('Error', 'Invalid verification code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <View style={styles.container}>
        <Text style={styles.title}>
          {step === 'phone' ? 'Enter Phone Number' : 'Enter Verification Code'}
        </Text>
        <Text style={styles.subtitle}>
          {step === 'phone'
            ? "Well send you a verification code"
            : "Enter the code we sent to your phone"}
        </Text>

        {step === 'phone' ? (
          <View style={styles.phoneInputContainer}>
            <View style={styles.countryCodeContainer}>
              <Text style={styles.countryCode}>+91</Text>
            </View>
            <TextInput
              style={styles.phoneInput}
              placeholder="Enter 10-digit number"
              value={phoneNumber}
              onChangeText={handlePhoneNumberChange}
              keyboardType="phone-pad"
              maxLength={10}
            />
          </View>
        ) : (
          <Input
            label="Verification Code"
            placeholder="123456"
            value={verificationCode}
            onChangeText={setVerificationCode}
            keyboardType="number-pad"
            maxLength={6}
          />
        )}

        <Button
          title={step === 'phone' ? 'Send Code' : 'Verify'}
          onPress={step === 'phone' ? handleSendCode : handleVerifyCode}
          loading={loading}
          style={styles.button}
        />
        
        {step === 'code' && (
          <TouchableOpacity 
            style={styles.backButton} 
            onPress={() => setStep('phone')}
          >
            <Text style={styles.backButtonText}>Change Phone Number</Text>
          </TouchableOpacity>
        )}
        
        <View style={styles.infoContainer}>
          <Text style={styles.infoText}>
            Development Mode Information:
          </Text>
          <Text style={styles.infoItem}>• This is running in development mode</Text>
          <Text style={styles.infoItem}>• Any 6-digit code will work for verification</Text>
          <Text style={styles.infoItem}>• In production, you need to set up:</Text>
          <Text style={styles.infoItem}>  - google-services.json in android/app/</Text>
          <Text style={styles.infoItem}>  - Enable Phone Authentication in Firebase Console</Text>
          <Text style={styles.infoItem}>  - Configure SHA-1 certificate fingerprint</Text>
        </View>
      </View>
    </Screen>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: SPACING.l,
  },
  title: {
    fontSize: FONTS.h2,
    fontWeight: 'bold',
    color: COLORS.white,
    marginBottom: SPACING.xs,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: FONTS.body1,
    color: COLORS.gray300,
    marginBottom: SPACING.xl,
    textAlign: 'center',
  },
  phoneInputContainer: {
    flexDirection: 'row',
    marginBottom: SPACING.l,
    borderWidth: 1,
    borderColor: COLORS.gray700,
    borderRadius: 8,
    overflow: 'hidden',
  },
  countryCodeContainer: {
    backgroundColor: COLORS.gray800,
    paddingHorizontal: SPACING.m,
    justifyContent: 'center',
    alignItems: 'center',
    borderRightWidth: 1,
    borderRightColor: COLORS.gray700,
  },
  countryCode: {
    color: COLORS.white,
    fontSize: FONTS.body1,
    fontWeight: 'bold',
  },
  phoneInput: {
    flex: 1,
    color: COLORS.white,
    fontSize: FONTS.body1,
    padding: SPACING.m,
    backgroundColor: COLORS.gray900,
  },
  button: {
    marginTop: SPACING.l,
  },
  backButton: {
    marginTop: SPACING.m,
    alignItems: 'center',
  },
  backButtonText: {
    color: COLORS.primary,
    fontSize: FONTS.body2,
  },
  infoContainer: {
    marginTop: SPACING.xl,
    padding: SPACING.m,
    backgroundColor: COLORS.gray900,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.accent,
  },
  infoText: {
    color: COLORS.gray300,
    fontSize: FONTS.body2,
    marginBottom: SPACING.s,
  },
  infoItem: {
    color: COLORS.gray300,
    fontSize: FONTS.body2,
    marginLeft: SPACING.s,
    marginBottom: SPACING.xs,
  },
});

export default PhoneAuthScreen;