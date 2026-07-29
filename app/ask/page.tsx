import { redirect } from 'next/navigation';

// This page is the site root now. The path stays alive because it has been
// linked out already. Temporary (307) rather than permanent for the same reason
// /setups is: a browser caches a permanent redirect hard, and reversing this
// would strand anyone who had visited here.
export default function Ask() {
  redirect('/');
}
