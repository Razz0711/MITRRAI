// ============================================
// MitrAI - SubTabBar (Horizontal pill-style sub-tabs)
// Used within Connect, Learn, and Discover tab groups
// Centered within content area with Lucide icons
// ============================================

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { MessageCircle, CircleDot, Users2, HelpCircle, Handshake, UserCheck, Ghost } from 'lucide-react';
import { LucideIcon } from 'lucide-react';

export interface SubTab {
  label: string;
  href: string;
  icon: LucideIcon;
}

const SUB_TABS: Record<string, SubTab[]> = {
  connect: [
    { label: 'Direct', href: '/chat', icon: MessageCircle },
    { label: 'Circles', href: '/circles', icon: CircleDot },
    { label: 'Rooms', href: '/rooms', icon: Users2 },
  ],
  learn: [
    { label: 'Doubts', href: '/doubts', icon: HelpCircle },
  ],
  discover: [
    { label: 'Matches', href: '/matches', icon: Handshake },
    { label: 'Friends', href: '/friends', icon: UserCheck },
    { label: 'Anonymous', href: '/anon', icon: Ghost },
  ],
};

export default function SubTabBar({ group }: { group: 'connect' | 'learn' | 'discover' }) {
  const pathname = usePathname();
  const tabs = SUB_TABS[group] || [];

  return (
    <div className="flex justify-center gap-2 overflow-x-auto no-scrollbar py-3 mb-4 max-w-4xl mx-auto px-4">
      {tabs.map(tab => {
        const isActive = pathname === tab.href || pathname.startsWith(tab.href + '/');
        const Icon = tab.icon;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
              isActive
                ? 'bg-[var(--primary)] text-white shadow-sm'
                : 'bg-[var(--surface)] text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface-light)] border border-[var(--border)]'
            }`}
          >
            <Icon size={14} strokeWidth={isActive ? 2.5 : 2} />
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
