import { describe, it, expect } from "vitest";
import { validateExpert, validateWaitlist } from "./validateSubmission";

describe("validateExpert", () => {
  const good = {
    name: "Ada Lovelace",
    email: "ada@example.com",
    expertise: "Distributed systems",
    yearsExperience: "10+",
    links: "https://github.com/ada",
    focusNote: "Reviewing tricky concurrency code",
  };

  it("accepts a complete, valid application and normalizes to a row", () => {
    const r = validateExpert(good);
    expect(r).toEqual({
      ok: true,
      kind: "insert",
      row: {
        name: "Ada Lovelace",
        email: "ada@example.com",
        expertise: "Distributed systems",
        years_experience: "10+",
        links: "https://github.com/ada",
        focus_note: "Reviewing tricky concurrency code",
        source: "expert-modal",
      },
    });
  });

  it("drops silently when the honeypot is filled", () => {
    const r = validateExpert({ ...good, company: "Acme Bot Co" });
    expect(r).toEqual({ ok: true, kind: "honeypot" });
  });

  it("rejects a missing name", () => {
    const r = validateExpert({ ...good, name: "   " });
    expect(r.ok).toBe(false);
  });

  it("rejects a malformed email", () => {
    const r = validateExpert({ ...good, email: "ada@nope" });
    expect(r.ok).toBe(false);
  });

  it("rejects a missing expertise", () => {
    const r = validateExpert({ ...good, expertise: "" });
    expect(r.ok).toBe(false);
  });

  it("trims whitespace and tolerates missing optional fields", () => {
    const r = validateExpert({
      name: "  Grace  ",
      email: "grace@example.com",
      expertise: "  Compilers  ",
    });
    expect(r).toMatchObject({
      ok: true,
      kind: "insert",
      row: { name: "Grace", expertise: "Compilers", years_experience: "", links: "", focus_note: "" },
    });
  });

  it("ignores non-string junk without throwing", () => {
    const r = validateExpert({ name: 42, email: null, expertise: undefined });
    expect(r.ok).toBe(false);
  });
});

describe("validateWaitlist", () => {
  const good = { name: "Linus", email: "linus@example.com", role: "engineer" };

  it("accepts a valid signup", () => {
    const r = validateWaitlist(good);
    expect(r).toEqual({
      ok: true,
      kind: "insert",
      row: { name: "Linus", email: "linus@example.com", role: "engineer", source: "waitlist" },
    });
  });

  it("drops silently when the honeypot is filled", () => {
    const r = validateWaitlist({ ...good, company: "spam" });
    expect(r).toEqual({ ok: true, kind: "honeypot" });
  });

  it("rejects a missing role", () => {
    expect(validateWaitlist({ ...good, role: "" }).ok).toBe(false);
  });

  it("rejects a malformed email", () => {
    expect(validateWaitlist({ ...good, email: "nope" }).ok).toBe(false);
  });
});
