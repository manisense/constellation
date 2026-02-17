import React, { useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import Screen from '../components/Screen';
import Card from '../components/Card';
import { COLORS, FONTS, SPACING } from '../constants/theme';
import { endCoupleSession, startCoupleSession } from '../services/playTogetherService';

const WatchTogetherScreen: React.FC = () => {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [watchLink, setWatchLink] = useState('');
  const [reaction, setReaction] = useState('');
  const [reactions, setReactions] = useState<string[]>([]);

  const startWatch = async () => {
    if (!watchLink.trim()) {
      Alert.alert('Add Link', 'Paste a movie or show link to begin watch together.');
      return;
    }

    try {
      const session = await startCoupleSession('watch');
      setSessionId(session.id);
    } catch {
      Alert.alert('Error', 'Could not start watch session.');
    }
  };

  const submitReaction = () => {
    if (!reaction.trim()) return;
    setReactions((prev) => [reaction.trim(), ...prev].slice(0, 5));
    setReaction('');
  };

  const endWatch = async () => {
    if (!sessionId) return;
    await endCoupleSession(sessionId);
    setSessionId(null);
    setReactions([]);
  };

  return (
    <Screen showHeader headerTitle="Watch Together">
      <View style={styles.container}>
        {!sessionId ? (
          <Card style={styles.card}>
            <Text style={styles.label}>Watch Link</Text>
            <TextInput
              value={watchLink}
              onChangeText={setWatchLink}
              placeholder="https://..."
              placeholderTextColor={COLORS.gray500}
              style={styles.input}
              autoCapitalize="none"
            />
            <TouchableOpacity style={styles.primaryButton} onPress={startWatch}>
              <Text style={styles.primaryText}>Start Private Watch Session</Text>
            </TouchableOpacity>
          </Card>
        ) : (
          <>
            <Card style={styles.card}>
              <Text style={styles.label}>Live reactions</Text>
              <TextInput
                value={reaction}
                onChangeText={setReaction}
                placeholder="Type a cute reaction..."
                placeholderTextColor={COLORS.gray500}
                style={styles.input}
              />
              <TouchableOpacity style={styles.primaryButton} onPress={submitReaction}>
                <Text style={styles.primaryText}>Send Reaction</Text>
              </TouchableOpacity>
            </Card>

            <Card style={styles.card}>
              {reactions.length === 0 ? (
                <Text style={styles.emptyText}>No reactions yet.</Text>
              ) : (
                reactions.map((item, index) => (
                  <Text key={`${item}-${index}`} style={styles.reactionText}>• {item}</Text>
                ))
              )}
            </Card>

            <TouchableOpacity style={styles.endButton} onPress={endWatch}>
              <Text style={styles.endText}>End Watch Session</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </Screen>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: SPACING.l,
    gap: SPACING.m,
  },
  card: {
    padding: SPACING.m,
    gap: SPACING.s,
  },
  label: {
    color: COLORS.white,
    fontSize: FONTS.body1,
    fontWeight: '600',
  },
  input: {
    height: 48,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.gray700,
    color: COLORS.white,
    backgroundColor: COLORS.input,
    paddingHorizontal: SPACING.m,
  },
  primaryButton: {
    marginTop: SPACING.s,
    borderRadius: 10,
    backgroundColor: COLORS.secondary,
    paddingVertical: SPACING.s,
    alignItems: 'center',
  },
  primaryText: {
    color: COLORS.white,
    fontWeight: '700',
  },
  emptyText: {
    color: COLORS.gray300,
  },
  reactionText: {
    color: COLORS.white,
    marginBottom: SPACING.xs,
  },
  endButton: {
    borderColor: COLORS.error,
    borderWidth: 1,
    borderRadius: 10,
    alignItems: 'center',
    paddingVertical: SPACING.s,
  },
  endText: {
    color: COLORS.error,
    fontWeight: '700',
  },
});

export default WatchTogetherScreen;
