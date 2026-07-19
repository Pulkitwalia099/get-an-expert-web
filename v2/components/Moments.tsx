import { ink } from "@/lib/palette";

const moments = [
  {
    label: "Before the big task",
    line: "About to start something heavy? Hand it to an expert and keep building.",
  },
  {
    label: "After real work",
    line: "Just shipped something that matters? Get senior eyes on it.",
  },
  {
    label: "The boring parts",
    line: "Migrations, cleanups, test suites. Delegate the grind.",
  },
  {
    label: "On serious stacks",
    line: "Deep in internal or sensitive systems? Keep an expert on standby.",
  },
];

export default function Moments() {
  return (
    <section
      id="moments"
      aria-labelledby="moments-title"
      style={{
        marginTop: "clamp(72px,8vw,110px)",
        padding: "0 clamp(24px,3.3vw,48px)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
      }}
    >
      <h2
        id="moments-title"
        style={{
          margin: 0,
          fontFamily: "var(--font-serif)",
          fontWeight: 600,
          fontSize: "clamp(34px,3.2vw,46px)",
          lineHeight: 1.2,
          textAlign: "center",
          maxWidth: "720px",
          textWrap: "balance",
        }}
      >
        Every session has moments worth delegating.
      </h2>
      <div
        style={{
          marginTop: "clamp(36px,4vw,52px)",
          width: "100%",
          maxWidth: "1120px",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))",
          gap: "44px 48px",
        }}
      >
        {moments.map((m) => (
          <div key={m.label} style={{ position: "relative", paddingTop: "22px" }}>
            <div
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: "2px",
                background: ink(0.12),
              }}
            />
            <div
              style={{
                fontSize: "11px",
                fontWeight: 600,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                color: ink(0.45),
              }}
            >
              {m.label}
            </div>
            <div
              style={{
                marginTop: "12px",
                fontFamily: "var(--font-serif)",
                fontWeight: 500,
                fontSize: "23px",
                lineHeight: 1.35,
                textWrap: "pretty",
              }}
            >
              {m.line}
            </div>
          </div>
        ))}
      </div>
      <p
        style={{
          margin: "clamp(40px,4.5vw,60px) 0 0",
          fontFamily: "var(--font-serif)",
          fontStyle: "italic",
          fontSize: "clamp(19px,1.8vw,23px)",
          color: ink(0.85),
          textAlign: "center",
        }}
      >
        Delegate like the best teams do.
      </p>
    </section>
  );
}
