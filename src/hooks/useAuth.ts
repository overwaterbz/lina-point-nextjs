"use client";

import { useCallback, useEffect, useState } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase";
import type { User, AuthError } from "@supabase/supabase-js";
import type { Profile } from "@/shared/types/supabase";

const supabase = createBrowserSupabaseClient();

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<AuthError | null>(null);
  const [token, setToken] = useState<string | null>(null);

  // Fetch user profile
  const fetchProfile = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", userId)
        .single();

      if (error) throw error;
      setProfile(data);
    } catch (err) {
      console.error("Error fetching profile:", err);
      // Profile might not exist yet, which is ok
    }
  }, []);

  // Initialize auth state
  useEffect(() => {
    const initAuth = async () => {
      try {
        const {
          data: { user: currentUser },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError) {
          throw authError;
        }

        if (currentUser) {
          setUser(currentUser as unknown as User);
          // Get session for access token
          const {
            data: { session },
          } = await supabase.auth.getSession();
          setToken(session?.access_token || null);
          await fetchProfile(currentUser.id);
        }
      } catch (err) {
        console.error("Auth initialization error:", err);
        setError(err as AuthError);
      } finally {
        setLoading(false);
      }
    };

    initAuth();

    // Subscribe to auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        setUser(session.user as unknown as User);
        setToken(session.access_token || null);
        await fetchProfile(session.user.id);
      } else {
        setUser(null);
        setProfile(null);
        setToken(null);
      }
    });

    return () => subscription?.unsubscribe();
  }, [fetchProfile]);

  const signIn = useCallback(
    async (email: string, password: string, prefs?: Partial<Profile>) => {
      setError(null);
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;

        if (data.user) {
          setUser(data.user as unknown as User);
          // If prefs provided on login, update profile
          if (prefs) {
            await supabase
              .from("profiles")
              .upsert(
                { user_id: data.user.id, ...prefs },
                { onConflict: "user_id" },
              );
          }
          await fetchProfile(data.user.id);
        }

        return { user: data.user as unknown as User, error: null };
      } catch (err) {
        const authError = err as AuthError;
        setError(authError);
        return { user: null, error: authError };
      }
    },
    [fetchProfile],
  );

  const signUp = useCallback(
    async (
      email: string,
      password: string,
      fullName?: string,
      prefs?: Partial<Profile>,
    ) => {
      setError(null);
      try {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName,
            },
          },
        });

        if (error) throw error;

        // Create profile for the new user (include prefs)
        if (data.user) {
          const profileRow: Partial<Profile> = {
            user_id: data.user.id,
            full_name: fullName,
            ...(prefs || {}),
          };

          await supabase.from("profiles").insert(profileRow);

          setUser(data.user as unknown as User);
          await fetchProfile(data.user.id);
        }

        return { user: data.user as unknown as User, error: null };
      } catch (err) {
        const authError = err as AuthError;
        setError(authError);
        return { user: null, error: authError };
      }
    },
    [fetchProfile],
  );

  const signOut = useCallback(async () => {
    setError(null);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      setUser(null);
      setProfile(null);
      return { error: null };
    } catch (err) {
      const authError = err as AuthError;
      setError(authError);
      return { error: authError };
    }
  }, []);

  const updateProfile = useCallback(
    async (prefs: Partial<Profile>) => {
      setError(null);
      try {
        if (!user) {
          throw new Error("Not authenticated");
        }

        const { data, error } = await supabase
          .from("profiles")
          .upsert({ user_id: user.id, ...prefs }, { onConflict: "user_id" })
          .select()
          .single();

        if (error) throw error;
        setProfile(data as Profile);
        return { profile: data as Profile, error: null };
      } catch (err) {
        const authError = err as AuthError;
        setError(authError);
        return { profile: null, error: authError };
      }
    },
    [user],
  );

  return {
    user,
    profile,
    loading,
    error,
    token,
    signIn,
    signUp,
    signOut,
    updateProfile,
  };
}

// Hook for getting session only (server-side safe)
export function useSession() {
  const [session, setSession] = useState<{ user: User } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const getSession = async () => {
      const {
        data: { session: currentSession },
      } = await supabase.auth.getSession();
      setSession(currentSession as unknown as { user: User });
      setLoading(false);
    };

    getSession();
  }, []);

  return { session, loading };
}
