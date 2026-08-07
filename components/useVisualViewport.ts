'use client';

import { useEffect } from 'react';

// Pins a fixed overlay to the visual viewport instead of the layout viewport.
//
// iOS Safari does not shrink the layout viewport when the soft keyboard opens.
// It shrinks the visual viewport, gives it an offsetTop, and scrolls the page
// to bring the focused input into view. A `position: fixed` element is laid out
// against the layout viewport, so it keeps its full height and gets carried
// upward with that scroll, which is why the chat jumped when the composer was
// tapped. `dvh` is no help: it tracks browser chrome, not the keyboard.
//
// Android is already handled by `interactiveWidget: 'resizes-content'` in
// app/layout.tsx, which makes the keyboard resize the layout viewport properly.
// iOS ignores that hint, so the numbers have to come from visualViewport.
//
// Writes two custom properties on <html>, read by .page-overlay:
//   --vv-height  usable height right now, keyboard subtracted
//   --vv-top     how far the visual viewport has been pushed down
export function useVisualViewport(active: boolean): void {
  useEffect(() => {
    if (!active) return;
    const vv = window.visualViewport;
    const root = document.documentElement;
    if (!vv) return;

    // Coalesce into a frame. visualViewport fires resize and scroll in bursts
    // while the keyboard animates, and writing a custom property per event
    // forces a style recalc on each one.
    let frame = 0;
    const apply = () => {
      frame = 0;
      root.style.setProperty('--vv-height', `${vv.height}px`);
      root.style.setProperty('--vv-top', `${vv.offsetTop}px`);
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(apply);
    };

    apply();
    vv.addEventListener('resize', schedule);
    vv.addEventListener('scroll', schedule);

    return () => {
      if (frame) cancelAnimationFrame(frame);
      vv.removeEventListener('resize', schedule);
      vv.removeEventListener('scroll', schedule);
      // Cleared rather than left behind, so a closed overlay cannot pin the
      // next thing that reads these to a stale keyboard height.
      root.style.removeProperty('--vv-height');
      root.style.removeProperty('--vv-top');
    };
  }, [active]);
}

export default useVisualViewport;
