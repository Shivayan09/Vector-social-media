"use client";

import Navbar from "@/components/Navbar";
import Feed from "@/components/feed/Feed";
import ScrollToTopButton from "@/components/ui/ScrollToTopButton";
import { Suspense } from "react";
import { useRef } from "react";
import MainQueryHandler from "./MainQueryHandler";

export default function Home() {
  const pageRef = useRef<HTMLDivElement>(null);

  return (
    <div ref={pageRef} className="page-scroll">
      <Navbar />
      <Suspense fallback={null}>
        <MainQueryHandler />
      </Suspense>
      <Feed />
      <ScrollToTopButton scrollContainerRef={pageRef} />
    </div>
  );
}
