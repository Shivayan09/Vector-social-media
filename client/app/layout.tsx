import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import ToastProvider from "@/components/ToastProvider";
import Providers from "@/components/Providers";
import GlobalLoader from "@/components/GlobalLoader";
import { Analytics } from "@vercel/analytics/next";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Vector",
  description: "Context-based social media platform",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} app-body`}
      >
        <Providers>
          <GlobalLoader /> {/* ✅ Global loader */}
          <ToastProvider />
          {children}
        </Providers>
        <Analytics />
      </body>
    </html>
  );
}
