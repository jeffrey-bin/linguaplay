"use client";

import type { WordHistory } from "@/types/store";

interface WordListProps {
  knownWords: string[];
  introducedWords: string[];
  wordHistory: Record<string, WordHistory>;
}

export function WordList({
  knownWords,
  introducedWords,
  wordHistory,
}: WordListProps) {
  return (
    <div className="rounded-2xl bg-white p-6 shadow-sm">
      <h3 className="text-lg font-semibold text-gray-800">Vocabulary</h3>

      {knownWords.length > 0 && (
        <div className="mt-4">
          <p className="text-sm font-medium text-green-600">
            Mastered ({knownWords.length})
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {knownWords.map((word) => (
              <span
                key={word}
                className="rounded-full bg-green-100 px-3 py-1 text-sm text-green-800"
                title={`Correct: ${wordHistory[word]?.timesCorrect ?? 0}`}
              >
                {word}
              </span>
            ))}
          </div>
        </div>
      )}

      {introducedWords.length > 0 && (
        <div className="mt-4">
          <p className="text-sm font-medium text-amber-600">
            Learning ({introducedWords.length})
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {introducedWords.map((word) => {
              const history = wordHistory[word];
              return (
                <span
                  key={word}
                  className="rounded-full bg-amber-100 px-3 py-1 text-sm text-amber-800"
                  title={`Correct: ${history?.timesCorrect ?? 0} / Sessions: ${history?.sessionIds.length ?? 0}`}
                >
                  {word}
                </span>
              );
            })}
          </div>
        </div>
      )}

      {knownWords.length === 0 && introducedWords.length === 0 && (
        <p className="mt-4 text-sm text-gray-400">
          No words learned yet. Start a game session!
        </p>
      )}
    </div>
  );
}
