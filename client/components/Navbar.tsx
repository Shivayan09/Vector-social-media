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
      <div className="hidden md:flex justify-around items-center w-[90%] text-slate-700 dark:text-gray-200">
        <div className="w-[80%] flex items-center justify-end gap-10">
        <p onClick={() => router.push("/main")} className="transition-all duration-300 hover:text-slate-900 dark:hover:text-white cursor-pointer text-center">
          Home
        </p>
        <p onClick={() => router.push("/main/contact")} className="transition-all duration-300 hover:text-slate-900 dark:hover:text-white cursor-pointer text-center">
          Contact Us
        </p>
        <p onClick={() => router.push("/main/support")} className="transition-all duration-300 hover:text-slate-900 dark:hover:text-white cursor-pointer text-center">
          Support
        </p>
        </div>
        <NotificationBell />
      </div>
    </div>
  );
}
