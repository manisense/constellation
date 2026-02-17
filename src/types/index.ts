// User types
export interface User {
  id: string;
  name: string;
  email: string;
  photoURL: string;
  about: string;
  interests: string[];
  starName: string;
  starType: StarType | null;
  constellationId: string | null;
  createdAt: Date;
  phoneNumber: string;
}

// Star types
export enum StarType {
  LUMINARY = "luminary",
  NAVIGATOR = "navigator",
}

// Constellation types
export interface Constellation {
  id: string;
  name: string;
  partnerIds: string[];
  createdAt: Date;
  bondingStrength: number;
  quizResults: QuizResult[];
}

// Quiz types
export interface Quiz {
  id: string;
  title: string;
  description: string;
  questions: Question[];
}

export interface Question {
  id: string;
  text: string;
  options: Option[];
}

export interface Option {
  id: string;
  text: string;
  value: number;
  type: StarType;
}

export interface QuizResult {
  id: string;
  quizId: string;
  userId: string;
  answers: Answer[];
  result: StarType;
  createdAt: Date;
}

export interface Answer {
  questionId: string;
  optionId: string;
}

// Message types
export interface Message {
  id: string;
  constellationId: string;
  senderId: string;
  text: string;
  createdAt: Date;
}

export interface SharedRoomState {
  constellationId: string;
  roomName: string;
  bondingStrength: number;
  ambience: "starglow" | "sunset" | "moonlight";
  decorLevel: number;
  unlockedArtifacts: string[];
  chapterUnlocked: number;
}

export interface RitualEntry {
  id: string;
  constellationId: string;
  createdAt: string;
  completedBy: string;
  ritualType: "check_in" | "prompt" | "gratitude";
  promptText?: string;
  responseText?: string;
}

export interface TimelineChapter {
  id: string;
  constellationId: string;
  chapterIndex: number;
  title: string;
  summary: string;
  isUnlocked: boolean;
  milestoneCount: number;
}

export type CallType = "voice" | "video";

export interface CallSession {
  id: string;
  constellationId: string;
  startedBy: string;
  type: CallType;
  status: "ringing" | "active" | "ended" | "missed";
  createdAt: string;
}

export interface CoupleSession {
  id: string;
  constellationId: string;
  mode: "game" | "watch";
  status: "active" | "ended";
  createdBy: string;
  createdAt: string;
}

export interface NotificationPreferences {
  pushEnabled: boolean;
  emailEnabled: boolean;
  updatedAt?: string;
}

export interface PushDeviceRegistration {
  provider: "onesignal";
  subscriptionId: string;
  platform: "ios" | "android";
  appVersion?: string;
}

// Navigation types
export type RootStackParamList = {
  Welcome: undefined;
  Onboarding: undefined;
  CreateConstellation: undefined;
  JoinConstellation: undefined;
  Profile: undefined;
  Quiz: undefined;
  StarReveal: undefined;
  Home: undefined;
  Chat: undefined;
  ConstellationView: undefined;
  Settings: undefined;
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;
  WaitingForPartner: {
    inviteCode?: string;
  };
  PhoneAuth: {
    constellationId?: string;
  };
  // New screens
  DatePlans: undefined;
  Memories: undefined;
  DailyRitual: undefined;
  Timeline: undefined;
  VoiceCall: undefined;
  VideoCall: undefined;
  CoupleGame: undefined;
  WatchTogether: undefined;
  // Tab navigator screens
  HomeTab: undefined;
  ChatTab: undefined;
  ConstellationTab: undefined;
  SettingsTab: undefined;
};
