
export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string; // Gmail only
  language: string;
  consentGiven: boolean;
  joinedAt: number;
}

export enum SafetyStatus {
  SAFE = 'SAFE',
  UNSAFE = 'UNSAFE',
  UNKNOWN = 'UNKNOWN'
}

export interface Mentor {
  id: string;
  name: string;
  description: string;
  context: string; // The "persona" or system instruction
  goals: string; // What to look for
  isDefault?: boolean;
  supportedModes?: ('camera' | 'screen')[]; // Defines where this mentor appears
}

export interface AnalysisPoint {
  timestamp: number;
  postureScore: number; // 1-10 (or generic Quality score for screen share)
  focusScore: number; // 1-10
  lightingScore: number; // 1-10 (or generic Clarity score)
  safetyStatus: SafetyStatus;
  detectedObjects: string[];
  suggestion: string;
  goodPoints?: string[]; // What is going well
  improvements?: string[]; // What needs fixing
}

export interface SessionReport {
  id: string;
  userId: string;
  startTime: number;
  endTime: number;
  durationSeconds: number;
  activityType: string;
  overallScore: number;
  keyInsights: string[];
  timeline: AnalysisPoint[];
  videoBlobKey?: string; // Key for IndexedDB
  isFlagged: boolean; // For toxicity
}

export type ViewState = 'onboarding' | 'dashboard' | 'recording' | 'co-creating' | 'report';