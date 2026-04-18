"use client";

import Loader from "@/components/Loader";
import { useAppContext } from "@/context/AppContext";

export default function GlobalLoader() {
  const { loading } = useAppContext();

  if (!loading) return null;

  return <Loader />;
}