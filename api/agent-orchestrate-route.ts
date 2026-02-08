/**
 * LinguaPlay - AI Agent Orchestration API Route
 * 
 * Next.js API Route: /api/agent/orchestrate
 * 
 * This is the brain of the game. It receives the child's current state,
 * calls the LLM with the system prompt and vocabulary context,
 * and returns structured game instructions.
 * 
 * File: app/api/agent/orchestrate/route.ts
 */

import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk"; // or use OpenAI SDK
import vocabularyMap from "@/config/vocabulary-map.json";

// ============================================================
// Types
// ============================================================

interface ChildState {
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

interface RecentInstruction {
  id: string;
  instruction_text: string;
  new_word: string | null;
  was_correct: boolean;
  hints_used: number;
  response_time_ms: number;
}

interface GameInstruction {
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
    level_3: { type: string; fallback_text: string; highlight_all_targets: boolean };
  };
  success_feedback: string;
  difficulty_score: number;
}

// ============================================================
// System Prompt
// ============================================================

const SYSTEM_PROMPT = `You are LinguaPlay Kitchen Chef, an AI orchestration engine for a children's English learning game. You do NOT interact with the child directly. Instead, you generate structured JSON instructions that a game frontend will render as interactive experiences.

## Your Role
You are a pedagogical decision-maker. Given a child's current vocabulary state and session context, you decide:
1. What English instruction to present next
2. Which vocabulary to target (balancing new words with reinforcement)
3. What interaction type to use (tap, drag, find)
4. What hints to prepare if the child struggles

## Core Pedagogical Rules (STRICT - Never Violate)

### Rule 1: i+1 Principle
- Each instruction MUST contain AT MOST 1 new word (a word NOT in known_words)
- All other words in the instruction MUST come from known_words or be ultra-basic function words (the, a, in, on, it)
- If you cannot form a valid i+1 instruction, use ONLY known words (i+0 reinforcement)

### Rule 2: Difficulty Adaptation
- If recent_accuracy < 0.5 → REDUCE difficulty: shorter sentences, only known words, more visual cues
- If recent_accuracy 0.5-0.85 → MAINTAIN current level: mix reinforcement with occasional new word
- If recent_accuracy > 0.85 for 5+ consecutive interactions → INCREASE: introduce a new word

### Rule 3: Concrete First
- New words must be concrete nouns, verbs, or adjectives that can be visually represented
- Never introduce abstract words to beginners
- Follow the difficulty_tier order from the vocabulary map

### Rule 4: Session Pacing
- session_duration_sec > 480 (8 min) → Begin wind-down: simpler tasks, positive reinforcement, no new words
- session_duration_sec > 600 (10 min) → Generate a final celebratory instruction then stop

### Rule 5: Variety
- Do NOT repeat the same instruction pattern more than twice consecutively
- Alternate between interaction types: tap (find item), drag (move item to destination)
- Rotate vocabulary targets to avoid drilling one word

### Rule 6: Scaffolding
- Every instruction must have a 3-level hint strategy:
  - Level 1 (after 5s no response): Visual hint (glow/pulse the target item)
  - Level 2 (after 10s or 1 wrong tap): Arrow pointing to target + simplified audio
  - Level 3 (after 15s or 2 wrong taps): Show fallback with only known words + strongest visual cue

## Output Format
Respond with ONLY a valid JSON array of 3-5 instruction objects. No other text.
Each object must have these exact fields:
- id: unique string
- instruction_text: English sentence for TTS
- target_items: array of item IDs from vocabulary map
- new_word: string or null
- known_words_used: array of strings
- interaction_type: "tap" | "drag" | "sequence"
- expected_action: { type, target, source }
- animation: string or null (one of: "cut-food.lottie", "add-salt.lottie", "prepare-food.lottie", "steam-food.lottie")
- hint_strategy: { level_1, level_2, level_3 }
- success_feedback: encouraging phrase
- difficulty_score: 0.0-1.0

Keep sentences short: 3-8 words for beginners. Use imperative mood ("Find the apple").
ONLY output the JSON array. No markdown, no explanation.`;

// ============================================================
// Build user message from child state
// ============================================================

function buildUserMessage(state: ChildState): string {
  const vocab = vocabularyMap.vocabulary as Record<string, any>;

  // Build available items context (exclude items way above child's level)
  const maxDifficulty = state.known_words.length < 5 ? 2 : state.known_words.length < 15 ? 3 : 5;
  const availableItems = Object.entries(vocab)
    .filter(([_, item]) => item.difficulty <= maxDifficulty)
    .map(([id, item]) => `${id} (difficulty: ${item.difficulty}, category: ${item.category})`)
    .join("\n  ");

  // Format recent instructions
  const recentStr = state.recent_instructions.length > 0
    ? state.recent_instructions
        .slice(-5)
        .map(
          (r) =>
            `- "${r.instruction_text}" → ${r.was_correct ? "correct" : "incorrect"} (${r.hints_used} hints, ${r.response_time_ms}ms)`
        )
        .join("\n  ")
    : "No previous instructions this session.";

  return `Generate the next batch of game instructions for this child.

## Child State
- known_words: [${state.known_words.join(", ")}]
- introduced_words: [${state.introduced_words.join(", ")}]
- current_scene: kitchen
- recent_accuracy: ${state.recent_accuracy} (over last ${state.accuracy_window} interactions)
- hint_count_this_session: ${state.hint_count}
- session_duration_sec: ${state.session_duration_sec}
- words_introduced_this_session: [${state.words_introduced_this_session.join(", ")}]
- consecutive_correct: ${state.consecutive_correct}

## Available Items in Scene
  ${availableItems}

## Recent Instructions
  ${recentStr}

Generate 3-5 instructions following all pedagogical rules. Return ONLY the JSON array.`;
}

// ============================================================
// Call LLM
// ============================================================

async function callAgent(state: ChildState): Promise<GameInstruction[]> {
  const userMessage = buildUserMessage(state);

  // --- Option A: Anthropic Claude ---
  if (process.env.ANTHROPIC_API_KEY) {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001", // Cost-optimized for high-frequency calls
      max_tokens: 2000,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userMessage }],
    });

    const text = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === "text")
      .map((block) => block.text)
      .join("");

    return parseAgentResponse(text);
  }

  // --- Option B: OpenAI ---
  if (process.env.OPENAI_API_KEY) {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini", // Cost-optimized
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userMessage },
        ],
        max_tokens: 2000,
        temperature: 0.7,
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const text = data.choices[0].message.content;
    return parseAgentResponse(text);
  }

  throw new Error("No AI provider configured. Set ANTHROPIC_API_KEY or OPENAI_API_KEY.");
}

// ============================================================
// Parse and validate Agent response
// ============================================================

function parseAgentResponse(text: string): GameInstruction[] {
  // Strip markdown code fences if present
  let cleaned = text.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
  }

  let parsed: any;
  try {
    parsed = JSON.parse(cleaned);
  } catch (e) {
    throw new Error(`Agent returned invalid JSON: ${cleaned.substring(0, 200)}...`);
  }

  // Handle both { instructions: [...] } and [...] formats
  const instructions = Array.isArray(parsed) ? parsed : parsed.instructions;

  if (!Array.isArray(instructions) || instructions.length === 0) {
    throw new Error("Agent returned empty or invalid instructions array");
  }

  // Validate each instruction has required fields
  const validItems = new Set(Object.keys(vocabularyMap.vocabulary));

  for (const instr of instructions) {
    if (!instr.id || !instr.instruction_text || !instr.target_items) {
      throw new Error(`Invalid instruction missing required fields: ${JSON.stringify(instr).substring(0, 100)}`);
    }

    // Validate target_items exist in vocabulary
    for (const item of instr.target_items) {
      if (!validItems.has(item)) {
        console.warn(`Warning: Agent referenced unknown item "${item}", removing`);
        instr.target_items = instr.target_items.filter((i: string) => i !== item);
      }
    }
  }

  return instructions as GameInstruction[];
}

// ============================================================
// Fallback instructions (used when Agent fails)
// ============================================================

function getFallbackInstructions(state: ChildState): GameInstruction[] {
  const known = state.known_words;
  const vocab = vocabularyMap.vocabulary as Record<string, any>;

  // Pick a few known words to make safe reinforcement instructions
  const safeWords = known.length > 0
    ? known.slice(0, 3)
    : ["apple", "banana", "egg"]; // absolute fallback for brand new users

  return safeWords.map((word, i) => ({
    id: `fallback_${i}`,
    instruction_text: `Find the ${word.replace(/_/g, " ")}`,
    target_items: [word],
    new_word: null,
    known_words_used: [word],
    interaction_type: "tap" as const,
    expected_action: { type: "tap" as const, target: word, source: null },
    animation: null,
    hint_strategy: {
      level_1: { type: "glow", target: word },
      level_2: { type: "arrow", target: word, audio: `The ${word.replace(/_/g, " ")}!` },
      level_3: {
        type: "show_and_tell",
        fallback_text: `Tap the ${word.replace(/_/g, " ")}!`,
        highlight_all_targets: true,
      },
    },
    success_feedback: "Great job!",
    difficulty_score: 0.1,
  }));
}

// ============================================================
// API Route Handler
// ============================================================

export async function POST(request: NextRequest) {
  try {
    const state: ChildState = await request.json();

    // Validate required fields
    if (!state.child_id || !Array.isArray(state.known_words)) {
      return NextResponse.json(
        { error: "Invalid child state: missing child_id or known_words" },
        { status: 400 }
      );
    }

    // Set defaults
    state.introduced_words = state.introduced_words || [];
    state.recent_accuracy = state.recent_accuracy ?? 0.75;
    state.accuracy_window = state.accuracy_window || 10;
    state.hint_count = state.hint_count || 0;
    state.session_duration_sec = state.session_duration_sec || 0;
    state.words_introduced_this_session = state.words_introduced_this_session || [];
    state.consecutive_correct = state.consecutive_correct || 0;
    state.recent_instructions = state.recent_instructions || [];

    let instructions: GameInstruction[];

    try {
      instructions = await callAgent(state);
    } catch (agentError: any) {
      console.error("Agent call failed, using fallback:", agentError.message);
      instructions = getFallbackInstructions(state);
    }

    return NextResponse.json({
      success: true,
      instructions,
      meta: {
        child_id: state.child_id,
        known_words_count: state.known_words.length,
        session_duration_sec: state.session_duration_sec,
        instruction_count: instructions.length,
        has_new_words: instructions.some((i) => i.new_word !== null),
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    console.error("Orchestration error:", error);
    return NextResponse.json(
      { error: error.message || "Orchestration failed" },
      { status: 500 }
    );
  }
}
