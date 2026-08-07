'use client';

import { useEffect, useLayoutEffect, useRef, type CSSProperties, type ReactNode } from 'react';
import { useVisualViewport } from '@/components/useVisualViewport';
import s from '@/components/Overlay.module.css';

// The layer every committed state on the homepage opens into. The hero, the
// setup cards and the example cards are the front door; this is what covers
// them, and what closing puts back. It used to live inside Chat, which meant
// the setup card and the booking picker had no way to reuse it.
//
// It owns the shell and nothing else. The scrim, the fixed sizing, Escape, the
// back button and the entrance are here; whatever renders the window itself
// arrives as children.

// Where the layer grows from: viewport pixels, because the layer is fixed, so
// a client rect from the tapped card is already in the right space.
export type OverlayOrigin = { x: number; y: number };

const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  'iframe',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

export default function Overlay({
  onClose,
  origin,
  children,
}: {
  onClose: () => void;
  origin?: OverlayOrigin | null;
  children: ReactNode;
}) {
  const layerRef = useRef<HTMLElement>(null);

  // Callers pass an inline arrow, so onClose is a new function on every render.
  // Held in a ref so the effects below run once per open instead of once per
  // render: re-running them would push a second history entry and yank focus
  // back out of the composer on every keystroke.
  const closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = onClose;
  });

  // Pins the fixed layer to the visual viewport, so the iOS keyboard shrinks it
  // instead of scrolling it off screen. See components/useVisualViewport.ts.
  useVisualViewport(true);

  // A layout effect, not a passive one, for a specific reason: passive effects
  // run child first, and Chat autofocuses its composer in one of those. Reading
  // the opener there would record the composer as the element to restore to,
  // and that element is gone by the time the layer closes. Layout effects run
  // ahead of every passive effect in the commit, so this sees the real opener.
  // Safe against the server warning because nothing renders this until a tap.
  useLayoutEffect(() => {
    const node = layerRef.current;
    const opener = document.activeElement as HTMLElement | null;

    function targets(): HTMLElement[] {
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

      const inside = targets();
      if (inside.length === 0) {
        event.preventDefault();
        node.focus();
        return;
      }
      const first = inside[0];
      const last = inside[inside.length - 1];
      const active = document.activeElement;

      // Wrap at both ends, and treat focus sitting on the layer itself as being
      // at the start, so the first Tab lands inside rather than escaping into
      // the page underneath.
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
    // Only if nothing inside has taken it already. Chat focuses its composer a
    // beat after this, and stealing focus up to the container first would leave
    // the keyboard open over a field that is not receiving keystrokes.
    if (node && !node.contains(document.activeElement)) node.focus();

    return () => {
      document.removeEventListener('keydown', onKey);
      // Focus goes back to whatever opened this. Guarded three ways.
      //
      // Gone from the document: without the check, focus would be left on a
      // detached node and the next Tab would start from the top of the page.
      //
      // The body: focusing it is a no-op that reads as success, so skip it and
      // let the browser keep focus on the document where it already is.
      //
      // A text field: never restore into one. The hero's search bar opens this
      // layer from its own onFocus handler, so handing focus back to it fires
      // that handler again and the layer reopens the instant it closes. For a
      // keyboard visitor that made Escape do nothing at all, forever. Focus on
      // that bar IS the opening gesture, which is exactly why it can never be a
      // sane thing to return to.
      if (!opener || opener === document.body) return;
      if (!document.contains(opener)) return;
      const tag = opener.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || opener.isContentEditable) return;
      // preventScroll because focusing an element scrolls it into view, and the
      // page has not moved the whole time this layer was up. Closing must not
      // be the thing that finally jerks it.
      opener.focus?.({ preventScroll: true });
    };
  }, []);

  // Back closes the layer instead of leaving the page. On a phone that is the
  // gesture people reach for first, and without this it throws them back to
  // wherever they came from.
  //
  // One entry for "a layer is open", owned here rather than by each thing
  // inside it. Per screen it would break the setup to booking hand off: the
  // first would pop its entry while the second pushed one, and the pop lands a
  // tick later and closes the screen that just opened. This component stays
  // mounted across that hand off, so the entry survives it.
  useEffect(() => {
    window.history.pushState({ midseshOverlay: true }, '');
    const onPop = () => closeRef.current();
    window.addEventListener('popstate', onPop);
    return () => {
      window.removeEventListener('popstate', onPop);
      // Closing by the X or the scrim leaves our entry behind, so take it off.
      // After a real back press the entry is already gone and this is skipped.
      if (window.history.state?.midseshOverlay) window.history.back();
    };
  }, []);

  // Read by Overlay.module.css as the transform origin. Rounded because a
  // subpixel origin buys nothing and reads as noise in the inspector. Left
  // unset when there is no origin, which is what the 50% fallbacks are for.
  const style = origin
    ? ({
        '--origin-x': `${Math.round(origin.x)}px`,
        '--origin-y': `${Math.round(origin.y)}px`,
      } as CSSProperties)
    : undefined;

  return (
    <main
      ref={layerRef}
      className="page page-overlay"
      style={style}
      // The trap above is what makes this promise true. The window inside
      // carries the visible title.
      role="dialog"
      aria-modal="true"
      tabIndex={-1}
    >
      {/* A real button, not a div, so the layer can be dismissed from the
          keyboard as well as by tapping outside the window. */}
      <button
        type="button"
        className="overlay-scrim"
        aria-label="Close"
        onClick={() => closeRef.current()}
      />
      <div className={s.grow}>{children}</div>
    </main>
  );
}
