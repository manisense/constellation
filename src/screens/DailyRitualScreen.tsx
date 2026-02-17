import React, { useEffect, useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import Screen from '../components/Screen';
import Card from '../components/Card';
import Button from '../components/Button';
import { COLORS, FONTS, SPACING } from '../constants/theme';
import { getCurrentStreak, getTodayPrompt, submitDailyRitual } from '../services/ritualsService';

const DailyRitualScreen: React.FC = () => {
  const [prompt, setPrompt] = useState('');
  const [streak, setStreak] = useState(0);
  const [responseText, setResponseText] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setPrompt(getTodayPrompt());
    getCurrentStreak().then(setStreak).catch(() => setStreak(0));
  }, []);

  const handleCompleteRitual = async () => {
    if (!responseText.trim()) {
      Alert.alert('Add a Response', 'Write a short response to complete today’s ritual.');
      return;
    }

    try {
      setSaving(true);
      await submitDailyRitual('prompt', responseText.trim());
      const nextStreak = await getCurrentStreak();
      setStreak(nextStreak);
      setResponseText('');
      Alert.alert('Ritual Complete', 'Beautiful. Your daily ritual has been saved.');
    } catch (error) {
      Alert.alert('Error', 'Could not complete ritual right now. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen showHeader headerTitle="Daily Love Ritual">
      <View style={styles.container}>
        <Card style={styles.heroCard}>
          <Text style={styles.streakLabel}>Current streak</Text>
          <Text style={styles.streakValue}>{streak} days</Text>
          <Text style={styles.promptText}>{prompt}</Text>
        </Card>

        <Card style={styles.inputCard}>
          <Text style={styles.inputLabel}>Your response</Text>
          <TextInput
            value={responseText}
            onChangeText={setResponseText}
            placeholder="Write from the heart..."
            placeholderTextColor={COLORS.gray500}
            multiline
            style={styles.input}
            maxLength={600}
          />
          <Button title="Complete Ritual" onPress={handleCompleteRitual} loading={saving} />
        </Card>

        <TouchableOpacity style={styles.helperCard}>
          <Text style={styles.helperTitle}>Quiz is optional</Text>
          <Text style={styles.helperText}>Use quiz prompts as a playful ritual whenever you both want.</Text>
        </TouchableOpacity>
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
  heroCard: {
    padding: SPACING.l,
    gap: SPACING.s,
  },
  streakLabel: {
    color: COLORS.gray300,
    fontSize: FONTS.body2,
  },
  streakValue: {
    color: COLORS.white,
    fontSize: FONTS.h2,
    fontWeight: '700',
  },
  promptText: {
    color: COLORS.highlight,
    fontSize: FONTS.body1,
    lineHeight: 22,
  },
  inputCard: {
    padding: SPACING.l,
    gap: SPACING.m,
  },
  inputLabel: {
    color: COLORS.white,
    fontSize: FONTS.body1,
    fontWeight: '600',
  },
  input: {
    minHeight: 120,
    borderWidth: 1,
    borderColor: COLORS.gray700,
    borderRadius: 12,
    padding: SPACING.m,
    color: COLORS.white,
    textAlignVertical: 'top',
    backgroundColor: COLORS.input,
  },
  helperCard: {
    borderWidth: 1,
    borderColor: COLORS.gray700,
    borderRadius: 12,
    padding: SPACING.m,
  },
  helperTitle: {
    color: COLORS.white,
    fontSize: FONTS.body1,
    fontWeight: '600',
    marginBottom: SPACING.xs,
  },
  helperText: {
    color: COLORS.gray300,
    fontSize: FONTS.body2,
  },
});

export default DailyRitualScreen;
