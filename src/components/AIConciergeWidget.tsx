"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const QUICK_ACTIONS = [
  {
    label: "🗺️ Build my itinerary",
    message: "Can you help me plan a full Belize itinerary for my stay?",
  },
  {
    label: "💰 Compare prices",
    message: "How do your tour prices compare to Viator and GetYourGuide?",
  },
  {
    label: "📅 Check availability",
    message: "I'd like to check room availability for my trip.",
  },
  {
    label: "🤿 Best tours",
    message: "What are the best tours and activities at Lina Point?",
  },
];

const INITIAL_MESSAGE = `Hi! 👋 I'm your Lina Point AI Concierge.

I can help you:
• **Plan a personalized Belize itinerary**
• **Beat Viator & GetYourGuide prices** by 6%+
• **Bundle your room + experiences** for maximum savings
• **Check availability** and answer any questions

What would you like to explore?`;

export default function AIConciergeWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: INITIAL_MESSAGE },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [pulse, setPulse] = useState(true);
  const [tooltip, setTooltip] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Listen for 'openConcierge' event to open chat with context
  useEffect(() => {
    function handleOpenConcierge(e: CustomEvent) {
      setOpen(true);
      if (e.detail && e.detail.context) {
        setMessages([
          { role: "assistant", content: INITIAL_MESSAGE },
          {
            role: "user",
            content: `I'm interested in the experience: ${e.detail.context}. Can you help me personalize or book it?`,
          },
        ]);
      }
    }
    window.addEventListener(
      "openConcierge",
      handleOpenConcierge as EventListener,
    );
    return () => {
      window.removeEventListener(
        "openConcierge",
        handleOpenConcierge as EventListener,
      );
    };
  }, []);

  // Stop pulsing after 8 seconds
  useEffect(() => {
    const t = setTimeout(() => setPulse(false), 8000);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (open) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [messages, open]);

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || loading) return;

      const userMsg: Message = { role: "user", content: trimmed };
      setMessages((prev) => [...prev, userMsg]);
      setInput("");
      setLoading(true);

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: [...messages, userMsg].map((m) => ({
              role: m.role,
              content: m.content,
            })),
          }),
        });

        if (!res.ok) throw new Error("Request failed");

        const data = await res.json();
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: data.content },
        ]);
      } catch {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content:
              "Sorry, I'm having trouble connecting right now. You can reach us directly on [WhatsApp](https://wa.me/5016327767) — we typically respond within minutes.",
          },
        ]);
      } finally {
        setLoading(false);
      }
    },
    [loading, messages],
  );

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    sendMessage(input);
  }

  function renderContent(text: string) {
    // Basic markdown: **bold**, [link](url), newlines
    const parts = text.split(/(\*\*[^*]+\*\*|\[[^\]]+\]\([^)]+\)|\n)/g);
    return parts.map((part, i) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return <strong key={i}>{part.slice(2, -2)}</strong>;
      }
      const linkMatch = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
      if (linkMatch) {
        return (
          <a
            key={i}
            href={linkMatch[2]}
            target="_blank"
            rel="noopener noreferrer"
            className="underline text-teal-300"
          >
            {linkMatch[1]}
          </a>
        );
      }
      if (part === "\n") return <br key={i} />;
      return part;
    });
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
      {/* Chat panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.96 }}
            transition={{ duration: 0.2 }}
            className="w-[340px] sm:w-[380px] bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden flex flex-col"
            style={{ maxHeight: "520px" }}
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-teal-700 to-cyan-700 px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center text-base">
                  🤖
                </div>
                <div>
                  <p className="text-white font-bold text-sm leading-none">
                    Lina Point Concierge
                  </p>
                  <p className="text-teal-200 text-[10px] flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-green-400 rounded-full inline-block" />
                    AI · Typically replies instantly
                  </p>
                </div>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="text-white/70 hover:text-white transition text-lg leading-none"
                aria-label="Close chat"
              >
                ×
              </button>
            </div>

            {/* Messages */}
            <div
              className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50"
              style={{ minHeight: 0 }}
            >
              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[85%] px-3 py-2.5 rounded-2xl text-sm leading-relaxed ${
                      msg.role === "user"
                        ? "bg-teal-600 text-white rounded-br-sm"
                        : "bg-white text-gray-800 shadow-sm border border-gray-100 rounded-bl-sm"
                    }`}
                  >
                    {msg.role === "assistant"
                      ? renderContent(msg.content)
                      : msg.content}
                  </div>
                </div>
              ))}

              {/* Quick action chips — show after initial message only */}
              {messages.length === 1 && (
                <div className="flex flex-col gap-1.5 pt-1">
                  {QUICK_ACTIONS.map((action) => (
                    <button
                      key={action.label}
                      onClick={() => sendMessage(action.message)}
                      className="text-left text-xs bg-white border border-teal-200 text-teal-700 px-3 py-2 rounded-xl hover:bg-teal-50 transition font-medium"
                    >
                      {action.label}
                    </button>
                  ))}
                </div>
              )}

              {loading && (
                <div className="flex justify-start">
                  <div className="bg-white border border-gray-100 shadow-sm px-4 py-2.5 rounded-2xl rounded-bl-sm flex gap-1">
                    {[0, 0.15, 0.3].map((delay, i) => (
                      <span
                        key={i}
                        className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"
                        style={{ animationDelay: `${delay}s` }}
                      />
                    ))}
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            {/* WhatsApp handoff */}
            <div className="px-4 pt-2 pb-1 bg-white border-t border-gray-100">
              <Link
                href="https://wa.me/5016327767?text=Hi!%20I'm%20interested%20in%20booking%20a%20stay%20at%20Lina%20Point."
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-xs text-gray-500 hover:text-green-600 transition w-fit"
              >
                <svg
                  className="w-3.5 h-3.5 text-green-500"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
                Continue on WhatsApp
              </Link>
            </div>

            {/* Input */}
            <form onSubmit={handleSubmit} className="px-4 pb-4 bg-white">
              <div className="flex gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask me anything…"
                  disabled={loading}
                  className="flex-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-teal-400 focus:ring-1 focus:ring-teal-400 disabled:opacity-50 bg-gray-50"
                />
                <button
                  type="submit"
                  disabled={loading || !input.trim()}
                  className="bg-teal-600 hover:bg-teal-500 disabled:opacity-40 text-white w-10 h-10 rounded-xl flex items-center justify-center transition shrink-0"
                  aria-label="Send"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                    />
                  </svg>
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tooltip */}
      <AnimatePresence>
        {tooltip && !open && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.95 }}
            className="bg-white border border-gray-100 shadow-xl rounded-xl px-4 py-3 text-sm text-gray-700 max-w-[200px]"
          >
            <p className="font-semibold text-gray-900 mb-0.5">
              Plan your trip! 🌴
            </p>
            <p className="text-xs text-gray-500">
              AI concierge ready to help — beats Viator prices.
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Trigger button */}
      <div className="relative">
        {pulse && !open && (
          <div className="absolute inset-0 bg-teal-500/40 rounded-full animate-ping pointer-events-none" />
        )}
        <motion.button
          onClick={() => {
            setOpen((o) => !o);
            setTooltip(false);
          }}
          onMouseEnter={() => {
            if (!open) setTooltip(true);
          }}
          onMouseLeave={() => setTooltip(false)}
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.95 }}
          className="relative w-14 h-14 bg-gradient-to-br from-teal-600 to-cyan-600 rounded-full flex items-center justify-center shadow-xl shadow-teal-500/30 text-white"
          aria-label="Open AI Concierge"
        >
          <AnimatePresence mode="wait">
            {open ? (
              <motion.span
                key="close"
                initial={{ rotate: -90, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                exit={{ rotate: 90, opacity: 0 }}
                className="text-xl leading-none"
              >
                ×
              </motion.span>
            ) : (
              <motion.span
                key="open"
                initial={{ rotate: 90, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                exit={{ rotate: -90, opacity: 0 }}
                className="text-2xl leading-none"
              >
                💬
              </motion.span>
            )}
          </AnimatePresence>
        </motion.button>
      </div>
    </div>
  );
}
