"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { c, ink, forest } from "@/lib/palette";

const CAL_LINK = "https://cal.com/pulkit-walia-plcgb7/15min";

const inputStyle: CSSProperties = {
  boxSizing: "border-box", width: "100%", padding: "13px 14px", fontSize: "15px",
  fontFamily: "inherit", color: c.ink, background: c.surface,
  border: `1px solid ${ink(0.25)}`, borderRadius: "4px",
};
const labelSpan: CSSProperties = { fontSize: "13px", fontWeight: 600, color: ink(0.62) };
const ctaPrimary: CSSProperties = {
  background: c.forest, color: c.cream, border: 0, cursor: "pointer",
  fontSize: "16px", fontWeight: 500, letterSpacing: "0.02em", fontFamily: "inherit",
  padding: "19px 44px", borderRadius: "999px",
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.14),0 1px 2px rgba(28,26,22,0.18),0 12px 24px -10px rgba(47,74,56,0.5)",
};

export default function Waitlist() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [booking, setBooking] = useState(false);
  const companyRef = useRef<HTMLInputElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);

  const openFold = () => {
    if (open) return;
    setOpen(true);
    setTimeout(() => nameRef.current?.focus({ preventScroll: true }), 430);
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const nm = name.trim();
    const em = email.trim();
    if (!nm) return setError("Please add your name.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em))
      return setError("That email doesn’t look right. Mind checking it?");
    if (!role) return setError("Pick what best describes you.");

    const isLocal = /^(localhost|127\.|0\.0\.0\.0)/.test(location.hostname);
    const endpoint = isLocal
      ? "http://localhost:3000/api/waitlist"
      : "https://ask-a-human.vercel.app/api/waitlist";

    setSubmitting(true);
    fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: nm, email: em, role, company: companyRef.current?.value || "" }),
    })
      .then((res) =>
        res
          .json()
          .catch(() => ({}))
          .then((data: { ok?: boolean; error?: string }) => {
            if (!res.ok || data.ok === false) throw new Error(data.error || "request failed");
          }),
      )
      .then(() => setDone(true))
      .catch(() => {
        setError("Could not reach the waitlist right now. Please try again in a minute.");
        setSubmitting(false);
      });
  };

  // Book-a-demo overlay: Esc closes, body scroll locks while open.
  useEffect(() => {
    if (!booking) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setBooking(false);
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [booking]);

  return (
    <section
      id="waitlist"
      aria-labelledby="waitlist-title"
      style={{
        marginTop: "clamp(88px,10.4vw,150px)",
        borderTop: `1px solid ${ink(0.1)}`,
        padding: "clamp(80px,8.9vw,128px) clamp(24px,3.3vw,48px)",
        display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center",
      }}
    >
      <h2 id="waitlist-title" style={{ margin: 0, fontFamily: "var(--font-serif)", fontWeight: 600, fontSize: "clamp(34px,3.2vw,46px)", lineHeight: 1.2, maxWidth: "720px", textWrap: "balance" }}>
        Your ambition, uninterrupted.
      </h2>
      <p style={{ margin: "18px 0 0", fontSize: "16px", lineHeight: 1.65, color: ink(0.75), maxWidth: "520px", textWrap: "pretty" }}>
        Install is open to everyone. Leave your email and we&apos;ll let you know
        as new experts and new tools come online.
      </p>
      <div style={{ marginTop: "40px", display: "flex", gap: "14px", flexWrap: "wrap", justifyContent: "center", alignItems: "center" }}>
        {!open && (
          <button type="button" data-cta onClick={openFold} style={ctaPrimary}>
            Get updates
          </button>
        )}
        <a
          href={CAL_LINK}
          data-cta
          data-cta-ghost
          onClick={(e) => {
            e.preventDefault();
            setBooking(true);
          }}
          style={{
            display: "inline-block", background: "transparent", color: c.forest,
            textDecoration: "none", fontSize: "16px", fontWeight: 500, letterSpacing: "0.02em",
            padding: "17.5px 38px", border: `1.5px solid ${forest(0.4)}`, borderRadius: "999px",
          }}
        >
          Book a demo
        </a>
      </div>

      <div id="wl-fold" data-open={open ? "" : undefined}>
        {!done ? (
          <form
            id="waitlist-form"
            noValidate
            onSubmit={submit}
            style={{ marginTop: "12px", width: "100%", display: "flex", flexDirection: "column", gap: "16px", textAlign: "left", padding: "4px", boxSizing: "border-box" }}
          >
            <label style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <span style={labelSpan}>Name</span>
              <input ref={nameRef} name="name" type="text" required autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} style={inputStyle} />
            </label>
            <label style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <span style={labelSpan}>Email</span>
              <input name="email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} style={inputStyle} />
            </label>
            <label style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <span style={labelSpan}>What best describes you?</span>
              <select name="role" required value={role} onChange={(e) => setRole(e.target.value)} style={inputStyle}>
                <option value="" disabled>Select one…</option>
                <option value="founder">Founder</option>
                <option value="side-project">Building a side project</option>
                <option value="engineer">Engineer</option>
                <option value="designer-pm">Designer or PM</option>
                <option value="student">Student</option>
                <option value="other">Other</option>
              </select>
            </label>
            <input ref={companyRef} name="company" type="text" tabIndex={-1} autoComplete="off" aria-hidden="true" style={{ position: "absolute", left: "-9999px", width: "1px", height: "1px", opacity: 0 }} />
            <button type="submit" data-cta disabled={submitting} style={{ ...ctaPrimary, marginTop: "6px" }}>
              {submitting ? "Joining…" : "Get updates"}
            </button>
            {error && <div style={{ fontSize: "13.5px", lineHeight: 1.5, color: c.rust }}>{error}</div>}
            <div style={{ fontSize: "12.5px", color: ink(0.62) }}>No spam. Occasional updates only.</div>
          </form>
        ) : (
          <div style={{ marginTop: "24px", maxWidth: "460px", fontSize: "17px", lineHeight: 1.6, color: c.ink }}>
            <span style={{ color: c.forest }}>✓</span> You&rsquo;re on the list.
            We&rsquo;ll keep you posted.
          </div>
        )}
      </div>

      {booking && (
        <div style={{ position: "fixed", inset: 0, zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: "16px", boxSizing: "border-box" }}>
          <div onClick={() => setBooking(false)} style={{ position: "absolute", inset: 0, background: ink(0.55), cursor: "pointer" }} />
          <div role="dialog" aria-modal="true" aria-label="Book a demo" style={{ position: "relative", width: "min(980px,100%)", height: "min(780px,94svh)", background: c.paper, borderRadius: "16px", overflow: "hidden", display: "flex", flexDirection: "column", boxShadow: `0 24px 80px -24px ${ink(0.5)}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "16px", padding: "20px 20px 12px 26px", borderBottom: `1px solid ${ink(0.1)}` }}>
              <div>
                <div style={{ fontFamily: "var(--font-serif)", fontWeight: 600, fontSize: "clamp(22px,2.2vw,27px)", lineHeight: 1.2 }}>Book a demo</div>
                <p style={{ margin: "5px 0 0", fontSize: "14.5px", lineHeight: 1.55, color: ink(0.75), maxWidth: "560px" }}>Pick a slot that suits you. We&rsquo;ll give you a live walkthrough and answer everything.</p>
              </div>
              <button type="button" onClick={() => setBooking(false)} style={{ flex: "none", display: "inline-flex", alignItems: "center", gap: "8px", background: c.forest, color: c.cream, border: 0, cursor: "pointer", fontFamily: "inherit", fontSize: "14.5px", fontWeight: 600, letterSpacing: "0.02em", padding: "12px 22px", borderRadius: "999px", minHeight: "44px" }}>
                ✕&ensp;Close
              </button>
            </div>
            <div style={{ flex: 1, overflow: "auto", background: c.surface }}>
              <iframe src={`${CAL_LINK}?embed=true`} title="Book a demo" style={{ width: "100%", height: "100%", border: 0 }} />
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
