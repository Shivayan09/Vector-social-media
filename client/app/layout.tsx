import type { Metadata } from "next";
import "./globals.css";
import ToastProvider from "@/components/ToastProvider";
import Providers from "@/components/Providers";
import GlobalLoader from "@/components/GlobalLoader";
import { Analytics } from "@vercel/analytics/next";

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
        className="app-body"
        style={{
          "--font-geist-sans": 'Arial, Helvetica, "Segoe UI", sans-serif',
          "--font-geist-mono":
            '"Courier New", Consolas, "Liberation Mono", monospace',
        } as React.CSSProperties}
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
