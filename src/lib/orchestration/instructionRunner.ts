import type { GameInstruction } from "@/types/game";
import type { KitchenScene } from "@/lib/pixi/KitchenScene";
import type {
  InteractionManager,
  InteractionResult,
} from "@/lib/pixi/InteractionManager";
import type { HintRenderer } from "@/lib/pixi/HintRenderer";
import type { AnimationOverlay } from "@/lib/pixi/AnimationOverlay";
import type { AudioEngine } from "@/lib/audio/AudioEngine";
import { useGameStore } from "@/lib/store/useGameStore";
import { TIMING, INTERACTION } from "@/config/constants";
import vocabularyMap from "@/config/vocabulary-map.json";

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function pickDistractors(
  instruction: GameInstruction,
  knownWords: string[]
): string[] {
  const vocab = Object.keys(vocabularyMap.vocabulary);
  const excluded = new Set(instruction.target_items);
  const candidates = knownWords.filter(
    (w) => !excluded.has(w) && vocab.includes(w)
  );
  // Also add some random vocab if not enough known words
  if (candidates.length < 4) {
    for (const v of vocab) {
      if (!excluded.has(v) && !candidates.includes(v)) {
        candidates.push(v);
        if (candidates.length >= 6) break;
      }
    }
  }
  const shuffled = candidates.sort(() => Math.random() - 0.5);
  const count =
    instruction.expected_action.type === "drag"
      ? INTERACTION.DRAG_DISTRACTOR_COUNT
      : INTERACTION.TAP_DISTRACTOR_COUNT;
  return shuffled.slice(0, count);
}

export async function runInstruction(
  instruction: GameInstruction,
  scene: KitchenScene,
  interactionManager: InteractionManager,
  hintRenderer: HintRenderer,
  animationOverlay: AnimationOverlay,
  audioEngine: AudioEngine,
  abortSignal: AbortSignal
): Promise<"completed" | "aborted"> {
  if (abortSignal.aborted) return "aborted";

  const store = useGameStore.getState();
  const distractors = pickDistractors(instruction, store.knownWords);

  // Setup scene
  scene.setupForInstruction(
    instruction.target_items,
    distractors,
    instruction.expected_action
  );

  // Play instruction audio
  await audioEngine.playInstruction(instruction.instruction_text);
  if (abortSignal.aborted) return "aborted";

  // Wait for interaction with hint escalation
  return new Promise((resolve) => {
    if (abortSignal.aborted) {
      resolve("aborted");
      return;
    }

    let hintsUsed = 0;
    let wrongAttempts = 0;
    const hintTimers: ReturnType<typeof setTimeout>[] = [];

    // Hint timer: Level 1 at 5s
    hintTimers.push(
      setTimeout(() => {
        hintRenderer.showHint(1, instruction.hint_strategy);
        hintsUsed++;
        useGameStore.getState().escalateHint();
      }, TIMING.HINT_LEVEL_1_DELAY_MS)
    );

    // Hint timer: Level 2 at 10s
    hintTimers.push(
      setTimeout(async () => {
        hintRenderer.clearAll();
        hintRenderer.showHint(2, instruction.hint_strategy);
        hintsUsed++;
        useGameStore.getState().escalateHint();
        await audioEngine.playInstruction(
          instruction.hint_strategy.level_2.audio
        );
      }, TIMING.HINT_LEVEL_2_DELAY_MS)
    );

    // Hint timer: Level 3 at 15s
    hintTimers.push(
      setTimeout(async () => {
        hintRenderer.clearAll();
        hintRenderer.showHint(3, instruction.hint_strategy);
        hintsUsed++;
        useGameStore.getState().escalateHint();
        await audioEngine.playInstruction(
          instruction.hint_strategy.level_3.fallback_text
        );
      }, TIMING.HINT_LEVEL_3_DELAY_MS)
    );

    const cleanup = () => {
      hintTimers.forEach(clearTimeout);
      interactionManager.deactivate();
      hintRenderer.clearAll();
    };

    const onAbort = () => {
      cleanup();
      resolve("aborted");
    };
    abortSignal.addEventListener("abort", onAbort, { once: true });

    // All items that are interactive (targets + distractors on scene)
    const allInteractiveItems = [
      ...instruction.target_items,
      ...distractors,
    ];

    interactionManager.activate(
      instruction.expected_action.type as "tap" | "drag",
      instruction.expected_action.target,
      instruction.expected_action.source,
      allInteractiveItems,
      async (result: InteractionResult) => {
        if (result.correct) {
          cleanup();
          abortSignal.removeEventListener("abort", onAbort);

          useGameStore
            .getState()
            .recordCorrect(result.responseTimeMs, hintsUsed);

          // Play animation and feedback audio in parallel
          const tasks: Promise<void>[] = [];

          if (instruction.animation) {
            const targetSprite = scene.getSprite(
              instruction.expected_action.target
            );
            const x = targetSprite?.x ?? 512;
            const y = targetSprite?.y ?? 384;
            tasks.push(animationOverlay.playAnimation(instruction.animation, x, y));
          }

          tasks.push(audioEngine.playFeedback(instruction.success_feedback));

          await Promise.all(tasks);

          await delay(300);
          resolve("completed");
        } else {
          wrongAttempts++;
          useGameStore.getState().recordIncorrect();

          // Escalate hints based on wrong attempts
          if (
            wrongAttempts === 1 &&
            useGameStore.getState().hintLevel < 2
          ) {
            hintRenderer.clearAll();
            hintRenderer.showHint(2, instruction.hint_strategy);
            hintsUsed++;
            useGameStore.getState().escalateHint();
          } else if (
            wrongAttempts >= 2 &&
            useGameStore.getState().hintLevel < 3
          ) {
            hintRenderer.clearAll();
            hintRenderer.showHint(3, instruction.hint_strategy);
            hintsUsed++;
            useGameStore.getState().escalateHint();
          }
        }
      }
    );
  });
}
