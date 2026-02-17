import React, { useEffect, useState } from 'react';
import { Alert, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Screen from '../components/Screen';
import Card from '../components/Card';
import { COLORS, FONTS, SPACING } from '../constants/theme';
import { TimelineChapter } from '../types';
import { getOnThisDayMemories, getTimelineChapters, unlockChapter } from '../services/timelineService';

const TimelineScreen: React.FC = () => {
  const [chapters, setChapters] = useState<TimelineChapter[]>([]);
  const [onThisDayCount, setOnThisDayCount] = useState(0);

  const loadTimeline = async () => {
    try {
      const [chapterData, memories] = await Promise.all([
        getTimelineChapters(),
        getOnThisDayMemories(),
      ]);
      setChapters(chapterData);
      setOnThisDayCount(memories.length || 0);
    } catch (error) {
      Alert.alert('Error', 'Could not load your timeline right now.');
    }
  };

  useEffect(() => {
    loadTimeline();
  }, []);

  const handleUnlock = async (item: TimelineChapter) => {
    try {
      await unlockChapter(item.id, item.chapterIndex);
      await loadTimeline();
    } catch (error) {
      Alert.alert('Error', 'Could not unlock this chapter yet.');
    }
  };

  return (
    <Screen showHeader headerTitle="Love Story Timeline">
      <View style={styles.container}>
        <Card style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>On this day</Text>
          <Text style={styles.summaryValue}>{onThisDayCount} memory resurfaced</Text>
        </Card>

        <FlatList
          data={chapters}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <Card style={styles.chapterCard}>
              <View style={styles.chapterHeader}>
                <Text style={styles.chapterTitle}>Chapter {item.chapterIndex}: {item.title}</Text>
                <Text style={styles.chapterStatus}>{item.isUnlocked ? 'Unlocked' : 'Locked'}</Text>
              </View>
              <Text style={styles.chapterSummary}>{item.summary}</Text>
              <Text style={styles.chapterMeta}>{item.milestoneCount} milestones</Text>

              {!item.isUnlocked && (
                <TouchableOpacity style={styles.unlockButton} onPress={() => handleUnlock(item)}>
                  <Text style={styles.unlockText}>Unlock Chapter</Text>
                </TouchableOpacity>
              )}
            </Card>
          )}
          ListEmptyComponent={<Text style={styles.emptyText}>Your timeline will appear as memories grow.</Text>}
        />
      </View>
    </Screen>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: SPACING.l,
  },
  summaryCard: {
    padding: SPACING.m,
    marginBottom: SPACING.m,
  },
  summaryTitle: {
    color: COLORS.gray300,
    fontSize: FONTS.body2,
  },
  summaryValue: {
    color: COLORS.white,
    fontSize: FONTS.h4,
    marginTop: SPACING.xs,
    fontWeight: '600',
  },
  listContent: {
    gap: SPACING.m,
    paddingBottom: SPACING.xl,
  },
  chapterCard: {
    padding: SPACING.m,
    gap: SPACING.s,
  },
  chapterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  chapterTitle: {
    color: COLORS.white,
    fontSize: FONTS.body1,
    fontWeight: '700',
    flex: 1,
    marginRight: SPACING.s,
  },
  chapterStatus: {
    color: COLORS.accent,
    fontSize: FONTS.caption,
  },
  chapterSummary: {
    color: COLORS.gray300,
    fontSize: FONTS.body2,
  },
  chapterMeta: {
    color: COLORS.gray500,
    fontSize: FONTS.caption,
  },
  unlockButton: {
    marginTop: SPACING.s,
    borderRadius: 10,
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.s,
    alignItems: 'center',
  },
  unlockText: {
    color: COLORS.white,
    fontWeight: '600',
  },
  emptyText: {
    color: COLORS.gray300,
    textAlign: 'center',
    marginTop: SPACING.xl,
  },
});

export default TimelineScreen;
