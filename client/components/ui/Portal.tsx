"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

export default function Portal({ children }: { children: React.ReactNode }) {
  const [el] = useState(() => document.createElement("div"));

  useEffect(() => {
    const target = document.body;
    target.appendChild(el);
    return () => {
      target.removeChild(el);
    };
  }, [el]);

  return createPortal(children, el);
}
