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
        
        // Refresh user status to trigger navigation to waiting screen
        await refreshUserStatus();
      } else {
        console.error("Unsuccessful response:", data);
        throw new Error(data?.message || 'Failed to create constellation');
      }
    } catch (error: any) {
      console.error('Error creating constellation:', error);
      Alert.alert('Error', error.message || 'Failed to create constellation. Please try again.');
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
          
          <View style={styles.header}>
            <TouchableOpacity 
              style={styles.backButton}
              onPress={() => navigation.goBack()}
            >
              <Ionicons name="arrow-back" size={24} color={COLORS.primary} />
            </TouchableOpacity>
          </View>
          
          <View style={styles.content}>
            <Image 
              source={require('../assets/images/constellation.png')} 
              style={styles.image}
              resizeMode="contain"
            />
            
            <Text style={styles.title}>Create Your Constellation</Text>
            <Text style={styles.subtitle}>
              Give your relationship a unique name that represents your bond.
              This will be the name of your constellation in the night sky.
            </Text>
            
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder="Constellation Name"
                placeholderTextColor={COLORS.gray500}
                value={constellationName}
                onChangeText={setConstellationName}
                maxLength={30}
              />
            </View>
            
            <TouchableOpacity
              style={styles.createButton}
              onPress={handleCreateConstellation}
              disabled={loading || !constellationName.trim()}
            >
              <Text style={styles.createButtonText}>Create Constellation</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.joinButton}
              onPress={() => navigation.navigate('JoinConstellation')}
            >
              <Text style={styles.joinButtonText}>I Have an Invite Code</Text>
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
  },
  createButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    marginBottom: SPACING.m,
  },
  createButtonText: {
    color: COLORS.white,
    fontSize: FONTS.body1,
    fontWeight: 'bold',
  },
  joinButton: {
    borderWidth: 1,
    borderColor: COLORS.primary,
    borderRadius: 8,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  joinButtonText: {
    color: COLORS.primary,
    fontSize: FONTS.body1,
    fontWeight: 'bold',
  },
});

export default CreateConstellationScreen; 