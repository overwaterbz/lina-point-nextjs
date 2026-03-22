import type { Database } from "./supabase-db";

// Helper to derive typed row from any Database table
export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];

// Profile — derived from the 'profiles' table definition in supabase-db
// Extended with role for RBAC (role may exist in DB but not in generated types)
export type Profile = Tables<"profiles"> & {
  role?: string | null;
};

// Reservation — booking record (reservations table not yet in generated DB types)
export interface Reservation {
  id: string;
  user_id: string;
  room_type: string;
  start_date: string;
  end_date: string;
  guests?: number | null;
  total_price?: number | null;
  status?: string | null;
  notes?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}
