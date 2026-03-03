// ============================================
// MitrAI - Navigation Bar (Compact — supports 13+ links)
// ============================================

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { useTheme } from '@/components/ThemeProvider';
import {
  Home, Handshake, Users, MessageCircle,
  DoorOpen, Flame, CircleDot, MessageCircleMore,
  FileText, CalendarDays, ClipboardList, BookOpen,
  BarChart3, Sun, Moon, Sparkles, MessageSquare, LogOut, LogIn, MoreHorizontal
} from 'lucide-react';

export default function Navbar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);
  const [moreOpen, setMoreOpen] = useState(false);

  // Close "More" dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) setMoreOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Primary links (always visible on desktop)
  const primaryLinks = user
    ? [
        { href: '/home', label: 'Home', icon: Home },
        { href: '/matches', label: 'Matches', icon: Handshake },
        { href: '/friends', label: 'Friends', icon: Users },
        { href: '/chat', label: 'Chat', icon: MessageCircle },
        { href: '/rooms', label: 'Rooms', icon: DoorOpen },
        { href: '/doubts', label: 'Doubts', icon: Flame },
        { href: '/circles', label: 'Circles', icon: CircleDot },
        { href: '/anon', label: 'Anon', icon: MessageCircleMore },
      ]
    : [];

  // Secondary links (hidden in "More" dropdown on desktop)
  const moreLinks = user
    ? [
        { href: '/materials', label: 'Materials', icon: FileText },
        { href: '/calendar', label: 'Calendar', icon: CalendarDays },
        { href: '/attendance', label: 'Attendance', icon: ClipboardList },
        { href: '/session', label: 'Session', icon: BookOpen },
        { href: '/analytics', label: 'Analytics', icon: BarChart3 },
      ]
    : [];

  const allLinks = [...primaryLinks, ...moreLinks];
  const isMoreActive = moreLinks.some(l => pathname === l.href);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-[var(--background)]/80 backdrop-blur-md border-b border-[var(--border)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-14">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <div className="w-7 h-7 rounded-md bg-[var(--primary)] flex items-center justify-center text-white font-bold text-xs">
              M
            </div>
            <span className="text-sm font-semibold text-[var(--foreground)]">MitrAI</span>
            <span className="text-[10px] text-[var(--muted)] hidden sm:inline">SVNIT</span>
          </Link>

          {/* Desktop Nav — Primary links (icon-only on md, icon+label on xl) + More dropdown */}
          <div className="hidden md:flex items-center gap-0.5">
            {primaryLinks.map(link => {
              const Icon = link.icon;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`px-2 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5 ${
                    pathname === link.href
                      ? 'bg-[var(--surface-light)] text-[var(--foreground)]'
                      : 'text-[var(--muted)] hover:text-[var(--foreground)]'
                  }`}
                  title={link.label}
                >
                  <Icon size={14} strokeWidth={pathname === link.href ? 2.2 : 1.8} />
                  <span className="hidden xl:inline">{link.label}</span>
                </Link>
              );
            })}

            {/* "More" dropdown for secondary links */}
            {moreLinks.length > 0 && (
              <div ref={moreRef} className="relative">
                <button
                  onClick={() => setMoreOpen(!moreOpen)}
                  className={`px-2 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1 ${
                    isMoreActive
                      ? 'bg-[var(--surface-light)] text-[var(--foreground)]'
                      : 'text-[var(--muted)] hover:text-[var(--foreground)]'
                  }`}
                  title="More"
                >
                  <MoreHorizontal size={14} strokeWidth={1.8} />
                  <span className="hidden xl:inline">More</span>
                </button>
                {moreOpen && (
                  <div className="absolute top-full right-0 mt-1 w-44 bg-[var(--surface)] border border-[var(--border)] rounded-lg shadow-lg py-1 z-50 fade-in">
                    {moreLinks.map(link => {
                      const Icon = link.icon;
                      return (
                        <Link
                          key={link.href}
                          href={link.href}
                          onClick={() => setMoreOpen(false)}
                          className={`flex items-center gap-2 px-3 py-2 text-xs font-medium transition-colors ${
                            pathname === link.href
                              ? 'bg-[var(--surface-light)] text-[var(--foreground)]'
                              : 'text-[var(--muted)] hover:text-[var(--foreground)]'
                          }`}
                        >
                          <Icon size={14} strokeWidth={1.8} />
                          <span>{link.label}</span>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right Side */}
          <div className="hidden md:flex items-center gap-1.5 shrink-0">
            {/* Theme toggle */}
            <button
              onClick={toggleTheme}
              className="p-1.5 rounded-md hover:bg-[var(--surface-light)] text-[var(--muted)] hover:text-[var(--foreground)] transition-colors text-sm"
              title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            >
            {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
          </button>
            {user ? (
              <>
                <Link href="/subscription" className="text-xs font-medium text-amber-400 hover:text-amber-300 transition-colors px-1.5" title="Pro">
                  <Sparkles size={15} />
                </Link>
                <Link href="/feedback" className="text-xs text-[var(--muted)] hover:text-[var(--foreground)] transition-colors px-1.5" title="Feedback">
                  <MessageSquare size={15} />
                </Link>
                <div className="h-4 w-px bg-[var(--border)]" />
                <span className="text-xs text-[var(--muted)] max-w-[80px] truncate">{user.name}</span>
                <button
                  onClick={logout}
                  className="text-xs text-[var(--muted)] hover:text-[var(--error)] transition-colors px-1.5"
                  title="Sign out"
                >
                  <LogOut size={15} />
                </button>
              </>
            ) : (
              <>
                <Link href="/login" className="btn-ghost text-xs py-1.5 px-3">
                  Sign in
                </Link>
                <Link href="/login" className="btn-primary text-xs py-1.5 px-3">
                  Get Started
                </Link>
              </>
            )}
          </div>

          {/* Mobile Menu */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden p-1.5 rounded-md hover:bg-[var(--surface-light)] text-[var(--muted)] text-sm"
          >
            {mobileOpen ? '\u2715' : '\u2630'}
          </button>
        </div>

        {/* Mobile Dropdown */}
        {mobileOpen && (
          <div className="md:hidden pb-3 border-t border-[var(--border)] mt-1 pt-2 fade-in">
            {allLinks.map(link => {
              const Icon = link.icon;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-md text-xs font-medium ${
                    pathname === link.href
                      ? 'bg-[var(--surface-light)] text-[var(--foreground)]'
                      : 'text-[var(--muted)] hover:text-[var(--foreground)]'
                  }`}
                >
                  <Icon size={14} strokeWidth={1.8} />
                  <span>{link.label}</span>
                </Link>
              );
            })}
            {user ? (
              <>
                <Link href="/subscription" onClick={() => setMobileOpen(false)} className="flex items-center gap-2 px-3 py-2 text-xs text-amber-400 font-medium">
                  <Sparkles size={14} /> Pro
                </Link>
                <Link href="/feedback" onClick={() => setMobileOpen(false)} className="flex items-center gap-2 px-3 py-2 text-xs text-[var(--muted)]">
                  <MessageSquare size={14} /> Feedback
                </Link>
                <button onClick={() => toggleTheme()} className="flex items-center gap-2 w-full text-left px-3 py-2 text-xs text-[var(--muted)]">
                  {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />} {theme === 'dark' ? 'Light mode' : 'Dark mode'}
                </button>
                <button onClick={() => { logout(); setMobileOpen(false); }} className="flex items-center gap-2 w-full text-left px-3 py-2 text-xs text-[var(--error)]">
                  <LogOut size={14} /> Sign out
                </button>
              </>
            ) : (
              <>
                <button onClick={() => toggleTheme()} className="flex items-center gap-2 w-full text-left px-3 py-2 text-xs text-[var(--muted)]">
                  {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />} {theme === 'dark' ? 'Light mode' : 'Dark mode'}
                </button>
                <Link href="/login" onClick={() => setMobileOpen(false)} className="flex items-center gap-2 px-3 py-2 text-xs text-[var(--primary-light)]">
                  <LogIn size={14} /> Sign in
                </Link>
              </>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}
