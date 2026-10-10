"use client";

import { useState, type ReactNode } from "react";

const KEY = "redacted.tips.seen";

function seenTips(): string[] {
  try {
    return JSON.parse(window.localStorage.getItem(KEY) ?? "[]") as string[];
  } catch {
    return [];
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

/** A one-time "how this screen works" note. It explains controls only, never the case. */
export function FirstTimeTip({ id, title, children, className = "" }: { id: string; title: string; children: ReactNode; className?: string }) {
  const [hidden, setHidden] = useState(() => typeof window === "undefined" || seenTips().includes(id));
  if (hidden) return null;
  function dismiss() {
    setHidden(true);
    try {
      window.localStorage.setItem(KEY, JSON.stringify([...new Set([...seenTips(), id])]));
    } catch {
      // If storage is blocked the tip simply returns next visit.
    }
  }
  return (
    <aside className={`game-tip animate-in fade-in slide-in-from-bottom-2 ${className}`} role="note">
      <p className="text-xs uppercase tracking-[0.18em] text-[#e8ac51]">{title}</p>
      <div className="mt-1 text-sm leading-relaxed text-[#e4e6d8]">{children}</div>
      <button className="mt-2 min-h-9 border border-[#e8ac51]/70 px-3 text-xs uppercase text-[#f1c987] hover:bg-[#e8ac51]/15" onClick={dismiss} type="button">Got it</button>
    </aside>
  );
}
