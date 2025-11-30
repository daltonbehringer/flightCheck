import './globals.css';
import type { Metadata } from 'next';
import { Space_Grotesk } from 'next/font/google';
import type { ReactNode } from 'react';

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-space-grotesk',
  display: 'swap'
});

export const metadata: Metadata = {
  title: 'Duffel Flight Search',
  description: 'Modern flight search experience powered by the Duffel API.'
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={spaceGrotesk.variable}>
      <body className="font-sans antialiased text-slate-900">{children}</body>
    </html>
  );
}
