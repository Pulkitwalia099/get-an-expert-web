import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import AccountLink from '@/components/AccountLink';
import ContactBlock from '@/components/ContactBlock';
import ContactLink from '@/components/ContactLink';
import SiteFooter from '@/components/SiteFooter';
import { SERVICES, serviceBySlug } from '@/lib/services';
import { serviceDetail } from '@/lib/service-details';
import styles from '../service.module.css';

// One template, five services. The alternative was five near-identical pages
// that drift apart, which is exactly what happened to the static preview: two of
// them disagreed on paragraph widths and three carried an em dash in the price
// placeholder that the copy rules forbid.
//
// Every price on this page comes from lib/services.ts, the same module the home
// page cards read, so a tile and its page cannot contradict each other.

export function generateStaticParams() {
  return SERVICES.map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const service = serviceBySlug(slug);
  const detail = serviceDetail(slug);
  if (!service || !detail) return { title: 'midsesh' };
  return { title: `midsesh · ${service.name}`, description: detail.promise };
}

export default async function ServicePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const service = serviceBySlug(slug);
  const detail = serviceDetail(slug);
  // An unknown slug is a 404, not an empty template. A page that renders its
  // chrome around nothing looks like the service exists and is broken.
  if (!service || !detail) notFound();

  const soon = service.status === 'soon';

  return (
    <>
      <div className="bg" />
      <div className="grain" />

      <header className="sitebar">
        <a className="sitemark" href="/" aria-label="midsesh home">
          <span className="worb">✳︎</span>midsesh
        </a>
        <nav className="sitenav">
          <ContactLink />
          <a className="privacy-link" href="/privacy">
            Privacy
          </a>
          <AccountLink />
        </nav>
      </header>

      <section className={`${styles.section} ${styles.head}`}>
        <div className={styles.wrap}>
          <span className={styles.badge}>{service.badge}</span>
          {service.status === 'beta' && (
            <span className={`${styles.badge} ${styles.badgeBeta} ${styles.chip}`}>
              New · in beta
            </span>
          )}
          {soon && (
            <span className={`${styles.badge} ${styles.badgeSoon} ${styles.chip}`}>
              Launching soon
            </span>
          )}

          <h1>{service.name}</h1>
          <p className={styles.promise}>{detail.promise}</p>

          {detail.priceLine && (
            <div className={styles.priceline}>
              <span className={detail.priceOpen ? styles.open : undefined}>{detail.priceLine}</span>
            </div>
          )}

          <div className={styles.btnrow}>
            <a className={styles.btn} href={detail.ctaHref}>
              {detail.ctaLabel}
            </a>
            <span className={styles.ctaNote}>{detail.ctaNote}</span>
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.wrap}>
          <div className={styles.shead}>
            <span className={styles.eyebrow}>Input, output</span>
            <h2>{detail.ioHeading}</h2>
          </div>
          <div className={styles.io}>
            <div className={styles.inputs}>
              {detail.inputs.map((i) => (
                <div key={i.title} className={styles.inCard}>
                  <b>{i.title}</b>
                  <span>{i.note}</span>
                </div>
              ))}
            </div>
            <div className={styles.arrow}>&rarr;</div>
            <div className={styles.outCard}>
              <b>{detail.output.title}</b>
              <span>{detail.output.note}</span>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.wrap}>
          <div className={styles.shead}>
            <span className={styles.eyebrow}>How it works</span>
            <h2>{detail.howHeading}</h2>
          </div>
          <div className={styles.steps}>
            {detail.steps.map((s) => (
              <div key={s.h} className={styles.step}>
                <div className={styles.em}>{s.em}</div>
                <h3>{s.h}</h3>
                <p>{s.p}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.wrap}>
          <div className={styles.shead}>
            <span className={styles.eyebrow}>Pricing</span>
            <h2>{detail.pricingHeading}</h2>
          </div>
          <div className={styles.tiers}>
            {detail.tiers.map((t) => (
              <div key={t.name} className={styles.tier}>
                <div className={styles.tierName}>{t.name}</div>
                <div className={`${styles.tierPrice}${t.open ? ` ${styles.open}` : ''}`}>
                  {t.price}
                </div>
                <p>{t.body}</p>
              </div>
            ))}
          </div>
          {detail.pricingNote && <p className={styles.note}>{detail.pricingNote}</p>}
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.wrap}>
          <div className={styles.promiseBox}>
            <h2>{detail.promiseHeading}</h2>
            <p>{detail.promiseBody}</p>
          </div>
        </div>
      </section>

      {/* The site's existing contact block, not a new form. It already writes to
          Supabase and already handles its own success and failure states, so the
          $29 path and the launching-soon waiting list both land somewhere real
          rather than on a dead button. Nothing here charges a card. */}
      <section className={styles.section} id="start">
        <div className={styles.wrap}>
          <div className={styles.shead}>
            <span className={styles.eyebrow}>{soon ? 'Get in first' : 'Get started'}</span>
            <h2>{soon ? 'Tell us what you would run' : 'Tell us what you need'}</h2>
          </div>
          {/* Always open here. It is a collapsible panel on the home page,
              where a button owns that state; on a service page it IS the step,
              so there is nothing to collapse it behind. */}
          <ContactBlock open />
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.wrap}>
          <div className={styles.shead}>
            <span className={styles.eyebrow}>FAQ</span>
            <h2>The fine print, plainly</h2>
          </div>
          <div className={styles.faq}>
            {detail.faq.map((f) => (
              <details key={f.q}>
                <summary>{f.q}</summary>
                <p>{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className={`${styles.section} ${styles.cross}`}>
        <div className={styles.wrap}>
          <div className={styles.btnrow}>
            <a className={`${styles.btn} ${styles.btnGhost}`} href="/">
              Browse all services
            </a>
          </div>
        </div>
      </section>

      <SiteFooter />
    </>
  );
}
