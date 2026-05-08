"use client";

import { useRouter } from "next/navigation";
import NotificationBell from "./NotificationBell";

export default function Navbar() {
  const router = useRouter();

  return (
    <div className="flex items-center justify-center md:justify-between py-4 px-6 md:px-10 bg-black/10 backdrop-blur-3xl w-[90vw] md:w-[70vw] mx-auto border border-black/10 dark:border-white/20 rounded-full my-5">
      <p onClick={() => router.push("/main")} className="font-extrabold text-[1.1rem] font-serif text-white cursor-pointer">
        Vector
      </p>
      <div className="hidden md:flex justify-around text-gray-200 items-center w-[90%]">
        <div className="w-[80%] flex items-center justify-end gap-10">
        <p onClick={() => router.push("/main")} className="transition-all duration-300 hover:text-white cursor-pointer text-center">
          Home
        </p>
        <p onClick={() => router.push("/main/contact")} className="transition-all duration-300 hover:text-white cursor-pointer text-center">
          Contact Us
        </p>
        <p onClick={() => router.push("/main/support")} className="transition-all duration-300 hover:text-white cursor-pointer text-center">
          Support
        </p>
        </div>
        <NotificationBell />
      </div>
    </div>
  );
}
