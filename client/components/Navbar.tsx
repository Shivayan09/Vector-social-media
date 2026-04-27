"use client";

import { useRouter } from "next/navigation";
import NotificationBell from "./NotificationBell";

export default function Navbar() {
  const router = useRouter();

  return (
    <div className="flex items-center justify-center md:justify-between py-4 px-6 md:px-10 bg-zinc-100/50 dark:bg-black/10 backdrop-blur-3xl w-[90vw] md:w-[70vw] mx-auto border border-black/10 dark:border-white/20 rounded-full my-5">
      <p onClick={() => router.push("/main")} className="font-extrabold text-[1.1rem] font-serif text-zinc-900 dark:text-white cursor-pointer">
        Vector
      </p>
      <div className="hidden md:flex gap-20 text-zinc-600 dark:text-gray-200 items-center">
        <p onClick={() => router.push("/main")} className="transition-all duration-300 hover:text-zinc-900 dark:hover:text-white cursor-pointer">
          Home
        </p>
        <p onClick={() => router.push("/main/contact")} className="transition-all duration-300 hover:text-zinc-900 dark:hover:text-white cursor-pointer">
          Contact Us
        </p>
        <p onClick={() => router.push("/main/support")} className="transition-all duration-300 hover:text-zinc-900 dark:hover:text-white cursor-pointer">
          Support
        </p>
        <NotificationBell />
      </div>
    </div>
  );
}
