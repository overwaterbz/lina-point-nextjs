// Auth types
export interface UserMetadata {
  email?: string;
  full_name?: string;
}

export interface User {
  id: string;
  email?: string;
  user_metadata?: UserMetadata;
  app_metadata?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

// Profile type
export interface Profile {
  id: string;
  user_id: string;
  full_name?: string;
  avatar_url?: string;
  bio?: string;
  phone_number?: string | null;
  role?: 'owner' | 'manager' | 'front_desk' | 'guest';
  // Preferences
  birthday?: string | null; // ISO date string e.g. 1990-05-14
  anniversary?: string | null; // ISO date string
  special_events?: Array<{ name: string; date: string }>; // custom events
  music_style?: 'EDM' | 'Pop' | 'Ambient' | 'Maya Fusion' | string;
  maya_interests?: string[]; // e.g. ['Ruins','Cuisine']
  opt_in_magic?: boolean;
  magic_profile?: string | null;
  updated_at: string;
  created_at: string;
}

// Reservation type
export interface Reservation {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  start_date: string;
  end_date: string;
  status: 'pending' | 'confirmed' | 'cancelled';
  created_at: string;
  updated_at: string;
}

// Auth context type
export interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (
    email: string,
    password: string,
    prefs?: Partial<Profile>
  ) => Promise<{ user: User | null; error: Error | null }>;
  signUp: (
    email: string,
    password: string,
    fullName?: string,
    prefs?: Partial<Profile>
  ) => Promise<{ user: User | null; error: Error | null }>;
  updateProfile: (prefs: Partial<Profile>) => Promise<{ profile: Profile | null; error: Error | null }>;
  signOut: () => Promise<{ error: Error | null }>;
}

// Response types for auth operations
export interface AuthResponse {
  user: User | null;
  error: Error | null;
}

export interface AuthError extends Error {
  status?: number;
  code?: string;
}
