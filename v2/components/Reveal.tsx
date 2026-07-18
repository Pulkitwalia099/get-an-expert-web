"use client";

import {
  createElement,
  useEffect,
  useRef,
  type ElementType,
  type ReactNode,
} from "react";

/* Scroll-reveal wrapper. Mirrors the original setupReveal: elements start
   translated down and faded out, then settle in on first intersection
   (threshold 0.12). Reduced motion shows the final frame with no transition
   (handled by the [data-reveal] CSS). An optional delay staggers grid cells. */
export default function Reveal({
  children,
  as,
  delay = 0,
  className,
  id,
  style,
}: {
  children: ReactNode;
  as?: ElementType;
  delay?: number;
  className?: string;
  id?: string;
  style?: React.CSSProperties;
}) {
  const ref = useRef<HTMLElement>(null);
  const Tag = (as || "div") as ElementType;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce || !("IntersectionObserver" in window)) {
      el.classList.add("is-revealed");
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            el.classList.add("is-revealed");
            io.unobserve(el);
          }
        });
      },
      { threshold: 0.12 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  /* createElement instead of <Tag>: a JSX tag typed as ElementType collapses
     its props union to `never` under current @types/react. */
  return createElement(
    Tag,
    {
      ref,
      id,
      "data-reveal": "",
      className,
      style: { transitionDelay: delay ? `${delay}ms` : undefined, ...style },
    },
    children,
  );
}
