// Where the back control on /signin goes, and what it may honestly say.
//
// The obvious version is `href={next}`, and it ships a control that visibly
// does nothing. Everybody looking at /signin is signed out by construction,
// because app/signin/page.tsx redirects anyone who is not, and every
// destination this site parks in `next` sends a signed out browser straight
// back here. A back control that returns you to the page you are trying to
// leave is worse than no back control.
//
// The second version routed order ids to /orders, on the grounds that it is
// the one guarded page that renders without a session. It does render, and
// what it renders is `SignInDoors` under a "Your orders" heading, which is
// another sign in page. So the way out of signing in was signing in.
//
// That leaves exactly one destination on the whole allowlist that shows a
// signed out visitor anything at all, and it is the marketplace. So there is
// nothing to derive: the control is a constant, and saying so in one place is
// better than a function that branches four ways and returns the same answer
// every time.
//
// Adding a real branch back is a two line change, and the bar for it is a
// destination that renders content without a session. If /orders ever grows a
// signed out view worth landing on, this is where that decision goes.

export interface BackTo {
  /** Where the control goes. The one page that renders without a session. */
  href: string;
  /** What it reads. Describes the href, so it cannot claim more than it does. */
  label: string;
}

// Frozen because it is shared by every request in the process. A stray
// assignment would rewrite the copy for everybody after it.
export const SIGNIN_BACK: BackTo = Object.freeze({ href: '/', label: 'Back to midsesh' });
