import { useRef, useCallback, useEffect } from 'react';

/**
 * useChatScroll — Smart scroll-to-bottom for chat pages.
 *
 * - On page load: instant scroll to bottom
 * - On new message sent: smooth scroll to bottom
 * - On new message received: only if user was already near bottom
 * - If user scrolls up: don't force them down
 *
 * Returns { containerRef, bottomRef, scrollToBottom, forceScrollToBottom, handleScroll }
 */
export function useChatScroll(deps: unknown[] = []) {
  const containerRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const userAtBottom = useRef(true);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    if (userAtBottom.current) {
      bottomRef.current?.scrollIntoView({ behavior });
    }
  }, []);

  const forceScrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    userAtBottom.current = true;
    bottomRef.current?.scrollIntoView({ behavior });
  }, []);

  const handleScroll = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    userAtBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
  }, []);

  // Auto-scroll when deps change (e.g. messages array)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { scrollToBottom('smooth'); }, deps);

  return { containerRef, bottomRef, scrollToBottom, forceScrollToBottom, handleScroll, userAtBottom };
}
