// GuestStoriesCarousel.tsx
import React from "react";

const guestStories = [
  {
    name: "Sarah M.",
    story:
      "Our stay at Lina Point was magical! The overwater bungalows and staff made our honeymoon unforgettable.",
    image: "/images/guests/sarah.jpg",
  },
  {
    name: "James R.",
    story:
      "The concierge helped us plan the perfect Belize adventure. We can’t wait to come back!",
    image: "/images/guests/james.jpg",
  },
  // Add more stories as needed
];

export default function GuestStoriesCarousel() {
  return (
    <div className="my-8">
      <h3 className="font-bold text-xl mb-4">Real Guest Stories</h3>
      <div className="flex gap-6 overflow-x-auto pb-4">
        {guestStories.map((g) => (
          <div
            key={g.name}
            className="min-w-[250px] bg-white rounded-lg shadow p-4 flex flex-col items-center"
          >
            <img
              src={g.image}
              alt={g.name}
              className="w-16 h-16 rounded-full mb-2 object-cover"
              onError={(e) => {
                e.currentTarget.onerror = null;
                e.currentTarget.src = "/images/fallback-guest.jpg";
              }}
            />
            <div className="italic text-gray-700 mb-2">“{g.story}”</div>
            <div className="font-semibold text-blue-800">- {g.name}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
