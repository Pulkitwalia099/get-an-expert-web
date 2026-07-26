'use client';

// The only entry point. It never says whether anyone is on, because a
// control that permanently reads "nobody is here" teaches people to stop
// looking. Presence is resolved on tap instead.
export default function CallPill({ onTap }: { onTap: () => void }) {
  return (
    <button className="call-pill" onClick={onTap} type="button">
      Talk to a human
    </button>
  );
}
