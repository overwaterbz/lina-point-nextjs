// ConciergeWidget.tsx
import React from "react";

export default function ConciergeWidget() {
  return (
    <div className="fixed bottom-6 right-6 z-50">
      <a
        href="https://wa.me/15551234567" // TODO: Replace with real WhatsApp number
        target="_blank"
        rel="noopener noreferrer"
        className="bg-green-500 hover:bg-green-600 text-white rounded-full shadow-lg px-6 py-3 flex items-center gap-2 text-lg font-bold"
      >
        <span role="img" aria-label="whatsapp">
          💬
        </span>{" "}
        Chat with Concierge
      </a>
    </div>
  );
}
