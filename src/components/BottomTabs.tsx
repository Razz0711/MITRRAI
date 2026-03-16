// ============================================
// MitrAI - Tab Route Mapping (shared by TopBar & SubTabBar)
// Exported helpers for active tab detection
// ============================================

export const TAB_ROUTES: Record<string, string[]> = {
  home: ['/home', '/campus-feed', '/notifications'],
  arya: ['/arya'],
  anon: ['/anon'],
  chat: ['/chat', '/rooms', '/doubts'],
  circles: ['/circles'],
};

export function getActiveTab(pathname: string): string {
  for (const [tabId, routes] of Object.entries(TAB_ROUTES)) {
    if (routes.some(r => pathname === r || pathname.startsWith(r + '/'))) {
      return tabId;
    }
  }
  return 'home';
}

// Legacy default export (no longer renders, tabs are in TopBar)
export default function BottomTabs() {
  return null;
}
