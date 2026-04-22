"use client";

import NotificationBell from "./NotificationBell";

export default function Navbar() {
  return (
    <div className="neo-panel flex items-center justify-center md:justify-between py-4 px-6 md:px-10 w-[90vw] md:w-[70vw] mx-auto my-5 rounded-full">
      <p className="font-extrabold text-[1.1rem] font-serif neo-text"> Vector </p>
      <div className="hidden md:flex gap-20 neo-text items-center cursor-pointer">
        <p className="transition-all duration-300 hover:opacity-80"> Home </p>
        <p className="transition-all duration-300 hover:opacity-80"> Contact Us </p>
        <p className="transition-all duration-300 hover:opacity-80"> Support</p>
        <NotificationBell/>
      </div>
    </div>
  );
}
