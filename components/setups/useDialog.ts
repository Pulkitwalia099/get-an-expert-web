'use client';

import { useEffect, useRef } from 'react';

// The three sheets on /setups all declare aria-modal="true", which promises a
// screen reader that everything behind them is switched off. Nothing enforced
// that: Escape did nothing, the grid scrolled behind the overlay, and Tab
// walked straight out of the dialog into the page underneath. This hook is the
// enforcement, written once so all three behave the same way.
//
// Returns a ref to put on the dialog element, which also needs tabIndex={-1}
// so it can take focus itself when it has no focusable child yet.

const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  'iframe',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

export function useDialog<T extends HTMLElement>(onClose: () => void) {
  const ref = useRef<T>(null);

  // Callers pass an inline arrow, so onClose is a new function every render.
  // Keeping it in a ref lets the effect below run once per open instead of
  // once per render, which matters: re-running it would re-capture the opener
  // and yank focus back to the top of the sheet on every keystroke.
  const closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = onClose;
  });

  useEffect(() => {
    const node = ref.current;
    const opener = document.activeElement as HTMLElement | null;

    function visibleTargets(): HTMLElement[] {
      if (!node) return [];
      return Array.from(node.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (el) => el.offsetWidth > 0 || el.offsetHeight > 0,
      );
    }

    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeRef.current();
        return;
      }
      if (event.key !== 'Tab' || !node) return;

      const targets = visibleTargets();
      if (targets.length === 0) {
        event.preventDefault();
        node.focus();
        return;
      }
      const first = targets[0];
      const last = targets[targets.length - 1];
      const active = document.activeElement;

      // Wrap at both ends, and treat focus sitting on the sheet itself as
      // being at the start, so the first Tab lands inside rather than escaping.
      if (event.shiftKey && (active === first || active === node)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      } else if (!node.contains(active)) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener('keydown', onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    node?.focus();

    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previousOverflow;
      opener?.focus?.();
    };
  }, []);

  return ref;
}
