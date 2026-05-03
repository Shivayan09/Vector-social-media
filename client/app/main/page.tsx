"use client";

import Navbar from "@/components/Navbar";
import Feed from "@/components/feed/Feed";
import { Suspense } from "react";
import MainQueryHandler from "./MainQueryHandler";

export default function Home() {
  return (
    <div className="page-scroll">
      <Navbar />
      <Suspense fallback={null}>
        <MainQueryHandler />
      </Suspense>
      <Feed />
    </div>
  );
}
