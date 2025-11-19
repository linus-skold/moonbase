"use client";
import { useEffect, useRef } from "react";

export function BannerContainer({ children }: { children: React.ReactNode }) {
  const containerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const updateBannerHeight = () => {
      if (containerRef.current) {
        const height = containerRef.current.offsetHeight;
        document.documentElement.style.setProperty(
          "--banner-height",
          `${height}px`
        );
      } else {
        document.documentElement.style.setProperty("--banner-height", "0px");
      }
    };

    updateBannerHeight();
    
    // Use ResizeObserver to detect when banners are added/removed/resized
    const resizeObserver = new ResizeObserver(updateBannerHeight);
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    window.addEventListener("resize", updateBannerHeight);
    
    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", updateBannerHeight);
    };
  }, []);

  return (
    <header ref={containerRef} className="w-full sticky top-0 z-50">
      {children}
    </header>
  );
}
