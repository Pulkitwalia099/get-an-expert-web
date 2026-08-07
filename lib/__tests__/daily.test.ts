import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createAudioRoom } from '../daily';

const fetchMock = vi.fn();

beforeEach(() => {
  vi.stubEnv('DAILY_API_KEY', 'test-key');
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('createAudioRoom', () => {
  it('returns the room url', async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ url: 'https://x.daily.co/abc' }), { status: 200 }),
    );
    expect(await createAudioRoom('abc')).toBe('https://x.daily.co/abc');
  });

  it('asks for a room with video off on both sides', async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ url: 'https://x.daily.co/abc' }), { status: 200 }),
    );
    await createAudioRoom('abc');
    const body = JSON.parse(String(fetchMock.mock.calls[0][1].body));
    expect(body.properties.start_video_off).toBe(true);
    expect(body.properties.start_audio_off).toBe(false);
  });

  it('returns null when Daily errors', async () => {
    fetchMock.mockResolvedValue(new Response('bad', { status: 500 }));
    expect(await createAudioRoom('abc')).toBeNull();
  });

  it('returns null without an api key and makes no request', async () => {
    vi.stubEnv('DAILY_API_KEY', '');
    expect(await createAudioRoom('abc')).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('returns null when the request throws', async () => {
    fetchMock.mockRejectedValue(new Error('network'));
    expect(await createAudioRoom('abc')).toBeNull();
  });
});

describe('the room has no lobby and no panels', () => {
  it('skips the pre-join screen, so Get connected now is the last button pressed', async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ url: 'https://x.daily.co/abc' }), { status: 200 }),
    );
    await createAudioRoom('abc');
    const props = JSON.parse(String(fetchMock.mock.calls[0][1].body)).properties;
    expect(props.enable_prejoin_ui).toBe(false);
  });

  it('turns off every panel that asks the visitor to decide something', async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ url: 'https://x.daily.co/abc' }), { status: 200 }),
    );
    await createAudioRoom('abc');
    const props = JSON.parse(String(fetchMock.mock.calls[0][1].body)).properties;
    expect(props.enable_chat).toBe(false);
    expect(props.enable_screenshare).toBe(false);
    expect(props.enable_video_processing_ui).toBe(false);
    expect(props.enable_people_ui).toBe(false);
  });
});
