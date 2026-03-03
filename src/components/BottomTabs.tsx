// ============================================
// MitrAI - Tab Route Mapping (shared by TopBar & SubTabBar)
// Exported helpers for active tab detection
// ============================================

export const TAB_ROUTES: Record<string, string[]> = {
  home: ['/home', '/dashboard', '/matches'],
  radar: ['/radar', '/skills'],
  chat: ['/anon', '/circles', '/rooms', '/chat'],
  feed: ['/doubts'],
  me: ['/me', '/subscription', '/feedback', '/onboarding'],
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
