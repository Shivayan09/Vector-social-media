"use client";

import { useAppContext } from "@/context/AppContext";
import axios from "axios";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "react-toastify";

export default function Navbar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const isLanding = pathname === "/";
  const isBuilder = pathname === "/builder";
  const { isLoggedIn, setIsLoggedIn, setUserData, loading } = useAppContext();
  const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL!;
  const router = useRouter();

  const handleLogout = async () => {
    try {
      const { data } = await axios.post(BACKEND_URL + '/api/auth/logout', {}, { withCredentials: true });
      if (data.success) {
        toast.success("Logged out successfully");
        setIsLoggedIn(false);
        setUserData(null);
      }
    } catch (error: any) {
      if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error("Something went wrong");
      }
    }
  }

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white">
      <div className="px-10 mx-auto h-14 flex items-center border-b">

        <div className="flex-1 flex items-center">
          <Link href="/" className="flex items-center gap-2.5 group">
            <img src="/vector.png" alt="" className="h-7 w-7 rounded-sm" />
            <span className="font-semibold text-sm text-neutral-900 tracking-tight">
              Vector
            </span>
          </Link>
        </div>

        <nav className="hidden md:flex flex-1 items-center justify-center gap-1">
          {isLanding && (
            <>
              <NavLink href="/#features">Features</NavLink>
              <NavLink href="/#how-it-works">How it works</NavLink>
              <NavLink href="/#pricing">Pricing</NavLink>
            </>
          )}
        </nav>

        <div className="flex-1 flex items-center justify-end gap-3">
          {isBuilder ? (
            <Link href="/payment" className="btn-secondary py-2 px-4">
              Unlock PDF
            </Link>
          ) : (
            <>
              {!loading && (
                <>
                  {isLoggedIn ? (
                    <button onClick={handleLogout} className="hidden md:inline-flex btn-secondary py-2 px-4">
                      Sign out
                    </button>
                  ) : (
                    <Link href="/logout"  className="hidden md:inline-flex btn-secondary py-2 px-4">
                      Sign in
                    </Link>
                  )}
                </>
              )}
              <Link href="/builder" className="btn-primary py-2 px-4">
                Get started
              </Link>
            </>
          )}

          <button className="md:hidden p-1.5 rounded-lg hover:bg-neutral-100 transition-colors" onClick={() => setMobileOpen(!mobileOpen)}>
            <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              {mobileOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="md:hidden px-6 py-3 border-t border-neutral-100 bg-white/90 backdrop-blur-md">
          <div className="flex flex-col gap-1">
            <MobileNavLink href="/#features" onClick={() => setMobileOpen(false)}>
              Features
            </MobileNavLink>
            <MobileNavLink href="/#how-it-works" onClick={() => setMobileOpen(false)}>
              How it works
            </MobileNavLink>
            <MobileNavLink href="/#pricing" onClick={() => setMobileOpen(false)}>
              Pricing
            </MobileNavLink>
          </div>
        </div>
      )}
    </header>
  );
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="px-3 py-1.5 rounded-lg text-sm text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 transition-all duration-150">
      {children}
    </Link>
  );
}

function MobileNavLink({
  href,
  children,
  onClick,
}: {
  href: string;
  children: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <Link href={href} onClick={onClick} className="px-3 py-2.5 rounded-lg text-sm text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50 transition-colors">
      {children}
    </Link>
  );
}