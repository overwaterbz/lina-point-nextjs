"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[DashboardError]", error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="rounded-2xl bg-white p-10 shadow-md text-center max-w-md w-full">
        <p className="text-4xl mb-4">⚠️</p>
        <h1 className="text-xl font-semibold text-gray-800 mb-2">
          Something went wrong
        </h1>
        <p className="text-gray-500 mb-1 text-sm">
          We hit an unexpected error. Your data is safe — please try again.
        </p>
        {error.digest && (
          <p className="text-xs text-gray-400 mb-6 font-mono">
            Reference: {error.digest}
          </p>
        )}
        <div className="flex flex-col sm:flex-row gap-3 justify-center mt-6">
          <button
            onClick={reset}
            className="bg-teal-700 text-white px-5 py-2.5 rounded-full text-sm font-medium hover:bg-teal-800 transition-colors"
          >
            Try Again
          </button>
          <Link
            href="/dashboard"
            className="border border-teal-700 text-teal-700 px-5 py-2.5 rounded-full text-sm font-medium hover:bg-teal-50 transition-colors"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
