// UpsellFeedbackPrompt.tsx
import React, { useState } from "react";

export default function UpsellFeedbackPrompt({
  guestName,
  onUpsell,
  onFeedback,
}: {
  guestName: string;
  onUpsell?: () => void;
  onFeedback?: (feedback: string) => void;
}) {
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedback, setFeedback] = useState("");

  return (
    <div className="my-8 p-6 bg-blue-50 rounded-xl shadow flex flex-col items-center">
      <h3 className="text-lg font-bold mb-2">
        Enhance Your Stay, {guestName}!
      </h3>
      <p className="mb-4 text-gray-700">
        Would you like to add a tour, spa treatment, or special experience to
        your booking?
      </p>
      <button
        className="bg-teal-600 text-white px-6 py-2 rounded-lg font-semibold mb-2 hover:bg-teal-700"
        onClick={onUpsell}
      >
        View Experiences
      </button>
      <button
        className="text-blue-700 underline text-sm mb-2"
        onClick={() => setShowFeedback((v) => !v)}
      >
        {showFeedback ? "Hide Feedback" : "Leave Feedback"}
      </button>
      {showFeedback && (
        <form
          className="flex flex-col items-center mt-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (onFeedback) onFeedback(feedback);
            setFeedback("");
            setShowFeedback(false);
          }}
        >
          <textarea
            className="border rounded p-2 w-64 mb-2"
            rows={3}
            placeholder="Share your thoughts..."
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            aria-label="Feedback"
          />
          <button
            className="bg-blue-600 text-white px-4 py-1 rounded"
            type="submit"
          >
            Submit
          </button>
        </form>
      )}
    </div>
  );
}
