import type { Metadata } from 'next';
import Script from 'next/script';
import { Caveat, DM_Sans, JetBrains_Mono, Young_Serif } from 'next/font/google';
import './globals.css';

const youngSerif = Young_Serif({ weight: '400', subsets: ['latin'], variable: '--font-young-serif' });
const dmSans = DM_Sans({ weight: ['400', '500', '700'], subsets: ['latin'], variable: '--font-dm-sans' });
const jetbrains = JetBrains_Mono({ weight: ['500', '700'], subsets: ['latin'], variable: '--font-jetbrains' });
const caveat = Caveat({ weight: ['500', '700'], subsets: ['latin'], variable: '--font-caveat' });

export const metadata: Metadata = {
  title: 'Supplock',
  description: 'Supplies, locked in. School supply and equipment management.'
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="en" className={`${youngSerif.variable} ${dmSans.variable} ${jetbrains.variable} ${caveat.variable}`}>
      <body suppressHydrationWarning>
        {children}
        <Script src="/sl/blocks.js" strategy="afterInteractive" />
        <Script src="/sl/icons.js" strategy="afterInteractive" />
      </body>
    </html>
  );
}
