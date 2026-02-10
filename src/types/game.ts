/**
 * LinguaPlay - Game Type Definitions
 *
 * Shared types used across API routes and frontend components.
 */

// ============================================================
// Child State (sent to AI Agent)
// ============================================================

export interface ChildState {
  child_id: string;
  known_words: string[];
  introduced_words: string[];
  recent_accuracy: number;
  accuracy_window: number;
  hint_count: number;
  session_duration_sec: number;
  words_introduced_this_session: string[];
  consecutive_correct: number;
  recent_instructions: RecentInstruction[];
}

export interface RecentInstruction {
  id: string;
  instruction_text: string;
  new_word: string | null;
  was_correct: boolean;
  hints_used: number;
  response_time_ms: number;
}

// ============================================================
// Game Instruction (returned by AI Agent)
// ============================================================

export interface GameInstruction {
  id: string;
  instruction_text: string;
  target_items: string[];
  new_word: string | null;
  known_words_used: string[];
  interaction_type: "tap" | "drag" | "sequence";
  expected_action: {
    type: "tap" | "drag";
    target: string;
    source: string | null;
  };
  animation: string | null;
  hint_strategy: {
    level_1: { type: string; target: string };
    level_2: { type: string; target: string; audio: string };
    level_3: {
      type: string;
      fallback_text: string;
      highlight_all_targets: boolean;
    };
  };
  success_feedback: string;
  difficulty_score: number;
}

// ============================================================
// Orchestration API Response
// ============================================================

export interface OrchestrationResponse {
  success: boolean;
  instructions: GameInstruction[];
  meta: {
    child_id: string;
    known_words_count: number;
    session_duration_sec: number;
    instruction_count: number;
    has_new_words: boolean;
    timestamp: string;
  };
}

// ============================================================
// Vocabulary Map Types
// ============================================================

export interface VocabularyItem {
  category: string;
  sprite_position: [number, number];
  audio_word: string;
  difficulty: number;
  compatible_actions: string[];
  compatible_adjectives: string[];
  semantic_cluster: string[];
  intro_sentence: string;
}

export interface VocabularyAction {
  animation: string;
  audio: string;
  difficulty: number;
  compatible_items: string[];
}

export interface VocabularyAdjective {
  audio: string;
  difficulty: number;
  compatible_items: string[];
}

export interface VocabularyMap {
  meta: {
    version: string;
    scene: string;
    description: string;
    sprite_sheet: string;
    sprite_grid: {
      columns: number;
      rows: number;
      cell_width: number;
      cell_height: number;
    };
    total_words: number;
    difficulty_scale: string;
    mastery_rules: {
      threshold: number;
      description: string;
    };
    animations: Record<string, string>;
    background: string;
  };
  vocabulary: Record<string, VocabularyItem>;
  actions: Record<string, VocabularyAction>;
  adjectives: Record<string, VocabularyAdjective>;
  difficulty_tiers: Record<string, { items: string[]; description: string }>;
}
