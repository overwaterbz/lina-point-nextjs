"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { createBrowserSupabaseClient } from "@/lib/supabase";
import toast from "react-hot-toast";

interface Tour {
  id: string;
  name: string;
  description: string;
  price: number;
  duration_hours: number;
  category: string;
  image_url: string | null;
  max_guests: number;
  active: boolean;
}

interface TourBooking {
  id: string;
  tour_id: string;
  tour_date: string;
  num_guests: number;
  status: string;
  total_price: number;
  tours: { name: string; category: string }[];
}

export default function ToursPage() {
  const { user } = useAuth();
  const [tours, setTours] = useState<Tour[]>([]);
  const [bookings, setBookings] = useState<TourBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"browse" | "booked">("browse");
  const [bookingModal, setBookingModal] = useState<Tour | null>(null);
  const [bookDate, setBookDate] = useState("");
  const [bookGuests, setBookGuests] = useState(1);
  const [bookingSubmit, setBookingSubmit] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const supabase = createBrowserSupabaseClient();
      try {
        const [toursRes, bookingsRes] = await Promise.all([
          supabase
            .from("tours")
            .select("*")
            .eq("active", true)
            .order("category"),
          supabase
            .from("tour_bookings")
            .select(
              "id, tour_id, tour_date, num_guests, status, total_price, tours(name, category)",
            )
            .eq("user_id", user.id)
            .order("tour_date", { ascending: false }),
        ]);
        setTours(toursRes.data || []);
        setBookings((bookingsRes.data as TourBooking[]) || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    })();
  }, [user]);

  const handleBook = async (tour: Tour) => {
    setBookingModal(tour);
    setBookDate("");
    setBookGuests(1);
  };

  const submitBook = async () => {
    if (!user || !bookingModal) return;
    if (!bookDate) {
      toast.error("Please select a date");
      return;
    }
    const guests = Math.min(Math.max(1, bookGuests), bookingModal.max_guests);
    setBookingSubmit(true);
    const supabase = createBrowserSupabaseClient();
    const { error } = await supabase.from("tour_bookings").insert({
      user_id: user.id,
      tour_id: bookingModal.id,
      tour_date: bookDate,
      num_guests: guests,
      total_price: bookingModal.price * guests,
      status: "pending",
    });
    setBookingSubmit(false);
    if (error) {
      toast.error("Failed to book tour");
    } else {
      toast.success(
        `${bookingModal.name} booking submitted! Our team will confirm shortly.`,
      );
      setBookingModal(null);
      const { data } = await supabase
        .from("tour_bookings")
        .select(
          "id, tour_id, tour_date, num_guests, status, total_price, tours(name, category)",
        )
        .eq("user_id", user.id)
        .order("tour_date", { ascending: false });
      setBookings((data as TourBooking[]) || []);
      setTab("booked");
    }
  };

  const categories = [...new Set(tours.map((t) => t.category))];

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-gray-900">Tours & Activities</h1>
        <p className="text-sm text-gray-600 mt-1">
          Explore Belize with Dee Kay&apos;s Tours — from snorkeling the reef to
          ancient ruins
        </p>
      </header>

      {/* Booking modal */}
      {bookingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6 space-y-4">
            <h2 className="text-lg font-bold text-gray-900">
              {bookingModal.name}
            </h2>
            <p className="text-sm text-gray-500">
              ${bookingModal.price}/person · max {bookingModal.max_guests}{" "}
              guests
            </p>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tour Date
              </label>
              <input
                type="date"
                value={bookDate}
                min={new Date().toISOString().split("T")[0]}
                onChange={(e) => setBookDate(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Number of Guests
              </label>
              <input
                type="number"
                min={1}
                max={bookingModal.max_guests}
                value={bookGuests}
                onChange={(e) =>
                  setBookGuests(parseInt(e.target.value, 10) || 1)
                }
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <p className="text-sm font-semibold text-teal-700">
              Total: $
              {bookingModal.price *
                Math.min(bookGuests, bookingModal.max_guests)}
            </p>
            <div className="flex gap-3 pt-1">
              <button
                onClick={submitBook}
                disabled={bookingSubmit}
                className="flex-1 py-2 bg-teal-600 text-white text-sm font-semibold rounded-lg hover:bg-teal-700 disabled:opacity-50"
              >
                {bookingSubmit ? "Booking…" : "Request Booking"}
              </button>
              <button
                onClick={() => setBookingModal(null)}
                className="px-4 py-2 bg-gray-100 text-gray-600 text-sm rounded-lg hover:bg-gray-200"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200 pb-2">
        {(["browse", "booked"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition ${
              tab === t
                ? "bg-white border border-b-0 border-gray-200 text-teal-700"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {t === "browse"
              ? "Browse Tours"
              : `My Bookings (${bookings.length})`}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin h-8 w-8 border-4 border-teal-500 border-t-transparent rounded-full" />
        </div>
      ) : tab === "browse" ? (
        <div className="space-y-8">
          {categories.map((cat) => (
            <div key={cat}>
              <h2 className="text-lg font-semibold text-gray-800 capitalize mb-3">
                {cat}
              </h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {tours
                  .filter((t) => t.category === cat)
                  .map((tour) => (
                    <div
                      key={tour.id}
                      className="bg-white rounded-lg shadow overflow-hidden hover:shadow-md transition"
                    >
                      <div className="h-36 bg-gradient-to-br from-teal-400 to-blue-500 flex items-center justify-center text-4xl">
                        {tour.category === "water"
                          ? "🤿"
                          : tour.category === "culture"
                            ? "🏛️"
                            : tour.category === "nature"
                              ? "🌿"
                              : "🏝️"}
                      </div>
                      <div className="p-4">
                        <h3 className="font-semibold text-gray-900">
                          {tour.name}
                        </h3>
                        <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                          {tour.description}
                        </p>
                        <div className="flex items-center justify-between mt-3">
                          <div>
                            <p className="text-lg font-bold text-teal-700">
                              ${tour.price}
                            </p>
                            <p className="text-xs text-gray-400">
                              {tour.duration_hours}h · max {tour.max_guests}
                            </p>
                          </div>
                          <button
                            onClick={() => handleBook(tour)}
                            className="px-3 py-1.5 bg-teal-600 text-white text-sm font-semibold rounded-lg hover:bg-teal-700 transition"
                          >
                            Book
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          ))}
          {tours.length === 0 && (
            <div className="bg-white rounded-lg shadow p-12 text-center">
              <p className="text-3xl mb-3">🌊</p>
              <p className="text-gray-500">
                Tours will appear here once available. Check back soon!
              </p>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {bookings.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-12 text-center">
              <p className="text-3xl mb-3">🎫</p>
              <p className="text-gray-500">
                No tour bookings yet. Browse tours to get started!
              </p>
            </div>
          ) : (
            bookings.map((b) => (
              <div
                key={b.id}
                className="bg-white rounded-lg shadow p-5 flex flex-col sm:flex-row sm:items-center gap-4"
              >
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">
                    {b.tours?.[0]?.name || "Tour"}
                  </h3>
                  <p className="text-sm text-gray-500">
                    {new Date(b.tour_date).toLocaleDateString()} ·{" "}
                    {b.num_guests} guest{b.num_guests > 1 ? "s" : ""}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <p className="font-bold text-gray-900">${b.total_price}</p>
                  <span
                    className={`text-xs px-2 py-1 rounded-full font-medium ${
                      b.status === "confirmed"
                        ? "bg-green-100 text-green-700"
                        : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {b.status}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
