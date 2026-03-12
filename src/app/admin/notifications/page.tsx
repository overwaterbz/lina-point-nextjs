'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { createBrowserSupabaseClient } from '@/lib/supabase';
import toast from 'react-hot-toast';

interface Notification {
  id: string;
  user_id: string | null;
  type: string;
  title: string;
  body: string;
  read: boolean;
  link: string | null;
  created_at: string;
}

const TYPE_ICONS: Record<string, string> = {
  booking: '🗓️',
  payment: '💰',
  housekeeping: '🧹',
  system: '⚙️',
  alert: '🚨',
  marketing: '📱',
  guest: '👤',
};

export default function NotificationsPage() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  const fetchNotifications = async () => {
    if (!user) return;
    const supabase = createBrowserSupabaseClient();
    try {
      const { data } = await supabase
        .from('notifications')
        .select('*')
        .or(`user_id.eq.${user.id},user_id.is.null`)
        .order('created_at', { ascending: false })
        .limit(50);
      setNotifications(data || []);
    } catch (err) { console.error(err) } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchNotifications(); }, [user]);

  const markRead = async (id: string) => {
    const supabase = createBrowserSupabaseClient();
    await supabase.from('notifications').update({ read: true }).eq('id', id);
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  };

  const markAllRead = async () => {
    if (!user) return;
    const supabase = createBrowserSupabaseClient();
    const unreadIds = notifications.filter((n) => !n.read).map((n) => n.id);
    if (unreadIds.length === 0) return;
    await supabase.from('notifications').update({ read: true }).in('id', unreadIds);
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    toast.success('All marked as read');
  };

  const filtered = filter === 'unread' ? notifications.filter((n) => !n.read) : notifications;
  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
          <p className="text-sm text-gray-600 mt-1">
            {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up!'}
          </p>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={markAllRead}
            className="text-sm text-indigo-600 hover:text-indigo-800 font-medium"
          >
            Mark all as read
          </button>
        )}
      </header>

      <div className="flex gap-2">
        {(['all', 'unread'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
              filter === f ? 'bg-indigo-100 text-indigo-700' : 'text-gray-500 hover:bg-gray-100'
            }`}
          >
            {f === 'all' ? 'All' : `Unread (${unreadCount})`}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin h-8 w-8 border-4 border-indigo-500 border-t-transparent rounded-full" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <p className="text-3xl mb-3">🔔</p>
          <p className="text-gray-500">{filter === 'unread' ? 'No unread notifications' : 'No notifications yet'}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((n) => (
            <div
              key={n.id}
              onClick={() => !n.read && markRead(n.id)}
              className={`bg-white rounded-lg shadow p-4 flex items-start gap-3 cursor-pointer transition ${
                !n.read ? 'border-l-4 border-indigo-500 hover:bg-indigo-50' : 'hover:bg-slate-50 opacity-75'
              }`}
            >
              <span className="text-xl">{TYPE_ICONS[n.type] || '📬'}</span>
              <div className="flex-1 min-w-0">
                <p className={`text-sm ${!n.read ? 'font-semibold text-gray-900' : 'text-gray-700'}`}>{n.title}</p>
                <p className="text-xs text-gray-500 mt-0.5">{n.body}</p>
                <p className="text-[10px] text-gray-400 mt-1">{new Date(n.created_at).toLocaleString()}</p>
              </div>
              {!n.read && (
                <span className="w-2 h-2 rounded-full bg-indigo-500 mt-2 flex-shrink-0" />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
