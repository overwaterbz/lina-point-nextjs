// Supabase auth types and application types for shared use
export type { User, AuthError } from "@supabase/supabase-js";

// Re-export Profile and Reservation from the canonical source
export type { Profile, Reservation, Tables } from "../../src/types/supabase";
