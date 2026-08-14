'use client';

import { useCallback, useEffect, useState } from 'react';
import { upload } from '@vercel/blob/client';

// The order queue, worked from a phone.
//
// One page, two views: the list of what is waiting, and one order open. No
// routing between them, because the whole thing is forty orders at most and a
// back button that never leaves the page is faster than a navigation.
//
// Nothing here emails anybody by loading. Uploads attach files and change
// nothing the customer can see; only the buttons at the bottom of an open
// order write an event and send the mail, and each one says which mail it is.

type Status = 'new' | 'working' | 'sample_sent' | 'approved' | 'delivered' | 'declined' | 'refunded';

interface Order {
  id: string;
  email: string;
  name: string | null;
  status: Status;
  serviceName: string | null;
  brief: string | null;
  createdAt: string;
  statusAt: string | null;
  events?: { status: string; note: string | null; actor: string | null; createdAt: string }[];
  parkedFinalUrl?: string | null;
  revisions?: number;
}

const LABELS: Record<Status, string> = {
  new: 'New',
  working: 'Working',
  sample_sent: 'Waiting on them',
  approved: 'Approved',
  delivered: 'Delivered',
  declined: 'Declined',
  refunded: 'Refunded',
};

function ago(iso: string): string {
  const mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (mins < 60) return `${mins}m`;
  const hours = Math.round(mins / 60);
  if (hours < 48) return `${hours}h`;
  return `${Math.round(hours / 24)}d`;
}

export default function OperatorOrders() {
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [open, setOpen] = useState<Order | null>(null);
  const [secret, setSecret] = useState('');
  const [locked, setLocked] = useState(false);
  const [error, setError] = useState('');
  const [flash, setFlash] = useState('');
  const [busy, setBusy] = useState('');

  // Uploads waiting to be sent, per slot, kept out of the order object so a
  // refresh of the queue cannot drop a file somebody just spent a minute on.
  const [sampleUrl, setSampleUrl] = useState('');
  const [finalUrl, setFinalUrl] = useState('');
  const [progress, setProgress] = useState<{ slot: string; pct: number } | null>(null);
  const [note, setNote] = useState('');

  const load = useCallback(async (): Promise<boolean> => {
    const res = await fetch('/api/operator/orders');
    if (!res.ok) {
      setLocked(true);
      return false;
    }
    const body = (await res.json()) as { orders: Order[] };
    setOrders(body.orders);
    setLocked(false);
    return true;
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

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
      setSecret('');
      await load();
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
    const res = await fetch(`/api/operator/orders?id=${encodeURIComponent(id)}`);
    if (!res.ok) {
      setError('That order could not be opened.');
      return;
    }
    const body = (await res.json()) as { order: Order };
    setOpen(body.order);
  }

  async function send(status: Status, assetUrl?: string) {
    if (!open || busy) return;
    setBusy(status);
    setError('');
    setFlash('');
    const res = await fetch('/api/operator/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId: open.id, status, note: note || null, assetUrl }),
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
    setError('');
    setProgress({ slot, pct: 0 });
    try {
      const blob = await upload(file.name, file, {
        access: 'public',
        handleUploadUrl: '/api/operator/upload',
        clientPayload: `${open.id}:${slot}`,
        onUploadProgress: ({ percentage }) => setProgress({ slot, pct: Math.round(percentage) }),
      });
      if (slot === 'sample') setSampleUrl(blob.url);
      else setFinalUrl(blob.url);
      setProgress(null);
    } catch (err) {
      setProgress(null);
      setError(err instanceof Error ? err.message : 'That upload failed.');
    }
  }

  if (locked) {
    return (
      <main className="opq">
        <h1>Orders</h1>
        <form
          className="opq-lock"
          onSubmit={(e) => {
            e.preventDefault();
            void signIn(secret.trim());
          }}
        >
          <input
            type="password"
            value={secret}
            onChange={(e) => setSecret(e.target.value)}
            placeholder="Admin password"
            autoFocus
          />
          <button className="opq-btn opq-solid" type="submit">
            Open
          </button>
        </form>
        {error && <p className="opq-error">{error}</p>}
      </main>
    );
  }

  if (open) {
    const parked = finalUrl || open.parkedFinalUrl;
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

        <section className="opq-block">
          <h2>Files</h2>
          <Drop
            label="Watermarked sample"
            url={sampleUrl}
            pct={progress?.slot === 'sample' ? progress.pct : null}
            onFile={(f) => void take(f, 'sample')}
          />
          <Drop
            label="Clean file"
            hint="Uploaded now, kept back until they approve."
            url={parked ?? ''}
            pct={progress?.slot === 'final' ? progress.pct : null}
            onFile={(f) => void take(f, 'final')}
          />
        </section>

        <section className="opq-block">
          <h2>Note</h2>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="For your own trail. The customer never sees this."
            rows={2}
          />
        </section>

        <section className="opq-actions">
          <button
            className="opq-btn opq-solid"
            disabled={!sampleUrl || !parked || busy !== ''}
            onClick={() => void send('sample_sent', sampleUrl)}
          >
            {busy === 'sample_sent' ? 'Sending' : 'Send the sample'}
          </button>
          <p className="opq-why">
            {!sampleUrl || !parked
              ? 'Needs both files. The clean one is parked, not shown to them.'
              : 'Emails them that it is ready to watch.'}
          </p>

          <button
            className="opq-btn"
            disabled={!parked || busy !== ''}
            onClick={() => void send('delivered')}
          >
            {busy === 'delivered' ? 'Delivering' : 'Deliver the clean file'}
          </button>
          <p className="opq-why">
            {parked ? 'Uses the parked file. Emails them the download.' : 'No clean file parked yet.'}
          </p>

          <button className="opq-btn" disabled={busy !== ''} onClick={() => void send('working')}>
            Mark as working
          </button>
          <p className="opq-why">Silent unless it follows a change request.</p>

          <details className="opq-danger">
            <summary>Turn it down or refund it</summary>
            <button className="opq-btn" disabled={busy !== ''} onClick={() => void send('declined')}>
              Decline
            </button>
            <button className="opq-btn" disabled={busy !== ''} onClick={() => void send('refunded')}>
              Refund
            </button>
            <button
              className="opq-btn"
              disabled={busy !== ''}
              onClick={() => {
                if (!window.confirm('Delete this order and its history? There is no undo.')) return;
                void drop();
              }}
            >
              {busy === 'delete' ? 'Deleting' : 'Delete this order'}
            </button>
            <p className="opq-why">For test rows. Emails nobody, and cannot be undone.</p>
          </details>
        </section>

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
      ) : orders.length === 0 ? (
        <p className="opq-sub">Nothing waiting. Everything is delivered or closed.</p>
      ) : (
        <ul className="opq-list">
          {orders.map((o, i) => (
            <li key={o.id} style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}>
              <button className="opq-row" onClick={() => void openOrder(o.id)}>
                <span className="opq-row-top">
                  <span className="opq-service">{o.serviceName ?? 'Order'}</span>
                  <span className={`opq-pill opq-${o.status}`}>{LABELS[o.status]}</span>
                </span>
                <span className="opq-row-meta">
                  {o.email} · waiting {ago(o.statusAt ?? o.createdAt)}
                </span>
                {o.brief && <span className="opq-row-brief">{o.brief}</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
      {error && <p className="opq-error">{error}</p>}
    </main>
  );
}

/** A drop target that is also a file input, because a phone has no drag. */
function Drop({
  label,
  hint,
  url,
  pct,
  onFile,
}: {
  label: string;
  hint?: string;
  url: string;
  pct: number | null;
  onFile: (file: File) => void;
}) {
  const [over, setOver] = useState(false);
  const done = Boolean(url) && pct === null;

  return (
    <label
      className={`opq-drop${over ? ' opq-drop-over' : ''}${done ? ' opq-drop-done' : ''}`}
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        const file = e.dataTransfer.files[0];
        if (file) onFile(file);
      }}
    >
      <input
        type="file"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onFile(file);
        }}
      />
      <span className="opq-drop-label">{label}</span>
      <span className="opq-drop-state">
        {pct !== null ? `Uploading ${pct}%` : done ? 'Attached' : 'Drop a file, or tap to pick one'}
      </span>
      {hint && !done && <span className="opq-drop-hint">{hint}</span>}
      {pct !== null && (
        <span className="opq-bar" aria-hidden="true">
          <span style={{ transform: `scaleX(${Math.max(pct, 2) / 100})` }} />
        </span>
      )}
    </label>
  );
}
