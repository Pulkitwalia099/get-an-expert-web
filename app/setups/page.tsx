import { redirect } from 'next/navigation';

// Setups now lives at the site root. This path is on Reddit and Instagram
// already, so it has to keep working. Temporary (307) rather than permanent on
// purpose: a browser caches a permanent redirect hard, and reversing this would
// leave anyone who visited here bounced to the root with no way to tell them
// otherwise.
export default function Setups() {
  redirect('/');
}
