// AIContentRefinementAdmin.tsx
// Admin tool for reviewing and refining AI-generated content
import React, { useState } from "react";
import {
  refineContent,
  ContentRefinementRequest,
  ContentRefinementResult,
} from "../src/lib/aiContentRefinement";

const TYPES = [
  { value: "altText", label: "Alt Text" },
  { value: "tag", label: "Tag" },
  { value: "description", label: "Description" },
  { value: "conciergeReply", label: "Concierge Reply" },
  { value: "custom", label: "Custom" },
];

export const AIContentRefinementAdmin: React.FC = () => {
  const [input, setInput] = useState("");
  const [type, setType] = useState<ContentRefinementRequest["type"]>("altText");
  const [context, setContext] = useState("");
  const [result, setResult] = useState<ContentRefinementResult | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleRefine() {
    setLoading(true);
    setResult(null);
    const res = await refineContent({ original: input, context, type });
    setResult(res);
    setLoading(false);
  }

  return (
    <div className="max-w-xl mx-auto p-6 bg-white rounded-xl shadow-lg border mt-10">
      <h2 className="text-xl font-bold mb-4 text-cyan-800">
        AI Content Refinement Admin
      </h2>
      <div className="mb-3">
        <label className="block text-sm font-medium mb-1">Content Type</label>
        <select
          value={type}
          onChange={(e) => setType(e.target.value as any)}
          className="border rounded px-2 py-1 w-full"
        >
          {TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </div>
      <div className="mb-3">
        <label className="block text-sm font-medium mb-1">
          Original Content
        </label>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="border rounded px-2 py-1 w-full"
          rows={3}
        />
      </div>
      <div className="mb-3">
        <label className="block text-sm font-medium mb-1">
          Context (optional)
        </label>
        <input
          value={context}
          onChange={(e) => setContext(e.target.value)}
          className="border rounded px-2 py-1 w-full"
        />
      </div>
      <button
        onClick={handleRefine}
        className="bg-cyan-700 text-white px-4 py-2 rounded disabled:opacity-50"
        disabled={loading || !input}
      >
        {loading ? "Refining…" : "Refine"}
      </button>
      {result && (
        <div className="mt-6 bg-cyan-50 p-4 rounded">
          <div className="font-semibold text-cyan-800 mb-2">
            Refined Content
          </div>
          <div className="mb-2 text-cyan-900">{result.refined}</div>
          {result.suggestions.length > 0 && (
            <div>
              <div className="font-semibold text-cyan-700 mb-1">
                Suggestions
              </div>
              <ul className="list-disc pl-5 text-cyan-800">
                {result.suggestions.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
