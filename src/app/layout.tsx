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
