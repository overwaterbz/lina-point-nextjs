import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { trackEvent, getUtmParams } from "@/lib/analytics";
import { logClientError } from "@/lib/logClientError";

// A/B session IDs — stored in sessionStorage so they persist across wizard steps
const AB_SESSION_KEY = "funnel_session_id";
const AB_VARIANT_KEY = "funnel_variant";

// ---- Shared types ----

export type RoomType =
  | "suite_2nd_floor"
  | "suite_1st_floor"
  | "cabana_duplex"
  | "cabana_1br"
  | "cabana_2br";

export type ActivityLevel = "low" | "medium" | "high";
export type WizardStep = 1 | 2 | 3 | 4 | 5 | 6;

export interface AvailabilityItem {
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

export interface BookingResult {
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
    dinner: { name: string; price: number };
    total: number;
    affiliate_links: Array<{
      provider: string;
      url: string;
      commission: number;
    }>;
  };
  recommendations: string[];
  confirmationNumber?: string;
  error?: string;
}

export interface PromoResult {
  valid: boolean;
  promoId?: string;
  code?: string;
  description?: string;
  discount?: number;
  error?: string;
}

export interface GuestDetails {
  name: string;
  email: string;
  phone: string;
  specialRequests: string;
}

// ---- Internal util ----

async function fetchWithTimeout<T>(
  url: string,
  options: RequestInit = {},
  timeoutMs = 30000,
): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error((err as any).error || `HTTP ${response.status}`);
    }
    return await response.json();
  } catch (error: any) {
    if (error.name === "AbortError")
      throw new Error(`Request timeout after ${timeoutMs / 1000}s`);
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

// ---- Hook ----

export function useBookingWizard(initialData?: {
  roomType?: RoomType;
  checkIn?: string;
  checkOut?: string;
}) {
  const router = useRouter();

  // Navigation
  const [step, setStep] = useState<WizardStep>(1);

  // Step 1 — dates + guests
  const [checkInDate, setCheckInDate] = useState(initialData?.checkIn ?? "");
  const [checkOutDate, setCheckOutDate] = useState(initialData?.checkOut ?? "");
  const [groupSize, setGroupSize] = useState(2);

  // Step 2 — room
  const [roomType, setRoomType] = useState<RoomType>(
    initialData?.roomType ?? "suite_2nd_floor",
  );

  // Step 3 — experiences
  const [activityLevel, setActivityLevel] = useState<ActivityLevel>("medium");
  const [tourBudget, setTourBudget] = useState(500);
  const [interests, setInterests] = useState<string[]>([
    "snorkeling",
    "dining",
  ]);

  // API state
  const [availability, setAvailability] = useState<AvailabilityItem[] | null>(
    null,
  );
  const [availLoading, setAvailLoading] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [packageResult, setPackageResult] = useState<BookingResult | null>(
    null,
  );

  // Step 4 — promo
  const [promoCode, setPromoCode] = useState("");
  const [promoResult, setPromoResult] = useState<PromoResult | null>(null);
  const [promoLoading, setPromoLoading] = useState(false);
  const [showPromo, setShowPromo] = useState(false);

  // Step 4 — bundle vs room-only selection
  const [bundleSelected, setBundleSelected] = useState(true);

  // Step 5 — Magic Family (auth/join)
  const [guestMode, setGuestMode] = useState(false);

  // Step 6 — checkout
  const [guestDetails, setGuestDetails] = useState<GuestDetails>({
    name: "",
    email: "",
    phone: "",
    specialRequests: "",
  });
  const [paymentOptions, setPaymentOptions] = useState<{
    clientSecret: string;
  } | null>(null);
  const [showPayment, setShowPayment] = useState(false);
  const [paymentMode, setPaymentMode] = useState<"square" | "stripe">("square");
  const [squareSdkReady, setSquareSdkReady] = useState(false);

  // A/B testing — session ID and variant assigned on mount, persisted in sessionStorage
  const [abVariant, setAbVariant] = useState<"A" | "B">("A");
  const [funnelSessionId, setFunnelSessionId] = useState("");

  // Ref snapshot for use inside callbacks without re-render loops
  const abVariantRef = useRef<"A" | "B">("A");
  const funnelSessionIdRef = useRef("");

  // Initialize A/B variant + session on mount
  useEffect(() => {
    if (typeof window === "undefined") return;
    let sid = sessionStorage.getItem(AB_SESSION_KEY);
    if (!sid) {
      sid =
        typeof crypto !== "undefined"
          ? crypto.randomUUID()
          : String(Date.now());
      sessionStorage.setItem(AB_SESSION_KEY, sid);
    }
    let v = sessionStorage.getItem(AB_VARIANT_KEY) as "A" | "B" | null;
    if (!v) {
      v = Math.random() < 0.5 ? "A" : "B";
      sessionStorage.setItem(AB_VARIANT_KEY, v);
    }
    setFunnelSessionId(sid);
    setAbVariant(v);
    funnelSessionIdRef.current = sid;
    abVariantRef.current = v;
  }, []);

  // Track funnel step advancement
  useEffect(() => {
    const sid = funnelSessionIdRef.current;
    if (!sid || step < 1) return;
    fetch("/api/analytics/funnel", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId: sid,
        variant: abVariantRef.current,
        stepReached: step,
        roomType: roomType || null,
        checkIn: checkInDate || null,
      }),
    }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  // Derived
  const nights = useMemo(() => {
    if (!checkInDate || !checkOutDate) return 0;
    const diff =
      new Date(checkOutDate).getTime() - new Date(checkInDate).getTime();
    return Math.round(diff / (1000 * 60 * 60 * 24));
  }, [checkInDate, checkOutDate]);

  const hasSquare =
    typeof window !== "undefined" &&
    !!process.env.NEXT_PUBLIC_SQUARE_APPLICATION_ID;

  const selectedRoom = useMemo(
    () => availability?.find((r) => r.roomType === roomType) ?? null,
    [availability, roomType],
  );

  // Debounced availability fetch
  const availTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!checkInDate || !checkOutDate || nights <= 0) {
      setAvailability(null);
      return;
    }
    if (availTimerRef.current) clearTimeout(availTimerRef.current);
    availTimerRef.current = setTimeout(() => {
      let cancelled = false;
      setAvailLoading(true);
      fetch(`/api/availability?checkIn=${checkInDate}&checkOut=${checkOutDate}`)
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
    }, 500);
    return () => {
      if (availTimerRef.current) clearTimeout(availTimerRef.current);
    };
  }, [checkInDate, checkOutDate, nights]);

  // Navigation
  const nextStep = useCallback(() => {
    setStep((s) => Math.min(5, s + 1) as WizardStep);
    if (typeof window !== "undefined")
      window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const prevStep = useCallback(() => {
    setStep((s) => Math.max(1, s - 1) as WizardStep);
    if (typeof window !== "undefined")
      window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const goToStep = useCallback((n: WizardStep) => {
    setStep(n);
    if (typeof window !== "undefined")
      window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const proceedToCheckout = useCallback(() => {
    setStep(6 as WizardStep);
    if (typeof window !== "undefined")
      window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const proceedAsGuest = useCallback(() => {
    setGuestMode(true);
    setStep(6 as WizardStep);
    if (typeof window !== "undefined")
      window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  // Generate AI package (step 3 → step 4)
  const generatePackage = useCallback(async () => {
    if (!checkInDate || !checkOutDate) {
      toast.error("Please select your dates first");
      return;
    }
    setIsLoading(true);
    const loadingToast = toast.loading(
      "AI agents running… Price Scout & Experience Curator",
    );
    try {
      const data = await fetchWithTimeout<BookingResult>(
        "/api/book-flow",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            roomType,
            checkInDate,
            checkOutDate,
            location: "Belize",
            groupSize,
            tourBudget,
            interests,
            activityLevel,
          }),
        },
        45000,
      );
      if (!data.success) throw new Error(data.error || "Booking failed");
      setPackageResult(data);
      setBundleSelected(true);
      toast.dismiss(loadingToast);
      toast.success("Your package is ready!");
      setStep(4);
      if (typeof window !== "undefined")
        window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (error) {
      toast.dismiss(loadingToast);
      toast.error(error instanceof Error ? error.message : "An error occurred");
      logClientError("booking-generate-package", error);
    } finally {
      setIsLoading(false);
    }
  }, [
    checkInDate,
    checkOutDate,
    roomType,
    groupSize,
    tourBudget,
    interests,
    activityLevel,
  ]);

  // Skip experiences — build a room-only package locally (no API call)
  const generateRoomOnlyPackage = useCallback(() => {
    const pricePerNight =
      selectedRoom?.dynamicRate ?? selectedRoom?.baseRate ?? 0;
    if (!pricePerNight || nights <= 0) {
      toast.error("Please select your dates and room first");
      return;
    }
    const roomTotal = pricePerNight * nights;
    // Approximate OTA reference: our direct price is 6% below OTA
    const otaPerNight = Math.round(pricePerNight * 1.064);
    const roomOnlyPackage: BookingResult = {
      success: true,
      beat_price: roomTotal,
      beat_price_per_night: pricePerNight,
      savings_percent: 6,
      nights,
      curated_package: {
        room: {
          price_per_night: otaPerNight,
          room_total: roomTotal,
          ota: "Best OTA Rate",
          url: "",
        },
        tours: [],
        dinner: { name: "Dining not included", price: 0 },
        total: roomTotal,
        affiliate_links: [],
      },
      recommendations: [
        "Book direct for the guaranteed best price — always 6% below OTA rates",
        "You can add tours and experiences after booking by contacting our concierge",
      ],
    };
    setPackageResult(roomOnlyPackage);
    setBundleSelected(false);
    setStep(4);
    if (typeof window !== "undefined")
      window.scrollTo({ top: 0, behavior: "smooth" });
  }, [selectedRoom, nights]);

  // Validate promo code
  const validatePromo = useCallback(async () => {
    if (!promoCode.trim()) return;
    setPromoLoading(true);
    try {
      const selected = availability?.find((r) => r.roomType === roomType);
      const res = await fetch("/api/promo/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: promoCode,
          roomType,
          bookingAmount:
            selected?.totalForStay ?? selected?.estimatedTotal ?? 0,
        }),
      });
      const data: PromoResult = await res.json();
      setPromoResult(data);
      if (data.valid) {
        toast.success(`Promo applied: ${data.description ?? data.code}`);
      } else {
        toast.error(data.error ?? "Invalid promo code");
      }
    } catch {
      toast.error("Failed to validate promo code");
    } finally {
      setPromoLoading(false);
    }
  }, [promoCode, availability, roomType]);

  const clearPromo = useCallback(() => {
    setPromoResult(null);
    setPromoCode("");
  }, []);

  // Create Stripe payment intent (used for both Stripe and Square UI modes)
  const fallbackToStripe = useCallback(async () => {
    if (!packageResult) return;
    const baseTotal = bundleSelected
      ? packageResult.curated_package.total
      : packageResult.curated_package.room.room_total;
    const finalTotal =
      promoResult?.valid && promoResult?.discount
        ? Math.max(0, baseTotal - promoResult.discount)
        : baseTotal;
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
  }, [packageResult, promoResult, bundleSelected]);

  // Initiate payment (requires login or guest mode)
  const handlePay = useCallback(
    async (user: any) => {
      if (!packageResult) return;
      if (!user && !guestMode) {
        toast.error(
          "Please sign in, create an account, or continue as a guest.",
        );
        return;
      }
      setPaymentMode(hasSquare ? "square" : "stripe");
      setPaymentOptions(null);
      // Always create the Stripe payment intent — both Square and Stripe UI
      // modes use Stripe Elements under the hood
      await fallbackToStripe();
      setShowPayment(true);
    },
    [packageResult, hasSquare, fallbackToStripe, guestMode],
  );

  // Post-payment success
  const handlePaymentSuccess = useCallback(
    (method: "square" | "stripe") => {
      if (!packageResult) return;
      setShowPayment(false);
      toast.success("Payment successful! Your reservation is confirmed.");
      trackEvent("purchase", {
        value: packageResult.curated_package.total,
        currency: "USD",
        payment_method: method,
        ...getUtmParams(),
      });
      // Record A/B conversion
      const sid = funnelSessionIdRef.current;
      if (sid) {
        fetch("/api/analytics/funnel", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId: sid,
            variant: abVariantRef.current,
            stepReached: 6,
            converted: true,
          }),
        }).catch(() => {});
      }
      if (packageResult.confirmationNumber) {
        router.push(
          `/booking/confirmation/${packageResult.confirmationNumber}`,
        );
      }
    },
    [packageResult, router],
  );

  const toggleInterest = useCallback((interest: string) => {
    setInterests((prev) =>
      prev.includes(interest)
        ? prev.filter((i) => i !== interest)
        : [...prev, interest],
    );
  }, []);

  return {
    // State
    step,
    checkInDate,
    checkOutDate,
    nights,
    groupSize,
    roomType,
    activityLevel,
    tourBudget,
    interests,
    availability,
    availLoading,
    isLoading,
    packageResult,
    promoCode,
    promoResult,
    promoLoading,
    showPromo,
    guestDetails,
    paymentOptions,
    showPayment,
    paymentMode,
    squareSdkReady,
    selectedRoom,
    hasSquare,
    // Setters
    setCheckInDate,
    setCheckOutDate,
    setGroupSize,
    setRoomType,
    setActivityLevel,
    setTourBudget,
    setInterests,
    toggleInterest,
    setPromoCode,
    setShowPromo,
    setGuestDetails,
    setPaymentMode,
    setShowPayment,
    setPaymentOptions,
    setSquareSdkReady,
    clearPromo,
    // Bundle selection
    bundleSelected,
    setBundleSelected,
    // Guest mode
    guestMode,
    // A/B testing
    abVariant,
    funnelSessionId,
    // Actions
    nextStep,
    prevStep,
    goToStep,
    proceedToCheckout,
    proceedAsGuest,
    generatePackage,
    generateRoomOnlyPackage,
    validatePromo,
    handlePay,
    handlePaymentSuccess,
    fallbackToStripe,
    setPackageResult,
  };
}
