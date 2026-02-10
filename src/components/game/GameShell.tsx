"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import { useGameStore } from "@/lib/store/useGameStore";
import { createPixiApp } from "@/lib/pixi/createApp";
import { KitchenScene } from "@/lib/pixi/KitchenScene";
import { InteractionManager } from "@/lib/pixi/InteractionManager";
import { HintRenderer } from "@/lib/pixi/HintRenderer";
import { AnimationOverlay } from "@/lib/pixi/AnimationOverlay";
import { AudioEngine } from "@/lib/audio/AudioEngine";
import { SessionRunner } from "@/lib/orchestration/sessionRunner";
import { LoadingScreen } from "./LoadingScreen";
import { InstructionBar } from "./InstructionBar";
import { SessionSummary } from "./SessionSummary";

export function GameShell() {
  const containerRef = useRef<HTMLDivElement>(null);
  const sessionRunnerRef = useRef<SessionRunner | null>(null);
  const audioEngineRef = useRef<AudioEngine | null>(null);
  const appHandleRef = useRef<Awaited<ReturnType<typeof createPixiApp>> | null>(null);
  const [ready, setReady] = useState(false);
  const [assetsLoaded, setAssetsLoaded] = useState(false);
  const [needsGesture, setNeedsGesture] = useState(false);
  const phase = useGameStore((s) => s.phase);

  // Detect if page was loaded via refresh (no prior user gesture in this navigation)
  const hasGestureRef = useRef(false);

  useEffect(() => {
    // Check navigation type: "reload" means refresh, "navigate" from link click
    const navEntries = performance.getEntriesByType("navigation");
    const navEntry = navEntries[0] as PerformanceNavigationTiming | undefined;
    const isReload = navEntry?.type === "reload";
    hasGestureRef.current = !isReload;
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let destroyed = false;

    async function init() {
      const handle = await createPixiApp(container!);
      if (destroyed) {
        handle.destroy();
        return;
      }
      appHandleRef.current = handle;

      const scene = new KitchenScene(handle.app);
      await scene.loadAssets();
      if (destroyed) {
        handle.destroy();
        return;
      }

      const interactionManager = new InteractionManager(scene);
      const hintRenderer = new HintRenderer(scene);
      const animationOverlay = new AnimationOverlay(container!);
      const audioEngine = new AudioEngine();
      audioEngineRef.current = audioEngine;

      const runner = new SessionRunner(
        scene,
        interactionManager,
        hintRenderer,
        animationOverlay,
        audioEngine
      );
      sessionRunnerRef.current = runner;

      setAssetsLoaded(true);

      // If page was refreshed, wait for user gesture before starting
      if (!hasGestureRef.current) {
        setNeedsGesture(true);
        return;
      }

      setReady(true);
      runner.start();
    }

    init().catch(console.error);

    return () => {
      destroyed = true;
      sessionRunnerRef.current?.stop();
      audioEngineRef.current?.destroy();
      appHandleRef.current?.destroy();
      sessionRunnerRef.current = null;
      audioEngineRef.current = null;
      appHandleRef.current = null;
    };
  }, []);

  const handleStartFromGesture = useCallback(() => {
    setNeedsGesture(false);
    setReady(true);
    sessionRunnerRef.current?.start();
  }, []);

  const handleReplay = useCallback(() => {
    const instruction = useGameStore.getState().currentInstruction;
    if (instruction && audioEngineRef.current) {
      audioEngineRef.current.playInstruction(instruction.instruction_text);
    }
  }, []);

  const handleExit = useCallback(() => {
    sessionRunnerRef.current?.stop();
    useGameStore.getState().endSession();
  }, []);

  const handleDone = useCallback(() => {
    window.location.href = "/";
  }, []);

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-black">
      <div
        ref={containerRef}
        className="flex h-full w-full items-center justify-center"
      />

      {needsGesture && assetsLoaded && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <button
            onClick={handleStartFromGesture}
            className="flex flex-col items-center gap-4 rounded-3xl bg-white px-12 py-8 shadow-2xl transition-transform active:scale-95"
          >
            <span className="text-6xl">🎮</span>
            <span className="text-2xl font-bold text-amber-900">
              Tap to Play!
            </span>
          </button>
        </div>
      )}

      {(!ready || phase === "loading") && !needsGesture && <LoadingScreen />}

      {ready && phase === "playing" && <InstructionBar onReplay={handleReplay} />}

      {ready && phase === "waiting_for_batch" && (
        <div className="absolute left-1/2 top-4 z-20 -translate-x-1/2">
          <div className="flex items-center gap-3 rounded-full bg-white/90 px-6 py-3 shadow-lg backdrop-blur-sm">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-amber-200 border-t-amber-600" />
            <span className="text-lg font-semibold text-amber-900">
              Preparing next task...
            </span>
          </div>
        </div>
      )}

      {ready && phase !== "summary" && (
        <button
          onClick={handleExit}
          className="absolute right-4 top-4 z-20 flex h-10 w-10 items-center justify-center rounded-full bg-white/80 text-gray-500 shadow-md transition-colors hover:bg-white hover:text-gray-700"
          aria-label="Exit game"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M5 5l10 10M15 5l-10 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>
      )}

      <SessionSummary onDone={handleDone} />
    </div>
  );
}
