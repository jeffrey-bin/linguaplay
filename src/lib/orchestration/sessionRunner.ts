import type { KitchenScene } from "@/lib/pixi/KitchenScene";
import type { InteractionManager } from "@/lib/pixi/InteractionManager";
import type { HintRenderer } from "@/lib/pixi/HintRenderer";
import type { AnimationOverlay } from "@/lib/pixi/AnimationOverlay";
import type { AudioEngine } from "@/lib/audio/AudioEngine";
import type { GameInstruction } from "@/types/game";
import { useGameStore } from "@/lib/store/useGameStore";
import { runInstruction } from "./instructionRunner";
import { TIMING } from "@/config/constants";

// Client-side fallback if API is unreachable
const CLIENT_FALLBACK: GameInstruction[] = [
  {
    id: "fallback_1",
    instruction_text: "Find the apple",
    target_items: ["apple"],
    new_word: null,
    known_words_used: ["apple"],
    interaction_type: "tap",
    expected_action: { type: "tap", target: "apple", source: null },
    animation: null,
    hint_strategy: {
      level_1: { type: "glow", target: "apple" },
      level_2: { type: "arrow", target: "apple", audio: "The apple!" },
      level_3: {
        type: "show_and_tell",
        fallback_text: "Tap the apple!",
        highlight_all_targets: true,
      },
    },
    success_feedback: "Great job!",
    difficulty_score: 0.1,
  },
  {
    id: "fallback_2",
    instruction_text: "Find the banana",
    target_items: ["banana"],
    new_word: null,
    known_words_used: ["banana"],
    interaction_type: "tap",
    expected_action: { type: "tap", target: "banana", source: null },
    animation: null,
    hint_strategy: {
      level_1: { type: "glow", target: "banana" },
      level_2: { type: "arrow", target: "banana", audio: "The banana!" },
      level_3: {
        type: "show_and_tell",
        fallback_text: "Tap the banana!",
        highlight_all_targets: true,
      },
    },
    success_feedback: "Well done!",
    difficulty_score: 0.1,
  },
  {
    id: "fallback_3",
    instruction_text: "Find the egg",
    target_items: ["egg"],
    new_word: null,
    known_words_used: ["egg"],
    interaction_type: "tap",
    expected_action: { type: "tap", target: "egg", source: null },
    animation: null,
    hint_strategy: {
      level_1: { type: "glow", target: "egg" },
      level_2: { type: "arrow", target: "egg", audio: "The egg!" },
      level_3: {
        type: "show_and_tell",
        fallback_text: "Tap the egg!",
        highlight_all_targets: true,
      },
    },
    success_feedback: "Yes! That's right!",
    difficulty_score: 0.1,
  },
];

export class SessionRunner {
  private scene: KitchenScene;
  private interactionManager: InteractionManager;
  private hintRenderer: HintRenderer;
  private animationOverlay: AnimationOverlay;
  private audioEngine: AudioEngine;
  private sessionTimer: ReturnType<typeof setInterval> | null = null;
  private abortController: AbortController | null = null;

  constructor(
    scene: KitchenScene,
    interactionManager: InteractionManager,
    hintRenderer: HintRenderer,
    animationOverlay: AnimationOverlay,
    audioEngine: AudioEngine
  ) {
    this.scene = scene;
    this.interactionManager = interactionManager;
    this.hintRenderer = hintRenderer;
    this.animationOverlay = animationOverlay;
    this.audioEngine = audioEngine;
  }

  async start(): Promise<void> {
    const store = useGameStore.getState();
    store.startSession();

    // Start session timer
    this.sessionTimer = setInterval(() => {
      useGameStore.getState().tickSessionTimer();
    }, 1000);

    this.abortController = new AbortController();

    // Welcome audio
    try {
      await this.audioEngine.playInstruction("Welcome to the kitchen!");
    } catch {
      // Continue even if welcome audio fails
    }

    // Game loop
    await this.gameLoop();
  }

  private async gameLoop(): Promise<void> {
    while (
      this.abortController &&
      !this.abortController.signal.aborted
    ) {
      const duration = useGameStore.getState().sessionDurationSec;
      if (duration >= TIMING.SESSION_MAX_DURATION_SEC) {
        await this.endSession();
        return;
      }

      // Fetch instruction batch
      const instructions = await this.fetchBatch();
      if (
        !instructions ||
        this.abortController?.signal.aborted
      )
        return;

      useGameStore.getState().setInstructions(instructions);

      // Prefetch audio for all instructions
      for (const instr of instructions) {
        this.audioEngine.prefetchInstruction(instr.instruction_text);
      }

      // Execute each instruction in the batch
      for (let i = 0; i < instructions.length; i++) {
        if (this.abortController?.signal.aborted) return;

        // Check session time before each instruction
        const elapsed = useGameStore.getState().sessionDurationSec;
        if (elapsed >= TIMING.SESSION_MAX_DURATION_SEC) {
          await this.endSession();
          return;
        }

        useGameStore.getState().resetHint();
        const instruction = instructions[i];

        // Update current instruction in store
        useGameStore.setState({
          currentInstructionIndex: i,
          currentInstruction: instruction,
          phase: "playing",
        });

        const result = await runInstruction(
          instruction,
          this.scene,
          this.interactionManager,
          this.hintRenderer,
          this.animationOverlay,
          this.audioEngine,
          this.abortController!.signal
        );

        if (result === "aborted") return;
      }
    }
  }

  private async fetchBatch(): Promise<GameInstruction[] | null> {
    useGameStore.getState().setFetching(true);
    useGameStore.getState().setPhase("waiting_for_batch");

    try {
      const childState = useGameStore.getState().buildChildState();
      const response = await fetch("/api/agent/orchestrate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(childState),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      if (data.success && data.instructions?.length > 0) {
        return data.instructions;
      }
      throw new Error("No instructions returned");
    } catch (err) {
      console.error("Failed to fetch instructions, using fallback:", err);
      return CLIENT_FALLBACK;
    } finally {
      useGameStore.getState().setFetching(false);
    }
  }

  private async endSession(): Promise<void> {
    this.scene.clearItems();
    try {
      await this.audioEngine.playInstruction(
        "What a great chef you are!"
      );
    } catch {
      // Continue even if audio fails
    }
    useGameStore.getState().endSession();
  }

  stop(): void {
    this.abortController?.abort();
    if (this.sessionTimer) {
      clearInterval(this.sessionTimer);
      this.sessionTimer = null;
    }
    this.interactionManager.deactivate();
    this.hintRenderer.clearAll();
    this.audioEngine.stop();
  }
}
