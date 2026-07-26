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

  it('falls back to Rohit and his fallback tag when nothing matches', () => {
    expect(matchOperator('i want to talk about something else')).toEqual({
      id: 'rohit',
      tag: 'Code & engineering',
    });
  });

  it('prefers the earlier tag when two match, so order is the priority', () => {
    // 'api' is in Payments & APIs, 'database' is in Backend & databases.
    expect(matchOperator('an api that reads the database').tag).toBe('Payments & APIs');
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
