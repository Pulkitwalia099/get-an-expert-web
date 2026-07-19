/* eslint-disable @next/next/no-img-element */
import { ink } from "@/lib/palette";

type Company = { name: string; logo?: string };
type Expert = {
  name: string;
  role: string;
  linkedin: string;
  avatar: string;
  companies: Company[];
  tag: string;
  rating: string;
  fixes: string;
};

const roster: Expert[] = [
  {
    name: "Rohit Jain",
    role: "Senior software engineer",
    linkedin: "https://www.linkedin.com/in/rohit-jain-343437187/",
    avatar: "/assets/rohit.jpg",
    companies: [
      { name: "Amazon", logo: "/assets/amazon.jpg" },
      { name: "Square", logo: "/assets/square.jpg" },
    ],
    tag: "Code, payments & APIs",
    rating: "4.8",
    fixes: "12 fixes delivered",
  },
  {
    name: "Aakash Sangani",
    role: "Senior full-stack cloud engineer",
    linkedin: "https://www.linkedin.com/in/aakash-sangani/",
    avatar: "/assets/aakash.jpg",
    companies: [
      { name: "Fidelity", logo: "/assets/fidelity.jpg" },
      { name: "IIT Kharagpur" },
    ],
    tag: "Deploys & infrastructure",
    rating: "4.7",
    fixes: "9 fixes delivered",
  },
  {
    name: "Senjal Pandharpatte",
    role: "Senior UX designer",
    linkedin: "https://www.linkedin.com/in/senjalpandharpatte/",
    avatar: "/assets/senjal.jpg",
    companies: [
      { name: "LightBox", logo: "/assets/lightbox.jpg" },
      { name: "RIT", logo: "/assets/rit.jpg" },
    ],
    tag: "Design & user experience",
    rating: "4.8",
    fixes: "14 fixes delivered",
  },
  {
    name: "Iñigo Fernández",
    role: "AI Transformation Consultant, Ex-McKinsey Consultant / Harvard MBA",
    linkedin: "https://www.linkedin.com/in/inigofernandezguerraabdala/",
    avatar: "/assets/inigo.jpg",
    companies: [
      { name: "McKinsey & Company", logo: "/assets/mck.jpg" },
      { name: "Harvard Business School", logo: "/assets/hbs.jpg" },
    ],
    tag: "AI, RAG & agents",
    rating: "4.8",
    fixes: "6 fixes delivered",
  },
  {
    name: "Hardik Acharya",
    role: "Senior security operations analyst",
    linkedin: "https://www.linkedin.com/in/acharyahardik/",
    avatar: "/assets/hardik.jpg",
    companies: [{ name: "McKinsey & Company", logo: "/assets/mck.jpg" }],
    tag: "Security & compliance",
    rating: "4.6",
    fixes: "7 fixes delivered",
  },
  {
    name: "Pulkit Walia",
    role: "Business & growth leader",
    linkedin: "https://www.linkedin.com/in/pulkitwalia/",
    avatar: "/assets/pulkit.jpg",
    companies: [
      { name: "Urban Company", logo: "/assets/uc.jpg" },
      { name: "Bessemer", logo: "/assets/bessemer.jpg" },
      { name: "Harvard Business School", logo: "/assets/hbs.jpg" },
    ],
    tag: "Growth & go-to-market",
    rating: "4.7",
    fixes: "10 fixes delivered",
  },
];

const LI_PATH =
  "M4.98 3.5C4.98 4.88 3.87 6 2.5 6S0 4.88 0 3.5 1.12 1 2.5 1s2.48 1.12 2.48 2.5zM.22 8.1h4.56V23H.22V8.1zM8.34 8.1h4.37v2.03h.06c.61-1.15 2.1-2.37 4.32-2.37 4.62 0 5.47 3.04 5.47 6.99V23h-4.55v-7.2c0-1.72-.03-3.93-2.4-3.93-2.4 0-2.77 1.87-2.77 3.8V23H8.34V8.1z";

function ExpertCard({ e, duplicate }: { e: Expert; duplicate: boolean }) {
  return (
    <div data-xm-card>
      <a
        data-xm-li
        href={e.linkedin}
        target="_blank"
        rel="noopener"
        aria-label={duplicate ? undefined : `${e.name} on LinkedIn`}
        tabIndex={duplicate ? -1 : undefined}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d={LI_PATH} />
        </svg>
      </a>
      <div data-xm-top>
        <img
          data-xm-ava
          loading="lazy"
          decoding="async"
          src={e.avatar}
          alt={duplicate ? "" : e.name}
        />
        <div style={{ minWidth: 0 }}>
          <div data-xm-name>{e.name}</div>
          <div data-xm-role>{e.role}</div>
        </div>
      </div>
      <div data-xm-cos>
        {e.companies.map((co, i) => (
          <span key={co.name} style={{ display: "contents" }}>
            {i > 0 && <span data-xm-dot>·</span>}
            {co.logo && <img src={co.logo} alt="" />}
            <span>{co.name}</span>
          </span>
        ))}
      </div>
      <div data-xm-bot>
        <span data-xm-tag>{e.tag}</span>
        <div
          data-xm-rate
          role="img"
          aria-label={`Rated ${e.rating} out of 5, ${e.fixes}`}
        >
          <span data-xm-star aria-hidden="true">★</span>
          <b>{e.rating}</b>
          <span aria-hidden="true">·</span>
          <span>{e.fixes}</span>
        </div>
      </div>
    </div>
  );
}

export default function Experts() {
  return (
    <section
      id="experts"
      aria-labelledby="experts-title"
      style={{
        marginTop: "clamp(72px,8vw,110px)",
        padding: "0 clamp(24px,3.3vw,48px)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
      }}
    >
      <h2
        id="experts-title"
        style={{
          margin: 0,
          fontFamily: "var(--font-serif)",
          fontWeight: 600,
          fontSize: "clamp(34px,3.2vw,46px)",
          lineHeight: 1.2,
          textAlign: "center",
          maxWidth: "720px",
          textWrap: "balance",
        }}
      >
        The kind of experts beside you.
      </h2>
      <p
        style={{
          margin: "18px 0 0",
          fontSize: "16px",
          lineHeight: 1.65,
          color: ink(0.75),
          maxWidth: "560px",
          textAlign: "center",
          textWrap: "pretty",
        }}
      >
        A few from the bench: hand-picked seniors from the world&apos;s best
        teams. Every delivery reviewed before it reaches you.
      </p>
      <div data-xm>
        <div data-xm-track>
          <div data-xm-set>
            {roster.map((e) => (
              <ExpertCard key={e.name} e={e} duplicate={false} />
            ))}
          </div>
          <div data-xm-set aria-hidden="true">
            {roster.map((e) => (
              <ExpertCard key={e.name} e={e} duplicate />
            ))}
          </div>
        </div>
      </div>
      <p
        style={{
          margin: "44px 0 0",
          fontFamily: "var(--font-serif)",
          fontStyle: "italic",
          fontSize: "clamp(19px,1.8vw,23px)",
          color: ink(0.85),
          textAlign: "center",
        }}
      >
        Vetted, verified, and accountable to you.
      </p>
    </section>
  );
}
