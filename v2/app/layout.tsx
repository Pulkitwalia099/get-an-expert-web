import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, Hanken_Grotesk } from "next/font/google";
import "./globals.css";
import StructuredData from "@/components/StructuredData";

const SITE_URL = "https://midsesh.com";
const SITE_NAME = "get an expert";
const TITLE = "get an expert | real intelligence, delivered";
const DESCRIPTION =
  "Build like the world's best are beside you. Get An Expert is an MCP server for Claude Code, Codex, and Cursor: real human experts join your session to review, deliver, and take work off your plate. Real intelligence, delivered.";
const OG_ALT =
  "get an expert. Build like the world's best are beside you. Real intelligence, delivered.";

const cormorant = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin"],
  weight: ["500", "600"],
  style: ["normal", "italic"],
});

const hanken = Hanken_Grotesk({
  variable: "--font-hanken",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: TITLE,
    template: "%s · get an expert",
  },
  description: DESCRIPTION,
  applicationName: SITE_NAME,
  keywords: [
    "get an expert",
    "midsesh",
    "MCP server",
    "Claude Code",
    "Codex",
    "Cursor",
    "expert help for coding",
    "senior engineer on call",
    "code review",
    "AI coding workflow",
  ],
  alternates: { canonical: "/" },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    title: TITLE,
    description:
      "Real human experts join your AI coding session. Delegate the heavy pieces and keep your momentum.",
    url: "/",
    locale: "en_US",
    images: [{ url: "/assets/og.png", width: 1200, height: 630, alt: OG_ALT }],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description:
      "Real human experts join your AI coding session. Delegate the heavy pieces and keep your momentum.",
    images: [{ url: "/assets/og.png", alt: OG_ALT }],
  },
  icons: {
    icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'><rect width='32' height='32' rx='7' fill='%23FAF7F0'/><text x='16' y='24' font-family='Georgia,serif' font-size='23' font-weight='600' fill='%232F4A38' text-anchor='middle'>e</text></svg>",
    apple: [{ url: "/apple-icon", sizes: "180x180", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  colorScheme: "light",
  themeColor: "#FAF7F0",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${cormorant.variable} ${hanken.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <StructuredData />
        {children}
      </body>
    </html>
  );
}
