import { execFile } from 'node:child_process';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import ffmpeg from '@ffmpeg-installer/ffmpeg';
import ffprobe from '@ffprobe-installer/ffprobe';
import { describe, expect, it } from 'vitest';
import { markGeometry, probe, watermarkVideo } from '@/lib/watermark';

// A real encode, with the same ffmpeg build the function uses.
//
// Off by default, because it spends about a minute and every other test in
// this repo runs in milliseconds. It exists because the unit tests above prove
// the arithmetic and prove nothing about the binary: the filter that draws a
// 269px mark on one ffmpeg draws a 42px one on another, and that is exactly
// the bug this file would have caught.
//
//   WATERMARK_LIVE=1 npx vitest run lib/__tests__/watermark.live.test.ts

const live = process.env.WATERMARK_LIVE === '1';
const run = promisify(execFile);

/** Eight seconds of colour at a given size, with a tone so the audio copy is real. */
async function clip(dir: string, name: string, size: string): Promise<string> {
  const path = join(dir, name);
  await run(
    ffmpeg.path,
    [
      '-hide_banner', '-loglevel', 'error', '-y',
      '-f', 'lavfi', '-i', `testsrc=size=${size}:rate=25:duration=8`,
      '-f', 'lavfi', '-i', 'sine=frequency=440:duration=8',
      '-c:v', 'libx264', '-preset', 'ultrafast', '-pix_fmt', 'yuv420p', '-c:a', 'aac',
      path,
    ],
    { maxBuffer: 1024 * 1024 },
  );
  return path;
}

/** What the result actually is, read back rather than assumed. */
async function shape(path: string): Promise<{ width: number; height: number; audio: boolean }> {
  const { stdout } = await run(
    ffprobe.path,
    ['-v', 'error', '-show_streams', '-of', 'json', path],
    { maxBuffer: 4 * 1024 * 1024 },
  );
  const parsed = JSON.parse(stdout) as {
    streams?: { codec_type?: string; width?: number; height?: number }[];
  };
  const video = parsed.streams?.find((s) => s.codec_type === 'video');
  return {
    width: video?.width ?? 0,
    height: video?.height ?? 0,
    audio: (parsed.streams ?? []).some((s) => s.codec_type === 'audio'),
  };
}

describe.skipIf(!live)('a real encode', () => {
  it('watermarks a landscape cut and keeps its size and its audio', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'wm-live-'));
    const source = await clip(dir, 'wide.mp4', '1920x1080');

    const result = await watermarkVideo(source);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const out = join(dir, 'out.mp4');
    await writeFile(out, result.body);
    const shaped = await shape(out);
    expect(shaped.width).toBe(1920);
    expect(shaped.height).toBe(1080);
    expect(shaped.audio).toBe(true);
    expect(result.seconds).toBeGreaterThan(7);
  }, 180_000);

  it('reads a vertical cut at its real size and sizes the mark for it', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'wm-live-'));
    const source = await clip(dir, 'phone.mp4', '1080x1920');

    const info = await probe(source);
    expect(info).not.toBeNull();
    expect(info!.width).toBe(1080);
    expect(info!.height).toBe(1920);
    // Smaller in pixels than the 270 a 1920 wide cut gets, and the same
    // fraction of the frame, which is the whole point of the ratio.
    expect(markGeometry(info!.width).width).toBe(152);

    const result = await watermarkVideo(source);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    await writeFile(join(dir, 'out.mp4'), result.body);
    expect(await shape(join(dir, 'out.mp4'))).toMatchObject({ width: 1080, height: 1920 });
  }, 180_000);

  it('refuses a cut longer than the guard, without encoding any of it', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'wm-live-'));
    const args = [
      '-hide_banner', '-loglevel', 'error', '-y',
      '-f', 'lavfi', '-i', 'testsrc=size=320x240:rate=10:duration=130',
      '-c:v', 'libx264', '-preset', 'ultrafast', '-pix_fmt', 'yuv420p',
      join(dir, 'long.mp4'),
    ];
    await run(ffmpeg.path, args, { maxBuffer: 1024 * 1024 });

    const started = Date.now();
    const result = await watermarkVideo(join(dir, 'long.mp4'));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toContain('upload the watermarked sample too');
    // The refusal comes from the probe, so it is immediate rather than after
    // two minutes of encoding something that was always going to be rejected.
    expect(Date.now() - started).toBeLessThan(20_000);
  }, 180_000);
});
