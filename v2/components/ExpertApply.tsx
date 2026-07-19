"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { c, ink, forest } from "@/lib/palette";

const inputStyle: CSSProperties = {
  boxSizing: "border-box", width: "100%", padding: "13px 14px", fontSize: "15px",
  fontFamily: "inherit", color: c.ink, background: c.surface,
  border: `1px solid ${ink(0.25)}`, borderRadius: "4px",
};
const labelSpan: CSSProperties = { fontSize: "13px", fontWeight: 600, color: ink(0.62) };
const field: CSSProperties = { display: "flex", flexDirection: "column", gap: "6px" };

export default function ExpertApply() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [expertise, setExpertise] = useState("");
  const [years, setYears] = useState("");
  const [links, setLinks] = useState("");
  const [focus, setFocus] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const companyRef = useRef<HTMLInputElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  // Open with a clean slate: a prior success or error must never leak into the
  // next open (the pill stays mounted, so the same instance is reused).
  const openModal = () => {
    setError("");
    setSubmitting(false);
    setDone(false);
    setOpen(true);
  };

  // Close and return focus to the trigger, so keyboard users aren't dropped at
  // the top of the document.
  const closeModal = () => {
    setOpen(false);
    requestAnimationFrame(() => triggerRef.current?.focus());
  };

  // Keep focus inside the dialog while it is open (aria-modal promises this).
  const trapTab = (e: React.KeyboardEvent) => {
    if (e.key !== "Tab" || !dialogRef.current) return;
    const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
    );
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };

  // Open: lock body scroll, close on Esc, focus the first field.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeModal();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    const t = setTimeout(() => nameRef.current?.focus({ preventScroll: true }), 80);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
      clearTimeout(t);
    };
  }, [open]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const nm = name.trim();
    const em = email.trim();
    const ex = expertise.trim();
    if (!nm) return setError("Please add your name.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em))
      return setError("That email doesn't look right. Mind checking it?");
    if (!ex) return setError("Tell us your area of expertise.");

    setSubmitting(true);
    fetch("/api/expert-apply", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: nm, email: em, expertise: ex,
        yearsExperience: years, links: links.trim(), focusNote: focus.trim(),
        company: companyRef.current?.value || "",
      }),
    })
      .then((res) =>
        res
          .json()
          .catch(() => ({}))
          .then((data: { ok?: boolean; error?: string }) => {
            if (!res.ok || data.ok === false) throw new Error(data.error || "request failed");
          }),
      )
      .then(() => {
        setDone(true);
        setName(""); setEmail(""); setExpertise("");
        setYears(""); setLinks(""); setFocus("");
      })
      .catch(() => {
        setError("Could not send your application right now. Please try again in a minute.");
        setSubmitting(false);
      });
  };

  return (
    <>
      <style>{`
        .gae-expert-pill {
          position: fixed;
          top: clamp(16px, 3vw, 34px);
          right: clamp(14px, 3.3vw, 44px);
          z-index: 900;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: ${c.forest};
          color: ${c.cream};
          border: 0;
          cursor: pointer;
          font-family: inherit;
          font-size: clamp(13px, 1.15vw, 14.5px);
          font-weight: 600;
          letter-spacing: 0.02em;
          padding: clamp(9px, 1.1vw, 12px) clamp(15px, 1.6vw, 22px);
          border-radius: 999px;
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.14), 0 1px 2px rgba(28,26,22,0.18), 0 12px 24px -12px rgba(47,74,56,0.55);
          transition: transform 160ms ease, box-shadow 160ms ease;
        }
        .gae-expert-pill:hover {
          transform: translateY(-1px);
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.18), 0 2px 4px rgba(28,26,22,0.2), 0 18px 32px -12px rgba(47,74,56,0.6);
        }
        .gae-expert-pill:focus-visible {
          outline: 2px solid ${c.cream};
          outline-offset: 2px;
        }
        .gae-expert-pill .dot {
          width: 6px; height: 6px; border-radius: 999px;
          background: ${c.cream}; opacity: 0.85;
        }
        @media (prefers-reduced-motion: reduce) {
          .gae-expert-pill { transition: none; }
          .gae-expert-pill:hover { transform: none; }
        }
      `}</style>

      <button
        ref={triggerRef}
        type="button"
        className="gae-expert-pill"
        onClick={openModal}
        aria-haspopup="dialog"
      >
        <span className="dot" aria-hidden="true" />
        Join as an Expert
      </button>

      {open && (
        <div
          style={{
            position: "fixed", inset: 0, zIndex: 1000, display: "flex",
            alignItems: "center", justifyContent: "center", padding: "16px", boxSizing: "border-box",
          }}
        >
          <div
            onClick={closeModal}
            style={{ position: "absolute", inset: 0, background: ink(0.55), cursor: "pointer" }}
          />
          <div
            ref={dialogRef}
            onKeyDown={trapTab}
            role="dialog"
            aria-modal="true"
            aria-label="Join the expert network"
            style={{
              position: "relative", width: "min(560px, 100%)", maxHeight: "94svh",
              overflow: "auto", background: c.paper, borderRadius: "16px",
              padding: "clamp(26px, 4vw, 40px)", boxShadow: `0 24px 80px -24px ${ink(0.5)}`,
            }}
          >
            <button
              type="button"
              onClick={closeModal}
              aria-label="Close"
              style={{
                position: "absolute", top: "14px", right: "14px", width: "34px", height: "34px",
                display: "inline-flex", alignItems: "center", justifyContent: "center",
                background: "transparent", color: ink(0.55), border: 0, cursor: "pointer",
                fontSize: "18px", lineHeight: 1, borderRadius: "999px",
              }}
            >
              ✕
            </button>

            {!done ? (
              <>
                <h2 style={{ margin: "0 0 10px", fontFamily: "var(--font-serif)", fontWeight: 600, fontSize: "clamp(25px, 3vw, 32px)", lineHeight: 1.18, textWrap: "balance", maxWidth: "22ch" }}>
                  Join the expert network
                </h2>
                <p style={{ margin: "0 0 24px", fontSize: "15.5px", lineHeight: 1.6, color: ink(0.75), textWrap: "pretty" }}>
                  We bring in a small number of people we&rsquo;d trust with our own
                  work. Tell us a little about you and we&rsquo;ll be in touch.
                </p>

                <form noValidate onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: "15px", textAlign: "left" }}>
                  <label style={field}>
                    <span style={labelSpan}>Name</span>
                    <input ref={nameRef} name="name" type="text" required autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} style={inputStyle} />
                  </label>
                  <label style={field}>
                    <span style={labelSpan}>Email</span>
                    <input name="email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} style={inputStyle} />
                  </label>
                  <label style={field}>
                    <span style={labelSpan}>Area of expertise</span>
                    <input name="expertise" type="text" required placeholder="e.g. distributed systems, brand design, growth" value={expertise} onChange={(e) => setExpertise(e.target.value)} style={inputStyle} />
                  </label>
                  <label style={field}>
                    <span style={labelSpan}>Years of experience</span>
                    <select name="years" value={years} onChange={(e) => setYears(e.target.value)} style={inputStyle}>
                      <option value="">Select one&hellip;</option>
                      <option value="0-2">0 to 2</option>
                      <option value="3-5">3 to 5</option>
                      <option value="6-10">6 to 10</option>
                      <option value="10+">10 or more</option>
                    </select>
                  </label>
                  <label style={field}>
                    <span style={labelSpan}>Links (LinkedIn, GitHub, or portfolio)</span>
                    <input name="links" type="text" placeholder="https://" value={links} onChange={(e) => setLinks(e.target.value)} style={inputStyle} />
                  </label>
                  <label style={field}>
                    <span style={labelSpan}>What would you want to work on?</span>
                    <textarea name="focus" rows={3} value={focus} onChange={(e) => setFocus(e.target.value)} style={{ ...inputStyle, resize: "vertical", minHeight: "76px" }} />
                  </label>

                  <input ref={companyRef} name="company" type="text" tabIndex={-1} autoComplete="off" aria-hidden="true" style={{ position: "absolute", left: "-9999px", width: "1px", height: "1px", opacity: 0 }} />

                  <button
                    type="submit"
                    disabled={submitting}
                    style={{
                      marginTop: "4px", background: c.forest, color: c.cream, border: 0,
                      cursor: submitting ? "default" : "pointer", fontSize: "16px", fontWeight: 500,
                      letterSpacing: "0.02em", fontFamily: "inherit", padding: "16px 32px", borderRadius: "999px",
                      opacity: submitting ? 0.7 : 1,
                      boxShadow: "inset 0 1px 0 rgba(255,255,255,0.14),0 1px 2px rgba(28,26,22,0.18),0 12px 24px -10px rgba(47,74,56,0.5)",
                    }}
                  >
                    {submitting ? "Sending…" : "Submit application"}
                  </button>
                  {error && <div style={{ fontSize: "13.5px", lineHeight: 1.5, color: c.rust }}>{error}</div>}
                  <div style={{ fontSize: "12.5px", lineHeight: 1.55, color: ink(0.62) }}>
                    We read every application by hand. The network stays small on purpose.
                  </div>
                </form>
              </>
            ) : (
              <div style={{ padding: "8px 0 4px" }}>
                <div style={{ fontSize: "34px", lineHeight: 1, color: c.forest, marginBottom: "16px" }} aria-hidden="true">✓</div>
                <h2 style={{ margin: "0 0 12px", fontFamily: "var(--font-serif)", fontWeight: 600, fontSize: "clamp(24px, 3vw, 30px)", lineHeight: 1.2 }}>
                  Thank you.
                </h2>
                <p style={{ margin: "0 0 26px", fontSize: "16px", lineHeight: 1.62, color: ink(0.78), maxWidth: "42ch" }}>
                  We read every application personally and will be in touch. We keep
                  the network small on purpose.
                </p>
                <button
                  type="button"
                  onClick={closeModal}
                  style={{
                    background: "transparent", color: c.forest, cursor: "pointer",
                    fontSize: "15px", fontWeight: 500, letterSpacing: "0.02em", fontFamily: "inherit",
                    padding: "13px 30px", border: `1.5px solid ${forest(0.4)}`, borderRadius: "999px",
                  }}
                >
                  Close
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
