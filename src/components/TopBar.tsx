// ============================================
// MitrAI - Unified Header (Logo + Tabs + Actions in one row)
// Saves vertical space by combining TopBar + TabBar
// ============================================

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { useTheme } from '@/components/ThemeProvider';
import { Home, Radio, MessageCircle, Flame, Sun, Moon } from 'lucide-react';
import { getActiveTab } from './BottomTabs';

const tabs = [
  { id: 'home', label: 'Home', icon: Home, href: '/home' },
  { id: 'radar', label: 'Radar', icon: Radio, href: '/radar' },
  { id: 'chat', label: 'Chat', icon: MessageCircle, href: '/anon' },
  { id: 'feed', label: 'Feed', icon: Flame, href: '/doubts' },
];

export default function TopBar() {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const pathname = usePathname();
  const activeTab = getActiveTab(pathname);
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);

  useEffect(() => {
    const load = () => setProfilePhoto(localStorage.getItem('mitrai_profile_photo'));
    load();
    window.addEventListener('profilePhotoChanged', load);
    return () => window.removeEventListener('profilePhotoChanged', load);
  }, []);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-[var(--background)]/90 backdrop-blur-md border-b border-[var(--border)]">
      <div className="flex items-center h-14 px-3 max-w-7xl mx-auto">
        {/* Logo — compact */}
        <Link href="/home" className="flex items-center gap-1.5 shrink-0 mr-3">
          <img src="/logo.jpg" alt="MitrAI" className="h-8 w-auto" />
          <span className="text-sm font-bold text-[var(--foreground)] hidden sm:inline">MitrAI</span>
        </Link>

        {/* Center tabs */}
        <nav className="flex items-center justify-center gap-1 flex-1">
          {tabs.map(tab => {
            const isActive = tab.id === activeTab;
            const Icon = tab.icon;
            return (
              <Link
                key={tab.id}
                href={tab.href}
                className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-[var(--primary)]/15 text-[var(--primary-light)]'
                    : 'text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface-light)]'
                }`}
              >
                <Icon size={16} strokeWidth={isActive ? 2.5 : 2} />
                <span className="hidden sm:inline">{tab.label}</span>
                {isActive && (
                  <span className="absolute -bottom-[9px] left-1/2 -translate-x-1/2 w-6 h-0.5 rounded-full bg-[var(--primary-light)]" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Right actions */}
        <div className="flex items-center gap-1.5 shrink-0 ml-3">
          <button
            onClick={toggleTheme}
            className="p-1.5 rounded-lg hover:bg-[var(--surface-light)] text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
            title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
          >
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          </button>
          {user && (
            <Link href="/me" className="flex items-center gap-1.5">
              {profilePhoto ? (
                <img src={profilePhoto} alt="" className="w-7 h-7 rounded-full object-cover" />
              ) : (
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[var(--primary)] to-[var(--accent)] flex items-center justify-center text-white text-xs font-bold">
                  {user.name?.[0]?.toUpperCase() || '?'}
                </div>
              )}
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
