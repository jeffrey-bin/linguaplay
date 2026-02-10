"use client";

import type { SessionRecord } from "@/types/store";

interface ProgressChartProps {
  sessions: SessionRecord[];
  totalKnown: number;
  totalIntroduced: number;
}

export function ProgressChart({
  sessions,
  totalKnown,
  totalIntroduced,
}: ProgressChartProps) {
  const recent = sessions.slice(-10);
  const maxWords = Math.max(
    ...recent.map((s) => s.wordsIntroduced.length),
    1
  );

  return (
    <div className="rounded-2xl bg-white p-6 shadow-sm">
      <h3 className="text-lg font-semibold text-gray-800">Learning Progress</h3>

      <div className="mt-4 flex gap-6">
        <div className="text-center">
          <div className="text-3xl font-bold text-green-600">{totalKnown}</div>
          <div className="text-sm text-gray-500">Mastered</div>
        </div>
        <div className="text-center">
          <div className="text-3xl font-bold text-amber-500">
            {totalIntroduced}
          </div>
          <div className="text-sm text-gray-500">Learning</div>
        </div>
        <div className="text-center">
          <div className="text-3xl font-bold text-gray-400">
            {63 - totalKnown - totalIntroduced}
          </div>
          <div className="text-sm text-gray-500">Remaining</div>
        </div>
      </div>

      {recent.length > 0 && (
        <div className="mt-6">
          <p className="mb-2 text-sm text-gray-500">New words per session</p>
          <svg viewBox={`0 0 ${recent.length * 40} 100`} className="h-24 w-full">
            {recent.map((session, i) => {
              const height =
                (session.wordsIntroduced.length / maxWords) * 80;
              return (
                <g key={session.sessionId}>
                  <rect
                    x={i * 40 + 8}
                    y={90 - height}
                    width={24}
                    height={Math.max(height, 2)}
                    rx={4}
                    fill="#f59e0b"
                    opacity={0.8}
                  />
                  <text
                    x={i * 40 + 20}
                    y={98}
                    textAnchor="middle"
                    fontSize={8}
                    fill="#9ca3af"
                  >
                    {i + 1}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      )}

      {recent.length === 0 && (
        <p className="mt-6 text-center text-sm text-gray-400">
          No sessions yet. Start playing to see progress!
        </p>
      )}
    </div>
  );
}
