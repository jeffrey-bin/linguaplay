"use client";

export function LoadingScreen() {
  return (
    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-amber-50">
      <div className="h-16 w-16 animate-spin rounded-full border-4 border-amber-200 border-t-amber-600" />
      <p className="mt-6 text-xl font-medium text-amber-800">
        Loading kitchen...
      </p>
    </div>
  );
}
