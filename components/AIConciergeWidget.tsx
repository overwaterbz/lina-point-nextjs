// AIConciergeWidget.tsx
// Multimodal AI concierge chat widget (text/image, voice-ready)
import React, { useState } from "react";
import { sendToConcierge, ConciergeMessage } from "../src/lib/aiConcierge";

export const AIConciergeWidget: React.FC = () => {
  const [messages, setMessages] = useState<ConciergeMessage[]>([]);
  const [input, setInput] = useState("");
  const [imageUrl, setImageUrl] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(false);

  async function handleSend() {
    if (!input && !imageUrl) return;
    const userMsg: ConciergeMessage = {
      role: "user",
      content: input,
      imageUrl,
    };
    setMessages((msgs) => [...msgs, userMsg]);
    setInput("");
    setImageUrl(undefined);
    setLoading(true);
    const reply = await sendToConcierge([...messages, userMsg]);
    setMessages((msgs) => [...msgs, reply]);
    setLoading(false);
  }

  return (
    <div className="fixed bottom-6 right-6 w-80 bg-white rounded-xl shadow-2xl border border-cyan-200 z-50 flex flex-col">
      <div className="px-4 py-3 border-b font-bold text-cyan-800 bg-cyan-50 rounded-t-xl">
        AI Concierge
      </div>
      <div
        className="flex-1 overflow-y-auto p-4 space-y-3"
        style={{ maxHeight: 320 }}
      >
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`rounded-lg px-3 py-2 max-w-[80%] ${msg.role === "user" ? "bg-cyan-100 text-cyan-900" : "bg-cyan-700 text-white"}`}
            >
              {msg.imageUrl && (
                <img
                  src={msg.imageUrl}
                  alt="User upload"
                  className="mb-1 rounded max-h-24"
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src = "/images/fallback-upload.jpg";
                  }}
                />
              )}
              {msg.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="text-cyan-400 text-sm">Concierge is typing…</div>
        )}
      </div>
      <div className="flex items-center gap-2 p-3 border-t">
        <input
          type="text"
          className="flex-1 border rounded px-2 py-1 text-sm"
          placeholder="Ask me anything…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSend();
          }}
          disabled={loading}
        />
        {/* Image upload (future: voice) */}
        <label className="cursor-pointer text-cyan-600 text-xs font-semibold">
          📷
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) setImageUrl(URL.createObjectURL(file));
            }}
            disabled={loading}
          />
        </label>
        <button
          className="bg-cyan-700 text-white px-3 py-1 rounded disabled:opacity-50"
          onClick={handleSend}
          disabled={loading || (!input && !imageUrl)}
        >
          Send
        </button>
      </div>
    </div>
  );
};
