import { put } from '@vercel/blob';
import { NextRequest, NextResponse } from 'next/server';
import { withMetrics } from '@/lib/metrics';
import { isAuthorised } from '@/lib/operatorAuth';
import { isParkedFinalUrl, samplePrefix } from '@/lib/operatorOrders';
import { guardVerdict, watermarkVideo } from '@/lib/watermark';

// Draw the mark on the file the operator just uploaded.
//
// The dashboard calls this straight after the clean file lands, and swaps the
// URL it gets back into the sample slot. Nothing is emailed and no status
// moves: this produces a file and stops, so a failed encode costs a retry
// rather than an order in the wrong state.
//
// The source is not downloaded here. ffmpeg reads it over https from the same
// storage it was uploaded to, which keeps a half gigabyte out of a temporary
// directory that only holds 500MB and is shared with the encode's own output.

/** The platform kills a function at 300 seconds. lib/watermark stops itself before that. */
export const maxDuration = 300;

async function handlePost(req: NextRequest): Promise<NextResponse> {
  if (!isAuthorised(req)) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json({ error: 'File storage is not configured' }, { status: 503 });
  }

  let payload: Record<string, unknown>;
  try {
    payload = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const orderId = typeof payload.orderId === 'string' ? payload.orderId : '';
  const source = typeof payload.url === 'string' ? payload.url : '';
  if (!isParkedFinalUrl(orderId, source)) {
    return NextResponse.json({ error: 'That file does not belong to this order' }, { status: 400 });
  }

  // Size is asked of storage rather than taken from the page. The dashboard
  // checks it too and says so before uploading anything, but a check that
  // decides whether this function survives cannot live in the browser.
  const bytes = await sourceBytes(source);
  const verdict = guardVerdict({ bytes });
  if (!verdict.ok) return NextResponse.json({ error: verdict.reason }, { status: 400 });

  const encoded = await watermarkVideo(source);
  if (!encoded.ok) return NextResponse.json({ error: encoded.error }, { status: 400 });

  try {
    const stored = await put(`${samplePrefix(orderId)}watermarked.mp4`, encoded.body, {
      access: 'public',
      addRandomSuffix: true,
      contentType: 'video/mp4',
    });
    return NextResponse.json({ ok: true, url: stored.url, seconds: encoded.seconds });
  } catch (err) {
    console.error('[midsesh:operator] could not store the watermarked sample', err);
    return NextResponse.json(
      { error: 'The sample was made but could not be stored. Try again.' },
      { status: 502 },
    );
  }
}

/**
 * How large the source is, or null when storage will not say.
 *
 * Null passes the guard. A HEAD that fails is not evidence the file is too
 * big, and refusing on it would turn a storage hiccup into an operator being
 * told to go and watermark it themselves.
 */
async function sourceBytes(url: string): Promise<number | null> {
  try {
    const res = await fetch(url, { method: 'HEAD', signal: AbortSignal.timeout(10_000) });
    const length = Number(res.headers.get('content-length'));
    return Number.isFinite(length) && length > 0 ? length : null;
  } catch {
    return null;
  }
}

export const POST = withMetrics('operator-watermark', handlePost);
