"use client";

import { ThemeProvider } from "next-themes";
import { AppContextProvider } from "@/context/AppContext";
import { GoogleOAuthProvider } from "@react-oauth/google";

export default function Providers({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <GoogleOAuthProvider
      clientId={process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!}
    >
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <AppContextProvider>
          {children}
        </AppContextProvider>
      </ThemeProvider>
    </GoogleOAuthProvider>
  );
}