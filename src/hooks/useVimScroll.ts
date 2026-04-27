import { useEffect } from 'react';

// j scrolls down, k scrolls up — like vim. Bails out when the user is typing
// into the typing test, the terminal takeover, or any other text field, so
// the scroll doesn't fight with command/text input.
export function useVimScroll(step = 0.7) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'j' && e.key !== 'k') return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      const target = e.target as HTMLElement | null;
      if (target) {
        const tag = target.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || target.isContentEditable) return;
      }
      const ae = document.activeElement as HTMLElement | null;
      // typing test: the prompt is a focusable div with class .mt-prompt
      if (ae?.classList.contains('mt-prompt')) return;
      // terminal takeover captures all keys for its shell while it's mounted
      if (document.querySelector('.term-takeover')) return;

      e.preventDefault();
      const dy = window.innerHeight * step;
      window.scrollBy({ top: e.key === 'j' ? dy : -dy, behavior: 'smooth' });
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [step]);
}
