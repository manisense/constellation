/**
 * PlayScreen — Two prominent feature cards: Couple Game + Watch Together.
 * Each card manages its own session state inline.
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, SPACING } from '../constants/theme';
import { endCoupleSession, startCoupleSession } from '../services/playTogetherService';

// ─── Game prompts ─────────────────────────────────────────────────────────────

const GAME_PROMPTS = [
  'Share one tiny thing you admire in your partner.',
  'Describe your ideal cozy evening together in three words.',
  'What song best describes your relationship this week?',
  'If you could relive one moment together, what would it be?',
  'What is one small thing your partner does that makes you smile?',
  'Describe your partner using only three emojis.',
];

// ─── Component ────────────────────────────────────────────────────────────────

const PlayScreen: React.FC = () => {
  // ── Game state ────────────────────────────────────────────────────
  const [gameSessionId, setGameSessionId] = useState<string | null>(null);
  const [promptIndex, setPromptIndex] = useState(0);
  const [gameLoading, setGameLoading] = useState(false);

  // ── Watch state ───────────────────────────────────────────────────
  const [watchSessionId, setWatchSessionId] = useState<string | null>(null);
  const [watchLink, setWatchLink] = useState('');
  const [reaction, setReaction] = useState('');
  const [reactions, setReactions] = useState<string[]>([]);
  const [watchLoading, setWatchLoading] = useState(false);

  // ── Game handlers ─────────────────────────────────────────────────
  const startGame = async () => {
    try {
      setGameLoading(true);
      const session = await startCoupleSession('game');
      setGameSessionId(session.id);
      setPromptIndex(0);
    } catch { Alert.alert('Error', 'Could not start the game session.'); }
    finally { setGameLoading(false); }
  };

  const nextPrompt = () => setPromptIndex((i) => (i + 1) % GAME_PROMPTS.length);

  const endGame = async () => {
    if (!gameSessionId) return;
    try { await endCoupleSession(gameSessionId); } catch {}
    setGameSessionId(null);
  };

  // ── Watch handlers ────────────────────────────────────────────────
  const startWatch = async () => {
    if (!watchLink.trim()) { Alert.alert('Add a link', 'Paste a movie or show link to begin.'); return; }
    try {
      setWatchLoading(true);
      const session = await startCoupleSession('watch');
      setWatchSessionId(session.id);
    } catch { Alert.alert('Error', 'Could not start watch session.'); }
    finally { setWatchLoading(false); }
  };

  const submitReaction = () => {
    if (!reaction.trim()) return;
    setReactions((prev) => [reaction.trim(), ...prev].slice(0, 6));
    setReaction('');
  };

  const endWatch = async () => {
    if (!watchSessionId) return;
    try { await endCoupleSession(watchSessionId); } catch {}
    setWatchSessionId(null);
    setReactions([]);
    setWatchLink('');
  };

  // ── Render ────────────────────────────────────────────────────────
  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>

      {/* ── Couple Game card ── */}
      <View style={styles.featureCard}>
        <View style={styles.cardHeader}>
          <View style={styles.cardIcon}>
            <Ionicons name="game-controller-outline" size={28} color={COLORS.accent} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle}>Couple Game</Text>
            <Text style={styles.cardSub}>Answer heartfelt prompts together</Text>
          </View>
          {gameSessionId && (
            <View style={styles.liveBadge}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>LIVE</Text>
            </View>
          )}
        </View>

        {!gameSessionId ? (
          <TouchableOpacity style={styles.primaryBtn} onPress={startGame} disabled={gameLoading}>
            {gameLoading ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.primaryBtnText}>Start Game</Text>}
          </TouchableOpacity>
        ) : (
          <>
            <View style={styles.promptBox}>
              <Text style={styles.promptLabel}>Prompt {promptIndex + 1} of {GAME_PROMPTS.length}</Text>
              <Text style={styles.promptText}>{GAME_PROMPTS[promptIndex]}</Text>
            </View>
            <View style={styles.btnRow}>
              <TouchableOpacity style={[styles.outlineBtn, { flex: 1 }]} onPress={nextPrompt}>
                <Text style={styles.outlineBtnText}>Next →</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.dangerBtn]} onPress={endGame}>
                <Text style={styles.dangerBtnText}>End</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>

      {/* ── Watch Together card ── */}
      <View style={styles.featureCard}>
        <View style={styles.cardHeader}>
          <View style={[styles.cardIcon, { backgroundColor: '#1A0D2E' }]}>
            <Ionicons name="film-outline" size={28} color={COLORS.secondary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle}>Watch Together</Text>
            <Text style={styles.cardSub}>Sync a private viewing session</Text>
          </View>
          {watchSessionId && (
            <View style={styles.liveBadge}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>LIVE</Text>
            </View>
          )}
        </View>

        {!watchSessionId ? (
          <>
            <TextInput
              style={styles.linkInput}
              placeholder="Paste a movie or show link…"
              placeholderTextColor={COLORS.gray700}
              value={watchLink}
              onChangeText={setWatchLink}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: COLORS.secondary }]} onPress={startWatch} disabled={watchLoading}>
              {watchLoading ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.primaryBtnText}>Start Watching</Text>}
            </TouchableOpacity>
          </>
        ) : (
          <>
            {/* Reactions feed */}
            <View style={styles.reactionsBox}>
              <Text style={styles.promptLabel}>Live reactions</Text>
              {reactions.length === 0 ? (
                <Text style={styles.noReactionsText}>No reactions yet…</Text>
              ) : (
                reactions.map((r, i) => (
                  <Text key={i} style={styles.reactionItem}>• {r}</Text>
                ))
              )}
            </View>
            <View style={styles.reactionInputRow}>
              <TextInput
                style={styles.reactionInput}
                placeholder="Type a reaction…"
                placeholderTextColor={COLORS.gray700}
                value={reaction}
                onChangeText={setReaction}
                onSubmitEditing={submitReaction}
              />
              <TouchableOpacity style={styles.sendReactionBtn} onPress={submitReaction}>
                <Ionicons name="send" size={18} color={COLORS.white} />
              </TouchableOpacity>
            </View>
            <TouchableOpacity style={styles.dangerBtn} onPress={endWatch}>
              <Text style={styles.dangerBtnText}>End Session</Text>
            </TouchableOpacity>
          </>
        )}
      </View>

      <View style={{ height: 32 }} />
    </ScrollView>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0A0A12' },
  container: { padding: SPACING.m, gap: SPACING.m },

  // Feature card
  featureCard: {
    backgroundColor: '#111120',
    borderRadius: 20,
    padding: SPACING.m,
    borderWidth: 1,
    borderColor: '#1F1F2E',
    gap: SPACING.m,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: SPACING.m },
  cardIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: '#0D1530',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: { color: COLORS.white, fontSize: FONTS.h4, fontWeight: '700' },
  cardSub: { color: COLORS.gray500, fontSize: FONTS.caption, marginTop: 2 },
  liveBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#1A0808', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1, borderColor: COLORS.error + '66' },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: COLORS.error },
  liveText: { color: COLORS.error, fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },

  // Game
  promptBox: { backgroundColor: '#0D0D1A', borderRadius: 12, padding: SPACING.m, gap: SPACING.s, borderWidth: 1, borderColor: '#2A2A45' },
  promptLabel: { color: COLORS.gray600, fontSize: FONTS.caption, textTransform: 'uppercase', letterSpacing: 0.8 },
  promptText: { color: COLORS.white, fontSize: FONTS.body1, lineHeight: 26, fontWeight: '500' },

  // Watch
  linkInput: { backgroundColor: '#1A1A2E', borderRadius: 12, borderWidth: 1, borderColor: '#2A2A45', paddingHorizontal: SPACING.m, paddingVertical: 12, color: COLORS.white, fontSize: FONTS.body2 },
  reactionsBox: { backgroundColor: '#0D0D1A', borderRadius: 12, padding: SPACING.m, gap: 6, minHeight: 80, borderWidth: 1, borderColor: '#2A2A45' },
  noReactionsText: { color: COLORS.gray700, fontSize: FONTS.body2, fontStyle: 'italic' },
  reactionItem: { color: COLORS.white, fontSize: FONTS.body2, lineHeight: 22 },
  reactionInputRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.s },
  reactionInput: { flex: 1, backgroundColor: '#1A1A2E', borderRadius: 22, borderWidth: 1, borderColor: '#2A2A45', paddingHorizontal: SPACING.m, paddingVertical: 10, color: COLORS.white, fontSize: FONTS.body2 },
  sendReactionBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.secondary, alignItems: 'center', justifyContent: 'center' },

  // Buttons
  primaryBtn: { backgroundColor: COLORS.primary, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  primaryBtnText: { color: COLORS.white, fontSize: FONTS.body1, fontWeight: '600' },
  outlineBtn: { borderWidth: 1, borderColor: COLORS.accent, borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  outlineBtnText: { color: COLORS.accent, fontSize: FONTS.body2, fontWeight: '600' },
  dangerBtn: { borderWidth: 1, borderColor: COLORS.error + '66', borderRadius: 12, paddingVertical: 12, alignItems: 'center', paddingHorizontal: SPACING.m },
  dangerBtnText: { color: COLORS.error, fontSize: FONTS.body2, fontWeight: '600' },
  btnRow: { flexDirection: 'row', gap: SPACING.s, alignItems: 'center' },
});

export default PlayScreen;
