"use client";

import { useGameStore } from "@/lib/store/useGameStore";

interface SessionSummaryProps {
  onDone: () => void;
}

export function SessionSummary({ onDone }: SessionSummaryProps) {
  const phase = useGameStore((s) => s.phase);
  const duration = useGameStore((s) => s.sessionDurationSec);
  const newWords = useGameStore((s) => s.wordsIntroducedThisSession);
  const accuracy = useGameStore((s) => s.recentAccuracy);
  const instructions = useGameStore((s) => s.recentInstructions);

  if (phase !== "summary") return null;

  const minutes = Math.floor(duration / 60);
  const seconds = duration % 60;

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="mx-4 w-full max-w-md rounded-3xl bg-white p-8 text-center shadow-2xl">
        <h2 className="text-3xl font-bold text-amber-800">
          Great job, Chef!
        </h2>

        <div className="mt-6 grid grid-cols-3 gap-4">
          <div className="rounded-2xl bg-amber-50 p-4">
            <div className="text-2xl font-bold text-amber-700">
              {minutes}:{seconds.toString().padStart(2, "0")}
            </div>
            <div className="mt-1 text-sm text-amber-600">Time</div>
          </div>
          <div className="rounded-2xl bg-green-50 p-4">
            <div className="text-2xl font-bold text-green-700">
              {newWords.length}
            </div>
            <div className="mt-1 text-sm text-green-600">New Words</div>
          </div>
          <div className="rounded-2xl bg-blue-50 p-4">
            <div className="text-2xl font-bold text-blue-700">
              {Math.round(accuracy * 100)}%
            </div>
            <div className="mt-1 text-sm text-blue-600">Accuracy</div>
          </div>
        </div>

        {newWords.length > 0 && (
          <div className="mt-6">
            <p className="text-sm font-medium text-gray-500">
              Words learned today
            </p>
            <div className="mt-2 flex flex-wrap justify-center gap-2">
              {newWords.map((word) => (
                <span
                  key={word}
                  className="rounded-full bg-amber-100 px-3 py-1 text-sm font-medium text-amber-800"
                >
                  {word}
                </span>
              ))}
            </div>
          </div>
        )}

        {instructions.length > 0 && (
          <p className="mt-4 text-sm text-gray-400">
            {instructions.length} interactions completed
          </p>
        )}

        <button
          onClick={onDone}
          className="mt-8 rounded-full bg-amber-500 px-10 py-3 text-lg font-bold text-white shadow-md transition-colors hover:bg-amber-600"
        >
          Done!
        </button>
      </div>
    </div>
  );
}
