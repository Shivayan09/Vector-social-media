import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";
import { ResumeProvider } from "@/context/ResumeContext";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { AppContextProvider } from "@/context/AppContext";

export const metadata: Metadata = {
  title: "Vector - Build ATS-Friendly Resumes in Minutes",
  description:
    "Create professional, ATS-optimized resumes with live preview and instant download.",
  icons: {
    icon: '/vector.png'
  },
  openGraph: {
    title: "Vector — Build ATS-Friendly Resumes in Minutes",
    description:
      "Create professional, ATS-optimized resumes with live preview and instant download.",
    url: "https://yourdomain.com",
    siteName: "Vector",
    images: [
      {
        url: "/vector.png",
        width: 1200,
        height: 630,
        alt: "Vector Resume Builder",
      },
    ],
    type: "website",
  },

  twitter: {
    card: "summary_large_image",
    title: "Vector — Build ATS-Friendly Resumes in Minutes",
    description:
      "Create professional, ATS-optimized resumes with live preview and instant download.",
    images: ["/vector.png"],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body className="antialiased bg-white text-neutral-900">
        <AppContextProvider>
          <ResumeProvider>{children}</ResumeProvider>
        </AppContextProvider>
        <ToastContainer
          position="top-center"
          autoClose={2500}
          hideProgressBar
          newestOnTop
          closeOnClick
          pauseOnHover
          theme="light"
        />
      </body>
    </html>
  );
}