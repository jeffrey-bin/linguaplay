"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { useGameStore } from "@/lib/store/useGameStore";
import { ProgressChart } from "@/components/dashboard/ProgressChart";
import { WordList } from "@/components/dashboard/WordList";
import { SessionHistory } from "@/components/dashboard/SessionHistory";

export default function DashboardPage() {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);

  const knownWords = useGameStore((s) => s.knownWords);
  const introducedWords = useGameStore((s) => s.introducedWords);
  const wordHistory = useGameStore((s) => s.wordHistory);
  const sessionHistory = useGameStore((s) => s.sessionHistory);

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      <header className="bg-white shadow-sm">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
          <h1 className="text-xl font-bold text-gray-800">Parent Dashboard</h1>
          <Link
            href="/"
            className="text-sm text-amber-600 hover:text-amber-700"
          >
            Back to Home
          </Link>
        </div>
      </header>

      {!hydrated ? (
        <main className="mx-auto mt-6 max-w-3xl px-6">
          <div className="flex justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-amber-200 border-t-amber-600" />
          </div>
        </main>
      ) : (
        <main className="mx-auto mt-6 max-w-3xl space-y-6 px-6">
          <ProgressChart
            sessions={sessionHistory}
            totalKnown={knownWords.length}
            totalIntroduced={introducedWords.length}
          />
          <WordList
            knownWords={knownWords}
            introducedWords={introducedWords}
            wordHistory={wordHistory}
          />
          <SessionHistory sessions={sessionHistory} />
        </main>
      )}
    </div>
  );
}
