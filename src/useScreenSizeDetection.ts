import { useState, useEffect } from "react";

export const DEVICES_SCREEN_LIMITS = {
  tablet: 925,
  mobile: 450,
} as const;

function useWindowWidth(): number {
  const [width, setWidth] = useState(() => window.innerWidth);

  useEffect(() => {
    let rafId: number | null = null;

    const onResize = () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => setWidth(window.innerWidth));
    };

    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      if (rafId !== null) cancelAnimationFrame(rafId);
    };
  }, []);

  return width;
}

export function useScreenSizeDetection() {
  const width = useWindowWidth();

  return {
    isTooSmall: width <= DEVICES_SCREEN_LIMITS.mobile,
    isTablet:
      width <= DEVICES_SCREEN_LIMITS.tablet &&
      width > DEVICES_SCREEN_LIMITS.mobile,
  };
}
