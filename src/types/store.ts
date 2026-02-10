import type { GameInstruction, RecentInstruction } from "./game";

export interface WordHistory {
  firstSeen: string;
  lastSeen: string;
  timesCorrect: number;
  timesIncorrect: number;
  contexts: number;
  sessionIds: string[];
}

export interface SessionRecord {
  sessionId: string;
  date: string;
  durationSec: number;
  wordsIntroduced: string[];
  wordsMastered: string[];
  totalInteractions: number;
  accuracy: number;
  hintsUsed: number;
}

export interface PersistedState {
  version: number;
  childId: string;
  knownWords: string[];
  introducedWords: string[];
  wordHistory: Record<string, WordHistory>;
  sessionHistory: SessionRecord[];
}

export type GamePhase =
  | "loading"
  | "playing"
  | "waiting_for_batch"
  | "feedback"
  | "summary";

export interface GameStoreState {
  // Persisted
  childId: string;
  knownWords: string[];
  introducedWords: string[];
  wordHistory: Record<string, WordHistory>;
  sessionHistory: SessionRecord[];

  // Session (transient)
  sessionId: string;
  sessionStartTime: number;
  sessionDurationSec: number;
  wordsIntroducedThisSession: string[];
  recentAccuracy: number;
  accuracyWindow: number;
  hintCount: number;
  consecutiveCorrect: number;
  recentInstructions: RecentInstruction[];

  // Instruction queue
  instructionQueue: GameInstruction[];
  currentInstructionIndex: number;
  currentInstruction: GameInstruction | null;

  // UI
  phase: GamePhase;
  hintLevel: 0 | 1 | 2 | 3;
  isFetchingInstructions: boolean;
  error: string | null;
}

export interface GameStoreActions {
  startSession: () => void;
  endSession: () => void;
  tickSessionTimer: () => void;

  setInstructions: (instructions: GameInstruction[]) => void;
  advanceInstruction: () => GameInstruction | null;

  recordCorrect: (responseTimeMs: number, hintsUsed: number) => void;
  recordIncorrect: () => void;
  escalateHint: () => void;
  resetHint: () => void;

  setPhase: (phase: GamePhase) => void;
  setFetching: (fetching: boolean) => void;
  setError: (error: string | null) => void;

  buildChildState: () => import("./game").ChildState;
}

export type GameStore = GameStoreState & GameStoreActions;
