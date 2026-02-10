import Link from "next/link";

export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-amber-50">
      <main className="text-center">
        <h1 className="text-5xl font-bold text-amber-900">LinguaPlay</h1>
        <p className="mt-3 text-lg text-amber-600">Little Kitchen</p>

        <div className="mt-10 flex flex-col items-center gap-4">
          <Link
            href="/game"
            className="inline-block rounded-full bg-amber-500 px-10 py-4 text-xl font-bold text-white shadow-lg transition-colors hover:bg-amber-600"
          >
            Start Playing
          </Link>
          <Link
            href="/dashboard"
            className="text-sm text-amber-700 underline underline-offset-2 hover:text-amber-800"
          >
            Parent Dashboard
          </Link>
        </div>
      </main>
    </div>
  );
}
