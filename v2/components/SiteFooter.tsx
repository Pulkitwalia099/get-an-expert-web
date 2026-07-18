import { ink } from "@/lib/palette";

export default function SiteFooter() {
  return (
    <footer
      style={{
        maxWidth: "1216px",
        margin: "0 auto",
        padding: "0 clamp(24px,3.3vw,48px)",
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          gap: "24px",
          padding: "26px 0 38px",
          borderTop: `1px solid ${ink(0.1)}`,
          fontSize: "12px",
          color: ink(0.62),
        }}
      >
        <span>get an expert</span>
        <span>© 2026</span>
      </div>
    </footer>
  );
}
