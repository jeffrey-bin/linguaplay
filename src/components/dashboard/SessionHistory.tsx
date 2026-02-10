"use client";

import type { SessionRecord } from "@/types/store";

interface SessionHistoryProps {
  sessions: SessionRecord[];
}

export function SessionHistory({ sessions }: SessionHistoryProps) {
  const sorted = [...sessions].reverse();

  return (
    <div className="rounded-2xl bg-white p-6 shadow-sm">
      <h3 className="text-lg font-semibold text-gray-800">Session History</h3>

      {sorted.length === 0 ? (
        <p className="mt-4 text-sm text-gray-400">No sessions recorded yet.</p>
      ) : (
        <div className="mt-4 space-y-3">
          {sorted.map((session) => {
            const date = new Date(session.date);
            const minutes = Math.floor(session.durationSec / 60);
            const seconds = session.durationSec % 60;
            return (
              <div
                key={session.sessionId}
                className="flex items-center justify-between rounded-xl bg-gray-50 px-4 py-3"
              >
                <div>
                  <p className="text-sm font-medium text-gray-700">
                    {date.toLocaleDateString()} {date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </p>
                  <p className="text-xs text-gray-400">
                    {minutes}m {seconds}s &middot;{" "}
                    {session.wordsIntroduced.length} new words
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-amber-600">
                    {Math.round(session.accuracy * 100)}%
                  </p>
                  <p className="text-xs text-gray-400">
                    {session.totalInteractions} interactions
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
