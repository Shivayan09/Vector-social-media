"use client";

import Link from "next/link";
import NotificationBell from "./NotificationBell";

export default function Navbar() {
  return (
    <div className="flex items-center justify-center md:justify-between py-4 px-6 md:px-10 bg-black/10 backdrop-blur-3xl w-[90vw] md:w-[70vw] mx-auto border border-black/10 dark:border-white/20 rounded-full my-5">
      <Link href="/main">
        <p className="font-extrabold text-[1.1rem] font-serif text-white cursor-pointer">Vector</p>
      </Link>
      <div className="hidden md:flex gap-20 text-gray-200 items-center">
        <Link href="/main" className="transition-all duration-300 hover:text-white">
          Home
        </Link>
        <Link href="#contact" className="transition-all duration-300 hover:text-white">
          Contact Us
        </Link>
        <Link href="#support" className="transition-all duration-300 hover:text-white">
          Support
        </Link>
        <NotificationBell />
      </div>
    </div>
  );
}
