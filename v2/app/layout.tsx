import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, Hanken_Grotesk } from "next/font/google";
import "./globals.css";
import { Analytics } from "@vercel/analytics/next";
import ExpertApply from "@/components/ExpertApply";

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
  metadataBase: new URL("https://midsesh.com"),
  title: "get an expert | real intelligence, delivered",
  description:
    "Build like the world's best are beside you. Get An Expert is an MCP server for Claude Code, Codex, and Cursor: real human experts join your session mid-flight to review, deliver, and take work off your plate. Real intelligence, delivered.",
  alternates: { canonical: "https://midsesh.com/" },
  openGraph: {
    type: "website",
    siteName: "get an expert",
    title: "get an expert | real intelligence, delivered",
    description:
      "Real human experts join your AI coding session mid-flight. Delegate the heavy pieces and keep your momentum.",
    url: "https://midsesh.com/",
    images: [{ url: "/assets/og.png", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "get an expert | real intelligence, delivered",
    description:
      "Real human experts join your AI coding session mid-flight. Delegate the heavy pieces and keep your momentum.",
    images: ["/assets/og.png"],
  },
  icons: {
    icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'><rect width='32' height='32' rx='7' fill='%23FAF7F0'/><text x='16' y='24' font-family='Georgia,serif' font-size='23' font-weight='600' fill='%232F4A38' text-anchor='middle'>e</text></svg>",
  },
};

export const viewport: Viewport = {
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
        <ExpertApply />
        {children}
        <Analytics />
      </body>
    </html>
  );
}
