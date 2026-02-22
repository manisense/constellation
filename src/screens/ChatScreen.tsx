/**
 * ChatScreen — WhatsApp-style private chat between constellation partners.
 *
 * Features: text, image, voice note (record & play), file attachment,
 * message reply/quote, emoji reactions, read receipts, voice/video call shortcuts.
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Image,
  Alert,
  Modal,
  Pressable,
} from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { Audio } from 'expo-av';
import * as DocumentPicker from 'expo-document-picker';

import { COLORS, FONTS, SPACING } from '../constants/theme';
import { supabase } from '../utils/supabase';
import { useAuth } from '../provider/AuthProvider';
import {
  Message,
  getConstellationMessages,
  setupMessageSubscription,
  pickImage,
  sendMessage,
  getPartnerProfile,
} from '../utils/clientFixes';
import { RootStackParamList } from '../types';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Reaction {
  emoji: string;
  count: number;
  myReaction: boolean;
}

interface EnhancedMessage extends Message {
  message_type?: 'text' | 'image' | 'voice_note' | 'file';
  reply_to_message_id?: string | null;
  file_name?: string;
  file_size?: number;
  file_url?: string;
  voice_note_duration?: number;
  seen_at?: string | null;
  reactions?: Reaction[];
  replyPreview?: string;
}

const REACTION_EMOJIS = ['❤️', '😂', '😮', '😢', '👍', '🔥'];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmtTime = (iso: string) =>
  new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

const fmtDuration = (secs: number) => {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
};

const fmtFileSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
};

// ─── Read tick ────────────────────────────────────────────────────────────────

const ReadTick: React.FC<{ seen: boolean }> = ({ seen }) => (
  <Ionicons
    name={seen ? 'checkmark-done' : 'checkmark'}
    size={12}
    color={seen ? '#53BDEB' : COLORS.gray600}
    style={{ marginLeft: 3 }}
  />
);

// ─── Component ────────────────────────────────────────────────────────────────

const ChatScreen: React.FC = () => {
  const { user } = useAuth();
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();

  const [messages, setMessages] = useState<EnhancedMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [constellationId, setConstellationId] = useState<string | null>(null);
  const [partnerName, setPartnerName] = useState('Partner');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [viewingImage, setViewingImage] = useState<string | null>(null);
  const [quotedMessage, setQuotedMessage] = useState<EnhancedMessage | null>(null);
  const [reactionTarget, setReactionTarget] = useState<string | null>(null);

  // Voice note
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const recordingTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const soundRef = useRef<Audio.Sound | null>(null);

  const flatListRef = useRef<FlatList>(null);

  // ── Load ────────────────────────────────────────────────────────
  useEffect(() => {
    if (user) loadData();
    return () => { soundRef.current?.unloadAsync(); };
  }, [user]);

  const loadData = async () => {
    if (!user) return;
    try {
      const { data: memberData } = await supabase
        .from('constellation_members')
        .select('constellation_id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!memberData?.constellation_id) { setLoading(false); return; }

      const cid = memberData.constellation_id;
      setConstellationId(cid);

      const [msgData, partnerProfile] = await Promise.all([
        getConstellationMessages(cid),
        getPartnerProfile(cid),
      ]);

      setMessages(msgData as EnhancedMessage[]);
      if (partnerProfile) setPartnerName(partnerProfile.name || 'Partner');

      setupMessageSubscription(cid, (msg) => {
        setMessages((prev) => [...prev, msg as EnhancedMessage]);
        setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
      });

      // Mark partner messages as seen
      await supabase
        .from('messages')
        .update({ seen_at: new Date().toISOString() })
        .eq('constellation_id', cid)
        .neq('user_id', user.id)
        .is('seen_at', null);
    } catch (err) {
      console.error('ChatScreen loadData:', err);
    } finally {
      setLoading(false);
    }
  };

  // ── Send text / image ────────────────────────────────────────────
  const handleSend = async () => {
    if ((!newMessage.trim() && !selectedImage) || !constellationId || !user) return;
    try {
      setSending(true);
      const ok = await sendMessage(constellationId, newMessage.trim(), selectedImage);
      if (ok) { setNewMessage(''); setSelectedImage(null); setQuotedMessage(null); }
    } catch { Alert.alert('Error', 'Failed to send.'); }
    finally { setSending(false); }
  };

  const handlePickImage = async () => {
    const uri = await pickImage();
    if (uri) setSelectedImage(uri);
  };

  // ── File attachment ──────────────────────────────────────────────
  const handlePickFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true });
      if (result.canceled || !constellationId || !user) return;
      const file = result.assets[0];
      const ext = file.name.split('.').pop();
      const path = `${constellationId}/${Date.now()}.${ext}`;
      const resp = await fetch(file.uri);
      const blob = await resp.blob();
      const { error: upErr } = await supabase.storage.from('attachments').upload(path, blob);
      if (upErr) throw upErr;
      const { data: urlData } = supabase.storage.from('attachments').getPublicUrl(path);
      await supabase.from('messages').insert({
        constellation_id: constellationId,
        user_id: user.id,
        content: `📎 ${file.name}`,
        message_type: 'file',
        file_name: file.name,
        file_size: file.size,
        file_url: urlData.publicUrl,
      });
    } catch { Alert.alert('Error', 'Could not attach file.'); }
  };

  // ── Voice recording ──────────────────────────────────────────────
  const startRecording = async () => {
    try {
      await Audio.requestPermissionsAsync();
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const { recording: rec } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY,
      );
      setRecording(rec);
      setIsRecording(true);
      setRecordingDuration(0);
      recordingTimer.current = setInterval(() => setRecordingDuration((d) => d + 1), 1000);
    } catch { Alert.alert('Microphone', 'Could not access microphone.'); }
  };

  const stopRecording = async () => {
    if (!recording || !constellationId || !user) return;
    try {
      clearInterval(recordingTimer.current!);
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      const duration = recordingDuration;
      setRecording(null); setIsRecording(false); setRecordingDuration(0);
      if (uri) {
        const path = `${constellationId}/${Date.now()}.m4a`;
        const resp = await fetch(uri);
        const blob = await resp.blob();
        await supabase.storage.from('attachments').upload(path, blob, { contentType: 'audio/m4a' });
        const { data: urlData } = supabase.storage.from('attachments').getPublicUrl(path);
        await supabase.from('messages').insert({
          constellation_id: constellationId, user_id: user.id,
          content: '🎤 Voice note', message_type: 'voice_note',
          file_url: urlData.publicUrl, voice_note_duration: duration,
        });
      }
    } catch { Alert.alert('Error', 'Could not save voice note.'); }
  };

  // ── Playback ─────────────────────────────────────────────────────
  const handlePlayVoiceNote = async (msg: EnhancedMessage) => {
    if (!msg.file_url) return;
    if (playingId === msg.id) { await soundRef.current?.stopAsync(); setPlayingId(null); return; }
    try {
      soundRef.current?.unloadAsync();
      const { sound } = await Audio.Sound.createAsync({ uri: msg.file_url });
      soundRef.current = sound; setPlayingId(msg.id);
      await sound.playAsync();
      sound.setOnPlaybackStatusUpdate((s) => { if (s.isLoaded && s.didJustFinish) setPlayingId(null); });
    } catch { Alert.alert('Error', 'Could not play audio.'); }
  };

  // ── Reactions ────────────────────────────────────────────────────
  const handleReact = async (messageId: string, emoji: string) => {
    if (!user) return;
    setReactionTarget(null);
    try {
      await supabase.from('message_reactions').upsert(
        { message_id: messageId, user_id: user.id, emoji },
        { onConflict: 'message_id,user_id,emoji' },
      );
      setMessages((prev) =>
        prev.map((m) => {
          if (m.id !== messageId) return m;
          const existing = m.reactions || [];
          const found = existing.find((r) => r.emoji === emoji);
          if (found) return { ...m, reactions: existing.map((r) => r.emoji === emoji ? { ...r, count: r.count + 1, myReaction: true } : r) };
          return { ...m, reactions: [...existing, { emoji, count: 1, myReaction: true }] };
        }),
      );
    } catch {}
  };

  // ── Render bubble ────────────────────────────────────────────────
  const renderMessage = useCallback(({ item }: { item: EnhancedMessage }) => {
    const isMe = item.user_id === user?.id;
    return (
      <View style={[styles.bubbleWrapper, isMe ? styles.bwRight : styles.bwLeft]}>
        <Pressable
          onLongPress={() => setReactionTarget(item.id)}
          style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleThem]}
        >
          {/* Quote */}
          {item.replyPreview && (
            <View style={styles.quoteStrip}>
              <Text style={styles.quoteText} numberOfLines={2}>{item.replyPreview}</Text>
            </View>
          )}

          {/* Image */}
          {item.image_url && (
            <TouchableOpacity onPress={() => setViewingImage(item.image_url!)}>
              <Image source={{ uri: item.image_url }} style={styles.msgImg} resizeMode="cover" />
            </TouchableOpacity>
          )}

          {/* Voice note */}
          {item.message_type === 'voice_note' && (
            <TouchableOpacity style={styles.voiceRow} onPress={() => handlePlayVoiceNote(item)}>
              <View style={styles.playBtn}>
                <Ionicons name={playingId === item.id ? 'pause' : 'play'} size={18} color="#fff" />
              </View>
              <View style={styles.waveform}>
                {Array.from({ length: 22 }).map((_, i) => (
                  <View key={i} style={[styles.waveBar, { height: 4 + Math.abs(Math.sin(i * 0.7)) * 14 },
                    playingId === item.id ? { backgroundColor: COLORS.luminary } : {}]} />
                ))}
              </View>
              <Text style={styles.voiceDur}>{fmtDuration(item.voice_note_duration || 0)}</Text>
            </TouchableOpacity>
          )}

          {/* File */}
          {item.message_type === 'file' && item.file_name && (
            <View style={styles.fileCard}>
              <MaterialIcons name="insert-drive-file" size={28} color={COLORS.accent} />
              <View style={{ flex: 1 }}>
                <Text style={styles.fileName} numberOfLines={1}>{item.file_name}</Text>
                {item.file_size != null && <Text style={styles.fileSize}>{fmtFileSize(item.file_size)}</Text>}
              </View>
            </View>
          )}

          {/* Text */}
          {item.content && item.message_type !== 'voice_note' && item.message_type !== 'file' && (
            <Text style={styles.msgText}>{item.content}</Text>
          )}

          {/* Meta */}
          <View style={styles.metaRow}>
            <Text style={styles.msgTime}>{fmtTime(item.created_at)}</Text>
            {isMe && <ReadTick seen={!!item.seen_at} />}
          </View>
        </Pressable>

        {/* Reactions */}
        {item.reactions && item.reactions.length > 0 && (
          <View style={[styles.reactRow, isMe ? { justifyContent: 'flex-end' } : {}]}>
            {item.reactions.map((r) => (
              <TouchableOpacity key={r.emoji} onPress={() => handleReact(item.id, r.emoji)}
                style={[styles.reactChip, r.myReaction && styles.reactChipMine]}>
                <Text style={styles.reactEmoji}>{r.emoji}</Text>
                {r.count > 1 && <Text style={styles.reactCount}>{r.count}</Text>}
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
    );
  }, [user, playingId]);

  // ── Render ───────────────────────────────────────────────────────
  if (loading) {
    return <View style={styles.loadingBox}><ActivityIndicator size="large" color={COLORS.primary} /></View>;
  }

  return (
    <View style={styles.root}>
      {/* Chat header */}
      <View style={styles.chatHeader}>
        <View style={styles.headerLeft}>
          <View style={styles.partnerDot} />
          <View>
            <Text style={styles.partnerName}>{partnerName}</Text>
            <Text style={styles.partnerSub}>In your constellation</Text>
          </View>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.callBtn} onPress={() => navigation.navigate('VoiceCall')}>
            <Ionicons name="call-outline" size={20} color={COLORS.accent} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.callBtn} onPress={() => navigation.navigate('VideoCall')}>
            <Ionicons name="videocam-outline" size={20} color={COLORS.accent} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Messages */}
      {messages.length === 0 ? (
        <View style={styles.emptyBox}>
          <Ionicons name="chatbubble-ellipses-outline" size={60} color={COLORS.gray800} />
          <Text style={styles.emptyTitle}>Start the conversation</Text>
          <Text style={styles.emptySub}>Just the two of you — always private.</Text>
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessage}
          contentContainerStyle={styles.msgList}
          onLayout={() => flatListRef.current?.scrollToEnd({ animated: false })}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Reaction picker */}
      <Modal transparent visible={!!reactionTarget} animationType="fade" onRequestClose={() => setReactionTarget(null)}>
        <Pressable style={styles.reactOverlay} onPress={() => setReactionTarget(null)}>
          <View style={styles.reactPicker}>
            {REACTION_EMOJIS.map((emoji) => (
              <TouchableOpacity key={emoji} style={styles.reactPickerItem}
                onPress={() => reactionTarget && handleReact(reactionTarget, emoji)}>
                <Text style={styles.reactPickerEmoji}>{emoji}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </Pressable>
      </Modal>

      {/* Full image viewer */}
      <Modal transparent visible={!!viewingImage} animationType="fade" onRequestClose={() => setViewingImage(null)}>
        <View style={styles.imgViewerBg}>
          <TouchableOpacity style={styles.imgViewerClose} onPress={() => setViewingImage(null)}>
            <Ionicons name="close" size={28} color="#fff" />
          </TouchableOpacity>
          {viewingImage && <Image source={{ uri: viewingImage }} style={styles.imgViewerFull} resizeMode="contain" />}
        </View>
      </Modal>

      {/* Input area */}
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={styles.inputArea}>
          {quotedMessage && (
            <View style={styles.quotePreview}>
              <View style={styles.quotePreviewBar} />
              <Text style={styles.quotePreviewText} numberOfLines={1}>{quotedMessage.content}</Text>
              <TouchableOpacity onPress={() => setQuotedMessage(null)}>
                <Ionicons name="close" size={16} color={COLORS.gray500} />
              </TouchableOpacity>
            </View>
          )}
          {selectedImage && (
            <View style={styles.selImgWrap}>
              <Image source={{ uri: selectedImage }} style={styles.selImg} />
              <TouchableOpacity style={styles.removeImgBtn} onPress={() => setSelectedImage(null)}>
                <Ionicons name="close-circle" size={22} color="#fff" />
              </TouchableOpacity>
            </View>
          )}
          {isRecording && (
            <View style={styles.recBar}>
              <View style={styles.recDot} />
              <Text style={styles.recText}>Recording… {fmtDuration(recordingDuration)}</Text>
            </View>
          )}
          <View style={styles.inputRow}>
            <TouchableOpacity style={styles.inputAction} onPress={handlePickFile}>
              <Ionicons name="attach-outline" size={24} color={COLORS.gray500} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.inputAction} onPress={handlePickImage}>
              <Ionicons name="image-outline" size={24} color={COLORS.gray500} />
            </TouchableOpacity>
            <TextInput
              style={styles.textInput}
              placeholder="Message…"
              placeholderTextColor={COLORS.gray700}
              value={newMessage}
              onChangeText={setNewMessage}
              multiline maxLength={1000}
              editable={!!constellationId && !isRecording}
            />
            <TouchableOpacity
              style={styles.inputAction}
              onPressIn={startRecording}
              onPressOut={stopRecording}
              disabled={!constellationId}
            >
              <Ionicons name={isRecording ? 'mic' : 'mic-outline'} size={24}
                color={isRecording ? COLORS.error : COLORS.gray500} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.sendBtn, (!newMessage.trim() && !selectedImage) && styles.sendBtnOff]}
              onPress={handleSend}
              disabled={(!newMessage.trim() && !selectedImage) || sending || !constellationId}
            >
              {sending
                ? <ActivityIndicator size="small" color="#fff" />
                : <Ionicons name="send" size={18} color="#fff" />}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0A0A12' },
  loadingBox: { flex: 1, backgroundColor: '#0A0A12', justifyContent: 'center', alignItems: 'center' },

  // Chat header
  chatHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: SPACING.m, paddingVertical: 10,
    backgroundColor: '#111120', borderBottomWidth: 1, borderBottomColor: '#1F1F2E',
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  partnerDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: COLORS.success },
  partnerName: { color: COLORS.white, fontSize: FONTS.h4, fontWeight: '700' },
  partnerSub: { color: COLORS.gray500, fontSize: FONTS.caption, marginTop: 1 },
  headerRight: { flexDirection: 'row', gap: 4 },
  callBtn: { padding: 8, borderRadius: 20, backgroundColor: '#1A1A2E' },

  // Messages
  msgList: { padding: SPACING.m, paddingBottom: 16 },
  bubbleWrapper: { marginBottom: 10 },
  bwLeft: { alignItems: 'flex-start' },
  bwRight: { alignItems: 'flex-end' },
  bubble: { maxWidth: '78%', borderRadius: 14, padding: 10 },
  bubbleMe: { backgroundColor: '#2B3FA0', borderBottomRightRadius: 2 },
  bubbleThem: { backgroundColor: '#1E1E2E', borderBottomLeftRadius: 2, borderLeftWidth: 3, borderLeftColor: COLORS.accent },
  msgImg: { width: 220, height: 180, borderRadius: 10, marginBottom: 4 },
  msgText: { color: COLORS.white, fontSize: FONTS.body1, lineHeight: 22 },
  metaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', marginTop: 4 },
  msgTime: { color: 'rgba(255,255,255,0.4)', fontSize: 10 },

  // Quote strip inside bubble
  quoteStrip: { borderLeftWidth: 3, borderLeftColor: COLORS.accent, paddingLeft: 8, marginBottom: 6, opacity: 0.8 },
  quoteText: { color: COLORS.gray400, fontSize: FONTS.caption },

  // Voice note
  voiceRow: { flexDirection: 'row', alignItems: 'center', gap: 8, minWidth: 190 },
  playBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' },
  waveform: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 2, height: 28 },
  waveBar: { width: 3, borderRadius: 2, backgroundColor: COLORS.gray700 },
  voiceDur: { color: COLORS.gray400, fontSize: FONTS.caption, minWidth: 34, textAlign: 'right' },

  // File
  fileCard: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 8, padding: 10, minWidth: 180 },
  fileName: { color: COLORS.white, fontSize: FONTS.body2, flexShrink: 1 },
  fileSize: { color: COLORS.gray500, fontSize: FONTS.caption, marginTop: 2 },

  // Reactions on bubble
  reactRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 3, paddingHorizontal: 4 },
  reactChip: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1E1E2E', borderRadius: 10, paddingHorizontal: 7, paddingVertical: 3, borderWidth: 1, borderColor: '#333350' },
  reactChipMine: { borderColor: COLORS.accent },
  reactEmoji: { fontSize: 14 },
  reactCount: { color: COLORS.gray400, fontSize: 11, marginLeft: 3 },

  // Reaction picker modal
  reactOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.55)' },
  reactPicker: { flexDirection: 'row', backgroundColor: '#1E1E2E', borderRadius: 28, paddingHorizontal: 10, paddingVertical: 8, gap: 6, borderWidth: 1, borderColor: '#333350', elevation: 10 },
  reactPickerItem: { padding: 6 },
  reactPickerEmoji: { fontSize: 26 },

  // Image viewer
  imgViewerBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.93)', justifyContent: 'center', alignItems: 'center' },
  imgViewerClose: { position: 'absolute', top: 48, right: 20, zIndex: 10, padding: 8 },
  imgViewerFull: { width: '92%', height: '80%' },

  // Empty
  emptyBox: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 10, padding: SPACING.xl },
  emptyTitle: { color: COLORS.white, fontSize: FONTS.h3, fontWeight: '600' },
  emptySub: { color: COLORS.gray600, fontSize: FONTS.body2, textAlign: 'center' },

  // Input area
  inputArea: {
    backgroundColor: '#111120', borderTopWidth: 1, borderTopColor: '#1F1F2E',
    paddingTop: SPACING.s, paddingBottom: Platform.OS === 'ios' ? 28 : SPACING.s, paddingHorizontal: SPACING.s,
  },
  quotePreview: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6, paddingHorizontal: 4 },
  quotePreviewBar: { width: 3, height: 30, backgroundColor: COLORS.accent, borderRadius: 2 },
  quotePreviewText: { flex: 1, color: COLORS.gray400, fontSize: FONTS.caption },
  selImgWrap: { position: 'relative', alignSelf: 'flex-start', marginBottom: 6 },
  selImg: { width: 80, height: 80, borderRadius: 8 },
  removeImgBtn: { position: 'absolute', top: -8, right: -8 },
  recBar: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: SPACING.s, paddingVertical: 6, marginBottom: 4 },
  recDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: COLORS.error },
  recText: { color: COLORS.error, fontSize: FONTS.body2 },
  inputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 6 },
  inputAction: { paddingBottom: 8, paddingHorizontal: 3 },
  textInput: {
    flex: 1, backgroundColor: '#1A1A2E', borderRadius: 22, paddingHorizontal: SPACING.m, paddingVertical: 9,
    maxHeight: 110, color: COLORS.white, fontSize: FONTS.body1, borderWidth: 1, borderColor: '#2A2A45',
  },
  sendBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center', marginBottom: 2 },
  sendBtnOff: { backgroundColor: '#2A2A45' },
});

export default ChatScreen;
