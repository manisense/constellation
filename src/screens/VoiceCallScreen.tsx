import React, { useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Screen from '../components/Screen';
import { COLORS, FONTS, SPACING } from '../constants/theme';
import { databaseBackedCallAdapter } from '../services/callProviderAdapter';
import { getCurrentConstellationId } from '../services/pairLifecycle';

const VoiceCallScreen: React.FC = () => {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'ringing' | 'active'>('idle');

  const startCall = async () => {
    try {
      const constellationId = await getCurrentConstellationId();
      if (!constellationId) {
        Alert.alert('No Pair Yet', 'Voice call is available when both partners are connected.');
        return;
      }

      const id = await databaseBackedCallAdapter.startVoiceSession(constellationId);
      setSessionId(id);
      setStatus('ringing');
    } catch {
      Alert.alert('Error', 'Could not start voice call. Please try again.');
    }
  };

  const connectCall = async () => {
    if (!sessionId) return;
    await databaseBackedCallAdapter.markActive(sessionId);
    setStatus('active');
  };

  const endCall = async () => {
    if (!sessionId) return;
    await databaseBackedCallAdapter.endSession(sessionId);
    setStatus('idle');
    setSessionId(null);
  };

  return (
    <Screen showHeader headerTitle="Voice Call">
      <View style={styles.container}>
        <Text style={styles.title}>Private 1:1 Voice Space</Text>
        <Text style={styles.subtitle}>
          Status: {status === 'idle' ? 'Ready' : status === 'ringing' ? 'Ringing' : 'Connected'}
        </Text>

        {status === 'idle' && (
          <TouchableOpacity style={styles.primaryButton} onPress={startCall}>
            <Text style={styles.primaryText}>Start Voice Call</Text>
          </TouchableOpacity>
        )}

        {status === 'ringing' && (
          <TouchableOpacity style={styles.primaryButton} onPress={connectCall}>
            <Text style={styles.primaryText}>Join Call</Text>
          </TouchableOpacity>
        )}

        {status !== 'idle' && (
          <TouchableOpacity style={styles.endButton} onPress={endCall}>
            <Text style={styles.endText}>End Call</Text>
          </TouchableOpacity>
        )}
      </View>
    </Screen>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: SPACING.l,
    justifyContent: 'center',
    alignItems: 'center',
    gap: SPACING.m,
  },
  title: {
    color: COLORS.white,
    fontSize: FONTS.h3,
    fontWeight: '700',
  },
  subtitle: {
    color: COLORS.gray300,
    fontSize: FONTS.body1,
  },
  primaryButton: {
    width: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: SPACING.m,
    alignItems: 'center',
  },
  primaryText: {
    color: COLORS.white,
    fontWeight: '700',
  },
  endButton: {
    width: '100%',
    borderColor: COLORS.error,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: SPACING.m,
    alignItems: 'center',
  },
  endText: {
    color: COLORS.error,
    fontWeight: '700',
  },
});

export default VoiceCallScreen;
