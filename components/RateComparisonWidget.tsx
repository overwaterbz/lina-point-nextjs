// RateComparisonWidget.tsx
import React, { useEffect, useState } from "react";

interface Rate {
  source: string;
  price: number;
  url?: string;
}

const mockRates: Rate[] = [
  { source: "Direct", price: 299 },
  { source: "Booking.com", price: 319, url: "https://booking.com" },
  { source: "Expedia", price: 325, url: "https://expedia.com" },
];

export default function RateComparisonWidget() {
  const [rates, setRates] = useState<Rate[]>([]);

  useEffect(() => {
    // TODO: Replace with real API call to fetch OTA rates
    setRates(mockRates);
  }, []);

  return (
    <div className="rounded-lg border p-4 bg-white shadow-md my-4">
      <h3 className="font-bold text-lg mb-2">Compare Our Rates</h3>
      <table className="w-full text-sm">
        <thead>
          <tr>
            <th className="text-left">Source</th>
            <th className="text-right">Nightly Rate</th>
          </tr>
        </thead>
        <tbody>
          {rates.map((rate) => (
            <tr key={rate.source}>
              <td>
                {rate.url ? (
                  <a
                    href={rate.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline text-blue-600"
                  >
                    {rate.source}
                  </a>
                ) : (
                  <span className="font-semibold text-green-700">
                    {rate.source} (You Save!)
                  </span>
                )}
              </td>
              <td className="text-right">${rate.price}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mt-2 text-xs text-gray-500">
        We guarantee the best rate when you book direct.
      </div>
    </div>
  );
}
