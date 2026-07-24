import { redirect } from 'next/navigation';

// The stuck experience now lives at the site root. Keep this path working for
// any existing links by sending it there. Temporary (307) on purpose, so it is
// easy to reverse if /stuck ever becomes its own page again.
export default function Stuck() {
  redirect('/');
}
