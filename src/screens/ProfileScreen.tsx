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
import { db, storage } from '../services/firebase';
import { doc, updateDoc, getDoc, collection, query, orderBy, getDocs, limit, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

type ProfileScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Profile'>;
};

const ProfileScreen: React.FC<ProfileScreenProps> = ({ navigation }) => {
  const [name, setName] = useState('');
  const [about, setAbout] = useState('');
  const [starName, setStarName] = useState('');
  const [interests, setInterests] = useState<string[]>([]);
  const [newInterest, setNewInterest] = useState('');
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState('');
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
    try {
      // Get the current user ID from local storage
      // In a real app, we would use auth.currentUser.uid
      // For our demo, we'll use the latest user created
      const usersRef = collection(db, 'users');
      const q = query(usersRef, orderBy('createdAt', 'desc'), limit(1));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const userData = querySnapshot.docs[0].data();
        const userId = querySnapshot.docs[0].id;
        
        setUserId(userId);
        setName(userData.name || '');
        setAbout(userData.about || '');
        setStarName(userData.starName || '');
        setInterests(userData.interests || []);
        setProfileImage(userData.photoURL || null);
        setConstellationId(userData.constellationId || null);
      }
    } catch (error) {
      console.error('Error loading profile data:', error);
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
      if (!newImageUri) return null;

      // Convert image to blob
      const response = await fetch(newImageUri);
      const blob = await response.blob();

      // Upload to Firebase Storage
      const storageRef = ref(storage, `profile_images/${userId}_${Date.now()}`);
      await uploadBytes(storageRef, blob);

      // Get download URL
      const downloadURL = await getDownloadURL(storageRef);
      return downloadURL;
    } catch (error) {
      console.error('Error uploading image:', error);
      return null;
    }
  };

  const handleSaveProfile = async () => {
    if (!validateName() || !validateAbout() || !validateStarName()) {
      return;
    }

    setLoading(true);
    try {
      let photoURL = profileImage;

      if (newImageUri) {
        photoURL = await uploadProfileImage();
      }

      // Update the user document
      await updateDoc(doc(db, 'users', userId), {
        name,
        about,
        starName,
        interests,
        photoURL,
        updatedAt: serverTimestamp(),
      });

      // Navigate to quiz
      navigation.navigate('Quiz');
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen scrollable keyboardAvoiding>
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
                <Text style={styles.removeIcon}>×</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.addInterestContainer}>
            <Input
              placeholder="Add an interest"
              value={newInterest}
              onChangeText={setNewInterest}
              containerStyle={styles.interestInput}
            />
            <Button
              title="Add"
              onPress={handleAddInterest}
              size="small"
              style={styles.addButton}
            />
          </View>

          <Button
            title="Continue to Quiz"
            onPress={handleSaveProfile}
            loading={loading}
            style={styles.button}
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
    marginBottom: SPACING.xl,
    textAlign: 'center',
  },
  imageContainer: {
    marginBottom: SPACING.l,
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
    backgroundColor: COLORS.card,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.gray700,
    borderStyle: 'dashed',
  },
  imagePlaceholderText: {
    color: COLORS.accent,
    fontSize: FONTS.body2,
  },
  formContainer: {
    width: '100%',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
    paddingTop: SPACING.s,
  },
  label: {
    fontSize: FONTS.body2,
    color: COLORS.white,
    marginBottom: SPACING.xs,
  },
  interestsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: SPACING.m,
  },
  interestTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    borderRadius: 20,
    paddingHorizontal: SPACING.m,
    paddingVertical: SPACING.xs,
    margin: SPACING.xs,
  },
  interestText: {
    color: COLORS.white,
    marginRight: SPACING.xs,
  },
  removeIcon: {
    color: COLORS.white,
    fontSize: FONTS.h3,
    marginTop: -2,
  },
  addInterestContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.l,
  },
  interestInput: {
    flex: 1,
    marginRight: SPACING.s,
    marginBottom: 0,
  },
  addButton: {
    width: 80,
  },
  button: {
    marginTop: SPACING.m,
  },
});

export default ProfileScreen; 