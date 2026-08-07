'use client';

import AskForm from './AskForm';
import { useDialog } from './useDialog';
import sh from './sheets.module.css';

// Was inline in SetupsApp. It moved out so it can take the dialog behaviour,
// which lives in a hook and so cannot be called from a branch of a parent.
export default function AskSheet({ onClose }: { onClose: () => void }) {
  const ref = useDialog<HTMLDivElement>(onClose);

  return (
    <div className={`${sh.overlay} ${sh.center}`} onClick={onClose} role="presentation">
      <div
        ref={ref}
        tabIndex={-1}
        className={sh.askSheet}
        role="dialog"
        aria-modal="true"
        aria-label="Request a setup"
        onClick={(e) => e.stopPropagation()}
      >
        <button type="button" className={sh.x} onClick={onClose} aria-label="Close">
          ✕
        </button>
        <AskForm />
      </div>
    </div>
  );
}
