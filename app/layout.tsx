import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {title:'Wordbloom — Your personal vocabulary',description:'Collect new words as colorful bubbles and explore their meanings.',icons:{icon:'/favicon.svg'}};
export default function RootLayout({children}:{children:React.ReactNode}) { return <html lang="en"><body>{children}</body></html>; }
