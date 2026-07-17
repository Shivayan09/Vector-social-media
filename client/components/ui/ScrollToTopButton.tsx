"use client";

import { ArrowUp } from "lucide-react";
import { RefObject, useEffect, useState } from "react";

type ScrollToTopButtonProps = {
  scrollContainerRef: RefObject<HTMLElement | null>;
};

export default function ScrollToTopButton({
  scrollContainerRef,
}: ScrollToTopButtonProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const handleScroll = () => setVisible(container.scrollTop > 400);
    container.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();

    return () => container.removeEventListener("scroll", handleScroll);
  }, [scrollContainerRef]);

  if (!visible) return null;

  return (
    <button
      type="button"
      aria-label="Scroll to top"
      title="Scroll to top"
      onClick={() => scrollContainerRef.current?.scrollTo({ top: 0, behavior: "smooth" })}
      className="fixed bottom-6 right-6 z-40 rounded-full border border-border bg-card p-3 text-foreground shadow-lg transition hover:bg-secondary focus:outline-none focus:ring-2 focus:ring-blue-500"
    >
      <ArrowUp className="h-5 w-5" aria-hidden="true" />
    </button>
  );
}
