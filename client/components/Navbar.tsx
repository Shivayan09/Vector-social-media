"use client";

import NotificationBell from "./NotificationBell";

export default function Navbar() {
  return (
    <div className="neo-panel flex items-center justify-center md:justify-between py-4 px-6 md:px-10 w-[90vw] md:w-[70vw] mx-auto my-5 rounded-full">
      <p className="font-extrabold text-[1.1rem] font-serif text-white"> Vector </p>
      <div className="hidden md:flex gap-20 text-gray-200 items-center cursor-pointer">
        <p className="transition-all duration-300 hover:text-white"> Home </p>
        <p className="transition-all duration-300 hover:text-white"> Contact Us </p>
        <p className="transition-all duration-300 hover:text-white"> Support</p>
        <NotificationBell/>
      </div>
    </div>
  );
}
