export default function SiteHeader() {
  return (
    <header
      style={{
        display: "flex",
        justifyContent: "center",
        padding: "44px clamp(24px,3.3vw,48px) 0",
      }}
    >
      <div
        style={{
          fontFamily: "var(--font-serif)",
          fontWeight: 600,
          fontSize: "22px",
          letterSpacing: "0.02em",
        }}
      >
        get an expert
      </div>
    </header>
  );
}
