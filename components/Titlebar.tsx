'use client';

import { useEffect, useState } from 'react';
import styles from './Titlebar.module.css';
import SeshMark from './SeshMark';

// The Mac window chrome: lights, wordmark, and the privacy link. The red light
// is the only real control here. Mac chrome promises a close action, and on a
// page that is the whole site the closest honest thing is to start the
// conversation over. Yellow and green stay decoration and are hidden from
// screen readers, so this reads as one button rather than three dots.
export default function Titlebar({
  tag,
  onRestart,
  canRestart = false,
  needsConfirm = false,
  onDismiss,
}: {
  tag: string | null;
  onRestart?: () => void;
  canRestart?: boolean;
  // A live call is the one thing a restart cannot hand back, so it gets asked
  // about first. The question is inline: a native dialog freezes the page
  // under it, including the call still running there.
  needsConfirm?: boolean;
  // Present only in overlay mode. Swaps the whole titlebar for a wordmark and
  // one plain close button.
  onDismiss?: () => void;
}) {
  // Closed until the visitor asks for it. Starting this open would put the
  // confirm popover on screen at page load, warning about a call nobody is on.
  const [asking, setAsking] = useState(false);

  // The call ended some other way while the question was up. Nothing left to
  // confirm, so the popover goes with it.
  useEffect(() => {
    if (!needsConfirm) setAsking(false);
  }, [needsConfirm]);

  function handleClick() {
    if (needsConfirm) {
      setAsking((prev) => !prev);
      return;
    }
    onRestart?.();
  }

  // As an overlay there is somewhere to go back to, so the window gets one
  // obvious way out instead of three ornaments and a hidden restart. Closing
  // unmounts the chat and reopening starts a fresh session, which means this
  // button already does what the old red "start over" light did.
  if (onDismiss) {
    return (
      <div className="titlebar">
        <div className="wordmark">
          <span className="worb"><SeshMark /></span>midsesh
          {tag && <span className="tag">{tag}</span>}
        </div>
        <button type="button" className={styles.dismiss} aria-label="Close" onClick={onDismiss}>
          <svg width="15" height="15" viewBox="0 0 15 15" aria-hidden="true">
            <path
              d="M3.4 3.4 L11.6 11.6 M11.6 3.4 L3.4 11.6"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </div>
    );
  }

  return (
    <div className="titlebar">
      <div className="lights">
        <div
          className={styles.slot}
          onKeyDown={(e) => {
            if (e.key === 'Escape') setAsking(false);
          }}
        >
          <button
            type="button"
            className={styles.close}
            aria-label="Start over"
            aria-expanded={needsConfirm ? asking : undefined}
            disabled={!canRestart}
            onClick={handleClick}
          >
            <i className="r" />
            <span className={asking ? styles.tipOff : styles.tip} aria-hidden="true">
              Start over
            </span>
          </button>

          {asking && (
            <div className={styles.confirm} role="alertdialog" aria-label="Start over">
              <p className={styles.confirmText}>This ends the call you are on.</p>
              <div className={styles.confirmRow}>
                <button
                  type="button"
                  className={styles.keep}
                  autoFocus
                  onClick={() => setAsking(false)}
                >
                  Keep talking
                </button>
                <button
                  type="button"
                  className={styles.go}
                  onClick={() => {
                    setAsking(false);
                    onRestart?.();
                  }}
                >
                  Start over
                </button>
              </div>
            </div>
          )}
        </div>
        <i className="y" aria-hidden="true" />
        <i className="g" aria-hidden="true" />
      </div>
      <div className="wordmark">
        <span className="worb"><SeshMark /></span>midsesh
        {tag && <span className="tag">{tag}</span>}
      </div>
      <a className="privacy-link" href="/privacy">
        Privacy
      </a>
    </div>
  );
}
