import { useEffect, useRef, useCallback } from 'react';

/**
 * useChatScroll — Auto-scroll to bottom on new messages
 * Prevents scroll jump by only scrolling when user is near bottom
 */
export function useChatScroll(deps: unknown[]) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback((smooth = true) => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({
        behavior: smooth ? 'smooth' : 'auto',
        block: 'end',
      });
    }
  }, []);

  const isNearBottom = useCallback(() => {
    const el = containerRef.current;
    if (!el) return true;
    const threshold = 150;
    return el.scrollHeight - el.scrollTop - el.clientHeight < threshold;
  }, []);

  useEffect(() => {
    // Only auto-scroll if user is near bottom
    if (isNearBottom()) {
      // Small delay to let DOM render
      const id = requestAnimationFrame(() => scrollToBottom());
      return () => cancelAnimationFrame(id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { bottomRef, containerRef, scrollToBottom, isNearBottom };
}
