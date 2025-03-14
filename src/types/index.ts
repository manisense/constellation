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
  LUMINARY = 'luminary',
  NAVIGATOR = 'navigator',
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
  // Tab navigator screens
  HomeTab: undefined;
  ChatTab: undefined;
  ConstellationTab: undefined;
  SettingsTab: undefined;
}; 