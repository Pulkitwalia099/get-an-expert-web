'use client';

import { useEffect, useRef, useState } from 'react';
import type { DailyCall } from '@daily-co/daily-js';

// The live call, embedded in the chat panel. No new tab: the visitor stays
// in the conversation they were already having.
//
// This uses Daily Prebuilt rather than their call object. The call object
// would let us draw our own controls, but it also makes us responsible for
// attaching remote audio tracks, mic permission prompts, device switching
// and reconnection. Getting any of those subtly wrong on a real customer
// call means silence or an echo, and neither is testable here. Prebuilt
// owns all of it, and theming makes it look like the rest of the page.
//
// daily-js is around 200KB, so it is imported only when a call actually
// starts. It must never sit in the bundle every visitor downloads.

const THEME = {
  colors: {
    accent: '#C4593C',
    accentText: '#FFFFFF',
    background: '#F6F3ED',
    backgroundAccent: '#EFEAE1',
    baseText: '#211E1A',
    border: '#E2DCD1',
    mainAreaBg: '#F6F3ED',
    mainAreaBgAccent: '#EFEAE1',
    mainAreaText: '#211E1A',
    supportiveText: '#8B8375',
  },
};

export default function CallStage({
  roomUrl,
  onLeave,
  onRemoteJoined,
}: {
  roomUrl: string;
  onLeave: () => void;
  /** Someone else entered the room. This, not a database row, is what
   *  actually means the call connected. */
  onRemoteJoined: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const frameRef = useRef<DailyCall | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const container = ref.current;
    if (!container) return;
    let cancelled = false;

    async function start() {
      try {
        const { default: Daily } = await import('@daily-co/daily-js');
        if (cancelled || !container) return;

        const frame = Daily.createFrame(container, {
          showLeaveButton: true,
          showLocalVideo: false,
          showParticipantsBar: false,
          showFullscreenButton: false,
          showUserNameChangeUI: false,
          // So the operator sees who they walked in on rather than a blank
          // tile. The visitor is never asked to type it.
          userName: 'Visitor',
          // Audio only, so the loudest person is the only thing worth
          // showing. Removes the tile grid entirely.
          activeSpeakerMode: true,
          // Audio only. Nobody has to think about whether they are camera
          // ready, on either side of the call.
          startVideoOff: true,
          videoSource: false,
          theme: THEME,
          iframeStyle: {
            width: '100%',
            height: '100%',
            border: '0',
            borderRadius: '12px',
          },
        });
        frameRef.current = frame;

        frame.on('left-meeting', () => onLeave());
        // The operator can arrive by any route: the Answer button, or the
        // Join link in Telegram which never touches our API. Daily seeing a
        // second participant is the only signal that covers both.
        frame.on('participant-joined', () => onRemoteJoined());
        frame.on('error', (err) => {
          console.error('[midsesh:call] daily error', err);
          if (!cancelled) setFailed(true);
        });

        await frame.join({ url: roomUrl });
      } catch (err) {
        console.error('[midsesh:call] could not start the call', err);
        if (!cancelled) setFailed(true);
      }
    }

    void start();

    return () => {
      cancelled = true;
      // destroy() also removes the iframe, so the container is left clean
      // for a later call in the same session.
      void frameRef.current?.destroy();
      frameRef.current = null;
    };
  }, [roomUrl, onLeave, onRemoteJoined]);

  // Whatever went wrong, they can still get to the room. A dead panel with
  // no way forward is the one outcome worth avoiding.
  if (failed) {
    return (
      <div className="call-foot">
        <a
          className="call-cta"
          href={roomUrl}
          target="_blank"
          rel="noopener noreferrer"
        >
          Open the call
        </a>
        <p className="call-sub">The call could not load here. This opens it in a new tab.</p>
      </div>
    );
  }

  return <div className="call-stage" ref={ref} />;
}
