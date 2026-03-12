import { createServerSupabaseClient } from '@/lib/supabase-server';
import { redirect } from 'next/navigation';

export type StaffRole = 'owner' | 'manager' | 'front_desk' | 'guest';

const ROLE_LEVEL: Record<StaffRole, number> = {
  owner: 3,
  manager: 2,
  front_desk: 1,
  guest: 0,
};

export function getRoleLevel(role: StaffRole | string | null | undefined): number {
  return ROLE_LEVEL[(role as StaffRole)] ?? 0;
}

/** Legacy compat — still works for older admin pages */
export function isAdminEmail(email?: string | null) {
  if (!email) return false;
  const allowlist = (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
  return allowlist.includes(email.toLowerCase());
}

/**
 * Require a minimum role for server components / API routes.
 * Redirects to /auth/login if unauthenticated, /dashboard if under-privileged.
 */
export async function requireRole(minRole: StaffRole = 'front_desk') {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/login');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('user_id', user.id)
    .single();

  const userRole = (profile?.role as StaffRole) || 'guest';

  // Fallback: allow ADMIN_EMAILS as owner even if role column not set yet
  if (getRoleLevel(userRole) < getRoleLevel(minRole)) {
    if (isAdminEmail(user.email)) {
      // Legacy admin — treat as owner
    } else {
      redirect('/dashboard');
    }
  }

  return { supabase, user, role: userRole };
}

/** Backwards-compatible wrapper */
export async function requireAdmin() {
  return requireRole('front_desk');
}
