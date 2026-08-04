import { describe, expect, it } from 'vitest';
import { matchOperator, OPERATORS, tagFor } from '../operators';

describe('matchOperator', () => {
  it('sends a payments question to Rohit with the payments tag', () => {
    expect(matchOperator('our stripe webhooks are dropping events')).toEqual({
      id: 'rohit',
      tag: 'Payments & APIs',
    });
  });

  it('sends an automation question to Pulkit', () => {
    expect(matchOperator('rebuild our clay to n8n handoff')).toEqual({
      id: 'pulkit',
      tag: 'Workflow automation',
    });
  });

  it('sends an outbound question to Pulkit', () => {
    expect(matchOperator('2% reply rates on cold email')).toEqual({
      id: 'pulkit',
      tag: 'Outbound & GTM',
    });
  });

  it('is case insensitive', () => {
    expect(matchOperator('STRIPE WEBHOOK').id).toBe('rohit');
  });

  it('returns null rather than naming someone when nothing matches', () => {
    expect(matchOperator('i want to talk about something else')).toBeNull();
  });

  // The categories the home page advertises but the roster has no tag for.
  // These used to return Rohit with the tag "Code & engineering", which is
  // how a video editing brief was offered a backend engineer.
  it.each([
    ['video', 'edit my youtube videos every week, talking head, 12 minutes'],
    ['writing', 'get my content written and posted every week'],
    ['admin', 'i need a bookkeeper to sort out my invoices'],
    ['legal', 'i need a lawyer to review a contract'],
  ])('returns null for %s, which no tag covers', (_label, brief) => {
    expect(matchOperator(brief)).toBeNull();
  });

  it('prefers the stronger signal when tags compete', () => {
    // 'api' is weak, 'postgres' and 'database' are specific.
    expect(matchOperator('an api that reads the postgres database').tag).toBe(
      'Backend & databases',
    );
  });

  it('does not match a keyword inside a longer word', () => {
    // 'make' is a Pulkit keyword; 'makefile' must not trigger it.
    expect(matchOperator('my makefile is broken').id).toBe('rohit');
  });
});

describe('tagFor', () => {
  it('returns the operator fallback when their own keywords miss', () => {
    expect(tagFor('pulkit', 'stripe webhooks')).toBe('GTM & automations');
  });

  it('returns the matching tag for that operator', () => {
    expect(tagFor('rohit', 'the vercel deploy is broken')).toBe('Debugging & deploys');
  });
});

describe('OPERATORS', () => {
  it('has no em dashes in any copy', () => {
    expect(JSON.stringify(OPERATORS)).not.toContain('—');
  });

  it('puts both of them in San Francisco', () => {
    expect(OPERATORS.pulkit.location).toBe('San Francisco');
    expect(OPERATORS.rohit.location).toBe('San Francisco');
  });
});

describe('scoring beats list order', () => {
  it('sends an n8n workflow that mentions an error to Pulkit, not Rohit', () => {
    // The real regression: 'error' is Rohit's, 'n8n' and 'workflow' are
    // Pulkit's, and Rohit is swept first. Counting has to decide it.
    expect(
      matchOperator('i have an n8n workflow that keeps throwing an error on the hubspot node'),
    ).toEqual({ id: 'pulkit', tag: 'Workflow automation' });
  });

  it('still sends a real backend error to Rohit', () => {
    expect(matchOperator('our stripe webhook throws a 500 under load').id).toBe('rohit');
  });

  it('treats a named tool as stronger than a generic symptom', () => {
    expect(matchOperator('zapier is broken').id).toBe('pulkit');
    expect(matchOperator('postgres is broken').id).toBe('rohit');
  });

  it('breaks an exact tie towards the technical lane', () => {
    // One weak hit each, nothing specific either way.
    expect(matchOperator('the design has a bug').id).toBe('rohit');
  });

  it('routes hubspot work to automation', () => {
    expect(matchOperator('wire hubspot into sheets').tag).toBe('Workflow automation');
  });

  it('still returns null when nothing matches at all', () => {
    expect(matchOperator('i want to talk about something else')).toBeNull();
  });
});
