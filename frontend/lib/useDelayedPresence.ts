"use client";

import { useEffect, useState } from "react";

export function useDelayedPresence(open: boolean, delay = 180) {
  const [shouldRender, setShouldRender] = useState(open);

  useEffect(() => {
    if (open) {
      setShouldRender(true);
      return undefined;
    }

    const timeout = window.setTimeout(() => setShouldRender(false), delay);
    return () => window.clearTimeout(timeout);
  }, [delay, open]);

  return {
    shouldRender,
    state: open ? "open" : "closed"
  } as const;
}
