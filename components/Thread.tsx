'use client';

import { initials } from '@/lib/initials';
import TypingStatus from '@/components/TypingStatus';

export interface Msg {
  id: number;
  role: 'user' | 'ai';
  text: string;
  chips?: string[];
  avatars?: { name: string; photo: string | null }[];
  retry?: boolean;
}

// The message list: bubbles, avatar stacks, quick-reply chips on the last
// AI turn, and the typing indicator.
export default function Thread({
  msgs,
  typing,
  chipsActive,
  onSend,
}: {
  msgs: Msg[];
  typing: boolean;
  // Quick replies only render on the newest AI message while in the chat
  // phase; the parent decides when that is.
  chipsActive: boolean;
  onSend: (text: string, retry?: boolean) => void;
}) {
  const last = msgs[msgs.length - 1];

  return (
    <>
      {msgs.map((m) =>
        m.role === 'user' ? (
          <div key={m.id} className="msg user">
            <div className="bubble">{m.text}</div>
          </div>
        ) : (
          <div key={m.id} className="msg ai">
            <div className="ava">✳︎</div>
            <div className="body">
              {m.avatars && m.avatars.length > 0 && (
                <div className="mini-avs">
                  {m.avatars.map((a) =>
                    a.photo ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img key={a.name} className="mini-av" src={a.photo} alt={a.name} />
                    ) : (
                      <div key={a.name} className="mini-av">
                        {initials(a.name)}
                      </div>
                    ),
                  )}
                </div>
              )}
              <div className="text">{m.text}</div>
              {m.chips && m.chips.length > 0 && m === last && chipsActive && (
                <div className="qchips">
                  {m.chips.map((c) => (
                    <button key={c} className="qchip" onClick={() => onSend(c)}>
                      {c}
                    </button>
                  ))}
                </div>
              )}
              {m.retry && m === last && chipsActive && (
                <div className="qchips">
                  <button className="qchip" onClick={() => onSend('', true)}>
                    Try again
                  </button>
                </div>
              )}
            </div>
          </div>
        ),
      )}

      {typing && (
        <div className="msg ai">
          <div className="ava">✳︎</div>
          <div className="body">
            <TypingStatus />
          </div>
        </div>
      )}
    </>
  );
}
