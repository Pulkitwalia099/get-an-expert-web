// Preserve the original encodes, but serve them directly instead of through
// the external rewrite that cached partial Range responses as whole files.
import { mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const probe = require('@ffprobe-installer/ffprobe').path;
const destination = new URL('../public/media/content/', import.meta.url);
await mkdir(destination, { recursive: true });
for (const name of ['ugc', 'street', 'storyboard', 'product', 'viral', 'kaftan-v2']) {
  const url = `https://midsesh-preview.vercel.app/content/video/${name}.mp4?full-copy=20260928`;
  const response = await fetch(url);
  if (response.status !== 200 || response.headers.has('content-range')) throw Error(`Partial response: ${name}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.length < 1000000 || bytes.indexOf('moov') > bytes.indexOf('mdat')) throw Error(`Invalid MP4: ${name}`);
  const file = new URL(`${name}.mp4`, destination);
  await writeFile(file, bytes);
  const metadata = JSON.parse(execFileSync(probe, ['-v', 'error', '-show_entries', 'stream=codec_name,width,height,pix_fmt:format=duration', '-of', 'json', file.pathname], { encoding: 'utf8' }));
  console.log(JSON.stringify({ name, bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex'), ...metadata }));
}
