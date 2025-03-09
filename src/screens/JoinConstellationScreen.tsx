import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { COLORS, FONTS, SPACING } from '../constants/theme';
import Screen from '../components/Screen';
import Button from '../components/Button';
import Input from '../components/Input';
import Card from '../components/Card';
import { db, auth, onAuthStateChanged } from '../services/firebase';
import { 
  doc, 
  collection, 
  query, 
  where, 
  getDocs,
  updateDoc,
} from 'firebase/firestore';

type JoinConstellationScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'JoinConstellation'>;
};

const JoinConstellationScreen: React.FC<JoinConstellationScreenProps> = ({
  navigation,
}) => {
  const [inviteCode, setInviteCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [inviteCodeError, setInviteCodeError] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setIsAuthenticated(!!user);
      
      // If not authenticated, redirect to login
      if (!user) {
        Alert.alert(
          'Authentication Required',
          'Please sign in or create an account to join a constellation.',
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

  const validateInviteCode = () => {
    if (!inviteCode) {
      setInviteCodeError('Invite code is required');
      return false;
    }
    setInviteCodeError('');
    return true;
  };

  const handleJoinConstellation = async () => {
    if (!validateInviteCode()) {
      return;
    }

    if (!isAuthenticated) {
      Alert.alert(
        'Authentication Required',
        'Please sign in or create an account to join a constellation.',
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
      // Check if invite code exists
      const constellationsRef = collection(db, 'constellations');
      const q = query(constellationsRef, where('inviteCode', '==', inviteCode));
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        setInviteCodeError('Invalid invite code. Please check and try again.');
        setLoading(false);
        return;
      }
      
      // Get the constellation ID
      const constellationId = querySnapshot.docs[0].id;
      const constellationData = querySnapshot.docs[0].data();
      
      // Update user's constellation ID
      const user = auth.currentUser;
      if (user) {
        await updateDoc(doc(db, 'users', user.uid), {
          constellationId: constellationId
        });
        
        // Update constellation's partner IDs
        const partnerIds = constellationData.partnerIds || [];
        if (!partnerIds.includes(user.uid)) {
          partnerIds.push(user.uid);
          await updateDoc(doc(db, 'constellations', constellationId), {
            partnerIds: partnerIds
          });
        }
        
        // Navigate to profile setup
        navigation.reset({
          index: 0,
          routes: [{ name: 'Profile' }],
        });
      }
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen scrollable keyboardAvoiding>
      <View style={styles.container}>
        <Text style={styles.title}>Join a Constellation</Text>
        <Text style={styles.subtitle}>
          Enter your partner's invite code to connect
        </Text>

        <Card variant="outlined" style={styles.inviteCard}>
          <Input
            label="Invite Code"
            placeholder="Enter invite code"
            autoCapitalize="characters"
            value={inviteCode}
            onChangeText={setInviteCode}
            onBlur={validateInviteCode}
            error={inviteCodeError}
          />
        </Card>

        <View style={styles.buttonContainer}>
          <Button
            title="Join Constellation"
            onPress={handleJoinConstellation}
            loading={loading}
            style={styles.button}
          />
        </View>

        <TouchableOpacity
          onPress={() => navigation.navigate('CreateConstellation')}
          style={styles.linkContainer}
        >
          <Text style={styles.linkText}>
            Don't have an invite code? Create a constellation
          </Text>
        </TouchableOpacity>
      </View>
    </Screen>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: SPACING.l,
    alignItems: 'center',
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
    marginBottom: SPACING.l,
    textAlign: 'center',
  },
  inviteCard: {
    width: '100%',
    marginBottom: SPACING.l,
  },
  buttonContainer: {
    width: '100%',
    marginBottom: SPACING.l,
  },
  button: {
    marginTop: SPACING.m,
  },
  linkContainer: {
    marginTop: SPACING.l,
  },
  linkText: {
    color: COLORS.accent,
    fontSize: FONTS.body2,
    textAlign: 'center',
  },
});

export default JoinConstellationScreen; 