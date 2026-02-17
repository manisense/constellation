import React, { useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Screen from '../components/Screen';
import Card from '../components/Card';
import { COLORS, FONTS, SPACING } from '../constants/theme';
import { endCoupleSession, startCoupleSession } from '../services/playTogetherService';

const prompts = [
  'Share one tiny thing you admire in your partner.',
  'Describe your ideal cozy evening in three words.',
  'What song best describes your relationship this week?'
];

const CoupleGameScreen: React.FC = () => {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [promptIndex, setPromptIndex] = useState(0);

  const startGame = async () => {
    try {
      const session = await startCoupleSession('game');
      setSessionId(session.id);
      setPromptIndex(0);
    } catch {
      Alert.alert('Error', 'Could not start the game session.');
    }
  };

  const nextPrompt = () => {
    setPromptIndex((value) => (value + 1) % prompts.length);
  };

  const endGame = async () => {
    if (!sessionId) return;
    await endCoupleSession(sessionId);
    setSessionId(null);
  };

  return (
    <Screen showHeader headerTitle="Couple Game">
      <View style={styles.container}>
        {!sessionId ? (
          <TouchableOpacity style={styles.primaryButton} onPress={startGame}>
            <Text style={styles.primaryText}>Start Co-op Prompt Game</Text>
          </TouchableOpacity>
        ) : (
          <>
            <Card style={styles.promptCard}>
              <Text style={styles.promptLabel}>Prompt</Text>
              <Text style={styles.promptText}>{prompts[promptIndex]}</Text>
            </Card>
            <TouchableOpacity style={styles.primaryButton} onPress={nextPrompt}>
              <Text style={styles.primaryText}>Next Prompt</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.secondaryButton} onPress={endGame}>
              <Text style={styles.secondaryText}>End Session</Text>
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
  primaryButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    alignItems: 'center',
    paddingVertical: SPACING.m,
  },
  primaryText: {
    color: COLORS.white,
    fontWeight: '700',
  },
  promptCard: {
    padding: SPACING.l,
    gap: SPACING.s,
  },
  promptLabel: {
    color: COLORS.gray300,
    fontSize: FONTS.caption,
  },
  promptText: {
    color: COLORS.white,
    fontSize: FONTS.body1,
    lineHeight: 22,
  },
  secondaryButton: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.gray500,
    alignItems: 'center',
    paddingVertical: SPACING.m,
  },
  secondaryText: {
    color: COLORS.gray300,
    fontWeight: '700',
  },
});

export default CoupleGameScreen;
