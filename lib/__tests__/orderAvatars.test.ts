import { beforeEach, describe, expect, it, vi } from 'vitest';

// The lineup renders on a page behind somebody's session, so a row pointing
// anywhere but our own storage would tell whoever runs that host that this
// customer opened their order. Same reasoning as `isParkedFinalUrl`, one step
// earlier: this one guards an `<img>` rather than an ffmpeg input.

const selectRows = vi.fn<(table: string, query: string) => Promise<unknown[] | null>>(
  async () => [],
);
vi.mock('@/lib/supabase', () => ({ selectRows, patchRows: vi.fn(), insertRows: vi.fn() }));

const { avatarsFor } = await import('@/lib/orderAvatars');

const ID = '01dd1d17-fcdb-4518-bd81-96c557f90758';
const OURS = 'https://x.public.blob.vercel-storage.com/face.jpg';

function row(over: Record<string, unknown> = {}) {
  return {
    slug: 'team-b',
    name: 'The Hinglish one',
    kind: 'Phone-shot UGC',
    image_url: OURS,
    clip_url: null,
    note: 'Held the room.',
    picked: true,
    ...over,
  };
}

beforeEach(() => {
  selectRows.mockClear();
  selectRows.mockResolvedValue([]);
});

describe('avatarsFor', () => {
  it('reads a row back whole', async () => {
    selectRows.mockResolvedValue([row()]);
    expect(await avatarsFor(ID)).toEqual([
      {
        slug: 'team-b',
        name: 'The Hinglish one',
        kind: 'Phone-shot UGC',
        imageUrl: OURS,
        clipUrl: null,
        note: 'Held the room.',
        picked: true,
      },
    ]);
  });

  it.each([
    ['a third party host', 'https://evil.example.com/face.jpg'],
    ['plain http on our own host', 'http://x.public.blob.vercel-storage.com/face.jpg'],
    ['a host that merely ends in something similar', 'https://blob.vercel-storage.com.evil.io/f.jpg'],
    ['a data url', 'data:image/png;base64,AAAA'],
    ['nothing at all', null],
  ])('drops a face whose image is %s', async (_label, image_url) => {
    selectRows.mockResolvedValue([row({ image_url })]);
    expect(await avatarsFor(ID)).toEqual([]);
  });

  it('drops a clip that is not ours but keeps the face', async () => {
    selectRows.mockResolvedValue([row({ clip_url: 'https://evil.example.com/c.mp4' })]);
    const [face] = await avatarsFor(ID);
    expect(face.clipUrl).toBeNull();
    expect(face.imageUrl).toBe(OURS);
  });

  it('treats anything but true as not picked', async () => {
    selectRows.mockResolvedValue([row({ picked: 'yes' })]);
    expect((await avatarsFor(ID))[0].picked).toBe(false);
  });

  it('refuses an id that is not a uuid, without querying', async () => {
    expect(await avatarsFor('../../etc')).toEqual([]);
    expect(selectRows).not.toHaveBeenCalled();
  });

  it('renders nothing rather than throwing when Supabase is unreachable', async () => {
    selectRows.mockResolvedValue(null as unknown as unknown[]);
    expect(await avatarsFor(ID)).toEqual([]);
  });
});
