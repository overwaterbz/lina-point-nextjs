"use client";
import { useState, useEffect, useMemo, useCallback, useRef } from "react";
// Debounce helper
function useDebouncedEffect(effect: () => void, deps: any[], delay: number) {
  useEffect(() => {
    const handler = setTimeout(() => effect(), delay);
    return () => clearTimeout(handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, delay]);
}
import { useRouter } from "next/navigation";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import toast from "react-hot-toast";
// import { ProtectedRoute } from "@/components/ProtectedRoute";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import Script from "next/script";
import dynamic from "next/dynamic";
import { trackEvent, captureUtmParams, getUtmParams } from "@/lib/analytics";
import { logClientError } from "@/lib/logClientError";
import WhyBookDirect from "@/components/WhyBookDirect";

// Local CheckoutForm definition (fallback if not imported)
function CheckoutForm({ onSuccess }: { onSuccess: () => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) {
      toast.error("Stripe not loaded. Please refresh the page.");
      return;
    }
    setLoading(true);
    try {
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: window.location.href,
        },
        redirect: "if_required",
      } as any);

      if (error) {
        toast.error(`Payment failed: ${error.message}`);
        setLoading(false);
        return;
      }

      if (paymentIntent && paymentIntent.status === "succeeded") {
        onSuccess();
      } else {
        toast.error("Payment did not complete. Please try again.");
      }
    } catch (err: any) {
      toast.error(`Payment error: ${err?.message || "Unknown error"}`);
      logClientError("stripe-payment", err);
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement />
      <button
        type="submit"
        disabled={!stripe || loading}
        className="w-full bg-blue-600 text-white py-2 rounded"
      >
        {loading ? "Processing..." : "Pay"}
      </button>
    </form>
  );
}
// ...existing code...

const OTAPriceComparison = dynamic(
  () => import("@/components/OTAPriceComparison"),
  {
    loading: () => (
      <div className="animate-pulse h-48 bg-teal-900/20 rounded-xl" />
    ),
  },
);
const SocialProofCounter = dynamic(
  () => import("@/components/SocialProofCounter"),
  {
    loading: () => <div className="animate-pulse h-8 bg-teal-900/20 rounded" />,
  },
);

// ---------- helpers ----------
async function fetchWithTimeout<T>(
  url: string,
  options: RequestInit = {},
  timeoutMs: number = 30000,
): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || `HTTP ${response.status}`);
    }

    return await response.json();
  } catch (error: any) {
    if (error.name === "AbortError") {
      throw new Error(`Request timeout after ${timeoutMs / 1000}s`);
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

// ---------- Square Card Form ----------
function SquareCardForm({
  amount,
  metadata,
  onSuccess,
  onFallbackToStripe,
}: {
  amount: number;
  metadata: Record<string, string>;
  onSuccess: () => void;
  onFallbackToStripe: () => void;
}) {
  const cardRef = useRef<any>(null);
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    setLoading(true);
    try {
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: window.location.href,
        },
        redirect: "if_required",
      } as any);

      if (error) {
        toast.error(`Payment failed: ${error.message}`);
        setLoading(false);
        return;
      }

      if (paymentIntent && paymentIntent.status === "succeeded") {
        onSuccess();
      } else {
        toast.error("Payment did not complete. Please try again.");
      }
    } catch (err: any) {
      toast.error(`Payment error: ${err?.message || "Unknown error"}`);
      logClientError("square-payment", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement />
      <button
        type="submit"
        disabled={!stripe || loading}
        className="w-full bg-blue-600 text-white py-2 rounded"
      >
        {loading ? "Processing..." : "Pay"}
      </button>
    </form>
  );
}

interface BookingResult {
  success: boolean;
  beat_price: number;
  beat_price_per_night: number;
  savings_percent: number;
  nights: number;
  curated_package: {
    room: {
      price_per_night: number;
      room_total: number;
      ota: string;
      url: string;
    };
    tours: Array<{
      name: string;
      type: string;
      price: number;
      duration: string;
      affiliateUrl?: string | null;
    }>;
    dinner: {
      name: string;
      price: number;
    };
    total: number;
    affiliate_links: Array<{
      provider: string;
      url: string;
      commission: number;
    }>;
  };
  recommendations: string[];
  error?: string;
}

// Retry helper function
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  delay = 1000,
): Promise<T> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await new Promise((resolve) =>
        setTimeout(resolve, delay * Math.pow(2, i)),
      );
    }
  }
  throw new Error("Max retries exceeded");
}

interface AvailabilityItem {
  roomType: string;
  label: string;
  totalRooms: number;
  availableRooms: number;
  baseRate: number;
  nights: number;
  estimatedTotal: number;
  available: boolean;
  dynamicRate?: number;
  totalForStay?: number;
  appliedRules?: string[];
  savingsVsBase?: number;
}

// Room slug → roomType canonical key
const SLUG_TO_ROOM_TYPE: Record<string, string> = {
  "2nd-floor-suite": "suite_2nd_floor",
  "1st-floor-suite": "suite_1st_floor",
  "overwater-cabana-duplex": "cabana_duplex",
  "overwater-cabana": "cabana_1br",
  "2br-overwater-cabana": "cabana_2br",
};

export default function BookingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  // Booking page is public: guests can see prices and availability
  const [result, setResult] = useState<BookingResult | null>(null);
  const [paymentOptions, setPaymentOptions] = useState<any>(null);
  const [showPayment, setShowPayment] = useState(false);
  const [paymentMode, setPaymentMode] = useState<"square" | "stripe">("square");
  const [squareSdkReady, setSquareSdkReady] = useState(false);
  const [availability, setAvailability] = useState<AvailabilityItem[] | null>(
    null,
  );
  const [availLoading, setAvailLoading] = useState(false);

  // Promo code state
  const [promoCode, setPromoCode] = useState("");
  const [promoResult, setPromoResult] = useState<{
    valid: boolean;
    promoId?: string;
    code?: string;
    description?: string;
    discount?: number;
    error?: string;
  } | null>(null);
  const [promoLoading, setPromoLoading] = useState(false);
  const [showPromo, setShowPromo] = useState(false);

  // Memoize stripePromise to prevent reloading on every render
  const stripePromise = useMemo(
    () =>
      typeof window !== "undefined" &&
      process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
        ? loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)
        : null,
    [],
  );

  const hasSquare = !!process.env.NEXT_PUBLIC_SQUARE_APPLICATION_ID;

  // Capture UTM params on mount + pre-fill from URL params
  useEffect(() => {
    captureUtmParams();
    // Pre-fill form from URL search params (e.g. from rooms page links)
    const roomSlug = searchParams.get("room");
    const checkIn = searchParams.get("checkIn");
    const checkOut = searchParams.get("checkOut");
    if (roomSlug || checkIn || checkOut) {
      setFormData((prev) => ({
        ...prev,
        ...(roomSlug && SLUG_TO_ROOM_TYPE[roomSlug]
          ? { roomType: SLUG_TO_ROOM_TYPE[roomSlug] }
          : {}),
        ...(checkIn ? { checkInDate: checkIn } : {}),
        ...(checkOut ? { checkOutDate: checkOut } : {}),
      }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fallbackToStripe = useCallback(async () => {
    if (!result) return;
    const finalTotal =
      promoResult?.valid && promoResult?.discount
        ? Math.max(0, result.curated_package.total - promoResult.discount)
        : result.curated_package.total;
    setPaymentMode("stripe");
    try {
      const data = await fetchWithTimeout<any>(
        "/api/stripe/create-payment-intent",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            amount: finalTotal,
            currency: "usd",
            metadata: { booking: "lina-point" },
            useStripe: true,
          }),
        },
        10000,
      );
      if (data.error) throw new Error(data.error);
      setPaymentOptions({ clientSecret: data.client_secret });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Payment setup failed");
      setShowPayment(false);
    }
  }, [result, promoResult]);

  // Validate promo code
  const validatePromo = async () => {
    if (!promoCode.trim()) return;
    setPromoLoading(true);
    try {
      const selected = availability?.find(
        (r) => r.roomType === formData.roomType,
      );
      const res = await fetch("/api/promo/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: promoCode,
          roomType: formData.roomType,
          bookingAmount:
            selected?.totalForStay || selected?.estimatedTotal || 0,
        }),
      });
      const data = await res.json();
      setPromoResult(data);
      if (data.valid) {
        toast.success(`Promo applied: ${data.description || data.code}`);
      } else {
        toast.error(data.error || "Invalid promo code");
      }
    } catch {
      toast.error("Failed to validate promo code");
    } finally {
      setPromoLoading(false);
    }
  };

  const [formData, setFormData] = useState({
    roomType: "suite_2nd_floor",
    checkInDate: "",
    checkOutDate: "",
    location: "Belize",
    groupSize: 2,
    tourBudget: 500,
    interests: ["snorkeling", "dining"],
    activityLevel: "medium" as const,
  });

  // Fetch availability when dates change
  useDebouncedEffect(
    () => {
      if (!formData.checkInDate || !formData.checkOutDate) {
        setAvailability(null);
        return;
      }
      const ci = new Date(formData.checkInDate);
      const co = new Date(formData.checkOutDate);
      if (co <= ci) return;

      let cancelled = false;
      setAvailLoading(true);
      fetch(
        `/api/availability?checkIn=${formData.checkInDate}&checkOut=${formData.checkOutDate}`,
      )
        .then((r) => r.json())
        .then((data) => {
          if (!cancelled && data.availability)
            setAvailability(data.availability);
        })
        .catch(() => {})
        .finally(() => {
          if (!cancelled) setAvailLoading(false);
        });
      return () => {
        cancelled = true;
      };
    },
    [formData.checkInDate, formData.checkOutDate],
    400,
  );

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value, type } = e.target;

    if (type === "checkbox") {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData((prev) => ({
        ...prev,
        interests: checked
          ? [...prev.interests, value]
          : prev.interests.filter((i) => i !== value),
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]:
          type === "number"
            ? parseInt(value)
            : name === "activityLevel"
              ? value
              : value,
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.checkInDate || !formData.checkOutDate) {
      toast.error("Please select check-in and check-out dates");
      return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const checkIn = new Date(formData.checkInDate);
    const checkOut = new Date(formData.checkOutDate);

    if (checkIn < today) {
      toast.error("Check-in date cannot be in the past");
      return;
    }

    if (checkOut <= checkIn) {
      toast.error("Check-out must be after check-in");
      return;
    }

    const nights = Math.round(
      (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24),
    );
    if (nights < 2) {
      toast.error("Minimum stay is 2 nights");
      return;
    }

    if (nights > 30) {
      toast.error("Maximum stay is 30 nights");
      return;
    }

    // Only require login at reservation/checkout step
    // Do NOT require login for search/results. Only require login when user proceeds to payment/checkout.

    setIsLoading(true);
    const loadingToast = toast.loading(
      "Running agents... Price Scout & Experience Curator",
    );

    try {
      const data: BookingResult = await fetchWithTimeout<BookingResult>(
        "/api/book-flow",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        },
        45000, // Extended timeout for agent processing (45s)
      );

      if (!data.success) {
        throw new Error(data.error || "Booking failed");
      }

      setResult(data);

      // If server returned a client_secret from Stripe, open payment modal
      if ((data as any).client_secret) {
        setPaymentOptions({ clientSecret: (data as any).client_secret });
        setShowPayment(true);
      }
      toast.dismiss(loadingToast);
      toast.success("Booking processed successfully!");
    } catch (error) {
      toast.dismiss(loadingToast);
      toast.error(error instanceof Error ? error.message : "An error occurred");
      logClientError("booking-submit", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Open payment modal — Square is default, Stripe is fallback
  const handlePay = async () => {
    if (!result) return;
    // Require login at checkout/payment step
    if (!user) {
      toast.error("Please log in or sign up to reserve your room.");
      router.push("/auth/login");
      return;
    }
    setPaymentMode(hasSquare ? "square" : "stripe");
    setPaymentOptions(null);

    if (!hasSquare) {
      // No Square configured — go straight to Stripe
      await fallbackToStripe();
    }

    setShowPayment(true);
  };

  return (
    // Booking page is now public: Removed ProtectedRoute
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">
          Lina Point Resort Booking
        </h1>
        <SocialProofCounter />
        <p className="text-lg text-gray-600 mb-8">
          AI-powered price comparison & experience curation — San Pedro, Belize
        </p>

        {!result ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Booking Form */}
            <div className="bg-white rounded-lg shadow-lg p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">
                Search Rooms & Tours
              </h2>

              <form
                onSubmit={handleSubmit}
                className="space-y-6"
                aria-label="Booking form"
              >
                <div className="mb-2">
                  <span className="text-xs text-gray-500" role="note">
                    <strong>Note:</strong> You can view prices and availability
                    as a guest. Login is only required at checkout to reserve
                    your room.
                  </span>
                </div>
                {/* Room Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Room Type
                  </label>
                  <select
                    name="roomType"
                    value={formData.roomType}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    aria-label="Room Type"
                  >
                    {(
                      availability || [
                        {
                          roomType: "suite_2nd_floor",
                          label: "2nd Floor Overwater Hotel Suite",
                          baseRate: 130,
                          availableRooms: -1,
                          available: true,
                        },
                        {
                          roomType: "suite_1st_floor",
                          label: "1st Floor Overwater Hotel Suite",
                          baseRate: 150,
                          availableRooms: -1,
                          available: true,
                        },
                        {
                          roomType: "cabana_duplex",
                          label: "1 Bed Overwater Cabana (Duplex)",
                          baseRate: 250,
                          availableRooms: -1,
                          available: true,
                        },
                        {
                          roomType: "cabana_1br",
                          label: "1 Bedroom Overwater Cabana",
                          baseRate: 300,
                          availableRooms: -1,
                          available: true,
                        },
                        {
                          roomType: "cabana_2br",
                          label: "2 Bedroom Overwater Cabana",
                          baseRate: 400,
                          availableRooms: -1,
                          available: true,
                        },
                      ]
                    ).map((r: any) => (
                      <option
                        key={r.roomType}
                        value={r.roomType}
                        disabled={!r.available}
                      >
                        {r.label} — ${r.dynamicRate ?? r.baseRate}/night
                        {r.savingsVsBase ? ` (save $${r.savingsVsBase})` : ""}
                        {r.availableRooms >= 0
                          ? r.available
                            ? ` (${r.availableRooms} left)`
                            : " — SOLD OUT"
                          : ""}
                      </option>
                    ))}
                  </select>
                  {availLoading && (
                    <p className="text-xs text-blue-500 mt-1">
                      Checking availability…
                    </p>
                  )}
                  {availability &&
                    (() => {
                      const selected = availability.find(
                        (r) => r.roomType === formData.roomType,
                      );
                      if (!selected?.appliedRules?.length) return null;
                      return (
                        <div className="mt-2 bg-green-50 border border-green-200 rounded-lg p-3">
                          <p className="text-sm font-semibold text-green-800">
                            Dynamic Rate: ${selected.dynamicRate}/night
                            {selected.savingsVsBase ? (
                              <span className="ml-2 text-green-600">
                                (save ${selected.savingsVsBase}/night)
                              </span>
                            ) : null}
                          </p>
                          <p className="text-xs text-green-700 mt-1">
                            {selected.appliedRules.join(" · ")}
                          </p>
                          {selected.totalForStay && (
                            <p className="text-sm font-bold text-green-900 mt-1">
                              Total: ${selected.totalForStay} for{" "}
                              {selected.nights} night
                              {selected.nights !== 1 ? "s" : ""}
                            </p>
                          )}
                        </div>
                      );
                    })()}
                </div>

                {/* Dates Row */}
                <div className="grid grid-cols-2 gap-4">
                  {/* Check-in Date */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Check-in
                    </label>
                    <input
                      type="date"
                      name="checkInDate"
                      value={formData.checkInDate}
                      onChange={handleInputChange}
                      min={new Date().toISOString().split("T")[0]}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                      aria-label="Check-in Date"
                    />
                  </div>

                  {/* Check-out Date */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Check-out
                    </label>
                    <input
                      type="date"
                      name="checkOutDate"
                      value={formData.checkOutDate}
                      onChange={handleInputChange}
                      min={
                        formData.checkInDate ||
                        new Date().toISOString().split("T")[0]
                      }
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                      aria-label="Check-out Date"
                    />
                  </div>
                </div>

                {formData.checkInDate &&
                  formData.checkOutDate &&
                  (() => {
                    const nights = Math.round(
                      (new Date(formData.checkOutDate).getTime() -
                        new Date(formData.checkInDate).getTime()) /
                        (1000 * 60 * 60 * 24),
                    );
                    return nights > 0 ? (
                      <p className="text-sm text-blue-600 -mt-4">
                        {nights} night{nights !== 1 ? "s" : ""} stay
                      </p>
                    ) : null;
                  })()}

                {/* Group Size */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Group Size
                  </label>
                  <input
                    type="number"
                    name="groupSize"
                    value={formData.groupSize}
                    onChange={handleInputChange}
                    min="1"
                    max="10"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    aria-label="Group Size"
                  />
                </div>

                {/* Tour Budget */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tour Budget ($)
                  </label>
                  <input
                    type="number"
                    name="tourBudget"
                    value={formData.tourBudget}
                    onChange={handleInputChange}
                    min="100"
                    step="50"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    aria-label="Tour Budget"
                  />
                </div>

                {/* Activity Level */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Activity Level
                  </label>
                  <select
                    name="activityLevel"
                    value={formData.activityLevel}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    aria-label="Activity Level"
                  >
                    <option value="low">Low (Relaxation)</option>
                    <option value="medium">Medium (Balanced)</option>
                    <option value="high">High (Adventure)</option>
                  </select>
                </div>

                {/* Interests */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Tour Interests
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { value: "snorkeling", label: "Snorkeling & Reef" },
                      { value: "fishing", label: "Sport Fishing" },
                      { value: "mainland", label: "Mayan Ruins" },
                      { value: "cenote", label: "Cenote Swimming" },
                      { value: "kayaking", label: "Mangrove Kayaking" },
                      { value: "dining", label: "Culinary Dining" },
                    ].map((interest) => (
                      <div key={interest.value} className="flex items-center">
                        <input
                          type="checkbox"
                          id={interest.value}
                          name={interest.value}
                          value={interest.value}
                          checked={formData.interests.includes(interest.value)}
                          onChange={handleInputChange}
                          className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                          aria-label={interest.label}
                        />
                        <label
                          htmlFor={interest.value}
                          className="ml-2 text-sm text-gray-700"
                        >
                          {interest.label}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                {/* OTA Price Comparison — shows after dates selected */}
                {formData.checkInDate &&
                  formData.checkOutDate &&
                  (() => {
                    const ci = new Date(formData.checkInDate);
                    const co = new Date(formData.checkOutDate);
                    const n = Math.round(
                      (co.getTime() - ci.getTime()) / (1000 * 60 * 60 * 24),
                    );
                    return n >= 2 ? (
                      <OTAPriceComparison
                        roomType={formData.roomType}
                        checkIn={formData.checkInDate}
                        checkOut={formData.checkOutDate}
                        nights={n}
                      />
                    ) : null;
                  })()}

                {/* Promo Code */}
                <div>
                  {!showPromo ? (
                    <button
                      type="button"
                      onClick={() => setShowPromo(true)}
                      className="text-sm text-teal-600 hover:text-teal-800 font-medium"
                    >
                      Have a promo code? &rarr;
                    </button>
                  ) : (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={promoCode}
                        onChange={(e) => {
                          setPromoCode(e.target.value.toUpperCase());
                          setPromoResult(null);
                        }}
                        placeholder="Enter promo code"
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm uppercase focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                      />
                      <button
                        type="button"
                        onClick={validatePromo}
                        disabled={promoLoading || !promoCode.trim()}
                        className="px-4 py-2 bg-teal-600 text-white text-sm rounded-lg font-medium hover:bg-teal-700 disabled:bg-gray-300 transition-colors"
                      >
                        {promoLoading ? "..." : "Apply"}
                      </button>
                    </div>
                  )}
                  {promoResult?.valid && (
                    <div className="mt-2 bg-green-50 border border-green-200 rounded-lg p-3 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold text-green-800">
                          {promoResult.description}
                        </p>
                        {promoResult.discount ? (
                          <p className="text-xs text-green-600">
                            -${promoResult.discount.toFixed(2)} discount
                          </p>
                        ) : null}
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setPromoResult(null);
                          setPromoCode("");
                        }}
                        className="text-xs text-gray-400 hover:text-gray-600"
                      >
                        Remove
                      </button>
                    </div>
                  )}
                  {promoResult && !promoResult.valid && (
                    <p className="mt-1 text-xs text-red-500">
                      {promoResult.error}
                    </p>
                  )}
                </div>

                {/* Why Book Direct — compact version */}
                <WhyBookDirect compact />

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
                  aria-label="Search and Curate"
                >
                  {isLoading
                    ? "Processing... (Running Agents)"
                    : "Search & Curate"}
                </button>
              </form>
            </div>

            {/* Info Panel */}
            <div className="bg-white rounded-lg shadow-lg p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">
                How It Works
              </h2>

              <div className="space-y-6">
                <div className="border-l-4 border-blue-600 pl-4">
                  <h3 className="font-semibold text-lg text-gray-900">
                    1. Price Scout Agent
                  </h3>
                  <p className="text-gray-600 text-sm mt-2">
                    Scans Agoda, Expedia & Booking.com across up to 3 iterations
                    to find the best deal, then beats it by 6%.
                  </p>
                </div>

                <div className="border-l-4 border-green-600 pl-4">
                  <h3 className="font-semibold text-lg text-gray-900">
                    2. Experience Curator Agent
                  </h3>
                  <p className="text-gray-600 text-sm mt-2">
                    Customizes fishing, snorkeling & mainland tours based on
                    your preferences and generates affiliate links.
                  </p>
                </div>

                <div className="border-l-4 border-purple-600 pl-4">
                  <h3 className="font-semibold text-lg text-gray-900">
                    3. Smart Recommendations
                  </h3>
                  <p className="text-gray-600 text-sm mt-2">
                    LangGraph orchestrates both agents, compares prices
                    recursively, and packages everything with affiliate
                    commissions.
                  </p>
                </div>

                <div className="bg-blue-50 rounded-lg p-4 mt-8">
                  <p className="text-sm text-gray-700">
                    <strong>Example Query:</strong> &quot;Find an overwater room
                    for 2, snorkeling tour for family, with $500 tour
                    budget&quot;
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Results Display */
          <div className="bg-white rounded-lg shadow-lg p-8">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-3xl font-bold text-gray-900">
                Your Perfect {formData.location} Package
              </h2>
              <button
                onClick={() => setResult(null)}
                className="px-4 py-2 text-blue-600 hover:text-blue-800 font-semibold"
              >
                ← New Search
              </button>
            </div>

            {/* Price Comparison */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-lg p-6 border-l-4 border-red-600">
                <p className="text-gray-600 text-sm font-semibold">OTA Price</p>
                <p className="text-3xl font-bold text-red-600">
                  ${result.curated_package.room.price_per_night}
                  <span className="text-sm font-normal text-gray-500">
                    /night
                  </span>
                </p>
                <p className="text-xs text-gray-600 mt-1">
                  {result.curated_package.room.ota}
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  $
                  {(
                    result.curated_package.room.price_per_night * result.nights
                  ).toFixed(0)}{" "}
                  total for {result.nights} night
                  {result.nights !== 1 ? "s" : ""}
                </p>
              </div>

              <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-6 border-l-4 border-green-600">
                <p className="text-gray-600 text-sm font-semibold">
                  Our Direct Price
                </p>
                <p className="text-3xl font-bold text-green-600">
                  ${result.beat_price_per_night}
                  <span className="text-sm font-normal text-gray-500">
                    /night
                  </span>
                </p>
                <p className="text-xs text-gray-600 mt-1">
                  Save {result.savings_percent}% vs OTA
                </p>
                <p className="text-sm font-bold text-green-800 mt-1">
                  ${result.beat_price} total for {result.nights} night
                  {result.nights !== 1 ? "s" : ""}
                </p>
              </div>

              <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-6 border-l-4 border-purple-600">
                <p className="text-gray-600 text-sm font-semibold">
                  Total Package
                </p>
                <p className="text-3xl font-bold text-purple-600">
                  $
                  {promoResult?.valid && promoResult?.discount
                    ? Math.max(
                        0,
                        result.curated_package.total - promoResult.discount,
                      ).toFixed(0)
                    : result.curated_package.total}
                </p>
                {promoResult?.valid && promoResult?.discount ? (
                  <p className="text-xs text-green-600 mt-1">
                    Promo saves ${promoResult.discount.toFixed(2)}
                  </p>
                ) : null}
                <p className="text-xs text-gray-600 mt-1">
                  Room + tours + dinner
                </p>
              </div>
            </div>

            {/* Package Details */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
              {/* Room */}
              <div className="border border-gray-200 rounded-lg p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-4">
                  Room Booking
                </h3>
                <p className="text-gray-700 mb-1">
                  <strong>Type:</strong> {formData.roomType.replace(/_/g, " ")}
                </p>
                <p className="text-gray-700 mb-1">
                  <strong>Rate:</strong> $
                  {result.curated_package.room.price_per_night}/night ×{" "}
                  {result.nights} night{result.nights !== 1 ? "s" : ""}
                </p>
                <p className="text-gray-700 mb-1">
                  <strong>Room Total:</strong> $
                  {result.curated_package.room.room_total}
                </p>
                <p className="text-gray-700 mb-4">
                  <strong>OTA:</strong> {result.curated_package.room.ota}
                </p>
                <a
                  href={result.curated_package.room.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
                >
                  Book Direct & Save {result.savings_percent}%
                </a>
                <button
                  onClick={handlePay}
                  disabled={isLoading || !stripePromise}
                  className="ml-4 inline-block px-6 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors"
                >
                  {isLoading ? "Setting up payment..." : "Pay Securely"}
                </button>
              </div>

              {/* Tours */}
              <div className="border border-gray-200 rounded-lg p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-4">
                  Curated Experiences
                </h3>
                <div className="space-y-3">
                  {result.curated_package.tours.map((tour, idx) => (
                    <div key={idx} className="bg-gray-50 rounded p-3">
                      <p className="font-semibold text-gray-900">{tour.name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-sm font-bold text-green-700">
                          ${tour.price}
                        </span>
                        <span className="text-xs text-gray-400">
                          • {tour.duration}
                        </span>
                      </div>
                    </div>
                  ))}
                  <div className="bg-orange-50 rounded p-3">
                    <p className="font-semibold text-gray-900">
                      {result.curated_package.dinner.name}
                    </p>
                    <p className="text-sm text-gray-600">
                      ${result.curated_package.dinner.price}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Affiliate Links */}
            {result.curated_package.affiliate_links.length > 0 && (
              <div className="border border-gray-200 rounded-lg p-6 mb-8 bg-yellow-50">
                <h3 className="text-xl font-bold text-gray-900 mb-4">
                  Affiliate Partnerships
                </h3>
                <div className="space-y-2">
                  {result.curated_package.affiliate_links.map((link, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-3 bg-white rounded"
                    >
                      <div>
                        <p className="font-semibold text-gray-900">
                          {link.provider}
                        </p>
                        <p className="text-xs text-gray-600">
                          Commission: ${link.commission}
                        </p>
                      </div>
                      <a
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 font-semibold"
                      >
                        View →
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recommendations */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4">
                Agent Recommendations
              </h3>
              <ul className="space-y-2">
                {result.recommendations.map((rec, idx) => (
                  <li key={idx} className="flex items-start">
                    <span className="text-green-600 font-bold mr-3">✓</span>
                    <span className="text-gray-700">{rec}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Payment Modal — Square (primary) or Stripe (fallback) */}
            {showPayment && result && (
              <div
                className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
                role="dialog"
                aria-modal="true"
                aria-label="Payment Modal"
              >
                <div
                  className="bg-white rounded-lg p-6 max-w-lg w-full"
                  tabIndex={-1}
                  ref={(el) => {
                    if (el && showPayment) el.focus();
                  }}
                >
                  <h3 className="text-lg font-bold mb-2">Complete Payment</h3>
                  <p className="text-sm text-gray-500 mb-4">
                    {paymentMode === "square"
                      ? "Secured by Square"
                      : "Secured by Stripe"}
                  </p>

                  {paymentMode === "square" && hasSquare && (
                    <SquareCardForm
                      amount={
                        promoResult?.valid && promoResult?.discount
                          ? Math.max(
                              0,
                              result.curated_package.total -
                                promoResult.discount,
                            )
                          : result.curated_package.total
                      }
                      metadata={{ booking: "lina-point" }}
                      onSuccess={() => {
                        setShowPayment(false);
                        toast.success("Payment successful!");
                        trackEvent("purchase", {
                          value: result.curated_package.total,
                          currency: "USD",
                          payment_method: "square",
                          ...getUtmParams(),
                        });
                        if ((result as any)?.confirmationNumber) {
                          router.push(
                            `/booking/confirmation/${(result as any).confirmationNumber}`,
                          );
                        }
                      }}
                      onFallbackToStripe={() => fallbackToStripe()}
                    />
                  )}

                  {paymentMode === "stripe" &&
                    paymentOptions &&
                    stripePromise && (
                      <Elements
                        stripe={stripePromise}
                        options={{
                          clientSecret: paymentOptions.clientSecret,
                        }}
                      >
                        <CheckoutForm
                          onSuccess={() => {
                            setShowPayment(false);
                            toast.success("Payment successful!");
                            trackEvent("purchase", {
                              value: result.curated_package.total,
                              currency: "USD",
                              payment_method: "stripe",
                              ...getUtmParams(),
                            });
                            if ((result as any)?.confirmationNumber) {
                              router.push(
                                `/booking/confirmation/${(result as any).confirmationNumber}`,
                              );
                            }
                          }}
                        />
                      </Elements>
                    )}

                  {paymentMode === "stripe" && !paymentOptions && (
                    <p className="text-sm text-gray-500 text-center py-4">
                      Setting up Stripe…
                    </p>
                  )}

                  <button
                    onClick={() => setShowPayment(false)}
                    className="mt-4 text-sm text-gray-600 hover:underline"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Square SDK script — loaded only when needed */}
            {hasSquare && (
              <Script
                src={
                  process.env.NODE_ENV === "production"
                    ? "https://web.squarecdn.com/v1/square.js"
                    : "https://sandbox.web.squarecdn.com/v1/square.js"
                }
                strategy="lazyOnload"
                onLoad={() => setSquareSdkReady(true)}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
