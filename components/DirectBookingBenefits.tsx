// DirectBookingBenefits.tsx
import React from "react";

const benefits = [
  "Best Rate Guarantee",
  "Free Welcome Drink",
  "Flexible Cancellation",
  "Exclusive Experiences",
  "Priority Room Upgrades",
];

export default function DirectBookingBenefits() {
  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 my-4 flex flex-col md:flex-row items-center justify-between">
      <div className="font-bold text-blue-900 text-lg mb-2 md:mb-0">
        Book Direct & Enjoy:
      </div>
      <ul className="flex flex-wrap gap-4 text-blue-800 text-sm">
        {benefits.map((b) => (
          <li key={b} className="flex items-center">
            <span className="mr-2">✔️</span> {b}
          </li>
        ))}
      </ul>
    </div>
  );
}
