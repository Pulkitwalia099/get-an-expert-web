// Read-only deployment check: two different ranges followed by a complete
// response on the SAME URL. A HEAD-only check misses poisoned partial caches.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const base = process.argv[2] || 'https://midsesh.com';
const html = await (await fetch(base, { signal: AbortSignal.timeout(20000) })).text();
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const clips = [...new Set([...html.matchAll(/<source src="([^"]+\.mp4)"/g)].map(m => m[1]))];
assert.equal(clips.length, 8);
for (const path of clips) {
  assert(!path.startsWith('/content/video/'), 'Legacy proxy still in page');
  const local = await readFile(new URL('../public' + path, import.meta.url));
  const url = new URL(path, base); url.searchParams.set('delivery-check', String(Date.now()));
  for (const [start, end] of [[0, 1], [2048, 4095]]) {
    const response = await fetch(url, { headers: { Range: `bytes=${start}-${end}` }, signal: AbortSignal.timeout(20000) });
    const bytes = Buffer.from(await response.arrayBuffer());
    assert.equal(response.status, 206, path);
    assert.equal(response.headers.get('content-range'), `bytes ${start}-${end}/${local.length}`, path);
    assert.deepEqual(bytes, local.subarray(start, end + 1), path);
  }
  const response = await fetch(url, { signal: AbortSignal.timeout(20000) });
  const bytes = Buffer.from(await response.arrayBuffer());
  assert.equal(response.status, 200, path);
  assert.equal(response.headers.get('content-range'), null, path);
  assert.equal(hash(bytes), hash(local), path);
  console.log(`PASS ranges + full SHA256: ${path} (${bytes.length} bytes)`);
}
const resources = [...new Set([...html.matchAll(/(?:src|href|poster)="(\/[^"#]+)"/g)].map(m => m[1]))];
for (const path of resources.filter(p => !clips.includes(p))) {
  const response = await fetch(new URL(path, base), { method: 'HEAD', signal: AbortSignal.timeout(20000) });
  assert(response.ok, `${path}: ${response.status}`);
  console.log(`PASS ${response.status}: ${path}`);
}
