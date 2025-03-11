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
import { Ionicons } from '@expo/vector-icons';
import Screen from '../components/Screen';
import { createConstellation } from '../utils/supabase';
import { useAuth } from '../provider/AuthProvider';
import Button from '../components/Button';

type CreateConstellationScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'CreateConstellation'>;
};

const CreateConstellationScreen: React.FC<CreateConstellationScreenProps> = ({ navigation }) => {
  const { user, refreshUserStatus } = useAuth();
  const [constellationName, setConstellationName] = useState('');
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

  const handleCreateConstellation = async () => {
    if (!user) {
      Alert.alert('Error', 'You must be logged in to create a constellation');
      navigation.reset({
        index: 0,
        routes: [{ name: 'Welcome' }],
      });
      return;
    }

    if (!constellationName.trim()) {
      Alert.alert('Error', 'Please enter a name for your constellation');
      return;
    }

    setLoading(true);
    try {
      console.log("Creating constellation with name:", constellationName);
      console.log("User ID:", user.id);
      
      // Create constellation using the RPC function
      const { data, error } = await createConstellation(constellationName);
      
      if (error) {
        console.error("Error details:", error);
        throw error;
      }
      
      if (data && data.success) {
        console.log('Constellation created successfully:', data.constellation_id);
        console.log('Invite code:', data.invite_code);
        
        // Refresh user status to update the context
        await refreshUserStatus();
        
        // Explicitly navigate to the WaitingForPartner screen
        navigation.navigate('WaitingForPartner', { 
          inviteCode: data.invite_code 
        });
      } else {
        console.error("Unsuccessful response:", data);
        throw new Error(data?.message || 'Failed to create constellation');
      }
    } catch (error: any) {
      console.error('Error creating constellation:', error);
      
      // Check if the error is because the user is already in a constellation
      if (error.message && error.message.includes('User is already in a constellation')) {
        console.log('User is already in a constellation, redirecting to WaitingForPartner');
        
        // Refresh user status to get the latest data
        await refreshUserStatus();
        
        // Navigate to WaitingForPartner screen
        navigation.navigate('WaitingForPartner', {});
      } else {
        // Show error alert for other errors
        Alert.alert('Error', error.message || 'Failed to create constellation. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen 
      showHeader={true} 
      headerTitle="Create Constellation"
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
          <Text style={styles.title}>Create Your Constellation</Text>
          <Text style={styles.subtitle}>
            Give your constellation a meaningful name
          </Text>
        </View>
        
        <View style={styles.formContainer}>
          <Text style={styles.label}>Constellation Name</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter a name for your constellation"
            placeholderTextColor={COLORS.gray500}
            value={constellationName}
            onChangeText={setConstellationName}
            maxLength={30}
          />
          
          <Button
            title="Create Constellation"
            onPress={handleCreateConstellation}
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
  formContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: FONTS.body1,
    color: COLORS.gray700,
    marginBottom: SPACING.s,
  },
  input: {
    height: 50,
    color: COLORS.gray900,
    fontSize: FONTS.body1,
    textAlign: 'center',
    borderWidth: 1,
    borderColor: COLORS.gray300,
    borderRadius: 8,
    paddingHorizontal: SPACING.m,
    backgroundColor: COLORS.white,
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
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: SPACING.l,
  },
  backButton: {
    padding: SPACING.s,
  },
  backButtonText: {
    color: COLORS.primary,
    fontSize: FONTS.body1,
    fontWeight: 'bold',
  },
});

export default CreateConstellationScreen; 