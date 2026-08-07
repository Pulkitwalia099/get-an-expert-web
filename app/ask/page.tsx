import { redirect } from 'next/navigation';

// This path predates the marketplace and has been linked out already. It used to
// point at the root because the root was the expert search. The root is the
// marketplace now, so it points at /search-experts instead: the destination
// moved, the meaning of the link did not, and sending these visitors to a page
// selling something else would be a worse answer than a 404.
//
// Temporary (307) rather than permanent, for the same reason /setups is: a
// browser caches a permanent redirect hard, and reversing this would strand
// anyone who had visited here.
export default function Ask() {
  redirect('/search-experts');
}
