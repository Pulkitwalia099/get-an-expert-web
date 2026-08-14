'use client';

// What the operator can do to one order, and what each one will send.
//
// Split out of app/operator/orders/page.tsx when that page passed 400 lines.
// Every button here writes an event and most of them email the customer, so
// each one carries a line underneath saying which. That line is the feature:
// a dashboard where you have to remember what a button does is a dashboard
// somebody eventually presses the wrong thing on.

export default function OperatorActions({
  text,
  sendable,
  edited,
  marking,
  parked,
  sample,
  busy,
  onSend,
  onDelete,
}: {
  /** True when this order hands over words rather than a file. */
  text: boolean;
  sendable: boolean;
  edited: boolean;
  marking: boolean;
  parked: string | null;
  sample: string | null;
  busy: string;
  onSend: (
    status: 'sample_sent' | 'delivered' | 'working' | 'declined' | 'refunded',
    assetUrl?: string,
  ) => void;
  onDelete: () => void;
}) {
  const send = onSend;
  const drop = onDelete;
  return (
        <section className="opq-actions">
          <button
            className="opq-btn opq-solid"
            disabled={!sendable || marking || busy !== ''}
            onClick={() => send('sample_sent', text ? undefined : sample ?? undefined)}
          >
            {busy === 'sample_sent' ? 'Sending' : text ? 'Send the draft' : 'Send the sample'}
          </button>
          <p className="opq-why">
            {text
              ? sendable
                ? 'Emails them that it is ready to read. They can edit it and comment on it.'
                : 'Write the post first.'
              : marking
                ? 'Waiting on the watermark.'
                : !parked
                  ? 'Drop the clean cut first.'
                  : !sample
                    ? 'The clean file is here but the sample is not. Upload one above.'
                    : 'Emails them that it is ready to watch. The clean file stays parked.'}
          </p>

          <button
            className="opq-btn"
            disabled={(text ? !sendable : !parked) || busy !== ''}
            onClick={() => send('delivered')}
          >
            {busy === 'delivered'
              ? 'Delivering'
              : text
                ? 'Hand the post over'
                : 'Deliver the clean file'}
          </button>
          <p className="opq-why">
            {text
              ? edited
                ? 'Saves what is in the box and hands that over as the final post.'
                : 'Hands the current version over as the final post.'
              : parked
                ? 'Uses the parked file. Emails them the download.'
                : 'No clean file parked yet.'}
          </p>

          <button className="opq-btn" disabled={busy !== ''} onClick={() => send('working')}>
            Mark as working
          </button>
          <p className="opq-why">Silent unless it follows a change request.</p>

          <details className="opq-danger">
            <summary>Turn it down or refund it</summary>
            <button className="opq-btn" disabled={busy !== ''} onClick={() => send('declined')}>
              Decline
            </button>
            <button className="opq-btn" disabled={busy !== ''} onClick={() => send('refunded')}>
              Refund
            </button>
            <button
              className="opq-btn"
              disabled={busy !== ''}
              onClick={() => {
                if (!window.confirm('Delete this order and its history? There is no undo.')) return;
                drop();
              }}
            >
              {busy === 'delete' ? 'Deleting' : 'Delete this order'}
            </button>
            <p className="opq-why">For test rows. Emails nobody, and cannot be undone.</p>
          </details>
        </section>
  );
}
