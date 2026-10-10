"use client";

import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

const KEY = "redacted.tips.seen";
const SHOW_MS = 12_000;

function seenTips(): string[] {
  try {
    return JSON.parse(window.localStorage.getItem(KEY) ?? "[]") as string[];
  } catch {
    return [];
  }
}

function markSeen(id: string) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify([...new Set([...seenTips(), id])]));
  } catch {
    // If storage is blocked the tip simply returns next visit.
  }
}

/** Forget every dismissed tip so they show again (from the pause menu). */
export function resetTips() {
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    // Tips are a convenience; nothing to reset if storage is unavailable.
  }
}

/**
 * A one-time "how this screen works" note, shown as a floating card over the game, never in the page
 * flow. It fades after a few seconds and is remembered once shown. It explains controls only.
 */
export function FirstTimeTip({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  const [visible, setVisible] = useState(() => typeof window !== "undefined" && !seenTips().includes(id));

  useEffect(() => {
    if (!visible) return;
    markSeen(id);
    const timer = window.setTimeout(() => setVisible(false), SHOW_MS);
    return () => window.clearTimeout(timer);
  }, [id, visible]);

  if (!visible || typeof document === "undefined") return null;
  return createPortal(
    <aside className="game-tip pointer-events-auto fixed bottom-4 left-4 z-[65] w-[min(24rem,calc(100%-2rem))] animate-in fade-in slide-in-from-bottom-2" role="status">
      <div className="flex items-start gap-2">
        <p className="flex-1 text-xs uppercase tracking-[0.18em] text-[#e8ac51]">Tip · {title}</p>
        <button aria-label="Close tip" className="-mr-1 -mt-1 size-7 text-[#c8d8d2]/70 hover:text-[#e8ac51]" onClick={() => setVisible(false)} type="button">✕</button>
      </div>
      <div className="mt-1 font-mono text-sm leading-relaxed text-[#e4e6d8]">{children}</div>
    </aside>,
    document.body,
  );
}
