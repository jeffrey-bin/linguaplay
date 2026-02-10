import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { GameStore, GamePhase, SessionRecord } from "@/types/store";
import type { GameInstruction, ChildState } from "@/types/game";
import { TIMING } from "@/config/constants";

function generateId(): string {
  return Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
}

const initialSessionState = {
  sessionId: "",
  sessionStartTime: 0,
  sessionDurationSec: 0,
  wordsIntroducedThisSession: [] as string[],
  recentAccuracy: 0.75,
  accuracyWindow: TIMING.ACCURACY_WINDOW,
  hintCount: 0,
  consecutiveCorrect: 0,
  recentInstructions: [],
  instructionQueue: [] as GameInstruction[],
  currentInstructionIndex: 0,
  currentInstruction: null as GameInstruction | null,
  phase: "loading" as GamePhase,
  hintLevel: 0 as 0 | 1 | 2 | 3,
  isFetchingInstructions: false,
  error: null as string | null,
};

export const useGameStore = create<GameStore>()(
  persist(
    (set, get) => ({
      // Persisted defaults
      childId: generateId(),
      knownWords: [],
      introducedWords: [],
      wordHistory: {},
      sessionHistory: [],

      // Session defaults
      ...initialSessionState,

      startSession: () => {
        set({
          ...initialSessionState,
          sessionId: generateId(),
          sessionStartTime: Date.now(),
          phase: "loading",
        });
      },

      endSession: () => {
        const state = get();
        const record: SessionRecord = {
          sessionId: state.sessionId,
          date: new Date().toISOString(),
          durationSec: state.sessionDurationSec,
          wordsIntroduced: [...state.wordsIntroducedThisSession],
          wordsMastered: [],
          totalInteractions: state.recentInstructions.length,
          accuracy: state.recentAccuracy,
          hintsUsed: state.hintCount,
        };
        set((s) => ({
          sessionHistory: [...s.sessionHistory, record],
          phase: "summary" as GamePhase,
        }));
      },

      tickSessionTimer: () => {
        const state = get();
        if (state.sessionStartTime === 0) return;
        const elapsed = Math.floor((Date.now() - state.sessionStartTime) / 1000);
        set({ sessionDurationSec: elapsed });
      },

      setInstructions: (instructions: GameInstruction[]) => {
        set({
          instructionQueue: instructions,
          currentInstructionIndex: 0,
          currentInstruction: instructions[0] || null,
          phase: "playing",
          isFetchingInstructions: false,
        });
        // Prefetch: mark new words as introduced
        for (const instr of instructions) {
          if (instr.new_word) {
            const state = get();
            if (
              !state.knownWords.includes(instr.new_word) &&
              !state.introducedWords.includes(instr.new_word)
            ) {
              set((s) => ({
                introducedWords: [...s.introducedWords, instr.new_word!],
                wordsIntroducedThisSession: [
                  ...s.wordsIntroducedThisSession,
                  instr.new_word!,
                ],
              }));
            }
          }
        }
      },

      advanceInstruction: () => {
        const state = get();
        const nextIndex = state.currentInstructionIndex + 1;
        if (nextIndex < state.instructionQueue.length) {
          const next = state.instructionQueue[nextIndex];
          set({
            currentInstructionIndex: nextIndex,
            currentInstruction: next,
            hintLevel: 0,
            phase: "playing",
          });
          return next;
        }
        set({ currentInstruction: null, phase: "waiting_for_batch" });
        return null;
      },

      recordCorrect: (responseTimeMs: number, hintsUsed: number) => {
        const state = get();
        const instruction = state.currentInstruction;
        if (!instruction) return;

        const newRecentInstructions = [
          ...state.recentInstructions,
          {
            id: instruction.id,
            instruction_text: instruction.instruction_text,
            new_word: instruction.new_word,
            was_correct: true,
            hints_used: hintsUsed,
            response_time_ms: responseTimeMs,
          },
        ].slice(-TIMING.ACCURACY_WINDOW);

        const correctCount = newRecentInstructions.filter(
          (i) => i.was_correct
        ).length;
        const newAccuracy =
          newRecentInstructions.length > 0
            ? correctCount / newRecentInstructions.length
            : 0.75;

        // Update word history
        const updatedHistory = { ...state.wordHistory };
        for (const word of instruction.target_items) {
          const existing = updatedHistory[word] || {
            firstSeen: new Date().toISOString(),
            lastSeen: "",
            timesCorrect: 0,
            timesIncorrect: 0,
            contexts: 0,
            sessionIds: [],
          };
          existing.lastSeen = new Date().toISOString();
          existing.timesCorrect += 1;
          existing.contexts += 1;
          if (!existing.sessionIds.includes(state.sessionId)) {
            existing.sessionIds.push(state.sessionId);
          }
          updatedHistory[word] = existing;

          // Check mastery: 3+ correct across 2+ sessions → known
          if (
            existing.timesCorrect >= TIMING.MASTERY_THRESHOLD &&
            existing.sessionIds.length >= TIMING.MASTERY_MIN_SESSIONS &&
            !state.knownWords.includes(word)
          ) {
            set((s) => ({
              knownWords: [...s.knownWords, word],
              introducedWords: s.introducedWords.filter((w) => w !== word),
            }));
          }
        }

        set({
          recentInstructions: newRecentInstructions,
          recentAccuracy: newAccuracy,
          consecutiveCorrect: state.consecutiveCorrect + 1,
          hintCount: state.hintCount + hintsUsed,
          wordHistory: updatedHistory,
          hintLevel: 0,
          phase: "feedback",
        });
      },

      recordIncorrect: () => {
        set((s) => ({
          consecutiveCorrect: 0,
          recentAccuracy: Math.max(0, s.recentAccuracy - 0.05),
        }));
      },

      escalateHint: () => {
        set((s) => ({
          hintLevel: Math.min(3, s.hintLevel + 1) as 0 | 1 | 2 | 3,
        }));
      },

      resetHint: () => {
        set({ hintLevel: 0 });
      },

      setPhase: (phase: GamePhase) => set({ phase }),
      setFetching: (fetching: boolean) =>
        set({ isFetchingInstructions: fetching }),
      setError: (error: string | null) => set({ error }),

      buildChildState: (): ChildState => {
        const s = get();
        return {
          child_id: s.childId,
          known_words: s.knownWords,
          introduced_words: s.introducedWords,
          recent_accuracy: s.recentAccuracy,
          accuracy_window: s.accuracyWindow,
          hint_count: s.hintCount,
          session_duration_sec: s.sessionDurationSec,
          words_introduced_this_session: s.wordsIntroducedThisSession,
          consecutive_correct: s.consecutiveCorrect,
          recent_instructions: s.recentInstructions,
        };
      },
    }),
    {
      name: "linguaplay_state",
      storage: createJSONStorage(() =>
        typeof window !== "undefined"
          ? localStorage
          : {
              getItem: () => null,
              setItem: () => {},
              removeItem: () => {},
            }
      ),
      partialize: (state) => ({
        childId: state.childId,
        knownWords: state.knownWords,
        introducedWords: state.introducedWords,
        wordHistory: state.wordHistory,
        sessionHistory: state.sessionHistory,
      }),
    }
  )
);
