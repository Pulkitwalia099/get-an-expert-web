import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
import { NextRequest, NextResponse } from 'next/server';
import { withMetrics } from '@/lib/metrics';
import { isAuthorised } from '@/lib/operatorAuth';
import { avatarPrefix, finalPrefix, samplePrefix } from '@/lib/operatorOrders';

// Hands the browser a short lived token so the file goes straight to Blob.
//
// The file never passes through this function, which is the whole point: a
// four hundred megabyte video uploaded over 5G would be a long request to hold
// open, and a function has a body limit that a raw video walks past. The
// browser uploads directly and this route only says who is allowed to.
//
// The pathname is built here rather than taken from the browser. A caller that
// can choose its own path can write over another order's file, and this route
// is the only thing standing between the operator secret and the bucket.

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Keeps a filename readable and harmless once it is part of a URL. */
function safeName(name: string): string {
  const clean = name
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
  return clean || 'file';
}

async function handlePost(req: NextRequest): Promise<NextResponse> {
  if (!isAuthorised(req)) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json({ error: 'File storage is not configured' }, { status: 503 });
  }

  const body = (await req.json()) as HandleUploadBody;

  try {
    const result = await handleUpload({
      body,
      request: req,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        // clientPayload is "<order id>:<sample|final>", chosen by the page and
        // checked here. Anything else gets no token.
        const [orderId, slot] = (clientPayload ?? '').split(':');
        if (!UUID.test(orderId ?? '')) throw new Error('Unknown order');
        if (slot !== 'sample' && slot !== 'final' && slot !== 'avatar') {
          throw new Error('Unknown slot');
        }

        const prefix =
          slot === 'final'
            ? finalPrefix(orderId)
            : slot === 'avatar'
              ? avatarPrefix(orderId)
              : samplePrefix(orderId);
        return {
          // A face is a still or a few seconds of one. Nothing else belongs
          // under that prefix, and the customer's page renders whatever is
          // there, so the narrower list is the guard rather than a courtesy.
          allowedContentTypes:
            slot === 'avatar'
              ? ['image/*', 'video/*']
              : ['video/*', 'image/*', 'audio/*', 'application/pdf', 'text/*'],
          // Under the order's own prefix, and with a random suffix, so two
          // files called final.mp4 cannot overwrite each other and a URL
          // cannot be guessed from the order id alone.
          pathname: `${prefix}${safeName(pathname.split('/').pop() ?? 'file')}`,
          addRandomSuffix: true,
          tokenPayload: clientPayload ?? '',
        };
      },
      onUploadCompleted: async () => {
        // Nothing to do. The sample URL is attached when the operator presses
        // Send, and the clean file is found by its prefix at delivery, so a
        // completed upload has nothing left to record.
      },
    });
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Upload failed';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export const POST = withMetrics('operator-upload', handlePost);
