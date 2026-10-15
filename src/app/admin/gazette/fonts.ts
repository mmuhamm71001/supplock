import { Anton, Old_Standard_TT, Playfair_Display } from 'next/font/google';

// Newspaper type for the Gazette (page and dashboard mini edition).
export const anton = Anton({ weight: '400', subsets: ['latin'], variable: '--font-anton' });
export const oldStandard = Old_Standard_TT({ weight: ['400', '700'], style: ['normal', 'italic'], subsets: ['latin'], variable: '--font-old-standard' });
export const playfair = Playfair_Display({ weight: '900', subsets: ['latin'], variable: '--font-playfair' });
export const gazetteFonts = `${anton.variable} ${oldStandard.variable} ${playfair.variable}`;
