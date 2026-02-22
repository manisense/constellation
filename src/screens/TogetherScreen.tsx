/**
 * TogetherScreen — Tab combining Daily Ritual (top) + Date Plans (scrollable list).
 * Ritual card shows today's prompt + streak + response input.
 * Date plans section below handles add/accept/complete actions.
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  FlatList,
} from 'react-native';
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { COLORS, FONTS, SPACING } from '../constants/theme';
import { supabase } from '../utils/supabase';
import { useAuth } from '../provider/AuthProvider';
import { getCurrentStreak, getTodayPrompt, submitDailyRitual } from '../services/ritualsService';

// ─── Types ────────────────────────────────────────────────────────────────────

interface DatePlan {
  id: string;
  title: string;
  description: string;
  date: string;
  location: string;
  created_by: string;
  constellation_id: string;
  status: 'pending' | 'accepted' | 'completed';
}

// ─── Component ────────────────────────────────────────────────────────────────

const TogetherScreen: React.FC = () => {
  const { user } = useAuth();

  // ── Ritual state ──────────────────────────────────────────────────
  const [prompt, setPrompt] = useState('');
  const [streak, setStreak] = useState(0);
  const [response, setResponse] = useState('');
  const [submittingRitual, setSubmittingRitual] = useState(false);
  const [ritualDone, setRitualDone] = useState(false);

  // ── Date Plans state ──────────────────────────────────────────────
  const [constellationId, setConstellationId] = useState<string | null>(null);
  const [datePlans, setDatePlans] = useState<DatePlan[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newPlan, setNewPlan] = useState({ title: '', description: '', date: '', location: '' });
  const [submittingPlan, setSubmittingPlan] = useState(false);

  // ── Init ──────────────────────────────────────────────────────────
  useEffect(() => {
    setPrompt(getTodayPrompt());
    getCurrentStreak().then(setStreak).catch(() => setStreak(0));
    if (user) loadPlans();
  }, [user]);

  const loadPlans = async () => {
    if (!user) return;
    try {
      const { data: memberData } = await supabase
        .from('constellation_members')
        .select('constellation_id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!memberData?.constellation_id) { setLoadingPlans(false); return; }
      const cid = memberData.constellation_id;
      setConstellationId(cid);

      const { data, error } = await supabase
        .from('date_plans')
        .select('*')
        .eq('constellation_id', cid)
        .order('date', { ascending: true });

      if (!error) setDatePlans(data || []);
    } catch (err) {
      console.error('TogetherScreen loadPlans:', err);
    } finally {
      setLoadingPlans(false);
    }
  };

  // ── Ritual submit ─────────────────────────────────────────────────
  const handleSubmitRitual = async () => {
    if (!response.trim()) {
      Alert.alert('Write a response', "Share something before completing today's ritual.");
      return;
    }
    try {
      setSubmittingRitual(true);
      await submitDailyRitual('prompt', response.trim());
      const nextStreak = await getCurrentStreak();
      setStreak(nextStreak);
      setResponse('');
      setRitualDone(true);
    } catch {
      Alert.alert('Error', 'Could not save ritual. Please try again.');
    } finally {
      setSubmittingRitual(false);
    }
  };

  // ── Date plan CRUD ────────────────────────────────────────────────
  const handleAddPlan = async () => {
    if (!newPlan.title.trim()) { Alert.alert('Title required', 'Give your date plan a title.'); return; }
    if (!newPlan.date.trim()) { Alert.alert('Date required', 'When is this date?'); return; }
    if (!constellationId || !user) return;
    try {
      setSubmittingPlan(true);
      const { data, error } = await supabase
        .from('date_plans')
        .insert({ ...newPlan, created_by: user.id, constellation_id: constellationId, status: 'pending' })
        .select();
      if (error) throw error;
      if (data) {
        setDatePlans((prev) => [...prev, data[0]]);
        setNewPlan({ title: '', description: '', date: '', location: '' });
        setShowAddForm(false);
        await supabase.rpc('increase_bonding_strength', { constellation_id: constellationId });
      }
    } catch { Alert.alert('Error', 'Could not add date plan.'); }
    finally { setSubmittingPlan(false); }
  };

  const handleUpdateStatus = async (id: string, status: 'accepted' | 'completed') => {
    try {
      await supabase.from('date_plans').update({ status }).eq('id', id);
      setDatePlans((prev) => prev.map((p) => (p.id === id ? { ...p, status } : p)));
      if (constellationId) await supabase.rpc('increase_bonding_strength', { constellation_id: constellationId });
    } catch { Alert.alert('Error', 'Could not update date plan.'); }
  };

  // ── Render date plan card ─────────────────────────────────────────
  const renderPlan = useCallback(({ item }: { item: DatePlan }) => {
    const isCreator = item.created_by === user?.id;
    const statusColors: Record<string, string> = {
      completed: COLORS.success,
      accepted: COLORS.accent,
      pending: COLORS.warning,
    };
    const statusColor = statusColors[item.status] || COLORS.gray500;

    return (
      <View style={styles.planCard}>
        <View style={styles.planCardHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.planTitle}>{item.title}</Text>
            {item.date ? <Text style={styles.planMeta}><Ionicons name="calendar-outline" size={12} color={COLORS.gray500} /> {item.date}</Text> : null}
            {item.location ? <Text style={styles.planMeta}><Ionicons name="location-outline" size={12} color={COLORS.gray500} /> {item.location}</Text> : null}
          </View>
          <View style={[styles.statusBadge, { borderColor: statusColor }]}>
            <Text style={[styles.statusText, { color: statusColor }]}>{item.status}</Text>
          </View>
        </View>
        {item.description ? <Text style={styles.planDesc}>{item.description}</Text> : null}
        <View style={styles.planActions}>
          {!isCreator && item.status === 'pending' && (
            <TouchableOpacity style={[styles.planBtn, { borderColor: COLORS.accent }]} onPress={() => handleUpdateStatus(item.id, 'accepted')}>
              <Text style={[styles.planBtnText, { color: COLORS.accent }]}>Accept ✓</Text>
            </TouchableOpacity>
          )}
          {item.status === 'accepted' && (
            <TouchableOpacity style={[styles.planBtn, { borderColor: COLORS.success }]} onPress={() => handleUpdateStatus(item.id, 'completed')}>
              <Text style={[styles.planBtnText, { color: COLORS.success }]}>Mark Complete</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  }, [user]);

  // ── Render ────────────────────────────────────────────────────────
  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
      {/* ── Daily Ritual ── */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Daily Ritual</Text>
          <View style={styles.streakBadge}>
            <Text style={styles.streakFire}>🔥</Text>
            <Text style={styles.streakNum}>{streak}</Text>
          </View>
        </View>

        <View style={styles.ritualCard}>
          <Text style={styles.ritualLabel}>Today's prompt</Text>
          <Text style={styles.ritualPrompt}>{prompt}</Text>

          {ritualDone ? (
            <View style={styles.ritualDoneBox}>
              <Ionicons name="checkmark-circle" size={32} color={COLORS.success} />
              <Text style={styles.ritualDoneText}>Ritual complete for today ✨</Text>
            </View>
          ) : (
            <>
              <TextInput
                style={styles.ritualInput}
                placeholder="Write from the heart…"
                placeholderTextColor={COLORS.gray700}
                value={response}
                onChangeText={setResponse}
                multiline
                maxLength={600}
              />
              <TouchableOpacity
                style={[styles.primaryBtn, submittingRitual && { opacity: 0.6 }]}
                onPress={handleSubmitRitual}
                disabled={submittingRitual}
              >
                {submittingRitual
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Text style={styles.primaryBtnText}>Complete Ritual</Text>}
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>

      {/* ── Date Plans ── */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Date Plans</Text>
          <TouchableOpacity style={styles.addBtn} onPress={() => setShowAddForm((v) => !v)}>
            <Ionicons name={showAddForm ? 'close' : 'add'} size={20} color={COLORS.accent} />
          </TouchableOpacity>
        </View>

        {/* Add form */}
        {showAddForm && (
          <View style={styles.addForm}>
            <TextInput style={styles.formInput} placeholder="Date idea title *" placeholderTextColor={COLORS.gray700}
              value={newPlan.title} onChangeText={(v) => setNewPlan((p) => ({ ...p, title: v }))} />
            <TextInput style={styles.formInput} placeholder="Description" placeholderTextColor={COLORS.gray700}
              value={newPlan.description} onChangeText={(v) => setNewPlan((p) => ({ ...p, description: v }))} multiline />
            <TextInput style={styles.formInput} placeholder="Date (e.g. 2026-03-15) *" placeholderTextColor={COLORS.gray700}
              value={newPlan.date} onChangeText={(v) => setNewPlan((p) => ({ ...p, date: v }))} />
            <TextInput style={styles.formInput} placeholder="Location" placeholderTextColor={COLORS.gray700}
              value={newPlan.location} onChangeText={(v) => setNewPlan((p) => ({ ...p, location: v }))} />
            <TouchableOpacity style={[styles.primaryBtn, submittingPlan && { opacity: 0.6 }]}
              onPress={handleAddPlan} disabled={submittingPlan}>
              {submittingPlan ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.primaryBtnText}>Add Plan ❤️</Text>}
            </TouchableOpacity>
          </View>
        )}

        {loadingPlans ? (
          <ActivityIndicator color={COLORS.primary} style={{ marginTop: 20 }} />
        ) : datePlans.length === 0 ? (
          <View style={styles.emptyBox}>
            <Ionicons name="heart-circle-outline" size={40} color={COLORS.gray700} />
            <Text style={styles.emptyText}>No date plans yet. Plan something special!</Text>
          </View>
        ) : (
          datePlans.map((plan) => (
            <View key={plan.id}>
              {renderPlan({ item: plan })}
            </View>
          ))
        )}
      </View>

      {/* Bottom space */}
      <View style={{ height: 32 }} />
    </ScrollView>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0A0A12' },
  container: { padding: SPACING.m },
  section: { marginBottom: SPACING.l },

  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: SPACING.s },
  sectionTitle: { color: COLORS.white, fontSize: FONTS.h3, fontWeight: '700' },

  // Streak badge
  streakBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1E1E2E', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4, gap: 4 },
  streakFire: { fontSize: 16 },
  streakNum: { color: COLORS.white, fontSize: FONTS.h4, fontWeight: '700' },

  // Ritual
  ritualCard: { backgroundColor: '#111120', borderRadius: 16, padding: SPACING.m, borderWidth: 1, borderColor: '#1F1F2E', gap: SPACING.m },
  ritualLabel: { color: COLORS.gray400, fontSize: FONTS.caption, textTransform: 'uppercase', letterSpacing: 1 },
  ritualPrompt: { color: COLORS.highlight, fontSize: FONTS.body1, lineHeight: 26, fontWeight: '500' },
  ritualInput: { backgroundColor: '#1A1A2E', borderRadius: 12, borderWidth: 1, borderColor: '#2A2A45', padding: SPACING.m, color: COLORS.white, fontSize: FONTS.body1, minHeight: 100, textAlignVertical: 'top' },
  ritualDoneBox: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: SPACING.s },
  ritualDoneText: { color: COLORS.success, fontSize: FONTS.body1 },

  // Buttons
  primaryBtn: { backgroundColor: COLORS.primary, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  primaryBtnText: { color: COLORS.white, fontSize: FONTS.body1, fontWeight: '600' },
  addBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#1A1A2E', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: COLORS.accent },

  // Add form
  addForm: { backgroundColor: '#111120', borderRadius: 16, padding: SPACING.m, borderWidth: 1, borderColor: '#2A2A45', gap: SPACING.s, marginBottom: SPACING.m },
  formInput: { backgroundColor: '#1A1A2E', borderRadius: 10, borderWidth: 1, borderColor: '#2A2A45', paddingHorizontal: SPACING.m, paddingVertical: 12, color: COLORS.white, fontSize: FONTS.body2 },

  // Plan card
  planCard: { backgroundColor: '#111120', borderRadius: 14, padding: SPACING.m, borderWidth: 1, borderColor: '#1F1F2E', marginBottom: SPACING.s, gap: SPACING.s },
  planCardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.s },
  planTitle: { color: COLORS.white, fontSize: FONTS.body1, fontWeight: '600' },
  planMeta: { color: COLORS.gray500, fontSize: FONTS.caption, marginTop: 2 },
  planDesc: { color: COLORS.gray400, fontSize: FONTS.body2, lineHeight: 20 },
  statusBadge: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  statusText: { fontSize: FONTS.caption, fontWeight: '600', textTransform: 'capitalize' },
  planActions: { flexDirection: 'row', gap: SPACING.s },
  planBtn: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
  planBtnText: { fontSize: FONTS.caption, fontWeight: '600' },

  // Empty
  emptyBox: { alignItems: 'center', justifyContent: 'center', paddingVertical: SPACING.xl, gap: SPACING.s },
  emptyText: { color: COLORS.gray600, fontSize: FONTS.body2, textAlign: 'center' },
});

export default TogetherScreen;
