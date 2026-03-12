'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useState, useEffect } from 'react';
import { createBrowserSupabaseClient } from '@/lib/supabase';

const NAV_SECTIONS = [
  {
    title: 'Operations',
    items: [
      { href: '/admin/dashboard', label: 'Overview', icon: '📊' },
      { href: '/admin/calendar', label: 'Calendar', icon: '🗓️' },
      { href: '/admin/rooms', label: 'Rooms', icon: '🏨' },
      { href: '/admin/guests', label: 'Guests', icon: '👥' },
      { href: '/admin/tours', label: 'Tours', icon: '🌊' },
      { href: '/admin/housekeeping', label: 'Housekeeping', icon: '🧹' },
    ],
  },
  {
    title: 'Revenue',
    items: [
      { href: '/admin/revenue', label: 'Revenue', icon: '💰' },
      { href: '/admin/pricing', label: 'Pricing', icon: '🏷️', minRole: 'manager' as const },
    ],
  },
  {
    title: 'Marketing',
    items: [
      { href: '/admin/marketing-dashboard', label: 'Campaigns', icon: '📱' },
      { href: '/admin/whatsapp', label: 'WhatsApp', icon: '💬' },
    ],
  },
  {
    title: 'System',
    items: [
      { href: '/admin/ai-monitor', label: 'AI Monitor', icon: '🤖' },
      { href: '/admin/notifications', label: 'Notifications', icon: '🔔' },
    ],
  },
];

const ROLE_LEVEL: Record<string, number> = { owner: 3, manager: 2, front_desk: 1, guest: 0 };

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, profile, loading, signOut } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const userRoleLevel = ROLE_LEVEL[profile?.role || 'guest'] ?? 0;

  // Fetch unread notification count
  useEffect(() => {
    if (!user) return;
    const supabase = createBrowserSupabaseClient();
    (async () => {
      try {
        const { count } = await supabase
          .from('notifications')
          .select('id', { count: 'exact', head: true })
          .or(`user_id.eq.${user.id},user_id.is.null`)
          .eq('read', false);
        setUnreadCount(count || 0);
      } catch {}
    })();
  }, [user]);

  const handleSignOut = async () => {
    await signOut();
    router.push('/auth/login');
  };

  // Redirect unauthenticated users
  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/login');
    }
  }, [loading, user, router]);

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin h-8 w-8 border-4 border-indigo-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  // Breadcrumb from pathname
  const segments = pathname.split('/').filter(Boolean);
  const breadcrumbs = segments.map((seg, i) => ({
    label: seg.charAt(0).toUpperCase() + seg.slice(1).replace(/-/g, ' '),
    href: '/' + segments.slice(0, i + 1).join('/'),
    isLast: i === segments.length - 1,
  }));

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-30 bg-black/40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-40 w-64 bg-slate-900 flex flex-col transition-transform lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="p-5 border-b border-slate-700">
          <Link href="/admin/dashboard" className="text-xl font-bold text-white font-[family-name:var(--font-playfair)]">
            Lina Point
          </Link>
          <p className="text-xs text-slate-400 mt-1">Admin Console</p>
        </div>

        <nav className="flex-1 overflow-y-auto py-3">
          {NAV_SECTIONS.map((section) => (
            <div key={section.title} className="mb-4">
              <p className="px-5 text-[10px] uppercase tracking-widest text-slate-500 font-semibold mb-1">
                {section.title}
              </p>
              {section.items
                .filter((item) => {
                  if (!profile?.role) return true; // Show all while profile loads
                  const minLevel = ROLE_LEVEL[(item as { minRole?: string }).minRole || 'front_desk'] ?? 1;
                  return userRoleLevel >= minLevel;
                })
                .map((item) => {
                  const isActive = pathname === item.href || (item.href !== '/admin/dashboard' && pathname.startsWith(item.href));
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setSidebarOpen(false)}
                      className={`flex items-center gap-3 mx-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        isActive
                          ? 'bg-slate-700 text-white'
                          : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                      }`}
                    >
                      <span className="text-base">{item.icon}</span>
                      {item.label}
                      {item.href === '/admin/notifications' && unreadCount > 0 && (
                        <span className="ml-auto bg-red-500 text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center">
                          {unreadCount > 9 ? '9+' : unreadCount}
                        </span>
                      )}
                    </Link>
                  );
                })}
            </div>
          ))}
        </nav>

        <div className="p-3 border-t border-slate-700 space-y-1">
          <Link
            href="/dashboard"
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-teal-400 hover:bg-slate-800 transition-colors"
          >
            <span className="text-base">🏠</span>
            Guest Portal
          </Link>
          <button
            onClick={handleSignOut}
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-red-400 hover:bg-slate-800 transition-colors w-full text-left"
          >
            <span className="text-base">🚪</span>
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="bg-white border-b border-slate-200 px-4 lg:px-6 py-3 flex items-center gap-4 sticky top-0 z-20">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-2 -ml-2 text-slate-600 hover:text-slate-900"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          {/* Breadcrumbs */}
          <nav className="flex items-center text-sm text-slate-500 gap-1">
            {breadcrumbs.map((bc) => (
              <span key={bc.href} className="flex items-center gap-1">
                {bc.isLast ? (
                  <span className="text-slate-900 font-medium">{bc.label}</span>
                ) : (
                  <>
                    <Link href={bc.href} className="hover:text-slate-700">{bc.label}</Link>
                    <span className="text-slate-300">/</span>
                  </>
                )}
              </span>
            ))}
          </nav>

          <div className="flex-1" />

          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-500 hidden sm:block capitalize">
              {profile?.role || 'guest'}
            </span>
            <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-semibold text-sm">
              {(profile?.full_name || user?.email || '?')[0].toUpperCase()}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
