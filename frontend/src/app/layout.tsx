import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Web3Provider } from "@/components/Web3Provider";
import { Navbar } from "@/components/Navbar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "LailTix - Web3 Event Ticketing dApp",
  description: "Secure, transparent, and seamless decentralized event ticketing platform.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased dark`}
    >
      <body className="min-h-full flex flex-col bg-zinc-950 text-zinc-50 selection:bg-violet-500/30 selection:text-violet-200">
        <Web3Provider>
          {/* Ambient background glow */}
          <div className="absolute inset-0 -z-10 overflow-hidden">
            <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-gradient-to-b from-violet-600/10 via-indigo-600/5 to-transparent rounded-full blur-[120px]" />
            <div className="absolute top-1/4 left-1/4 w-[400px] h-[400px] bg-fuchsia-600/5 rounded-full blur-[100px]" />
          </div>
          
          <Navbar />
          <main className="flex-1 flex flex-col">{children}</main>
        </Web3Provider>
      </body>
    </html>
  );
}
