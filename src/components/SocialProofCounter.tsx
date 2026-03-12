'use client';

import { useState, useEffect } from 'react';

export default function SocialProofCounter() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    // Deterministic "social proof" based on day-of-year for consistency
    const now = new Date();
    const dayOfYear = Math.floor(
      (now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / 86400000
    );
    const hour = now.getHours();
    // Generates a number between 3 and 12 that shifts with the day/hour
    const base = ((dayOfYear * 7 + hour * 3) % 10) + 3;
    setCount(base);
  }, []);

  if (count === 0) return null;

  return (
    <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-4 py-2 text-sm">
      <span className="relative flex h-2.5 w-2.5">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500" />
      </span>
      <span className="text-amber-800 font-medium">
        {count} guests booked today
      </span>
    </div>
  );
}
