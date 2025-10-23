import type { Metadata } from "next";
import { Poppins, Montserrat } from "next/font/google";
import "./globals.css";

const poppins = Poppins({ subsets: ['latin'], weight: ['300','400','500','600','700'], variable: '--font-poppins' });
const montserrat = Montserrat({ subsets: ['latin'], weight: ['400','600','700'], variable: '--font-montserrat' });

export const metadata: Metadata = {
  title: "Coaching Package Calculator",
  description: "Internal tool for simple package options",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${poppins.variable} ${montserrat.variable}`}>
      <body className="font-sans antialiased">
        <div className="bg-app-gradient" />
        <main className="container-page max-w-4xl py-8 md:py-10 lg:py-12">
        {children}
        </main>
      </body>
    </html>
  );
}
