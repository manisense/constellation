import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
  ScrollView,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { COLORS, FONTS, SPACING } from '../constants/theme';
import Screen from '../components/Screen';
import Button from '../components/Button';
import Input from '../components/Input';
import * as ImagePicker from 'expo-image-picker';
import { supabase, updateProfile, getProfile } from '../utils/supabase';
import { useAuth } from '../hooks/useAuth';

type ProfileScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Profile'>;
};

const ProfileScreen: React.FC<ProfileScreenProps> = ({ navigation }) => {
  const { user } = useAuth();
  const [name, setName] = useState('');
  const [about, setAbout] = useState('');
  const [starName, setStarName] = useState('');
  const [starType, setStarType] = useState<string | null>(null);
  const [interests, setInterests] = useState<string[]>([]);
  const [newInterest, setNewInterest] = useState('');
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [constellationId, setConstellationId] = useState<string | null>(null);
  const [newImageUri, setNewImageUri] = useState<string | null>(null);

  // Validation
  const [nameError, setNameError] = useState('');
  const [aboutError, setAboutError] = useState('');
  const [starNameError, setStarNameError] = useState('');

  useEffect(() => {
    // Request permission for image picker
    (async () => {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Sorry, we need camera roll permissions to upload a profile picture.');
      }
    })();

    // Load existing profile data if available
    loadProfileData();
  }, []);

  const loadProfileData = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      
      // Get user profile from Supabase using the getProfile function
      const { data, error } = await getProfile();
      
      if (error) throw error;
      
      if (data) {
        console.log('Profile data loaded:', data);
        setName(data.name || '');
        setAbout(data.about || '');
        setStarName(data.star_name || '');
        setStarType(data.star_type || null);
        setInterests(data.interests || []);
        setProfileImage(data.avatar_url || data.photo_url || null);
        
        // Get constellation membership
        const { data: memberData, error: memberError } = await supabase
          .from('constellation_members')
          .select('constellation_id')
          .eq('user_id', user.id)
          .single();
        
        if (!memberError && memberData) {
          setConstellationId(memberData.constellation_id);
        }
      }
    } catch (error) {
      console.error('Error loading profile data:', error);
      Alert.alert('Error', 'Failed to load profile data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const validateName = () => {
    if (!name.trim()) {
      setNameError('Name is required');
      return false;
    }
    setNameError('');
    return true;
  };

  const validateAbout = () => {
    if (!about.trim()) {
      setAboutError('About section is required');
      return false;
    }
    setAboutError('');
    return true;
  };

  const validateStarName = () => {
    if (!starName.trim()) {
      setStarNameError('Star name is required');
      return false;
    }
    setStarNameError('');
    return true;
  };

  const handlePickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled) {
        setProfileImage(result.assets[0].uri);
        setNewImageUri(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const handleAddInterest = () => {
    if (newInterest.trim() && !interests.includes(newInterest.trim())) {
      setInterests([...interests, newInterest.trim()]);
      setNewInterest('');
    }
  };

  const handleRemoveInterest = (interest: string) => {
    setInterests(interests.filter((item) => item !== interest));
  };

  const uploadProfileImage = async (): Promise<string | null> => {
    try {
      if (!newImageUri || !user) return null;

      // Convert image to blob
      const response = await fetch(newImageUri);
      const blob = await response.blob();

      // Upload to Supabase Storage
      const filePath = `profile_photos/${user.id}_${Date.now()}`;
      const { data, error } = await supabase.storage
        .from('avatars')
        .upload(filePath, blob, {
          upsert: true,
          contentType: 'image/jpeg'
        });
      
      if (error) {
        console.error('Storage upload error:', error);
        throw error;
      }
      
      // Get public URL
      const { data: urlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);
      
      console.log('Image uploaded successfully:', urlData.publicUrl);
      return urlData.publicUrl;
    } catch (error) {
      console.error('Error uploading image:', error);
      Alert.alert('Error', 'Failed to upload profile image. Please try again.');
      return null;
    }
  };

  const handleSaveProfile = async () => {
    if (!validateName() || !validateAbout() || !validateStarName() || !user) {
      return;
    }

    setLoading(true);
    try {
      let avatarUrl = profileImage;

      if (newImageUri) {
        console.log('Uploading new profile image...');
        avatarUrl = await uploadProfileImage();
        if (!avatarUrl) {
          Alert.alert('Warning', 'Failed to upload profile image, but will continue saving other profile data.');
        }
      }

      console.log('Updating profile with data:', {
        name,
        about,
        star_name: starName,
        interests,
        photo_url: avatarUrl,
        avatar_url: avatarUrl
      });

      // Update the user profile using the updateProfile function
      const { success, error } = await updateProfile({
        name,
        about,
        star_name: starName,
        star_type: starType || undefined,
        interests,
        photo_url: avatarUrl || undefined,
        avatar_url: avatarUrl || undefined
      });

      if (error) throw error;

      if (success) {
        Alert.alert('Success', 'Profile updated successfully!');
        // Navigate to quiz or appropriate screen
        if (constellationId) {
          navigation.navigate('Home');
        } else {
          navigation.navigate('Quiz');
        }
      }
    } catch (error: any) {
      console.error('Profile update error:', error);
      Alert.alert('Error', error.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen showHeader={true} headerTitle="Profile" scrollable keyboardAvoiding>
      <View style={styles.container}>
        <Text style={styles.title}>Create Your Profile</Text>
        <Text style={styles.subtitle}>
          Tell us about yourself to personalize your experience
        </Text>

        <TouchableOpacity style={styles.imageContainer} onPress={handlePickImage}>
          {profileImage ? (
            <Image source={{ uri: profileImage }} style={styles.profileImage} />
          ) : (
            <View style={styles.imagePlaceholder}>
              <Text style={styles.imagePlaceholderText}>Add Photo</Text>
            </View>
          )}
        </TouchableOpacity>

        <View style={styles.formContainer}>
          <Input
            label="Name"
            placeholder="Enter your name"
            value={name}
            onChangeText={setName}
            onBlur={validateName}
            error={nameError}
          />

          <Input
            label="About Me"
            placeholder="Tell us about yourself"
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            style={styles.textArea}
            value={about}
            onChangeText={setAbout}
            onBlur={validateAbout}
            error={aboutError}
          />

          <Input
            label="Star Name"
            placeholder="Choose a name for your star"
            value={starName}
            onChangeText={setStarName}
            onBlur={validateStarName}
            error={starNameError}
          />

          <Text style={styles.label}>Interests</Text>
          <View style={styles.interestsContainer}>
            {interests.map((interest, index) => (
              <TouchableOpacity
                key={index}
                style={styles.interestTag}
                onPress={() => handleRemoveInterest(interest)}
              >
                <Text style={styles.interestText}>{interest}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.addInterestContainer}>
            <Input
              placeholder="Add an interest"
              value={newInterest}
              onChangeText={setNewInterest}
              containerStyle={styles.addInterestInput}
              returnKeyType="done"
              onSubmitEditing={handleAddInterest}
            />
            <TouchableOpacity
              style={styles.addInterestButton}
              onPress={handleAddInterest}
            >
              <Text style={styles.addInterestButtonText}>Add</Text>
            </TouchableOpacity>
          </View>

          <Button
            title="Save Profile"
            onPress={handleSaveProfile}
            loading={loading}
            style={styles.saveButton}
          />
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
    textAlign: 'center',
    marginBottom: SPACING.s,
  },
  subtitle: {
    fontSize: FONTS.body2,
    color: COLORS.gray400,
    textAlign: 'center',
    marginBottom: SPACING.xl,
  },
  imageContainer: {
    alignSelf: 'center',
    marginBottom: SPACING.xl,
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  imagePlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: COLORS.gray700,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.gray500,
    borderStyle: 'dashed',
  },
  imagePlaceholderText: {
    color: COLORS.gray400,
    fontSize: FONTS.body2,
  },
  formContainer: {
    width: '100%',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  label: {
    fontSize: FONTS.body2,
    color: COLORS.white,
    marginBottom: SPACING.s,
  },
  interestsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: SPACING.m,
  },
  interestTag: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.m,
    paddingVertical: SPACING.xs,
    borderRadius: 20,
    marginRight: SPACING.s,
    marginBottom: SPACING.s,
  },
  interestText: {
    color: COLORS.white,
    fontSize: FONTS.body2,
  },
  addInterestContainer: {
    flexDirection: 'row',
    marginBottom: SPACING.l,
  },
  addInterestInput: {
    flex: 1,
    marginRight: SPACING.s,
  },
  addInterestButton: {
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.m,
    borderRadius: 8,
  },
  addInterestButtonText: {
    color: COLORS.white,
    fontSize: FONTS.body2,
    fontWeight: 'bold',
  },
  saveButton: {
    marginTop: SPACING.l,
  },
});

export default ProfileScreen; 