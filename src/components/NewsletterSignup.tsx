"use client";

import { useState } from "react";

export function NewsletterSignup({ source = "lina_point_footer" }: { source?: string }) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setStatus("loading");
    try {
      const res = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), source }),
      });
      if (res.ok) {
        setStatus("success");
        setEmail("");
      } else {
        setStatus("error");
      }
    } catch {
      setStatus("error");
    }
  }

  if (status === "success") {
    return (
      <p className="text-sm text-amber-400">✓ Welcome! Island insights coming your way.</p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="your@email.com"
        required
        className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-400/50 placeholder:text-gray-500 min-w-0"
      />
      <button
        type="submit"
        disabled={status === "loading"}
        className="bg-amber-600 hover:bg-amber-500 text-white rounded-lg px-4 py-2 text-sm font-semibold transition disabled:opacity-50"
      >
        {status === "loading" ? "..." : "Join"}
      </button>
    </form>
  );
}
