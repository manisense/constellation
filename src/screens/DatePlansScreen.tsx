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
  FlatList,
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

type DatePlansScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'DatePlans'>;
};

interface DatePlan {
  id: string;
  title: string;
  description: string;
  date: string;
  location: string;
  created_by: string;
  constellation_id: string;
  created_at: string;
  status: 'pending' | 'accepted' | 'completed';
}

const DatePlansScreen: React.FC<DatePlansScreenProps> = ({ navigation }) => {
  const { user } = useAuth();
  const [datePlans, setDatePlans] = useState<DatePlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [constellationId, setConstellationId] = useState<string | null>(null);
  const [partnerName, setPartnerName] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newPlan, setNewPlan] = useState({
    title: '',
    description: '',
    date: '',
    location: '',
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (user) {
      loadConstellationInfo();
      loadDatePlans();
    }
  }, [user]);

  const loadConstellationInfo = async () => {
    try {
      // Get user's constellation membership
      const { data: memberData, error: memberError } = await supabase
        .from('constellation_members')
        .select('constellation_id')
        .eq('user_id', user?.id)
        .single();
      
      if (memberError) throw memberError;
      
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

  const loadDatePlans = async () => {
    try {
      setLoading(true);
      
      // Get user's constellation ID
      const { data: memberData, error: memberError } = await supabase
        .from('constellation_members')
        .select('constellation_id')
        .eq('user_id', user?.id)
        .single();
      
      if (memberError) throw memberError;
      
      if (memberData && memberData.constellation_id) {
        // Get date plans for this constellation
        const { data, error } = await supabase
          .from('date_plans')
          .select('*')
          .eq('constellation_id', memberData.constellation_id)
          .order('date', { ascending: true });
        
        if (error) throw error;
        
        setDatePlans(data || []);
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Error loading date plans:', error);
      setError('Failed to load date plans. Please try again.');
      setLoading(false);
    }
  };

  const handleAddPlan = async () => {
    try {
      if (!user || !constellationId) {
        Alert.alert('Error', 'You must be in a constellation to add date plans.');
        return;
      }
      
      // Validate inputs
      if (!newPlan.title.trim()) {
        Alert.alert('Error', 'Please enter a title for your date plan.');
        return;
      }
      
      if (!newPlan.date.trim()) {
        Alert.alert('Error', 'Please enter a date for your date plan.');
        return;
      }
      
      setSubmitting(true);
      
      // Create new date plan
      const { data, error } = await supabase
        .from('date_plans')
        .insert({
          title: newPlan.title,
          description: newPlan.description,
          date: newPlan.date,
          location: newPlan.location,
          created_by: user.id,
          constellation_id: constellationId,
          status: 'pending'
        })
        .select();
      
      if (error) throw error;
      
      // Update local state
      if (data) {
        setDatePlans([...datePlans, data[0]]);
        
        // Reset form
        setNewPlan({
          title: '',
          description: '',
          date: '',
          location: '',
        });
        setShowAddForm(false);
        
        // Increase bonding strength
        await supabase.rpc('increase_bonding_strength', { 
          constellation_id: constellationId 
        });
      }
      
      setSubmitting(false);
    } catch (error) {
      console.error('Error adding date plan:', error);
      Alert.alert('Error', 'Failed to add date plan. Please try again.');
      setSubmitting(false);
    }
  };

  const handleUpdateStatus = async (id: string, status: 'accepted' | 'completed') => {
    try {
      const { error } = await supabase
        .from('date_plans')
        .update({ status })
        .eq('id', id);
      
      if (error) throw error;
      
      // Update local state
      setDatePlans(datePlans.map(plan => 
        plan.id === id ? { ...plan, status } : plan
      ));
      
      // Increase bonding strength
      if (constellationId) {
        await supabase.rpc('increase_bonding_strength', { 
          constellation_id: constellationId 
        });
      }
    } catch (error) {
      console.error('Error updating date plan:', error);
      Alert.alert('Error', 'Failed to update date plan. Please try again.');
    }
  };

  const renderDatePlan = ({ item }: { item: DatePlan }) => {
    const isCreator = item.created_by === user?.id;
    const statusColor = 
      item.status === 'completed' ? COLORS.success :
      item.status === 'accepted' ? COLORS.accent :
      COLORS.warning;
    
    return (
      <Card style={styles.dateCard}>
        <View style={styles.dateHeader}>
          <Text style={styles.dateTitle}>{item.title}</Text>
          <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
            <Text style={styles.statusText}>
              {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
            </Text>
          </View>
        </View>
        
        {item.description ? (
          <Text style={styles.dateDescription}>{item.description}</Text>
        ) : null}
        
        <View style={styles.dateDetails}>
          <View style={styles.detailRow}>
            <FontAwesome5 name="calendar-alt" size={16} color={COLORS.accent} />
            <Text style={styles.detailText}>{item.date}</Text>
          </View>
          
          {item.location ? (
            <View style={styles.detailRow}>
              <Ionicons name="location-outline" size={16} color={COLORS.accent} />
              <Text style={styles.detailText}>{item.location}</Text>
            </View>
          ) : null}
          
          <View style={styles.detailRow}>
            <FontAwesome5 name="user" size={16} color={COLORS.accent} />
            <Text style={styles.detailText}>
              Suggested by {isCreator ? 'you' : partnerName}
            </Text>
          </View>
        </View>
        
        {item.status === 'pending' && !isCreator && (
          <Button 
            title="Accept Date Plan" 
            onPress={() => handleUpdateStatus(item.id, 'accepted')}
            style={styles.actionButton}
          />
        )}
        
        {item.status === 'accepted' && (
          <Button 
            title="Mark as Completed" 
            onPress={() => handleUpdateStatus(item.id, 'completed')}
            style={styles.actionButton}
          />
        )}
      </Card>
    );
  };

  const renderAddForm = () => {
    return (
      <Card style={styles.formCard}>
        <Text style={styles.formTitle}>Add New Date Plan</Text>
        
        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Title</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter date title"
            placeholderTextColor={COLORS.gray500}
            value={newPlan.title}
            onChangeText={(text) => setNewPlan({ ...newPlan, title: text })}
          />
        </View>
        
        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Description (Optional)</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Enter date description"
            placeholderTextColor={COLORS.gray500}
            value={newPlan.description}
            onChangeText={(text) => setNewPlan({ ...newPlan, description: text })}
            multiline
            numberOfLines={3}
          />
        </View>
        
        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Date</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter date (e.g., May 15, 2023)"
            placeholderTextColor={COLORS.gray500}
            value={newPlan.date}
            onChangeText={(text) => setNewPlan({ ...newPlan, date: text })}
          />
        </View>
        
        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Location (Optional)</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter location"
            placeholderTextColor={COLORS.gray500}
            value={newPlan.location}
            onChangeText={(text) => setNewPlan({ ...newPlan, location: text })}
          />
        </View>
        
        <View style={styles.formButtons}>
          <Button
            title="Cancel"
            onPress={() => setShowAddForm(false)}
            style={styles.cancelButton}
            textStyle={styles.cancelButtonText}
          />
          <Button
            title={submitting ? 'Adding...' : 'Add Date Plan'}
            onPress={handleAddPlan}
            disabled={submitting}
          />
        </View>
      </Card>
    );
  };

  if (loading) {
    return (
      <Screen showHeader={true} headerTitle="Date Plans">
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen showHeader={true} headerTitle="Date Plans">
      <ScrollView style={styles.container}>
        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}
        
        <View style={styles.header}>
          <Text style={styles.title}>Plan Special Moments Together</Text>
          <Text style={styles.subtitle}>
            Create and manage date plans with {partnerName}
          </Text>
        </View>
        
        {!showAddForm && (
          <Button
            title="Add New Date Plan"
            onPress={() => setShowAddForm(true)}
            icon={<Ionicons name="add-circle-outline" size={20} color={COLORS.white} />}
            style={styles.addButton}
          />
        )}
        
        {showAddForm && renderAddForm()}
        
        <View style={styles.plansContainer}>
          <Text style={styles.sectionTitle}>
            {datePlans.length > 0 ? 'Your Date Plans' : 'No Date Plans Yet'}
          </Text>
          
          {datePlans.length > 0 ? (
            datePlans.map(plan => renderDatePlan({ item: plan }))
          ) : (
            <Card style={styles.emptyCard}>
              <Text style={styles.emptyText}>
                No date plans yet. Create your first date plan to strengthen your bond!
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
  plansContainer: {
    padding: SPACING.l,
    paddingTop: 0,
  },
  sectionTitle: {
    fontSize: FONTS.h3,
    fontWeight: 'bold',
    color: COLORS.white,
    marginBottom: SPACING.m,
  },
  dateCard: {
    marginBottom: SPACING.m,
    padding: SPACING.m,
  },
  dateHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.s,
  },
  dateTitle: {
    fontSize: FONTS.h4,
    fontWeight: 'bold',
    color: COLORS.white,
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: SPACING.s,
    paddingVertical: SPACING.xs / 2,
    borderRadius: 12,
  },
  statusText: {
    fontSize: FONTS.caption,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  dateDescription: {
    fontSize: FONTS.body2,
    color: COLORS.gray300,
    marginBottom: SPACING.m,
  },
  dateDetails: {
    marginBottom: SPACING.m,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  detailText: {
    fontSize: FONTS.body2,
    color: COLORS.gray300,
    marginLeft: SPACING.s,
  },
  actionButton: {
    marginTop: SPACING.s,
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
    minHeight: 80,
    textAlignVertical: 'top',
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

export default DatePlansScreen; 