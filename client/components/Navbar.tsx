"use client";

import { useRouter } from "next/navigation";
import NotificationBell from "./NotificationBell";

export default function Navbar() {
  const router = useRouter();

  return (
    <div className="top-nav">
      <p onClick={() => router.push("/main")} className="cursor-pointer font-serif text-[1.1rem] font-extrabold text-foreground">
        Vector
      </p>
      <div className="hidden items-center gap-20 md:flex">
        <p onClick={() => router.push("/main")} className="top-nav-link">
          Home
        </p>
        <p onClick={() => router.push("/main/contact")} className="top-nav-link">
          Contact Us
        </p>
        <p onClick={() => router.push("/main/support")} className="top-nav-link">
          Support
        </p>
      </div>
      <NotificationBell />
    </div>
  );
}
