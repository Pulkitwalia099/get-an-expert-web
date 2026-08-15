'use client';

import { useCallback, useEffect, useState } from 'react';
import { upload } from '@vercel/blob/client';
import OperatorActions from '@/components/OperatorActions';
import OperatorDraft from '@/components/OperatorDraft';
import { videoShape } from '@/components/OperatorDrop';
import OperatorFiles from '@/components/OperatorFiles';
import OperatorLock from '@/components/OperatorLock';
import OperatorQueueView from '@/components/OperatorQueueView';
import { useQuoteQueue } from '@/components/useQuoteQueue';
import { deliveryFor } from '@/lib/delivery';
import { ORDER_QUEUE_LABELS as LABELS } from '@/lib/operator-lanes';
import { ago } from '@/lib/promise-clock';
import { guardVerdict } from '@/lib/watermark-guard';

// The order queue, worked from a phone.
//
// One page, two views: the list of what is waiting, and one order open. No
// routing between them, because the whole thing is forty orders at most and a
// back button that never leaves the page is faster than a navigation.
//
// The list is grouped by whose turn it is and headed by four counts, which is
// OperatorQueueView. Quote requests are read separately and sit in it as a
// fifth kind of row, because they carry the same 24 hour promise and nothing
// in this tool used to show them at all.
//
// Nothing here emails anybody by loading. Uploads attach files and change
// nothing the customer can see; only the buttons at the bottom of an open
// order write an event and send the mail, and each one says which mail it is.
//
// One file goes in. The clean cut is uploaded and the server draws the mark on
// a copy of it, so the operator is never asked to produce a watermarked file
// by hand and there is no way to send a clean one by mistake. Anything too
// long or too large for a function to finish falls back to the two file flow,
// with the reason on screen rather than a silent difference in behaviour.

type Status = 'new' | 'working' | 'sample_sent' | 'approved' | 'delivered' | 'declined' | 'refunded';

interface Version {
  id: number;
  body: string;
  actor: string;
  createdAt: string;
}

interface Order {
  id: string;
  email: string;
  name: string | null;
  status: Status;
  serviceName: string | null;
  serviceSlug: string | null;
  brief: string | null;
  createdAt: string;
  statusAt: string | null;
  events?: { status: string; note: string | null; actor: string | null; createdAt: string }[];
  parkedFinalUrl?: string | null;
  parkedSampleUrl?: string | null;
  revisions?: number;
  draft?: { versions: Version[]; comments: Version[] };
}

export default function OperatorOrders() {
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [closed, setClosed] = useState<Order[]>([]);
  const [open, setOpen] = useState<Order | null>(null);
  const [locked, setLocked] = useState(false);
  const [error, setError] = useState('');
  const [flash, setFlash] = useState('');
  const [busy, setBusy] = useState('');

  // The quote requests, read separately from the orders on purpose. They are a
  // different table with a different failure, and a page that hid live orders
  // because that table was unreachable would be worse than one that says so.
  const requests = useQuoteQueue();

  // Uploads waiting to be sent, per slot, kept out of the order object so a
  // refresh of the queue cannot drop a file somebody just spent a minute on.
  const [sampleUrl, setSampleUrl] = useState('');
  const [finalUrl, setFinalUrl] = useState('');
  const [progress, setProgress] = useState<{ slot: string; pct: number } | null>(null);
  const [note, setNote] = useState('');

  // Set only when the server is not going to produce the sample: too long, too
  // large, or an encode that failed. It carries the sentence explaining why and
  // its presence is what puts the second drop target back on screen.
  const [twoFiles, setTwoFiles] = useState('');
  const [marking, setMarking] = useState(false);

  // The draft being written, for a service that delivers words. Seeded from
  // the current version when an order is opened, so editing starts from what
  // is already there rather than from an empty box.
  const [draft, setDraft] = useState('');

  const load = useCallback(async (): Promise<boolean> => {
    const res = await fetch('/api/operator/orders');
    if (!res.ok) {
      setLocked(true);
      return false;
    }
    const body = (await res.json()) as { orders: Order[]; closed?: Order[] };
    setOrders(body.orders);
    setClosed(body.closed ?? []);
    setLocked(false);
    return true;
  }, []);

  const loadQuotes = requests.load;
  useEffect(() => {
    void load();
    void loadQuotes();
  }, [load, loadQuotes]);

  // The password may arrive once in the address bar, and is taken straight out
  // of it, so a screenshot of this page is not a credential.
  useEffect(() => {
    const raw = window.location.search.slice(1).split('&').find((p) => p.startsWith('secret='));
    if (!raw) return;
    const value = decodeURIComponent(raw.slice('secret='.length));
    const url = new URL(window.location.href);
    url.searchParams.delete('secret');
    window.history.replaceState({}, '', url.pathname + url.hash);
    void signIn(value);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function signIn(value: string) {
    const res = await fetch('/api/operator/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secret: value }),
    });
    if (res.ok) {
      await load();
      await loadQuotes();
    } else {
      setError('That password is not right.');
    }
  }

  async function openOrder(id: string) {
    setError('');
    setFlash('');
    setSampleUrl('');
    setFinalUrl('');
    setNote('');
    setTwoFiles('');
    setMarking(false);
    const res = await fetch(`/api/operator/orders?id=${encodeURIComponent(id)}`);
    if (!res.ok) {
      setError('That order could not be opened.');
      return;
    }
    const body = (await res.json()) as { order: Order };
    setOpen(body.order);
    setDraft(body.order.draft?.versions[0]?.body ?? '');
  }

  async function send(status: Status, assetUrl?: string) {
    if (!open || busy) return;
    setBusy(status);
    setError('');
    setFlash('');
    const res = await fetch('/api/operator/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        orderId: open.id,
        status,
        note: note || null,
        assetUrl,
        draft: deliveryFor(open.serviceSlug) === 'text' ? draft : null,
      }),
    });
    const body = (await res.json().catch(() => null)) as
      | { ok?: boolean; message?: string; error?: string }
      | null;
    setBusy('');
    if (!res.ok) {
      setError(body?.error ?? 'That did not go through.');
      return;
    }
    setFlash(body?.message ?? 'Saved.');
    setNote('');
    await load();
    await openOrder(open.id);
  }

  async function drop() {
    if (!open || busy) return;
    setBusy('delete');
    setError('');
    const res = await fetch(`/api/operator/orders?id=${encodeURIComponent(open.id)}`, {
      method: 'DELETE',
    });
    const body = (await res.json().catch(() => null)) as { message?: string; error?: string } | null;
    setBusy('');
    if (!res.ok) {
      setError(body?.error ?? 'That did not delete.');
      return;
    }
    setOpen(null);
    setFlash(body?.message ?? 'Deleted.');
    await load();
  }

  async function take(file: File, slot: 'sample' | 'final') {
    if (!open) return;
    const order = open.id;
    setError('');

    // Asked before the upload, not after, so somebody with a ten minute cut
    // hears about it now rather than at the end of a four minute upload. The
    // server checks again with ffprobe, because a browser can be wrong about a
    // file and this side is only the courtesy.
    let watermarkable = slot === 'final';
    if (slot === 'final') {
      const verdict = guardVerdict({ bytes: file.size, ...(await videoShape(file)) });
      watermarkable = verdict.ok;
      setTwoFiles(verdict.reason ?? '');
    }

    setProgress({ slot, pct: 0 });
    try {
      const blob = await upload(file.name, file, {
        access: 'public',
        handleUploadUrl: '/api/operator/upload',
        clientPayload: `${order}:${slot}`,
        onUploadProgress: ({ percentage }) => setProgress({ slot, pct: Math.round(percentage) }),
      });
      setProgress(null);
      if (slot === 'sample') {
        setSampleUrl(blob.url);
        return;
      }
      setFinalUrl(blob.url);
      if (watermarkable) await drawMark(order, blob.url);
    } catch (err) {
      setProgress(null);
      setError(err instanceof Error ? err.message : 'That upload failed.');
    }
  }

  /**
   * Ask the server for the watermarked copy.
   *
   * A failure here is not an error at the top of the page. It is a fallback:
   * the second drop target comes back with the reason on it, and the operator
   * carries on rather than being told something went wrong and left to guess
   * what to do about it.
   */
  async function drawMark(orderId: string, url: string) {
    setMarking(true);
    try {
      const res = await fetch('/api/operator/watermark', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, url }),
      });
      const body = (await res.json().catch(() => null)) as
        | { url?: string; error?: string }
        | null;
      if (!res.ok || !body?.url) {
        setTwoFiles(body?.error ?? 'The watermark did not run. Upload the sample yourself.');
        return;
      }
      setSampleUrl(body.url);
      setTwoFiles('');
    } catch {
      setTwoFiles('The watermark did not finish here. Upload the sample yourself.');
    } finally {
      setMarking(false);
    }
  }

  if (locked) {
    return <OperatorLock error={error} onSignIn={(value) => void signIn(value)} />;
  }

  if (open) {
    const parked = finalUrl || open.parkedFinalUrl;
    // The sample this page just made, or one made on an earlier visit and left
    // in storage when the tab was closed. Either is the same file to send.
    const sample = sampleUrl || open.parkedSampleUrl;
    // A LinkedIn order hands over words. Everything below that says "file"
    // asks this first, because for those orders there is no file at any point.
    const text = deliveryFor(open.serviceSlug) === 'text';
    const versions = open.draft?.versions ?? [];
    const comments = open.draft?.comments ?? [];
    const edited = draft.trim() !== (versions[0]?.body.trim() ?? '');
    // What Send needs before it is allowed: words for a text order, both files
    // for everything else.
    const sendable = text ? draft.trim().length > 0 : Boolean(sample && parked);
    return (
      <main className="opq">
        <button className="opq-back" onClick={() => setOpen(null)}>
          Back to the queue
        </button>

        <h1>{open.serviceName ?? 'Order'}</h1>
        <p className="opq-sub">
          {open.email} · {LABELS[open.status]} · {ago(open.statusAt ?? open.createdAt)} ago
          {open.revisions ? ` · ${open.revisions} change request${open.revisions > 1 ? 's' : ''}` : ''}
        </p>

        {open.brief && <p className="opq-brief">{open.brief}</p>}

        {flash && <p className="opq-flash">{flash}</p>}
        {error && <p className="opq-error">{error}</p>}

        {text ? (
          <OperatorDraft
            draft={draft}
            onDraft={setDraft}
            versions={versions}
            comments={comments}
            ago={ago}
          />
        ) : (
          <OperatorFiles
            parked={parked ?? null}
            sample={sample ?? null}
            uploading={progress}
            marking={marking}
            twoFiles={twoFiles}
            onFile={(f, slot) => void take(f, slot)}
          />
        )}

        <section className="opq-block">
          <h2>Note</h2>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="For your own trail. The customer never sees this."
            rows={2}
          />
        </section>

        <OperatorActions
          text={text}
          sendable={sendable}
          edited={edited}
          marking={marking}
          parked={parked ?? null}
          sample={sample ?? null}
          busy={busy}
          onSend={(status, assetUrl) => void send(status, assetUrl)}
          onDelete={() => void drop()}
        />

        {open.events && open.events.length > 0 && (
          <section className="opq-block">
            <h2>Trail</h2>
            <ul className="opq-trail">
              {open.events.map((e, i) => (
                <li key={i}>
                  <span className="opq-trail-s">{LABELS[e.status as Status] ?? e.status}</span>
                  <span className="opq-trail-m">
                    {ago(e.createdAt)} ago{e.actor ? ` · ${e.actor}` : ''}
                    {e.note ? ` · ${e.note}` : ''}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>
    );
  }

  return (
    <main className="opq">
      <h1>Orders</h1>
      {orders === null ? (
        <p className="opq-sub">Loading.</p>
      ) : (
        <OperatorQueueView
          orders={orders}
          closed={closed}
          quotes={requests.quotes}
          quotesError={requests.error}
          busyQuote={requests.busy}
          onOpen={(id) => void openOrder(id)}
          onMoveQuote={(id, status) => void requests.move(id, status)}
        />
      )}
      {error && <p className="opq-error">{error}</p>}
    </main>
  );
}
