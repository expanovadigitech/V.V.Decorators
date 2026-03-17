import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'V.V. Decorators | Event Booking CRM',
  description:
    'Professional event booking management system for V.V. Decorators. Manage bookings, track financials, and organise events seamlessly.',
  keywords: 'event decorator, CRM, booking management, V.V. Decorators',
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5, // Allow users to zoom if needed but prevent auto-zoom on input focus (handled by font-size elsewhere)
  userScalable: true,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
