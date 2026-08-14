import { describe, expect, it } from 'vitest';
import { firstName, greeting, initials } from '@/lib/initials';

// The name field on the intake form is free text on a public page. It holds
// full names, single names, company names, email addresses, whole sentences
// and our own test rows, and whatever comes out of it is the first thing a
// paying customer reads. Getting it wrong is worse than not trying: "Hi," is
// neutral and "Hi TEST SUBMISSION," is a company that mails from a template.

describe('firstName', () => {
  it('takes the first word of a full name', () => {
    expect(firstName('Pulkit Walia')).toBe('Pulkit');
    expect(firstName('Andrea Carmona Arriaza')).toBe('Andrea');
  });

  it('handles a name given last name first', () => {
    expect(firstName('Walia, Pulkit')).toBe('Walia');
  });

  it('capitalises a name typed all in lowercase', () => {
    expect(firstName('pulkit walia')).toBe('Pulkit');
  });

  it('leaves deliberate capitalisation alone', () => {
    // Recapitalising these is its own small insult, and the greeting is
    // supposed to read like a person wrote it.
    expect(firstName('McDonald')).toBe('McDonald');
    expect(firstName('JP Morgan')).toBe('JP');
    expect(firstName("O'Brien")).toBe("O'Brien");
  });

  it('accepts a name in any alphabet', () => {
    expect(firstName('José Álvarez')).toBe('José');
    expect(firstName('李雷')).toBe('李雷');
    expect(firstName('अनिल शर्मा')).toBe('अनिल');
  });

  it('refuses an email address in the name field', () => {
    expect(firstName('pranav@kroslo.com')).toBeNull();
    expect(firstName('someone someone@example.com')).toBeNull();
  });

  it('refuses our own test rows', () => {
    // Real strings from mk_orders. Each one would have gone out in a greeting.
    expect(firstName('TEST SUBMISSION (ignore)')).toBeNull();
    expect(firstName('GO LIVE TEST (delete me)')).toBeNull();
    expect(firstName('test')).toBeNull();
  });

  it('refuses handles, placeholders and nothing at all', () => {
    for (const raw of ['user123', 'n/a', 'none', '-', '', '   ', null, undefined, 'x']) {
      expect(firstName(raw)).toBeNull();
    }
  });

  it('softens a name typed in shouting capitals', () => {
    expect(firstName('JOHN SMITH')).toBe('John');
    // Two letters are far more likely to be initials somebody goes by.
    expect(firstName('JP Morgan')).toBe('JP');
  });

  it('refuses a single letter and an implausibly long word', () => {
    expect(firstName('A')).toBeNull();
    expect(firstName('Bartholomewlongnameindeedyes')).toBeNull();
  });

  it('drops trailing punctuation rather than greeting somebody with it', () => {
    expect(firstName('Pulkit.')).toBe('Pulkit');
    expect(firstName('Hi, I am Pulkit')).toBe('Hi');
  });
});

describe('greeting', () => {
  it('uses the name when there is one', () => {
    expect(greeting('Pulkit Walia')).toBe('Hi Pulkit,');
  });

  it('falls back to a plain greeting rather than an empty one', () => {
    // The bug this exists to prevent is "Hi ," at the top of a real email.
    for (const raw of [null, '', '   ', 'test', 'a@b.com']) {
      expect(greeting(raw)).toBe('Hi,');
    }
  });

  it('never leaves a dangling comma or a double space', () => {
    for (const raw of ['Pulkit', null, 'rohit jain']) {
      expect(greeting(raw)).toMatch(/^Hi( \S+)?,$/);
    }
  });
});

describe('initials', () => {
  it('still does what it did', () => {
    expect(initials('Pulkit Walia')).toBe('PW');
  });
});
