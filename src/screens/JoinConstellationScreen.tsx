import React, { useState, useEffect } from 'react';
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
  Image
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { COLORS, FONTS, SPACING } from '../constants/theme';
import { joinConstellationWithCode } from '../utils/supabase';
import { Ionicons } from '@expo/vector-icons';
import Screen from '../components/Screen';
import { useAuth } from '../provider/AuthProvider';
import Button from '../components/Button';

type JoinConstellationScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'JoinConstellation'>;
};

const JoinConstellationScreen: React.FC<JoinConstellationScreenProps> = ({ navigation }) => {
  const { user, refreshUserStatus } = useAuth();
  const [inviteCode, setInviteCode] = useState('');
  const [loading, setLoading] = useState(false);

  // Check if user is authenticated
  useEffect(() => {
    if (!user) {
      console.log("No authenticated user, redirecting to Welcome");
      navigation.reset({
        index: 0,
        routes: [{ name: 'Welcome' }],
      });
    }
  }, [user, navigation]);

  const handleJoinConstellation = async () => {
    if (!user) {
      Alert.alert('Error', 'You must be logged in to join a constellation');
      navigation.reset({
        index: 0,
        routes: [{ name: 'Welcome' }],
      });
      return;
    }

    if (!inviteCode.trim()) {
      Alert.alert('Error', 'Please enter an invite code');
      return;
    }

    setLoading(true);
    try {
      console.log("Joining constellation with invite code:", inviteCode.toUpperCase());
      console.log("User ID:", user.id);
      
      // Join constellation using direct SQL approach (bypassing RPC)
      const { data, error } = await joinConstellationWithCode(inviteCode.toUpperCase());
      
      if (error) {
        console.error("Error details:", error);
        throw error;
      }
      
      // Check if the response indicates success
      if (data && data.success === true) {
        console.log('Successfully joined constellation:', data.constellation_id);
        
        // Refresh user status to update the context
        await refreshUserStatus();
        
        // Navigate to the Home screen instead of Quiz
        console.log('Navigating to Home screen');
        navigation.navigate('Home');
      } else {
        console.error("Unsuccessful response:", data);
        throw new Error(data?.message || 'Failed to join constellation');
      }
    } catch (error: any) {
      console.error('Error joining constellation:', error);
      
      // Check if the error is because the user is already in a constellation
      if (error.message && error.message.includes('User is already in a constellation')) {
        console.log('User is already in a constellation, refreshing status');
        
        // Refresh user status to get the latest data
        await refreshUserStatus();
        
        // The navigation will be handled by the AppNavigator based on userStatus
      } else {
        // Show error alert for other errors
        Alert.alert('Error', error.message || 'Failed to join constellation. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen 
      showHeader={true} 
      headerTitle="Join Constellation"
      keyboardAvoiding={true}
      scrollable={true}
    >
      <View style={styles.container}>
        {loading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color={COLORS.primary} />
          </View>
        )}
        
        <View style={styles.header}>
          <Text style={styles.title}>Join a Constellation</Text>
          <Text style={styles.subtitle}>
            Enter the invite code shared by your partner
          </Text>
        </View>
        
        <View style={styles.formContainer}>
          <Text style={styles.label}>Invite Code</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter 6-digit code"
            placeholderTextColor={COLORS.gray500}
            value={inviteCode}
            onChangeText={setInviteCode}
            autoCapitalize="characters"
            maxLength={6}
          />
          
          <Button
            title="Join Constellation"
            onPress={handleJoinConstellation}
            style={styles.button}
            loading={loading}
          />
        </View>
        
        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
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
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.l,
  },
  backButton: {
    padding: SPACING.s,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: {
    width: 200,
    height: 200,
    marginBottom: SPACING.l,
  },
  title: {
    fontSize: FONTS.h1,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginBottom: SPACING.s,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: FONTS.body1,
    color: COLORS.gray700,
    marginBottom: SPACING.l,
    textAlign: 'center',
  },
  inputContainer: {
    width: '100%',
    borderWidth: 1,
    borderColor: COLORS.gray300,
    borderRadius: 8,
    marginBottom: SPACING.l,
    paddingHorizontal: SPACING.m,
    backgroundColor: COLORS.white,
  },
  input: {
    height: 50,
    color: COLORS.gray900,
    fontSize: FONTS.body1,
    textAlign: 'center',
    letterSpacing: 2,
  },
  joinButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    marginBottom: SPACING.m,
  },
  joinButtonText: {
    color: COLORS.white,
    fontSize: FONTS.body1,
    fontWeight: 'bold',
  },
  createButton: {
    borderWidth: 1,
    borderColor: COLORS.primary,
    borderRadius: 8,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  createButtonText: {
    color: COLORS.primary,
    fontSize: FONTS.body1,
    fontWeight: 'bold',
  },
  formContainer: {
    width: '100%',
    padding: SPACING.l,
  },
  label: {
    fontSize: FONTS.body1,
    fontWeight: 'bold',
    color: COLORS.gray900,
    marginBottom: SPACING.s,
  },
  button: {
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    marginBottom: SPACING.m,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: SPACING.m,
  },
  backButtonText: {
    color: COLORS.primary,
    fontSize: FONTS.body1,
    fontWeight: 'bold',
  },
});

export default JoinConstellationScreen; 