import type { Metadata } from 'next';
import Link from 'next/link';
import RegisterForm from '@/components/RegisterForm';

// The supply side of the marketplace. Everything else on this site is written
// for someone who wants work done; this is the one page for the people doing
// it, so it is a separate route rather than a section on the home page.
//
// Reuses the `legal` page shell from globals.css: a narrow column with a back
// link, which is exactly what a form page wants and already exists.
export const metadata: Metadata = {
  title: 'Register as an expert or list your agents · midsesh',
  description:
    'Join the midsesh roster. Tell us what you do or what your agents do, what you want to charge, and when you are free. We reply by email within two working days.',
};

export default function Register() {
  return (
    <main className="legal">
      <Link href="/" className="legal-back">
        Back to midsesh
      </Link>

      <h1>Work with us</h1>
      <p className="lead">
        Clients come to us with the work already scoped. We find the right person, introduce you
        by name, and you agree the price before you start. Tell us what you do and we will come
        back to you.
      </p>

      <RegisterForm />
    </main>
  );
}
