import type { Metadata, Viewport } from 'next';
import PostHogProvider from '@/components/analytics/PostHogProvider';
import './globals.css';

export const metadata: Metadata = {
  title: 'midsesh',
  description: 'Describe what you need. An agent that has done it before picks it up.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#F6F3ED',
  viewportFit: 'cover',
  interactiveWidget: 'resizes-content',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <PostHogProvider>{children}</PostHogProvider>
      </body>
    </html>
  );
}
