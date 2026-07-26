// Creates the audio room a call runs in. Returns null on every failure so
// the caller can fall back to booking instead of showing a broken call.

if (typeof window !== 'undefined') {
  throw new Error('lib/daily is server-only and must never reach the client');
}

const TIMEOUT_MS = 5_000;
const ROOM_MINUTES = 60;

export async function createAudioRoom(callId: string): Promise<string | null> {
  const key = process.env.DAILY_API_KEY;
  if (!key) return null;
  try {
    const res = await fetch('https://api.daily.co/v1/rooms', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: `midsesh-${callId}`,
        privacy: 'public',
        properties: {
          // Audio only. Both sides join muted-video; nobody has to think
          // about whether they are camera ready.
          start_video_off: true,
          start_audio_off: false,

          // No lobby. Daily's pre-join screen asks a visitor to pick a
          // camera and a mic and then press Join, which is three decisions
          // and a second button after they already pressed Get connected
          // now. They go straight into the room instead.
          enable_prejoin_ui: false,

          // Every other panel that invites a decision. None of them belong
          // on a fifteen minute audio call with a stranger.
          enable_chat: false,
          enable_screenshare: false,
          enable_video_processing_ui: false,
          enable_people_ui: false,
          enable_network_ui: false,
          enable_noise_cancellation_ui: false,

          exp: Math.floor(Date.now() / 1000) + ROOM_MINUTES * 60,
        },
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) {
      console.error('[midsesh:daily] room create failed', res.status, await res.text());
      return null;
    }
    const data = (await res.json()) as { url?: string };
    return data.url ?? null;
  } catch (err) {
    console.error('[midsesh:daily] room create failed', err);
    return null;
  }
}
