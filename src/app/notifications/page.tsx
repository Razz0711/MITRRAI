// ============================================
// MitrAI - Notifications Page
// Shows all notifications: matches, invites, nearby posts
// ============================================

'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Bell, BellOff, Trash2, Users, MessageCircle, MapPin, AlertTriangle, Heart } from 'lucide-react';
import LoadingSkeleton from '@/components/LoadingSkeleton';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
}

export default function NotificationsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    if (!user) return;
    // Fetch from API if available, otherwise show empty state
    const fetchNotifications = async () => {
      try {
        const res = await fetch('/api/notifications');
        const d = await res.json();
        if (d.success && d.data) {
          setNotifications(d.data);
        }
      } catch {
        // API may not exist yet — show empty state
      }
      setLoading(false);
    };
    fetchNotifications();
  }, [user]);

  const getIcon = (type: string) => {
    switch (type) {
      case 'match': return <Users size={16} className="text-green-400" />;
      case 'message': return <MessageCircle size={16} className="text-blue-400" />;
      case 'nearby': return <MapPin size={16} className="text-amber-400" />;
      case 'sos': return <AlertTriangle size={16} className="text-red-400" />;
      default: return <Bell size={16} className="text-[var(--primary)]" />;
    }
  };

  function timeAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  }

  if (!user) return null;

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="sticky top-0 z-40 px-4 py-3" style={{
        background: 'var(--glass-bg)',
        backdropFilter: 'blur(20px) saturate(1.5)',
        WebkitBackdropFilter: 'blur(20px) saturate(1.5)',
        borderBottom: '1px solid var(--glass-border)',
      }}>
        <div className="flex items-center gap-3 max-w-2xl mx-auto">
          <button onClick={() => router.back()} className="p-2 rounded-xl hover:bg-[var(--surface-light)] text-[var(--muted)] transition-colors">
            <ArrowLeft size={18} />
          </button>
          <h1 className="text-base font-bold text-[var(--foreground)] flex-1">Notifications</h1>
          {notifications.length > 0 && (
            <button
              onClick={() => setNotifications([])}
              className="text-xs text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
            >
              Clear all
            </button>
          )}
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-4 space-y-2">
        {loading && <LoadingSkeleton />}

        {!loading && notifications.length === 0 && (
          <div className="card p-8 text-center space-y-3">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-[var(--surface)] flex items-center justify-center">
              <BellOff size={28} className="text-[var(--muted)]" />
            </div>
            <h3 className="text-lg font-bold text-[var(--foreground)]">All caught up!</h3>
            <p className="text-sm text-[var(--muted)]">No new notifications. Post something on the feed to get started!</p>
          </div>
        )}

        {notifications.map(n => (
          <div
            key={n.id}
            className={`card p-3.5 flex items-start gap-3 transition-all ${n.read ? 'opacity-60' : ''}`}
          >
            <div className="shrink-0 w-9 h-9 rounded-xl bg-[var(--surface)] flex items-center justify-center">
              {getIcon(n.type)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-[var(--foreground)]">{n.title}</p>
              <p className="text-xs text-[var(--muted)] mt-0.5">{n.message}</p>
              <p className="text-[9px] text-[var(--muted)] mt-1">{timeAgo(n.createdAt)}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
