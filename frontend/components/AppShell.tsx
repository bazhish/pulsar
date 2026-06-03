"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { KeyboardEvent, PointerEvent, ReactNode } from "react";
import { BottomNav } from "@/components/BottomNav";
import { Sidebar } from "@/components/Sidebar";

const SIDEBAR_WIDTH_KEY = "pulsar_sidebar_width";
const SIDEBAR_COMPACT_KEY = "pulsar_sidebar_compact";
const DEFAULT_WIDTH = 280;
const COMPACT_WIDTH = 84;
const MIN_EXPANDED_WIDTH = 184;
const MAX_WIDTH = 360;
const AUTO_COMPACT_WIDTH = 156;

const AppShellContext = createContext(false);

export function useInsideAppShell() {
  return useContext(AppShellContext);
}

function clampSidebarWidth(width: number) {
  return Math.min(MAX_WIDTH, Math.max(MIN_EXPANDED_WIDTH, width));
}

export function AppShell({ children }: Readonly<{ children: ReactNode }>) {
  const [compact, setCompact] = useState(false);
  const [expandedWidth, setExpandedWidth] = useState(DEFAULT_WIDTH);
  const dragStartRef = useRef<{ pointerX: number; width: number } | null>(null);

  useEffect(() => {
    const storedWidth = Number(window.localStorage.getItem(SIDEBAR_WIDTH_KEY));
    const storedCompact = window.localStorage.getItem(SIDEBAR_COMPACT_KEY);
    if (Number.isFinite(storedWidth) && storedWidth >= MIN_EXPANDED_WIDTH) {
      setExpandedWidth(clampSidebarWidth(storedWidth));
    }
    if (storedCompact !== null) setCompact(storedCompact === "true");
  }, []);

  useEffect(() => {
    window.localStorage.setItem(SIDEBAR_WIDTH_KEY, String(expandedWidth));
  }, [expandedWidth]);

  useEffect(() => {
    window.localStorage.setItem(SIDEBAR_COMPACT_KEY, String(compact));
  }, [compact]);

  const effectiveWidth = compact ? COMPACT_WIDTH : expandedWidth;

  const applyResize = useCallback((nextWidth: number) => {
    if (nextWidth <= AUTO_COMPACT_WIDTH) {
      setCompact(true);
      return;
    }
    setCompact(false);
    setExpandedWidth(clampSidebarWidth(nextWidth));
  }, []);

  function startResize(event: PointerEvent<HTMLDivElement>) {
    event.preventDefault();
    dragStartRef.current = { pointerX: event.clientX, width: effectiveWidth };

    const move = (moveEvent: globalThis.PointerEvent) => {
      const start = dragStartRef.current;
      if (!start) return;
      applyResize(start.width + moveEvent.clientX - start.pointerX);
    };

    const stop = () => {
      dragStartRef.current = null;
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", stop);
    };

    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", stop);
  }

  function resizeWithKeyboard(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    applyResize(effectiveWidth + (event.key === "ArrowRight" ? 16 : -16));
  }

  const gridStyle = useMemo(
    () => ({ gridTemplateColumns: `${effectiveWidth}px minmax(0, 1fr)` }),
    [effectiveWidth]
  );

  return (
    <AppShellContext.Provider value={true}>
      <div className="min-h-screen lg:grid lg:transition-[grid-template-columns] lg:duration-200 lg:ease-out" style={gridStyle}>
        <a className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-app focus:bg-white focus:px-4 focus:py-2 focus:font-semibold focus:text-ink focus:shadow-lift" href="#app-main">
          Pular para o conteúdo
        </a>
        <Sidebar
          compact={compact}
          expandedWidth={expandedWidth}
          onResizeKeyDown={resizeWithKeyboard}
          onResizeStart={startResize}
          onToggleCompact={() => setCompact((current) => !current)}
          width={effectiveWidth}
        />
        <main id="app-main" className="min-w-0 pb-24 lg:pb-0">
          <div className="min-h-screen animate-shell-content">{children}</div>
        </main>
        <BottomNav />
      </div>
    </AppShellContext.Provider>
  );
}
