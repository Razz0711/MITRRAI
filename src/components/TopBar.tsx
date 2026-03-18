// ============================================
// MitrrAi v2 - Clean Top Bar + Mobile Bottom Tabs
// Tabs: Feed, Arya, Anon, Chat, Community
// ============================================

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutGrid, Sparkles, Ghost, MessageCircle, CircleDot,
} from 'lucide-react';
import { getActiveTab } from './BottomTabs';

const tabs = [
  { id: 'home', label: 'Home', icon: LayoutGrid, href: '/home' },
  { id: 'arya', label: 'Arya', icon: Sparkles, href: '/arya' },
  { id: 'anon', label: 'Anon', icon: Ghost, href: '/anon' },
  { id: 'chat', label: 'Chat', icon: MessageCircle, href: '/chat' },
  { id: 'circles', label: 'Community', icon: CircleDot, href: '/circles' },
];

export default function TopBar() {
  const pathname = usePathname();
  const activeTab = getActiveTab(pathname);

  // Hide mobile bottom tabs on pages with their own fixed-bottom input bar
  const hideBottomTabs =
    /^\/anon\/[^/]+/.test(pathname) ||   // anon chat room
    /^\/chat\/[^/]+/.test(pathname) ||    // direct chat thread
    /^\/call(\/|$)/.test(pathname);       // call page

  // Hide top bar on mobile (only show desktop nav)
  const hideTopBarOnMobile = true;

  return (
    <>
      {/* ─── Desktop Top Header Bar ─── */}
      <header className={`fixed top-0 left-0 right-0 z-50 ${hideTopBarOnMobile ? 'hidden md:block' : ''}`} style={{
        background: 'var(--glass-bg)',
        backdropFilter: 'blur(20px) saturate(1.5)',
        WebkitBackdropFilter: 'blur(20px) saturate(1.5)',
        borderBottom: '1px solid var(--glass-border)',
      }}>
        <div className="flex items-center h-14 px-4 max-w-7xl mx-auto">
          {/* Desktop Center tabs */}
          <nav className="flex items-center justify-center gap-1 flex-1">
            {tabs.map(tab => {
              const isActive = tab.id === activeTab || (tab.id === 'circles' && activeTab === 'circles');
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
        </div>
      </header>

      {/* ─── Mobile Bottom Tab Bar ─── */}
      {!hideBottomTabs && (
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 pb-[env(safe-area-inset-bottom)]" style={{
        background: 'var(--glass-bg)',
        backdropFilter: 'blur(24px) saturate(1.6)',
        WebkitBackdropFilter: 'blur(24px) saturate(1.6)',
        borderTop: '1px solid var(--glass-border)',
      }}>
        <div className="flex items-center justify-around h-16 px-2 max-w-lg mx-auto">
          {tabs.map(tab => {
            const isActive = tab.id === activeTab || (tab.id === 'circles' && activeTab === 'circles');
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
      )}
    </>
  );
}
