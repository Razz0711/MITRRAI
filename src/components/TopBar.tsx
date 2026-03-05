// ============================================
// MitrAI v2 - Premium Top Bar + Mobile Bottom Tabs
// Glass header with smooth tab transitions
// ============================================

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { useTheme } from '@/components/ThemeProvider';
import {
  Home, MessageCircle, Flame, Sun, Moon,
  User, Compass
} from 'lucide-react';
import { getActiveTab } from './BottomTabs';

const tabs = [
  { id: 'home', label: 'Home', icon: Home, href: '/home' },
  { id: 'radar', label: 'Discover', icon: Compass, href: '/radar' },
  { id: 'chat', label: 'Chat', icon: MessageCircle, href: '/anon' },
  { id: 'feed', label: 'Feed', icon: Flame, href: '/doubts' },
  { id: 'me', label: 'Profile', icon: User, href: '/me' },
];

export default function TopBar() {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const pathname = usePathname();
  const activeTab = getActiveTab(pathname);

  return (
    <>
      {/* ─── Top Header Bar (glass) ─── */}
      <header className="fixed top-0 left-0 right-0 z-50" style={{
        background: 'var(--glass-bg)',
        backdropFilter: 'blur(20px) saturate(1.5)',
        WebkitBackdropFilter: 'blur(20px) saturate(1.5)',
        borderBottom: '1px solid var(--glass-border)',
      }}>
        <div className="flex items-center h-14 px-4 max-w-7xl mx-auto">
          {/* Logo */}
          <Link href="/home" className="flex items-center gap-2 shrink-0 mr-4 group">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[var(--primary)] to-[var(--accent)] flex items-center justify-center text-white font-extrabold text-sm shadow-lg group-hover:scale-105 transition-transform">
              M
            </div>
            <div className="hidden sm:flex flex-col">
              <span className="text-sm font-bold text-[var(--foreground)] leading-none">MitrAI</span>
              <span className="text-[9px] text-[var(--muted)] leading-none mt-0.5">SVNIT</span>
            </div>
          </Link>

          {/* Desktop Center tabs */}
          <nav className="hidden md:flex items-center justify-center gap-1 flex-1">
            {tabs.map(tab => {
              const isActive = tab.id === activeTab;
              const Icon = tab.icon;
              return (
                <Link
                  key={tab.id}
                  href={tab.href}
                  className={`relative flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all duration-300 ${
                    isActive
                      ? 'bg-[var(--primary)]/15 text-[var(--primary-light)] shadow-sm'
                      : 'text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface-light)]'
                  }`}
                >
                  <Icon size={16} strokeWidth={isActive ? 2.5 : 2} />
                  <span>{tab.label}</span>
                  {isActive && (
                    <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full bg-gradient-to-r from-[var(--primary)] to-[var(--accent)]" />
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Spacer for mobile */}
          <div className="flex-1 md:hidden" />

          {/* Right actions */}
          <div className="flex items-center gap-1 shrink-0 ml-3">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-xl hover:bg-[var(--surface-light)] text-[var(--muted)] hover:text-[var(--foreground)] transition-all duration-200"
              title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
            >
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            {user && (
              <Link href="/me" className="hidden md:flex ml-1">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[var(--primary)] via-[var(--accent)] to-[var(--secondary)] p-[1.5px]">
                  <div className="w-full h-full rounded-xl bg-[var(--background)] flex items-center justify-center text-xs font-bold text-[var(--foreground)]">
                    {user.name?.[0]?.toUpperCase() || '?'}
                  </div>
                </div>
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* ─── Mobile Bottom Tab Bar ─── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 pb-[env(safe-area-inset-bottom)]" style={{
        background: 'var(--glass-bg)',
        backdropFilter: 'blur(24px) saturate(1.6)',
        WebkitBackdropFilter: 'blur(24px) saturate(1.6)',
        borderTop: '1px solid var(--glass-border)',
      }}>
        <div className="flex items-center justify-around h-16 px-2 max-w-lg mx-auto">
          {tabs.map(tab => {
            const isActive = tab.id === activeTab;
            const Icon = tab.icon;
            return (
              <Link
                key={tab.id}
                href={tab.href}
                className={`flex flex-col items-center gap-0.5 py-1.5 px-3 rounded-2xl transition-all duration-300 ${
                  isActive
                    ? 'text-[var(--primary-light)]'
                    : 'text-[var(--muted)] hover:text-[var(--foreground)]'
                }`}
              >
                <div className={`relative p-1.5 rounded-xl transition-all duration-300 ${
                  isActive ? 'bg-[var(--primary)]/15 scale-110' : ''
                }`}>
                  <Icon size={20} strokeWidth={isActive ? 2.5 : 1.8} />
                  {isActive && (
                    <span className="absolute -top-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[var(--primary-light)]" />
                  )}
                </div>
                <span className={`text-[9px] font-semibold transition-all duration-300 ${isActive ? 'opacity-100' : 'opacity-60'}`}>
                  {tab.label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
