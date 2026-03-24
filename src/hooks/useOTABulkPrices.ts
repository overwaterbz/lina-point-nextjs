"use client";

import { useState, useEffect, useRef } from "react";
import { RoomType } from "./useBookingWizard";

export interface OTAPriceData {
  ota: string;
  price: number;
  currency: string;
  url: string;
  source: string;
}

export interface OTAPriceResponse {
  otaPrices: OTAPriceData[];
  lowestOTA: { ota: string; price: number };
  ourDirectPrice: number;
  baseRate: number;
  savingsAmount: number;
  savingsPercent: number;
  guaranteeBadge: boolean;
  beatPercentage: number;
}

export type OTAPriceMap = Partial<Record<RoomType, OTAPriceResponse>>;

const ALL_ROOM_TYPES: RoomType[] = [
  "suite_2nd_floor",
  "suite_1st_floor",
  "cabana_duplex",
  "cabana_1br",
  "cabana_2br",
];

/**
 * Prefetches OTA competitive prices for ALL room types in parallel as
 * soon as valid dates are available. By the time the user reaches
 * Step 2 the data is already loaded — no blocking wait.
 *
 * Re-fetches automatically when dates change.
 * Uses AbortController per fetch cycle to prevent stale updates.
 */
export function useOTABulkPrices(
  checkIn: string,
  checkOut: string,
  nights: number,
): { priceMap: OTAPriceMap; loading: boolean; loaded: boolean } {
  const [priceMap, setPriceMap] = useState<OTAPriceMap>({});
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!checkIn || !checkOut || nights < 1) {
      setPriceMap({});
      setLoaded(false);
      return;
    }

    // Cancel any in-flight requests from a previous date selection
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setPriceMap({});
    setLoaded(false);

    const fetches = ALL_ROOM_TYPES.map((rt) =>
      fetch(
        `/api/ota-prices?roomType=${rt}&checkIn=${checkIn}&checkOut=${checkOut}`,
        { signal: controller.signal },
      )
        .then((r) => r.json())
        .then((data: OTAPriceResponse) => ({ rt, data }))
        .catch(() => null),
    );

    Promise.allSettled(fetches).then((results) => {
      if (controller.signal.aborted) return;

      const map: OTAPriceMap = {};
      for (const result of results) {
        if (result.status === "fulfilled" && result.value) {
          const { rt, data } = result.value as {
            rt: RoomType;
            data: OTAPriceResponse;
          };
          if (data && !data.hasOwnProperty("error")) {
            map[rt] = data;
          }
        }
      }
      setPriceMap(map);
      setLoaded(true);
      setLoading(false);
    });

    return () => {
      controller.abort();
    };
  }, [checkIn, checkOut, nights]);

  return { priceMap, loading, loaded };
}
