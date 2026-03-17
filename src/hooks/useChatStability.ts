import { useEffect } from 'react';

/**
 * useChatStability — Fixes mobile keyboard viewport issues
 * Uses visualViewport API to set --vh CSS variable
 * Prevents page flicker and layout shift when keyboard opens/closes
 */
export function useChatStability() {
  useEffect(() => {
    const setVh = () => {
      const vh = (window.visualViewport?.height ?? window.innerHeight) * 0.01;
      document.documentElement.style.setProperty('--vh', `${vh}px`);
    };

    // Set initially
    setVh();

    // Listen to visualViewport resize (keyboard open/close)
    const vv = window.visualViewport;
    if (vv) {
      vv.addEventListener('resize', setVh);
      vv.addEventListener('scroll', setVh);
    }
    window.addEventListener('resize', setVh);
    window.addEventListener('orientationchange', setVh);

    return () => {
      if (vv) {
        vv.removeEventListener('resize', setVh);
        vv.removeEventListener('scroll', setVh);
      }
      window.removeEventListener('resize', setVh);
      window.removeEventListener('orientationchange', setVh);
    };
  }, []);
}
