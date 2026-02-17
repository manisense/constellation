import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { COLORS, FONTS, SPACING, SIZES } from '../constants/theme';
import Screen from '../components/Screen';
import Card from '../components/Card';
import Button from '../components/Button';
import { supabase } from '../utils/supabase';
import { useAuth } from '../hooks/useAuth';
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';

type MemoriesScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Memories'>;
};

interface Memory {
  id: string;
  title: string;
  description: string;
  date: string;
  image_url: string | null;
  created_by: string;
  constellation_id: string;
  created_at: string;
}

const MemoriesScreen: React.FC<MemoriesScreenProps> = ({ navigation }) => {
  const { user } = useAuth();
  const [memories, setMemories] = useState<Memory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [constellationId, setConstellationId] = useState<string | null>(null);
  const [partnerName, setPartnerName] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newMemory, setNewMemory] = useState({
    title: '',
    description: '',
    date: '',
  });
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  useEffect(() => {
    if (user) {
      loadConstellationInfo();
      loadMemories();
    }
  }, [user]);

  const loadConstellationInfo = async () => {
    try {
      // Get user's constellation membership
      const { data: memberData, error: memberError } = await supabase
        .from('constellation_members')
        .select('constellation_id')
        .eq('user_id', user?.id)
        .maybeSingle();
      
      if (memberError) throw memberError;

      if (!memberData || !memberData.constellation_id) {
        setConstellationId(null);
        setPartnerName('Your partner');
        return;
      }
      
      if (memberData && memberData.constellation_id) {
        setConstellationId(memberData.constellation_id);
        
        // Get partner data
        const { data: partners, error: partnersError } = await supabase
          .from('constellation_members')
          .select('user_id')
          .eq('constellation_id', memberData.constellation_id)
          .neq('user_id', user?.id);
        
        if (partnersError) throw partnersError;
        
        if (partners && partners.length > 0) {
          const partnerId = partners[0].user_id;
          
          // Get partner profile
          const { data: partnerData, error: partnerError } = await supabase
            .from('profiles')
            .select('name')
            .eq('id', partnerId)
            .single();
            
          if (!partnerError && partnerData) {
            setPartnerName(partnerData.name || 'Partner');
          }
        }
      }
    } catch (error) {
      console.error('Error loading constellation info:', error);
      setError('Failed to load constellation information.');
    }
  };

  const loadMemories = async () => {
    try {
      setLoading(true);
      
      // Get user's constellation ID
      const { data: memberData, error: memberError } = await supabase
        .from('constellation_members')
        .select('constellation_id')
        .eq('user_id', user?.id)
        .maybeSingle();
      
      if (memberError) throw memberError;

      if (!memberData || !memberData.constellation_id) {
        setMemories([]);
        setLoading(false);
        return;
      }
      
      if (memberData && memberData.constellation_id) {
        // Get memories for this constellation
        const { data, error } = await supabase
          .from('memories')
          .select('*')
          .eq('constellation_id', memberData.constellation_id)
          .order('date', { ascending: false });
        
        if (error) throw error;
        
        setMemories(data || []);
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Error loading memories:', error);
      setError('Failed to load memories. Please try again.');
      setLoading(false);
    }
  };

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });
      
      if (!result.canceled && result.assets && result.assets.length > 0) {
        setSelectedImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image. Please try again.');
    }
  };

  const uploadImage = async (uri: string): Promise<string | null> => {
    try {
      setUploadingImage(true);
      
      if (!constellationId) {
        throw new Error('No constellation ID found');
      }
      
      // Check if the bucket exists
      const { data: buckets } = await supabase.storage.listBuckets();
      const bucketExists = buckets?.some(bucket => bucket.name === 'memories');
      
      if (!bucketExists) {
        throw new Error('Memories bucket does not exist');
      }
      
      // Format the file path
      const fileExt = uri.split('.').pop()?.toLowerCase() || 'jpg';
      const filePath = `${constellationId}/${Date.now()}.${fileExt}`;
      
      // Upload the file
      const formData = new FormData();
      formData.append('file', {
        uri,
        name: `memory.${fileExt}`,
        type: `image/${fileExt}`,
      } as any);
      
      const { data, error } = await supabase.storage
        .from('memories')
        .upload(filePath, formData);
      
      if (error) throw error;
      
      // Get the public URL
      const { data: publicUrlData } = supabase.storage
        .from('memories')
        .getPublicUrl(filePath);
      
      return publicUrlData.publicUrl;
    } catch (error) {
      console.error('Error uploading image:', error);
      Alert.alert('Error', 'Failed to upload image. Please try again.');
      return null;
    } finally {
      setUploadingImage(false);
    }
  };

  const handleAddMemory = async () => {
    try {
      if (!user || !constellationId) {
        Alert.alert('Error', 'You must be in a constellation to add memories.');
        return;
      }
      
      // Validate inputs
      if (!newMemory.title.trim()) {
        Alert.alert('Error', 'Please enter a title for your memory.');
        return;
      }
      
      if (!newMemory.date.trim()) {
        Alert.alert('Error', 'Please enter a date for your memory.');
        return;
      }
      
      setSubmitting(true);
      
      // Upload image if selected
      let imageUrl = null;
      if (selectedImage) {
        imageUrl = await uploadImage(selectedImage);
      }
      
      // Create new memory
      const { data, error } = await supabase
        .from('memories')
        .insert({
          title: newMemory.title,
          description: newMemory.description,
          date: newMemory.date,
          image_url: imageUrl,
          created_by: user.id,
          constellation_id: constellationId,
        })
        .select();
      
      if (error) throw error;
      
      // Update local state
      if (data) {
        setMemories([data[0], ...memories]);
        
        // Reset form
        setNewMemory({
          title: '',
          description: '',
          date: '',
        });
        setSelectedImage(null);
        setShowAddForm(false);
        
        // Increase bonding strength
        await supabase.rpc('increase_bonding_strength', { 
          constellation_id: constellationId 
        });
      }
      
      setSubmitting(false);
    } catch (error) {
      console.error('Error adding memory:', error);
      Alert.alert('Error', 'Failed to add memory. Please try again.');
      setSubmitting(false);
    }
  };

  const renderAddForm = () => {
    return (
      <Card style={styles.formCard}>
        <Text style={styles.formTitle}>Add New Memory</Text>
        
        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Title</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter memory title"
            placeholderTextColor={COLORS.gray500}
            value={newMemory.title}
            onChangeText={(text) => setNewMemory({ ...newMemory, title: text })}
          />
        </View>
        
        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Description</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Describe this special memory"
            placeholderTextColor={COLORS.gray500}
            value={newMemory.description}
            onChangeText={(text) => setNewMemory({ ...newMemory, description: text })}
            multiline
            numberOfLines={4}
          />
        </View>
        
        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Date</Text>
          <TextInput
            style={styles.input}
            placeholder="When did this happen? (e.g., May 15, 2023)"
            placeholderTextColor={COLORS.gray500}
            value={newMemory.date}
            onChangeText={(text) => setNewMemory({ ...newMemory, date: text })}
          />
        </View>
        
        <View style={styles.imagePickerContainer}>
          <Text style={styles.inputLabel}>Add Photo (Optional)</Text>
          
          {selectedImage ? (
            <View style={styles.selectedImageContainer}>
              <Image
                source={{ uri: selectedImage }}
                style={styles.selectedImage}
                resizeMode="cover"
              />
              <TouchableOpacity
                style={styles.removeImageButton}
                onPress={() => setSelectedImage(null)}
              >
                <Ionicons name="close-circle" size={24} color={COLORS.error} />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.imagePickerButton}
              onPress={pickImage}
            >
              <Ionicons name="image-outline" size={24} color={COLORS.accent} />
              <Text style={styles.imagePickerText}>Select Image</Text>
            </TouchableOpacity>
          )}
        </View>
        
        <View style={styles.formButtons}>
          <Button
            title="Cancel"
            onPress={() => {
              setShowAddForm(false);
              setSelectedImage(null);
              setNewMemory({
                title: '',
                description: '',
                date: '',
              });
            }}
            style={styles.cancelButton}
            textStyle={styles.cancelButtonText}
          />
          <Button
            title={
              submitting
                ? uploadingImage
                  ? 'Uploading Image...'
                  : 'Adding Memory...'
                : 'Save Memory'
            }
            onPress={handleAddMemory}
            disabled={submitting}
          />
        </View>
      </Card>
    );
  };

  const renderMemoryCard = (memory: Memory) => {
    const isCreator = memory.created_by === user?.id;
    
    return (
      <Card key={memory.id} style={styles.memoryCard}>
        {memory.image_url && (
          <Image
            source={{ uri: memory.image_url }}
            style={styles.memoryImage}
            resizeMode="cover"
          />
        )}
        
        <View style={styles.memoryContent}>
          <Text style={styles.memoryTitle}>{memory.title}</Text>
          
          <View style={styles.memoryMeta}>
            <View style={styles.metaItem}>
              <FontAwesome5 name="calendar-alt" size={14} color={COLORS.accent} />
              <Text style={styles.metaText}>{memory.date}</Text>
            </View>
            
            <View style={styles.metaItem}>
              <FontAwesome5 name="user" size={14} color={COLORS.accent} />
              <Text style={styles.metaText}>
                Added by {isCreator ? 'you' : partnerName}
              </Text>
            </View>
          </View>
          
          {memory.description && (
            <Text style={styles.memoryDescription}>{memory.description}</Text>
          )}
        </View>
      </Card>
    );
  };

  if (loading) {
    return (
      <Screen showHeader={true} headerTitle="Memories">
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen showHeader={true} headerTitle="Memories">
      <ScrollView style={styles.container}>
        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}
        
        <View style={styles.header}>
          <Text style={styles.title}>Cherish Your Special Moments</Text>
          <Text style={styles.subtitle}>
            Save and revisit memories with {partnerName}
          </Text>
        </View>
        
        {!showAddForm && (
          <Button
            title="Add New Memory"
            onPress={() => setShowAddForm(true)}
            style={styles.addButton}
          />
        )}
        
        {showAddForm && renderAddForm()}
        
        <View style={styles.memoriesContainer}>
          <Text style={styles.sectionTitle}>
            {memories.length > 0 ? 'Your Memories' : 'No Memories Yet'}
          </Text>
          
          {memories.length > 0 ? (
            memories.map(memory => renderMemoryCard(memory))
          ) : (
            <Card style={styles.emptyCard}>
              <Text style={styles.emptyText}>
                No memories saved yet. Create your first memory to strengthen your bond!
              </Text>
            </Card>
          )}
        </View>
      </ScrollView>
    </Screen>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    backgroundColor: COLORS.error,
    padding: SPACING.m,
    borderRadius: 8,
    marginHorizontal: SPACING.l,
    marginTop: SPACING.m,
  },
  errorText: {
    color: COLORS.white,
    fontSize: FONTS.body2,
    textAlign: 'center',
  },
  header: {
    padding: SPACING.l,
  },
  title: {
    fontSize: FONTS.h2,
    fontWeight: 'bold',
    color: COLORS.white,
    marginBottom: SPACING.xs,
  },
  subtitle: {
    fontSize: FONTS.body1,
    color: COLORS.gray300,
  },
  addButton: {
    marginHorizontal: SPACING.l,
    marginBottom: SPACING.l,
  },
  memoriesContainer: {
    padding: SPACING.l,
    paddingTop: 0,
  },
  sectionTitle: {
    fontSize: FONTS.h3,
    fontWeight: 'bold',
    color: COLORS.white,
    marginBottom: SPACING.m,
  },
  memoryCard: {
    marginBottom: SPACING.l,
    overflow: 'hidden',
  },
  memoryImage: {
    width: '100%',
    height: 200,
    borderTopLeftRadius: SIZES.borderRadius,
    borderTopRightRadius: SIZES.borderRadius,
  },
  memoryContent: {
    padding: SPACING.m,
  },
  memoryTitle: {
    fontSize: FONTS.h3,
    fontWeight: 'bold',
    color: COLORS.white,
    marginBottom: SPACING.s,
  },
  memoryMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: SPACING.m,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: SPACING.l,
    marginBottom: SPACING.xs,
  },
  metaText: {
    fontSize: FONTS.caption,
    color: COLORS.gray300,
    marginLeft: SPACING.xs,
  },
  memoryDescription: {
    fontSize: FONTS.body2,
    color: COLORS.gray300,
    lineHeight: 22,
  },
  emptyCard: {
    padding: SPACING.l,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: FONTS.body2,
    color: COLORS.gray300,
    textAlign: 'center',
  },
  formCard: {
    marginHorizontal: SPACING.l,
    marginBottom: SPACING.l,
    padding: SPACING.l,
  },
  formTitle: {
    fontSize: FONTS.h3,
    fontWeight: 'bold',
    color: COLORS.white,
    marginBottom: SPACING.m,
  },
  inputContainer: {
    marginBottom: SPACING.m,
  },
  inputLabel: {
    fontSize: FONTS.body2,
    color: COLORS.white,
    marginBottom: SPACING.xs,
  },
  input: {
    backgroundColor: COLORS.input,
    borderRadius: SIZES.borderRadius,
    padding: SPACING.m,
    color: COLORS.white,
    fontSize: FONTS.body2,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  imagePickerContainer: {
    marginBottom: SPACING.m,
  },
  imagePickerButton: {
    backgroundColor: COLORS.gray800,
    borderRadius: SIZES.borderRadius,
    padding: SPACING.m,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  imagePickerText: {
    color: COLORS.accent,
    fontSize: FONTS.body2,
    marginLeft: SPACING.s,
  },
  selectedImageContainer: {
    position: 'relative',
    marginTop: SPACING.s,
  },
  selectedImage: {
    width: '100%',
    height: 200,
    borderRadius: SIZES.borderRadius,
  },
  removeImageButton: {
    position: 'absolute',
    top: SPACING.s,
    right: SPACING.s,
    backgroundColor: COLORS.gray900,
    borderRadius: 20,
  },
  formButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: SPACING.m,
  },
  cancelButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: COLORS.gray700,
    marginRight: SPACING.m,
  },
  cancelButtonText: {
    color: COLORS.white,
  },
});

export default MemoriesScreen; 