// ============================================
// MitrAI - ChatSideNav (Vertical icon sidebar)
// Desktop-only: Chats, Anon, Circles, Rooms
// ============================================

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  MessageSquare,
  Ghost,
  CircleDot,
  Users2,
} from 'lucide-react';

const navItems = [
  { id: 'chats', label: 'Chats', icon: MessageSquare, href: '/chat' },
  { id: 'anon', label: 'Anon', icon: Ghost, href: '/anon' },
  { id: 'circles', label: 'Circles', icon: CircleDot, href: '/circles' },
  { id: 'rooms', label: 'Rooms', icon: Users2, href: '/rooms' },
];

export default function ChatSideNav() {
  const pathname = usePathname();

  const getActiveId = () => {
    if (pathname === '/chat' || pathname.startsWith('/chat/')) return 'chats';
    for (const item of navItems) {
      if (item.id !== 'chats' && (pathname === item.href || pathname.startsWith(item.href + '/'))) {
        return item.id;
      }
    }
    return 'chats';
  };

  const activeId = getActiveId();

  return (
    <nav className="flex flex-col items-center py-4 gap-1 w-[55px] md:w-[60px] shrink-0 border-r border-[var(--border)] bg-[color-mix(in_srgb,var(--background)_97%,transparent)] z-10">
      {navItems.map(item => {
        const isActive = item.id === activeId;
        const Icon = item.icon;
        return (
          <Link
            key={item.id}
            href={item.href}
            className={`flex flex-col items-center gap-0.5 w-11 md:w-12 py-2 rounded-xl transition-all duration-200 group ${
              isActive
                ? 'bg-[var(--primary)]/15 text-[var(--primary-light)]'
                : 'text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface)]'
            }`}
            title={item.label}
          >
            <Icon size={18} strokeWidth={isActive ? 2.5 : 2} />
            <span className={`text-[9px] font-semibold leading-none ${isActive ? 'text-[var(--primary-light)]' : ''}`}>
              {item.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
