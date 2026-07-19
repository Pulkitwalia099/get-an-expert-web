"use client";

import { useState, type CSSProperties } from "react";
import { c, ink, paper } from "@/lib/palette";

const claudeCmd =
  "claude mcp add get-an-expert --scope user -- npx -y get-an-expert-agent@latest";
const codexCmd = `[mcp_servers.get-an-expert]
command = "npx"
args = ["-y", "get-an-expert-agent@latest"]
startup_timeout_sec = 30`;

function CodeBlock({
  label,
  hint,
  code,
  ariaLabel,
}: {
  label: string;
  hint?: string;
  code: string;
  ariaLabel: string;
}) {
  const [btnText, setBtnText] = useState("Copy");

  const flash = (t: string) => {
    setBtnText(t);
    setTimeout(() => setBtnText("Copy"), 1600);
  };

  const copy = () => {
    const fallback = () => {
      const ta = document.createElement("textarea");
      ta.value = code;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed";
      ta.style.left = "-9999px";
      document.body.appendChild(ta);
      ta.select();
      let ok = false;
      try {
        ok = document.execCommand("copy");
      } catch {
        ok = false;
      }
      document.body.removeChild(ta);
      flash(ok ? "Copied" : "Select & copy");
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(code).then(() => flash("Copied"), fallback);
    } else {
      fallback();
    }
  };

  const btnStyle: CSSProperties = {
    position: "absolute", top: "12px", right: "12px",
    background: paper(0.1), color: c.border, border: `1px solid ${paper(0.2)}`,
    borderRadius: "6px", fontFamily: "inherit", fontSize: "11.5px", fontWeight: 600,
    letterSpacing: "0.04em", padding: "6px 14px", cursor: "pointer",
  };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: "12px", marginBottom: "9px" }}>
        <span style={{ fontSize: "11px", fontWeight: 600, letterSpacing: "0.18em", textTransform: "uppercase", color: ink(0.45) }}>{label}</span>
        {hint && <span style={{ fontFamily: "ui-monospace,Menlo,monospace", fontSize: "11.5px", color: ink(0.45) }}>{hint}</span>}
      </div>
      <div style={{ position: "relative", background: c.ink, borderRadius: "10px", padding: "18px 110px 18px 20px", overflowX: "auto" }}>
        <code style={{ fontFamily: "ui-monospace,Menlo,monospace", fontSize: "13.5px", lineHeight: 1.6, color: c.code, whiteSpace: "pre" }}>{code}</code>
        <button type="button" aria-label={ariaLabel} onClick={copy} style={btnStyle}>{btnText}</button>
      </div>
    </div>
  );
}

export default function Install() {
  return (
    <section
      id="install"
      aria-labelledby="install-title"
      style={{
        marginTop: "clamp(72px,8vw,110px)",
        padding: "0 clamp(24px,3.3vw,48px)",
        display: "flex", flexDirection: "column", alignItems: "center",
        scrollMarginTop: "40px",
      }}
    >
      <h2 id="install-title" style={{ margin: 0, fontFamily: "var(--font-serif)", fontWeight: 600, fontSize: "clamp(34px,3.2vw,46px)", lineHeight: 1.2, textAlign: "center", maxWidth: "720px", textWrap: "balance" }}>
        Install in 30 seconds.
      </h2>
      <p style={{ margin: "18px 0 0", fontSize: "16px", lineHeight: 1.65, color: ink(0.75), maxWidth: "520px", textAlign: "center", textWrap: "pretty" }}>
        Free to install. Pick your tool, paste one command, and the expert option
        is there the next time you need it.
      </p>
      <div style={{ marginTop: "44px", width: "min(760px,100%)", display: "flex", flexDirection: "column", gap: "22px" }}>
        <CodeBlock label="Claude Code" code={claudeCmd} ariaLabel="Copy the Claude Code install command" />
        <CodeBlock label="Codex" hint="~/.codex/config.toml" code={codexCmd} ariaLabel="Copy the Codex configuration" />
      </div>
    </section>
  );
}
