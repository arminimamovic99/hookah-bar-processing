import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Naručivanje u shisha baru',
  description: 'MVP aplikacija za naručivanje i rad po stanicama u shisha baru',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="bs">
      <body>{children}</body>
    </html>
  );
}
