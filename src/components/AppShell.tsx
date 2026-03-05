// ============================================
// MitrAI - App Shell (Conditional navigation wrapper)
// Handles TopBar, BottomTabs, and footer based on auth & route
// ============================================

'use client';

import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import TopBar from './TopBar';
import Link from 'next/link';
import { useTheme } from './ThemeProvider';
import { Sun, Moon } from 'lucide-react';
import GlobalNotificationPoller from './GlobalNotificationPoller';
import IncomingCallBanner from './IncomingCallBanner';

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();

  // Determine page type
  const isAuthPage = pathname === '/login' || pathname.startsWith('/reset-password');
  const isAdminPage = pathname.startsWith('/admin');

  // Show full app shell (TopBar + BottomTabs) for logged-in users on app pages
  const showAppShell = !!user && !isAuthPage && !isAdminPage;

  // ---- Logged-in app pages ----
  if (showAppShell) {
    return (
      <>
        <TopBar />
        <GlobalNotificationPoller />
        <IncomingCallBanner />
        <main className="pt-16 pb-20 md:pb-4 min-h-screen">
          {children}
        </main>
      </>
    );
  }

  // ---- Admin pages ----
  if (isAdminPage) {
    return (
      <main className="min-h-screen">
        {children}
      </main>
    );
  }

  // ---- Auth pages (login, reset-password) ----
  if (isAuthPage) {
    return (
      <main className="min-h-screen">
        {children}
      </main>
    );
  }

  // ---- Landing page & static pages ----
  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50" style={{
        background: 'var(--glass-bg)',
        backdropFilter: 'blur(20px) saturate(1.5)',
        WebkitBackdropFilter: 'blur(20px) saturate(1.5)',
        borderBottom: '1px solid var(--glass-border)',
      }}>
        <div className="flex items-center justify-between h-14 px-4 max-w-7xl mx-auto">
          <Link href="/" className="flex items-center gap-2.5 group">
            <img src="/logo.jpg" alt="MitrAI" className="w-8 h-8 rounded-xl shadow-lg group-hover:scale-105 transition-transform object-cover" />
            <div className="flex flex-col">
              <span className="text-sm font-bold text-[var(--foreground)] leading-none">MitrAI</span>
              <span className="text-[9px] text-[var(--muted)] leading-none mt-0.5 hidden sm:block">SVNIT Surat</span>
            </div>
          </Link>
          <div className="flex items-center gap-2">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-xl hover:bg-[var(--surface-light)] text-[var(--muted)] hover:text-[var(--foreground)] transition-all duration-200"
              title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
            >
              {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            <Link href="/login" className="btn-primary text-xs py-2 px-5 font-semibold">
              Get Started
            </Link>
          </div>
        </div>
      </header>
      <main className="pt-14 min-h-screen">
        {children}
      </main>
      <footer className="border-t border-[var(--glass-border)] py-5 px-4 text-center text-[10px] text-[var(--muted)] space-x-4">
        <Link href="/terms" className="hover:text-[var(--foreground)] transition-colors">Terms of Service</Link>
        <span className="opacity-30">·</span>
        <Link href="/privacy" className="hover:text-[var(--foreground)] transition-colors">Privacy Policy</Link>
        <span className="opacity-30">·</span>
        <span>© {new Date().getFullYear()} MitrAI — SVNIT</span>
      </footer>
    </>
  );
}
