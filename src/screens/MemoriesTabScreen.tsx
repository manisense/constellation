/**
 * MemoriesTabScreen — Timeline chapters (top) + Memories gallery (bottom).
 * Horizontal scroll of chapter cards; masonry-style memory grid below.
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Image,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { COLORS, FONTS, SPACING } from '../constants/theme';
import { supabase } from '../utils/supabase';
import { useAuth } from '../provider/AuthProvider';
import { TimelineChapter } from '../types';
import { getOnThisDayMemories, getTimelineChapters, unlockChapter } from '../services/timelineService';

// ─── Types ────────────────────────────────────────────────────────────────────

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

// ─── Component ────────────────────────────────────────────────────────────────

const MemoriesTabScreen: React.FC = () => {
  const { user } = useAuth();

  // Timeline
  const [chapters, setChapters] = useState<TimelineChapter[]>([]);
  const [onThisDayCount, setOnThisDayCount] = useState(0);
  const [loadingTimeline, setLoadingTimeline] = useState(true);

  // Memories
  const [constellationId, setConstellationId] = useState<string | null>(null);
  const [memories, setMemories] = useState<Memory[]>([]);
  const [loadingMemories, setLoadingMemories] = useState(true);

  // Add memory form
  const [showAddModal, setShowAddModal] = useState(false);
  const [newMemory, setNewMemory] = useState({ title: '', description: '', date: '' });
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // ── Init ──────────────────────────────────────────────────────────
  useEffect(() => {
    loadTimeline();
    if (user) loadMemories();
  }, [user]);

  const loadTimeline = async () => {
    try {
      const [chapterData, dayMems] = await Promise.all([
        getTimelineChapters(),
        getOnThisDayMemories(),
      ]);
      setChapters(chapterData);
      setOnThisDayCount(dayMems.length || 0);
    } catch {}
    finally { setLoadingTimeline(false); }
  };

  const loadMemories = async () => {
    if (!user) return;
    try {
      const { data: memberData } = await supabase
        .from('constellation_members')
        .select('constellation_id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!memberData?.constellation_id) { setLoadingMemories(false); return; }
      const cid = memberData.constellation_id;
      setConstellationId(cid);

      const { data } = await supabase
        .from('memories')
        .select('*')
        .eq('constellation_id', cid)
        .order('date', { ascending: false });

      setMemories(data || []);
    } catch { console.error('MemoriesTab load failed'); }
    finally { setLoadingMemories(false); }
  };

  const handleUnlock = async (item: TimelineChapter) => {
    try {
      await unlockChapter(item.id, item.chapterIndex);
      loadTimeline();
    } catch { Alert.alert('Error', 'Could not unlock this chapter yet.'); }
  };

  // ── Add memory ────────────────────────────────────────────────────
  const handlePickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.8 });
    if (!result.canceled) setSelectedImage(result.assets[0].uri);
  };

  const handleAddMemory = async () => {
    if (!newMemory.title.trim()) { Alert.alert('Title required', 'Give this memory a title.'); return; }
    if (!constellationId || !user) return;
    try {
      setSubmitting(true);
      let imageUrl: string | null = null;

      if (selectedImage) {
        const ext = selectedImage.split('.').pop() || 'jpg';
        const path = `${constellationId}/${Date.now()}.${ext}`;
        const resp = await fetch(selectedImage);
        const blob = await resp.blob();
        const { error: upErr } = await supabase.storage.from('memories').upload(path, blob);
        if (!upErr) {
          const { data: urlData } = supabase.storage.from('memories').getPublicUrl(path);
          imageUrl = urlData.publicUrl;
        }
      }

      const { data, error } = await supabase.from('memories').insert({
        ...newMemory,
        image_url: imageUrl,
        created_by: user.id,
        constellation_id: constellationId,
      }).select();

      if (error) throw error;
      if (data) {
        setMemories((prev) => [data[0], ...prev]);
        setNewMemory({ title: '', description: '', date: '' });
        setSelectedImage(null);
        setShowAddModal(false);
        await supabase.rpc('increase_bonding_strength', { constellation_id: constellationId });
      }
    } catch { Alert.alert('Error', 'Could not save memory.'); }
    finally { setSubmitting(false); }
  };

  // ── Render chapter card ───────────────────────────────────────────
  const renderChapter = useCallback(({ item }: { item: TimelineChapter }) => (
    <View style={[styles.chapterCard, item.isUnlocked && styles.chapterCardUnlocked]}>
      <View style={styles.chapterTop}>
        <Text style={styles.chapterNum}>Ch. {item.chapterIndex}</Text>
        <Ionicons name={item.isUnlocked ? 'lock-open-outline' : 'lock-closed-outline'} size={14}
          color={item.isUnlocked ? COLORS.success : COLORS.gray600} />
      </View>
      <Text style={styles.chapterTitle} numberOfLines={2}>{item.title}</Text>
      <Text style={styles.chapterMeta}>{item.milestoneCount} milestones</Text>
      {!item.isUnlocked && (
        <TouchableOpacity style={styles.unlockBtn} onPress={() => handleUnlock(item)}>
          <Text style={styles.unlockBtnText}>Unlock</Text>
        </TouchableOpacity>
      )}
    </View>
  ), []);

  // ── Render memory card ────────────────────────────────────────────
  const renderMemory = useCallback(({ item }: { item: Memory }) => (
    <View style={styles.memCard}>
      {item.image_url && (
        <Image source={{ uri: item.image_url }} style={styles.memImage} resizeMode="cover" />
      )}
      <View style={styles.memBody}>
        <Text style={styles.memTitle} numberOfLines={1}>{item.title}</Text>
        {item.date ? <Text style={styles.memDate}>{item.date}</Text> : null}
        {item.description ? <Text style={styles.memDesc} numberOfLines={2}>{item.description}</Text> : null}
      </View>
    </View>
  ), []);

  // ── Render ────────────────────────────────────────────────────────
  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>

        {/* ── On this day banner ── */}
        {onThisDayCount > 0 && (
          <View style={styles.onThisDayBanner}>
            <Ionicons name="star-outline" size={18} color={COLORS.luminary} />
            <Text style={styles.onThisDayText}>On this day: {onThisDayCount} memory resurfaced</Text>
          </View>
        )}

        {/* ── Timeline chapters ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Love Story Timeline</Text>
          {loadingTimeline ? (
            <ActivityIndicator color={COLORS.primary} style={{ marginTop: 12 }} />
          ) : chapters.length === 0 ? (
            <Text style={styles.emptyText}>Your story chapters will appear here as memories grow.</Text>
          ) : (
            <FlatList
              data={chapters}
              horizontal
              keyExtractor={(item) => item.id}
              renderItem={renderChapter}
              contentContainerStyle={styles.chapterList}
              showsHorizontalScrollIndicator={false}
            />
          )}
        </View>

        {/* ── Memories gallery ── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Memories</Text>
            <TouchableOpacity style={styles.addBtn} onPress={() => setShowAddModal(true)}>
              <Ionicons name="add" size={20} color={COLORS.accent} />
            </TouchableOpacity>
          </View>

          {loadingMemories ? (
            <ActivityIndicator color={COLORS.primary} style={{ marginTop: 12 }} />
          ) : memories.length === 0 ? (
            <View style={styles.emptyBox}>
              <Ionicons name="images-outline" size={40} color={COLORS.gray700} />
              <Text style={styles.emptyText}>Start capturing your special moments.</Text>
            </View>
          ) : (
            <View style={styles.memGrid}>
              {memories.map((m) => (
                <View key={m.id} style={styles.memGridItem}>
                  {renderMemory({ item: m })}
                </View>
              ))}
            </View>
          )}
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>

      {/* ── Add Memory Modal ── */}
      <Modal visible={showAddModal} animationType="slide" onRequestClose={() => setShowAddModal(false)}>
        <View style={styles.modalRoot}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Add a Memory</Text>
            <TouchableOpacity onPress={() => setShowAddModal(false)}>
              <Ionicons name="close" size={24} color={COLORS.white} />
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={styles.modalContent}>
            {selectedImage && (
              <View style={styles.imgPreviewWrap}>
                <Image source={{ uri: selectedImage }} style={styles.imgPreview} resizeMode="cover" />
                <TouchableOpacity style={styles.removeImgBtn} onPress={() => setSelectedImage(null)}>
                  <Ionicons name="close-circle" size={22} color="#fff" />
                </TouchableOpacity>
              </View>
            )}
            <TouchableOpacity style={styles.imgPickBtn} onPress={handlePickImage}>
              <Ionicons name="image-outline" size={20} color={COLORS.accent} />
              <Text style={styles.imgPickBtnText}>{selectedImage ? 'Change Photo' : 'Add Photo'}</Text>
            </TouchableOpacity>
            <TextInput style={styles.formInput} placeholder="Memory title *" placeholderTextColor={COLORS.gray700}
              value={newMemory.title} onChangeText={(v) => setNewMemory((p) => ({ ...p, title: v }))} />
            <TextInput style={[styles.formInput, styles.formTextarea]} placeholder="Description" placeholderTextColor={COLORS.gray700}
              value={newMemory.description} onChangeText={(v) => setNewMemory((p) => ({ ...p, description: v }))} multiline />
            <TextInput style={styles.formInput} placeholder="Date (e.g. 2024-06-10)" placeholderTextColor={COLORS.gray700}
              value={newMemory.date} onChangeText={(v) => setNewMemory((p) => ({ ...p, date: v }))} />
            <TouchableOpacity style={[styles.primaryBtn, submitting && { opacity: 0.6 }]}
              onPress={handleAddMemory} disabled={submitting}>
              {submitting ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.primaryBtnText}>Save Memory ✨</Text>}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0A0A12' },
  container: { padding: SPACING.m },
  section: { marginBottom: SPACING.l },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: SPACING.s },
  sectionTitle: { color: COLORS.white, fontSize: FONTS.h3, fontWeight: '700', marginBottom: SPACING.s },
  emptyText: { color: COLORS.gray600, fontSize: FONTS.body2, textAlign: 'center', paddingVertical: SPACING.m },

  // On this day
  onThisDayBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#1A1500', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, marginBottom: SPACING.m, borderWidth: 1, borderColor: '#3A3000' },
  onThisDayText: { color: COLORS.luminary, fontSize: FONTS.body2, fontWeight: '500' },

  // Chapters
  chapterList: { gap: SPACING.s, paddingBottom: 4 },
  chapterCard: { width: 160, backgroundColor: '#111120', borderRadius: 14, padding: SPACING.m, borderWidth: 1, borderColor: '#1F1F2E', gap: 8 },
  chapterCardUnlocked: { borderColor: COLORS.success + '50' },
  chapterTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  chapterNum: { color: COLORS.accent, fontSize: FONTS.caption, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  chapterTitle: { color: COLORS.white, fontSize: FONTS.body2, fontWeight: '600', lineHeight: 18 },
  chapterMeta: { color: COLORS.gray600, fontSize: FONTS.caption },
  unlockBtn: { backgroundColor: COLORS.primary, borderRadius: 8, paddingVertical: 6, alignItems: 'center' },
  unlockBtnText: { color: COLORS.white, fontSize: FONTS.caption, fontWeight: '600' },

  // Memory grid
  memGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.s },
  memGridItem: { width: '47%' },
  memCard: { backgroundColor: '#111120', borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: '#1F1F2E' },
  memImage: { width: '100%', height: 120 },
  memBody: { padding: 10, gap: 3 },
  memTitle: { color: COLORS.white, fontSize: FONTS.body2, fontWeight: '600' },
  memDate: { color: COLORS.accent, fontSize: FONTS.caption },
  memDesc: { color: COLORS.gray500, fontSize: FONTS.caption, lineHeight: 16 },

  emptyBox: { alignItems: 'center', paddingVertical: SPACING.xl, gap: SPACING.s },

  // Add button
  addBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#1A1A2E', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: COLORS.accent },

  // Modal
  modalRoot: { flex: 1, backgroundColor: '#0A0A12' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: SPACING.m, borderBottomWidth: 1, borderBottomColor: '#1F1F2E', paddingTop: 56 },
  modalTitle: { color: COLORS.white, fontSize: FONTS.h3, fontWeight: '700' },
  modalContent: { padding: SPACING.m, gap: SPACING.m },
  imgPreviewWrap: { position: 'relative', alignSelf: 'center', marginBottom: SPACING.s },
  imgPreview: { width: 200, height: 160, borderRadius: 12 },
  removeImgBtn: { position: 'absolute', top: -8, right: -8 },
  imgPickBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: COLORS.accent, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 16, alignSelf: 'center' },
  imgPickBtnText: { color: COLORS.accent, fontSize: FONTS.body2 },
  formInput: { backgroundColor: '#1A1A2E', borderRadius: 10, borderWidth: 1, borderColor: '#2A2A45', paddingHorizontal: SPACING.m, paddingVertical: 12, color: COLORS.white, fontSize: FONTS.body2 },
  formTextarea: { minHeight: 90, textAlignVertical: 'top' },
  primaryBtn: { backgroundColor: COLORS.primary, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  primaryBtnText: { color: COLORS.white, fontSize: FONTS.body1, fontWeight: '600' },
});

export default MemoriesTabScreen;
