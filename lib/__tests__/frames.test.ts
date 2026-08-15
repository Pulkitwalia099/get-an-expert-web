import { describe, expect, it } from 'vitest';
import {
  compileNotes,
  frameAt,
  framesToLines,
  isFrameNote,
  parseFrameLines,
  parseFrames,
  seconds,
  span,
  timecode,
} from '../frames';

const SHOTS = [
  { n: 1, t: 0, d: 0.6, name: 'Black, and one sound' },
  { n: 2, t: 0.6, d: 1.8, name: 'Two hands lower it in' },
  { n: 3, t: 2.4, d: 1.2, name: 'The hands leave' },
];

describe('timecode', () => {
  it('always carries a decimal, because shots run in fractions', () => {
    expect(timecode(0)).toBe('0:00.0');
    expect(timecode(0.6)).toBe('0:00.6');
    expect(timecode(17.2)).toBe('0:17.2');
    expect(timecode(63.4)).toBe('1:03.4');
  });

  it('does not print a negative or a NaN at somebody', () => {
    expect(timecode(-4)).toBe('0:00.0');
    expect(timecode(Number.NaN)).toBe('0:00.0');
  });
});

describe('parseFrames', () => {
  it('takes a good list', () => {
    const frames = parseFrames(SHOTS);
    expect(frames).toHaveLength(3);
    expect(frames![2].name).toBe('The hands leave');
  });

  // This repo does not own mk_order_events, so the shape is checked rather
  // than trusted. None of these may throw on a page somebody is waiting on.
  it('answers null for anything that is not a usable list', () => {
    expect(parseFrames(null)).toBeNull();
    expect(parseFrames('[]')).toBeNull();
    expect(parseFrames([])).toBeNull();
    expect(parseFrames([{ t: 'x', d: 1 }])).toBeNull();
    expect(parseFrames([{ t: 0, d: 0 }])).toBeNull();
    expect(parseFrames([{ t: -1, d: 2 }])).toBeNull();
  });

  it('renumbers from the cut, so a bad stored list cannot show two frame 4s', () => {
    const frames = parseFrames([
      { n: 9, t: 2.4, d: 1.2, name: 'third' },
      { n: 9, t: 0, d: 0.6, name: 'first' },
      { n: 9, t: 0.6, d: 1.8, name: 'second' },
    ]);
    expect(frames!.map((f) => [f.n, f.name])).toEqual([
      [1, 'first'],
      [2, 'second'],
      [3, 'third'],
    ]);
  });

  it('names a shot that arrived without one', () => {
    expect(parseFrames([{ t: 0, d: 1 }])![0].name).toBe('Shot 1');
  });

  it('flattens a name with newlines in it, because it is drawn on one line', () => {
    expect(parseFrames([{ t: 0, d: 1, name: 'a\n\nb' }])![0].name).toBe('a b');
  });
});

describe('frameAt', () => {
  it('finds the shot a second falls in', () => {
    expect(frameAt(SHOTS, 0).n).toBe(1);
    expect(frameAt(SHOTS, 0.6).n).toBe(2);
    expect(frameAt(SHOTS, 2.39).n).toBe(2);
    expect(frameAt(SHOTS, 99).n).toBe(3);
  });
});

describe('compileNotes', () => {
  it('writes the block an editor reads, frames first and in order', () => {
    const out = compileNotes(
      [
        { frame: null, text: 'Warmer than the reference overall.' },
        { frame: 3, text: 'Hands leave too early.' },
        { frame: 1, text: 'Open on the tick, not the black.' },
      ],
      SHOTS,
    );
    expect(out).toBe(
      [
        'Frame 1  (0:00.0 to 0:00.6)',
        '  Black, and one sound',
        '  Open on the tick, not the black.',
        '',
        'Frame 3  (0:02.4 to 0:03.6)',
        '  The hands leave',
        '  Hands leave too early.',
        '',
        'Whole video',
        '  Warmer than the reference overall.',
      ].join('\n'),
    );
  });

  // A tab left open across a recut is the case this protects. The note is
  // worth more than the heading, so the heading is what goes.
  it('keeps the words when the frame number names nothing', () => {
    const out = compileNotes([{ frame: 99, text: 'Still says something.' }], SHOTS);
    expect(out).toBe('Whole video\n  Still says something.');
  });

  it('drops an empty note rather than writing a heading over nothing', () => {
    expect(compileNotes([{ frame: 1, text: '   ' }], SHOTS)).toBe('');
  });

  it('caps a very long single note', () => {
    const out = compileNotes([{ frame: 1, text: 'x'.repeat(5000) }], SHOTS);
    expect(out.length).toBeLessThan(700);
  });
});

describe('seconds', () => {
  it('reads the shapes a person actually types', () => {
    expect(seconds('0:02.4')).toBeCloseTo(2.4);
    expect(seconds('2.4')).toBeCloseTo(2.4);
    expect(seconds(':02')).toBe(2);
    expect(seconds('1:02.5')).toBeCloseTo(62.5);
    expect(seconds('01:02')).toBe(62);
  });

  it('refuses what is not a time', () => {
    expect(seconds('')).toBeNull();
    expect(seconds('soon')).toBeNull();
    expect(seconds('-3')).toBeNull();
    expect(seconds('1:2:3:4')).toBeNull();
  });
});

describe('parseFrameLines', () => {
  it('takes explicit ranges', () => {
    const frames = parseFrameLines('0:00.0-0:00.6  Black\n0:00.6-0:02.4  Hands lower it')!;
    expect(frames).toHaveLength(2);
    expect(frames[0].d).toBeCloseTo(0.6);
    expect(frames[1].name).toBe('Hands lower it');
  });

  // The next line already says where this shot stops, so making somebody type
  // every boundary twice is a rule for the parser's benefit, not theirs.
  it('takes a bare start and reads the end off the next line', () => {
    const frames = parseFrameLines('0:00.0  Black\n0:00.6  Hands\n0:02.4  They leave')!;
    expect(frames[0].d).toBeCloseTo(0.6);
    expect(frames[1].d).toBeCloseTo(1.8);
  });

  it('gives the last shot a tail rather than refusing the whole list', () => {
    const frames = parseFrameLines('0:00.0  Black\n0:00.6  Hands')!;
    expect(frames[1].d).toBe(2);
  });

  it('sorts and renumbers whatever order it was typed in', () => {
    const frames = parseFrameLines('0:02.4  third\n0:00.0  first\n0:00.6  second')!;
    expect(frames.map((f) => f.name)).toEqual(['first', 'second', 'third']);
    expect(frames.map((f) => f.n)).toEqual([1, 2, 3]);
  });

  it('skips a line that is not a shot, and answers null for nothing usable', () => {
    expect(parseFrameLines('a heading\n0:00.0  Black')).toHaveLength(1);
    expect(parseFrameLines('')).toBeNull();
    expect(parseFrameLines('just some prose')).toBeNull();
  });

  it('round trips through the lines an operator edits', () => {
    const text = '0:00.0-0:00.6  Black, and one sound\n0:00.6-0:02.4  Two hands lower it in';
    expect(framesToLines(parseFrameLines(text))).toBe(text);
  });
});

describe('isFrameNote', () => {
  it('accepts a frame note and a whole video note', () => {
    expect(isFrameNote({ frame: 2, text: 'hi' })).toBe(true);
    expect(isFrameNote({ frame: null, text: 'hi' })).toBe(true);
  });

  it('rejects the shapes a browser should never send', () => {
    expect(isFrameNote({ frame: 0, text: 'hi' })).toBe(false);
    expect(isFrameNote({ frame: 1.5, text: 'hi' })).toBe(false);
    expect(isFrameNote({ frame: '1', text: 'hi' })).toBe(false);
    expect(isFrameNote({ frame: 1, text: '  ' })).toBe(false);
    expect(isFrameNote(null)).toBe(false);
  });
});
