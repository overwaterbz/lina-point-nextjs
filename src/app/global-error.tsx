'use client';

import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[GlobalError]', error);
  }, [error]);

  return (
    <html lang="en">
      <body className="min-h-screen bg-white flex items-center justify-center px-6">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-6">🌊</div>
          <h1 className="text-3xl font-bold text-slate-900 mb-3">
            Something went wrong
          </h1>
          <p className="text-slate-600 mb-8">
            The Caribbean waters are a little choppy right now. Our team has been notified.
          </p>
          <button
            onClick={reset}
            className="px-6 py-3 bg-sky-600 text-white rounded-lg hover:bg-sky-700 transition-colors font-medium"
          >
            Try Again
          </button>
        </div>
      </body>
    </html>
  );
}
