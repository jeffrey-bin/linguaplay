"use client";

import { useGameStore } from "@/lib/store/useGameStore";

interface InstructionBarProps {
  onReplay: () => void;
}

export function InstructionBar({ onReplay }: InstructionBarProps) {
  const instruction = useGameStore((s) => s.currentInstruction);
  const phase = useGameStore((s) => s.phase);

  if (!instruction || phase !== "playing") return null;

  return (
    <div className="absolute left-1/2 top-4 z-20 -translate-x-1/2">
      <div className="flex items-center gap-3 rounded-full bg-white/90 px-6 py-3 shadow-lg backdrop-blur-sm">
        <button
          onClick={onReplay}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100 text-xl transition-colors hover:bg-amber-200"
          aria-label="Replay instruction"
        >
          🔊
        </button>
        <span className="text-lg font-semibold text-amber-900">
          {instruction.instruction_text}
        </span>
      </div>
    </div>
  );
}
