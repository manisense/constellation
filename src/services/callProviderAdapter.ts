import { createCallSession, updateCallStatus } from "./communicationService";

export interface CallProviderAdapter {
  startVoiceSession: (constellationId: string) => Promise<string>;
  startVideoSession: (constellationId: string) => Promise<string>;
  markActive: (sessionId: string) => Promise<void>;
  endSession: (sessionId: string) => Promise<void>;
}

export const databaseBackedCallAdapter: CallProviderAdapter = {
  startVoiceSession: async (constellationId: string) => {
    const session = await createCallSession(constellationId, "voice");
    return session.id;
  },
  startVideoSession: async (constellationId: string) => {
    const session = await createCallSession(constellationId, "video");
    return session.id;
  },
  markActive: async (sessionId: string) => {
    await updateCallStatus(sessionId, "active");
  },
  endSession: async (sessionId: string) => {
    await updateCallStatus(sessionId, "ended");
  },
};
