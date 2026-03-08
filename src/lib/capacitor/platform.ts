/**
 * Platform detection utilities for Capacitor native apps
 * Detects if running inside a native app (Android/iOS) or browser
 */

export function isNativePlatform(): boolean {
  if (typeof window === 'undefined') return false;
  // Capacitor injects this on native platforms
  return !!(window as any).Capacitor?.isNativePlatform?.();
}

export function getPlatform(): 'android' | 'ios' | 'web' {
  if (typeof window === 'undefined') return 'web';
  const cap = (window as any).Capacitor;
  if (!cap) return 'web';
  const platform = cap.getPlatform?.();
  if (platform === 'android') return 'android';
  if (platform === 'ios') return 'ios';
  return 'web';
}

export function isAndroid(): boolean {
  return getPlatform() === 'android';
}

export function isIOS(): boolean {
  return getPlatform() === 'ios';
}
