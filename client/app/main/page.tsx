"use client";

import Navbar from "@/components/Navbar";
import Feed from "@/components/feed/Feed";
import { Suspense } from "react";
import MainQueryHandler from "./MainQueryHandler";
import Loader from "@/components/Loader";

export default function Home() {
  return (
    <div className="page-scroll">
      <Navbar />
      <Suspense fallback={<Loader />}>
        <MainQueryHandler />
      </Suspense>
      <Feed />
    </div>
  );
}
