'use client';

import { FormEvent, RefObject } from 'react';

// The bottom input bar. Presentational: the parent owns the value and
// decides what submitting means for the current phase.
export default function Composer({
  inputRef,
  value,
  placeholder,
  disabled,
  canSend,
  onChange,
  onSubmit,
}: {
  inputRef: RefObject<HTMLInputElement | null>;
  value: string;
  placeholder: string;
  disabled: boolean;
  canSend: boolean;
  onChange: (v: string) => void;
  onSubmit: (e: FormEvent) => void;
}) {
  return (
    <form className="composer" onSubmit={onSubmit}>
      <div className="field">
        <span className="icon-btn" aria-hidden="true">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M7 2v10M2 7h10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        </span>
        <input
          ref={inputRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          type="text"
          maxLength={500}
          aria-label="Message"
          disabled={disabled}
        />
        <button className="send" type="submit" aria-label="Send" disabled={!canSend}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path
              d="M7 11.5v-9M3.2 6.2 7 2.4l3.8 3.8"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>
    </form>
  );
}
