/* Pure validation + normalization for the two public intake forms.
   No I/O here, so it is trivially unit-testable. The API routes call these,
   then hand the returned row straight to Supabase.

   The `company` field on each input is a honeypot: a hidden field real users
   never fill. If a bot fills it, we report success but skip the insert, so the
   bot learns nothing and no junk row lands. */

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type ExpertInput = {
  name?: unknown;
  email?: unknown;
  expertise?: unknown;
  yearsExperience?: unknown;
  links?: unknown;
  focusNote?: unknown;
  company?: unknown; // honeypot
};

export type WaitlistInput = {
  name?: unknown;
  email?: unknown;
  role?: unknown;
  company?: unknown; // honeypot
};

export type ExpertRow = {
  name: string;
  email: string;
  expertise: string;
  years_experience: string;
  links: string;
  focus_note: string;
  source: string;
};

export type WaitlistRow = {
  name: string;
  email: string;
  role: string;
  source: string;
};

export type ValidationResult<T> =
  | { ok: true; kind: "insert"; row: T }
  | { ok: true; kind: "honeypot" }
  | { ok: false; error: string };

const str = (v: unknown): string => (typeof v === "string" ? v.trim() : "");

function honeypotTripped(company: unknown): boolean {
  return str(company).length > 0;
}

export function validateExpert(input: ExpertInput): ValidationResult<ExpertRow> {
  if (honeypotTripped(input.company)) return { ok: true, kind: "honeypot" };

  const name = str(input.name);
  const email = str(input.email);
  const expertise = str(input.expertise);

  if (!name) return { ok: false, error: "Please add your name." };
  if (!EMAIL_RE.test(email))
    return { ok: false, error: "That email doesn't look right. Mind checking it?" };
  if (!expertise) return { ok: false, error: "Tell us your area of expertise." };

  return {
    ok: true,
    kind: "insert",
    row: {
      name,
      email,
      expertise,
      years_experience: str(input.yearsExperience),
      links: str(input.links),
      focus_note: str(input.focusNote),
      source: "expert-modal",
    },
  };
}

export function validateWaitlist(input: WaitlistInput): ValidationResult<WaitlistRow> {
  if (honeypotTripped(input.company)) return { ok: true, kind: "honeypot" };

  const name = str(input.name);
  const email = str(input.email);
  const role = str(input.role);

  if (!name) return { ok: false, error: "Please add your name." };
  if (!EMAIL_RE.test(email))
    return { ok: false, error: "That email doesn't look right. Mind checking it?" };
  if (!role) return { ok: false, error: "Pick what best describes you." };

  return {
    ok: true,
    kind: "insert",
    row: { name, email, role, source: "waitlist" },
  };
}
