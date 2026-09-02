import { describe, expect, it } from 'vitest';
import { brandFromBrief, briefProse, parseReferences } from '../references';

// Pranav's actual brief, character for character, because it is the one this
// was built for and every shape in it is a shape real briefs have: a bare URL,
// a URL with a pipe and a handle after it, and a label on its own line.
const PRANAV = `https://kroslo.com/products/kadhai
https://www.instagram.com/kroslo.in/ | @kroslo.in
Reference video: https://www.instagram.com/p/DbsP5cgRPUn/`;

describe('parseReferences', () => {
  it('finds every link in a real brief, in order', () => {
    const refs = parseReferences(PRANAV);
    expect(refs.map((r) => r.kind)).toEqual(['site', 'instagram-profile', 'instagram-post']);
    expect(refs[0].display).toBe('kroslo.com/products/kadhai');
  });

  it('gives an Instagram post an embed and a profile none', () => {
    const refs = parseReferences(PRANAV);
    expect(refs[2].embed).toBe('https://www.instagram.com/p/DbsP5cgRPUn/embed');
    expect(refs[1].embed).toBeNull();
  });

  it('embeds a reel and a tv post the same way', () => {
    expect(parseReferences('https://www.instagram.com/reel/AbCdE12/')[0].embed).toBe(
      'https://www.instagram.com/reel/AbCdE12/embed',
    );
  });

  it('handles the three YouTube shapes', () => {
    expect(parseReferences('https://www.youtube.com/watch?v=dQw4w9WgXcQ')[0].embed).toBe(
      'https://www.youtube.com/embed/dQw4w9WgXcQ',
    );
    expect(parseReferences('https://youtu.be/dQw4w9WgXcQ')[0].embed).toBe(
      'https://www.youtube.com/embed/dQw4w9WgXcQ',
    );
    expect(parseReferences('https://www.youtube.com/shorts/dQw4w9WgXcQ')[0].embed).toBe(
      'https://www.youtube.com/embed/dQw4w9WgXcQ',
    );
  });

  // The whole reason this is a parser. A brief is text somebody else typed and
  // it renders on a page behind their own session.
  it('refuses every scheme that is not http or https', () => {
    expect(parseReferences('javascript:alert(1)')).toEqual([]);
    expect(parseReferences('data:text/html,<script>alert(1)</script>')).toEqual([]);
    expect(parseReferences('file:///etc/passwd')).toEqual([]);
  });

  it('never builds an embed out of unvalidated input', () => {
    // A host that merely contains instagram.com, and a path that is not a post.
    const refs = parseReferences('https://instagram.com.evil.example/p/abcdef/');
    expect(refs[0].kind).toBe('site');
    expect(refs[0].embed).toBeNull();
  });

  it('drops the punctuation a sentence put on the end', () => {
    expect(parseReferences('see https://example.com/a.')[0].url).toBe('https://example.com/a');
    expect(parseReferences('(https://example.com/b)')[0].url).toBe('https://example.com/b');
  });

  it('shows one card when the same link is written twice', () => {
    expect(parseReferences('https://example.com/a https://example.com/a/')).toHaveLength(1);
  });

  it('caps a brief that is nothing but links', () => {
    const many = Array.from({ length: 30 }, (_, i) => `https://example.com/${i}`).join(' ');
    expect(parseReferences(many)).toHaveLength(10);
  });

  it('answers empty for a brief with no links, and for no brief', () => {
    expect(parseReferences('Make it feel like the last one but shorter')).toEqual([]);
    expect(parseReferences(null)).toEqual([]);
    expect(parseReferences(undefined)).toEqual([]);
  });
});

describe('briefProse', () => {
  // The colon goes with the address it introduced. "Reference video:" hanging
  // over a card that is the reference video reads as a line cut off halfway.
  it("keeps the customer's own labels and drops the addresses", () => {
    expect(briefProse(PRANAV)).toBe('@kroslo.in\nReference video');
  });

  it('is empty when the brief was only links', () => {
    expect(briefProse('https://example.com/a\nhttps://example.com/b')).toBe('');
  });

  it('leaves a brief with no links alone', () => {
    expect(briefProse('Shorter hook, and cut the last line')).toBe('Shorter hook, and cut the last line');
  });
});

describe('brandFromBrief', () => {
  it('reads a site somebody typed without a scheme', () => {
    // Anant's brief, as written. parseReferences finds nothing in it.
    expect(
      brandFromBrief('www.mishq.in, need ads showcasing benefits of bra-fitting consultations'),
    ).toBe('Mishq');
  });

  it('reads a full url', () => {
    expect(brandFromBrief('https://kroslo.com/products/kadhai')).toBe('Kroslo');
  });

  it('skips a reference host and keeps looking for the brand', () => {
    expect(
      brandFromBrief('Reference: https://www.instagram.com/p/DbsP5cgRPUn/ | site: kroslo.com'),
    ).toBe('Kroslo');
  });

  it('is null when the brief names no site', () => {
    expect(brandFromBrief('Pulkit knows')).toBeNull();
    expect(brandFromBrief('')).toBeNull();
    expect(brandFromBrief(null)).toBeNull();
  });

  it('is null when every host in the brief is a reference', () => {
    expect(brandFromBrief('like https://instagram.com/x and https://youtu.be/y')).toBeNull();
  });
});
