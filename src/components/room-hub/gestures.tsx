"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/** Press and hold to commit (search a spot, send a sample). Releasing early cancels. Enter/Space also work. */
export function HoldButton({ label, ms = 700, disabled, onDone, className = "", children }: { label: string; ms?: number; disabled?: boolean; onDone: () => void; className?: string; children?: ReactNode }) {
  const [progress, setProgress] = useState(0);
  const frame = useRef<number | null>(null);
  const started = useRef(0);

  function stop() {
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    frame.current = null;
    setProgress(0);
  }
  function start() {
    if (disabled) return;
    started.current = performance.now();
    const tick = () => {
      const value = Math.min(1, (performance.now() - started.current) / ms);
      setProgress(value);
      if (value >= 1) { stop(); onDone(); return; }
      frame.current = requestAnimationFrame(tick);
    };
    frame.current = requestAnimationFrame(tick);
  }
  useEffect(() => stop, []);

  return (
    <button
      className={`relative min-h-10 w-full touch-none select-none overflow-hidden border border-[#e8ac51]/70 text-xs uppercase text-[#f1c987] disabled:opacity-45 ${className}`}
      disabled={disabled}
      onKeyDown={(event) => { if ((event.key === "Enter" || event.key === " ") && !event.repeat) { event.preventDefault(); onDone(); } }}
      onPointerCancel={stop}
      onPointerDown={start}
      onPointerLeave={stop}
      onPointerUp={stop}
      type="button"
    >
      <span aria-hidden="true" className="absolute inset-y-0 left-0 bg-[#e8ac51]/25" style={{ width: `${progress * 100}%` }} />
      {children ? <span className="relative block">{children}<span className="mt-1 block text-[0.65rem] text-[#c8d8d2]/60">{progress > 0 ? "Keep holding..." : label}</span></span> : <span className="relative">{progress > 0 ? "Keep holding..." : label}</span>}
    </button>
  );
}

/**
 * Rub across the area to work on it (dust for prints, sweep a lamp, run a lens). The trail is drawn as you go;
 * once enough ground is covered the action fires. Keyboard users can press Enter.
 */
export function ScrubPad({ tool, needed = 900, disabled, onDone, children, className = "" }: {
  tool: "brush" | "lamp" | "swab" | "lens" | "tape";
  needed?: number;
  disabled?: boolean;
  onDone: () => void;
  children: ReactNode;
  className?: string;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const last = useRef<{ x: number; y: number } | null>(null);
  const travelled = useRef(0);
  const [progress, setProgress] = useState(0);
  const [lamp, setLamp] = useState<{ x: number; y: number } | null>(null);
  const done = useRef(false);
  const ink = { brush: "rgba(210,200,180,0.55)", lamp: "rgba(140,90,255,0.18)", swab: "rgba(240,240,230,0.5)", lens: "rgba(232,172,81,0.15)", tape: "rgba(200,220,255,0.35)" }[tool];

  function point(event: React.PointerEvent) {
    const rect = event.currentTarget.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }
  function move(event: React.PointerEvent) {
    if (disabled || done.current) return;
    const here = point(event);
    if (tool === "lamp" || tool === "lens") setLamp(here);
    if (event.buttons === 0 && event.pointerType === "mouse") { last.current = null; return; }
    const context = canvas.current?.getContext("2d");
    if (context && canvas.current) {
      if (canvas.current.width !== canvas.current.clientWidth) canvas.current.width = canvas.current.clientWidth;
      if (canvas.current.height !== canvas.current.clientHeight) canvas.current.height = canvas.current.clientHeight;
      context.fillStyle = ink;
    }
    if (last.current && context) {
      const distance = Math.hypot(here.x - last.current.x, here.y - last.current.y);
      travelled.current += distance;
      for (let step = 0; step < distance; step += 4) {
        const t = step / Math.max(distance, 1);
        context.beginPath();
        context.arc(last.current.x + (here.x - last.current.x) * t, last.current.y + (here.y - last.current.y) * t, tool === "swab" ? 3 : tool === "brush" ? 6 : 10, 0, Math.PI * 2);
        context.fill();
      }
      const value = Math.min(1, travelled.current / needed);
      setProgress(value);
      if (value >= 1) { done.current = true; onDone(); }
    }
    last.current = here;
  }

  return (
    <div
      aria-label="Rub across the evidence to work on it. Press Enter to do it at once."
      className={`relative touch-none select-none overflow-hidden ${disabled ? "opacity-50" : "cursor-crosshair"} ${className}`}
      onKeyDown={(event) => { if (event.key === "Enter" && !disabled && !done.current) { done.current = true; onDone(); } }}
      onDragStart={(event) => { event.preventDefault(); event.stopPropagation(); }}
      onPointerDown={(event) => { event.preventDefault(); event.stopPropagation(); last.current = point(event); (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId); }}
      onPointerLeave={() => { last.current = null; setLamp(null); }}
      onPointerMove={move}
      onPointerUp={() => { last.current = null; }}
      role="button"
      tabIndex={disabled ? -1 : 0}
    >
      {children}
      <canvas aria-hidden="true" className="pointer-events-none absolute inset-0 h-full w-full" ref={canvas} />
      {lamp ? <span aria-hidden="true" className="pointer-events-none absolute size-28 -translate-x-1/2 -translate-y-1/2 rounded-full" style={{ left: lamp.x, top: lamp.y, background: tool === "lamp" ? "radial-gradient(circle, rgba(150,90,255,0.45), transparent 70%)" : "radial-gradient(circle, rgba(255,240,200,0.25), transparent 70%)", outline: tool === "lens" ? "3px solid rgba(232,172,81,.7)" : undefined }} /> : null}
      <span aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 h-1 bg-[#e8ac51]" style={{ width: `${progress * 100}%` }} />
    </div>
  );
}
