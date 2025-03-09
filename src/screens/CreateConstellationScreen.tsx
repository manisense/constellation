import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Share,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { COLORS, FONTS, SPACING } from '../constants/theme';
import Screen from '../components/Screen';
import Button from '../components/Button';
import Input from '../components/Input';
import Card from '../components/Card';
import { db, auth, onAuthStateChanged } from '../services/firebase';
import { doc, setDoc, serverTimestamp, updateDoc, collection } from 'firebase/firestore';

type CreateConstellationScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'CreateConstellation'>;
};

const CreateConstellationScreen: React.FC<CreateConstellationScreenProps> = ({
  navigation,
}) => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [constellationName, setConstellationName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [constellationId, setConstellationId] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setIsAuthenticated(!!user);
      
      // If not authenticated, redirect to login
      if (!user) {
        Alert.alert(
          'Authentication Required',
          'Please sign in or create an account to create a constellation.',
          [
            {
              text: 'Sign In',
              onPress: () => navigation.navigate('Login'),
            },
            {
              text: 'Create Account',
              onPress: () => navigation.navigate('Register'),
            },
          ]
        );
      }
    });

    return () => unsubscribe();
  }, []);

  const handleCreateConstellation = async () => {
    if (!constellationName.trim()) {
      Alert.alert('Error', 'Please enter a constellation name');
      return;
    }

    if (!isAuthenticated) {
      Alert.alert(
        'Authentication Required',
        'Please sign in or create an account to create a constellation.',
        [
          {
            text: 'Sign In',
            onPress: () => navigation.navigate('Login'),
          },
          {
            text: 'Create Account',
            onPress: () => navigation.navigate('Register'),
          },
        ]
      );
      return;
    }

    setLoading(true);
    try {
      // Generate a random invite code
      const generatedInviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();
      setInviteCode(generatedInviteCode);

      // Create a new constellation document
      const newConstellationRef = doc(collection(db, 'constellations'));
      const constellationData = {
        id: newConstellationRef.id,
        name: constellationName,
        partnerIds: [auth.currentUser?.uid],
        createdAt: serverTimestamp(),
        bondingStrength: 0,
        quizResults: [],
        inviteCode: generatedInviteCode,
      };

      await setDoc(newConstellationRef, constellationData);
      setConstellationId(newConstellationRef.id);
      
      // Update user's constellation ID
      if (auth.currentUser) {
        await updateDoc(doc(db, 'users', auth.currentUser.uid), {
          constellationId: newConstellationRef.id
        });
      }
      
      // Move to step 2
      setStep(2);
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleShareInvite = async () => {
    try {
      await Share.share({
        message: `Join my constellation in the Constellation app! Use invite code: ${inviteCode}`,
      });
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  const handleContinue = () => {
    navigation.navigate('Profile');
  };

  const renderStep1 = () => {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Create Your Constellation</Text>
        <Text style={styles.subtitle}>
          Give your relationship a name that represents your unique bond
        </Text>

        <Card style={styles.card}>
          <Input
            label="Constellation Name"
            placeholder="Enter a name for your constellation"
            value={constellationName}
            onChangeText={setConstellationName}
          />

          <Button
            title="Create Constellation"
            onPress={handleCreateConstellation}
            loading={loading}
            style={styles.button}
          />
        </Card>
      </View>
    );
  };

  const renderStep2 = () => {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Invite Your Partner</Text>
        <Text style={styles.subtitle}>
          Share this code with your partner to join your constellation
        </Text>

        <Card style={styles.card}>
          <View style={styles.inviteCodeContainer}>
            <Text style={styles.inviteCodeLabel}>Your Invite Code</Text>
            <Text style={styles.inviteCode}>{inviteCode}</Text>
          </View>

          <Button
            title="Share Invite Code"
            onPress={handleShareInvite}
            style={styles.button}
          />

          <Button
            title="Continue to Profile"
            onPress={handleContinue}
            variant="outline"
            style={styles.button}
          />
        </Card>
      </View>
    );
  };

  return (
    <Screen>
      {step === 1 ? renderStep1() : renderStep2()}
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
  card: {
    padding: SPACING.l,
  },
  button: {
    marginTop: SPACING.m,
  },
  inviteCodeContainer: {
    alignItems: 'center',
    marginBottom: SPACING.m,
  },
  inviteCodeLabel: {
    fontSize: FONTS.body2,
    color: COLORS.gray300,
    marginBottom: SPACING.xs,
  },
  inviteCode: {
    fontSize: FONTS.h1,
    fontWeight: 'bold',
    color: COLORS.primary,
    letterSpacing: 2,
  },
});

export default CreateConstellationScreen; 