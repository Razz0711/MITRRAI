// ============================================
// MitrAI v2 - SubTabBar (Premium pill-style sub-tabs)
// Glassmorphic, animated, with gradient active state
// ============================================

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { CircleDot, Users2, Ghost } from 'lucide-react';
import { LucideIcon } from 'lucide-react';

export interface SubTab {
  label: string;
  href: string;
  icon: LucideIcon;
}

const SUB_TABS: Record<string, SubTab[]> = {
  chat: [
    { label: 'Anon', href: '/anon', icon: Ghost },
    { label: 'Circles', href: '/circles', icon: CircleDot },
    { label: 'Rooms', href: '/rooms', icon: Users2 },
  ],
};

export default function SubTabBar({ group }: { group: 'chat' | 'radar' }) {
  const pathname = usePathname();
  const tabs = SUB_TABS[group] || [];

  return (
    <div className="flex justify-center gap-2 overflow-x-auto no-scrollbar py-3 mb-4 max-w-4xl mx-auto px-4">
      <div className="inline-flex items-center gap-1.5 p-1 rounded-2xl" style={{
        background: 'var(--surface)',
        border: '1px solid var(--glass-border)',
        backdropFilter: 'blur(8px)',
      }}>
        {tabs.map(tab => {
          const isActive = pathname === tab.href || pathname.startsWith(tab.href + '/');
          const Icon = tab.icon;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all duration-300 ${
                isActive
                  ? 'text-white shadow-lg'
                  : 'text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface-light)]'
              }`}
              style={isActive ? {
                background: 'linear-gradient(135deg, var(--primary), #6d28d9)',
                boxShadow: '0 2px 12px rgba(124, 58, 237, 0.35)',
              } : {}}
            >
              <Icon size={14} strokeWidth={isActive ? 2.5 : 2} />
              {tab.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
