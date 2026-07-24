"use client";
import { useEffect, useState } from "react";
import { ArrowUp } from "lucide-react";

export function ScrollToTop() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > 300);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (!show) return null;

  return (
    <button
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      className="fixed bottom-20 right-4 z-40 rounded-full bg-primary text-primary-foreground p-2.5 shadow-lg hover:bg-primary/90 transition-opacity md:bottom-6"
      aria-label="맨 위로"
    >
      <ArrowUp className="size-4" />
    </button>
  );
}
