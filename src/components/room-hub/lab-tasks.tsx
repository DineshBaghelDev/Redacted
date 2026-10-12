"use client";

import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
import { ScrubPad } from "./gestures";
import { play } from "../../lib/sound";

export type LabTest = "fingerprint" | "footprint" | "dna" | "blood" | "toxicology" | "fiber" | "ballistics" | "autopsy";

/** What the player has to do for each test, shown above the bench. */
const HINTS: Record<LabTest, string> = {
  fingerprint: "Brush powder over it until the print shows",
  blood: "Sweep the UV lamp around. Click every spot that glows",
  dna: "Press the swab on the circle and stay on it as it drifts",
  toxicology: "Hold to draw the sample. Let go inside the green band",
  fiber: "Grab the tape at the left and pull it all the way across in one go",
  footprint: "Stir the plaster: drag round and round the bowl",
  ballistics: "Drag the lower bullet until its grooves match the top one",
  autopsy: "Examine each part the pathologist names, in order",
};

/** A stable 0–1 value per evidence and step, so each piece of evidence gets its own layout. */
function seeded(seed: string, index: number) {
  let value = 2166136261;
  for (const character of `${seed}:${index}`) value = Math.imul(value ^ character.charCodeAt(0), 16777619);
  // Final mix so neighbouring steps land far apart (plain FNV barely moves the high bits).
  value = Math.imul(value ^ (value >>> 16), 0x85ebca6b);
  value = Math.imul(value ^ (value >>> 13), 0xc2b2ae35);
  return ((value ^ (value >>> 16)) >>> 0) / 4294967296;
}

function local(event: ReactPointerEvent) {
  const rect = event.currentTarget.getBoundingClientRect();
  return { x: event.clientX - rect.left, y: event.clientY - rect.top, width: rect.width, height: rect.height };
}

const AREA = "lab-task-tray relative h-56 w-full touch-none select-none overflow-hidden";
type Game = { seed: string; onDone: () => void; say: (note: string) => void };

/**
 * One hands-on task per lab test: each tool asks for a different action. The stored result never depends on how
 * well it was done; the task only stands in for doing the work. Enter finishes it at once for keyboard players.
 */
export function LabTask({ test, seed, disabled, onDone, children }: { test: LabTest; seed: string; disabled?: boolean; onDone: () => void; children: ReactNode }) {
  const finished = useRef(false);
  const [note, setNote] = useState("");
  const finish = () => {
    if (finished.current || disabled) return;
    finished.current = true;
    play("success");
    onDone();
  };
  const game: Game = { seed, onDone: finish, say: setNote };
  return (
    <div
      aria-label={`${HINTS[test]}. Press Enter to do it at once.`}
      className="w-full outline-none focus-visible:ring-1 focus-visible:ring-[#e8ac51]"
      onDragStart={(event) => event.preventDefault()}
      onKeyDown={(event) => { if (event.key === "Enter") finish(); }}
      role="group"
      tabIndex={disabled ? -1 : 0}
    >
      <div className="mb-2 flex items-center justify-between gap-3">{children}</div>
      <p className="mb-2 text-xs uppercase tracking-widest text-[#f1c987]">{HINTS[test]} · 5 min</p>
      <div className={disabled ? "pointer-events-none opacity-50" : ""}>
        {test === "fingerprint" ? <ScrubPad className={`${AREA} bg-[#14130f]`} needed={800} onDone={finish} tool="brush"><Print seed={seed} /></ScrubPad>
          : test === "blood" ? <UvLamp {...game} />
          : test === "dna" ? <Swab {...game} />
          : test === "toxicology" ? <Pipette {...game} />
          : test === "fiber" ? <Tape {...game} />
          : test === "footprint" ? <Stir {...game} />
          : test === "ballistics" ? <Scope {...game} />
          : <Autopsy {...game} />}
      </div>
      <p aria-live="polite" className="mt-2 min-h-5 text-xs uppercase text-[#c8d8d2]/70">{note}</p>
    </div>
  );
}

/** A faint whorl under the powder, so brushing feels like it is bringing something up. */
function Print({ seed }: { seed: string }) {
  return (
    <svg aria-hidden="true" className="absolute left-1/2 top-1/2 size-36 -translate-x-1/2 -translate-y-1/2 opacity-15" viewBox="-50 -50 100 100">
      {[8, 15, 22, 29, 36, 43].map((radius, index) => <ellipse cx={seeded(seed, index) * 4} cy={0} fill="none" key={radius} rx={radius * 0.8} ry={radius} stroke="#e4e6d8" strokeWidth="2.2" />)}
    </svg>
  );
}

/** Blood: a dark bench; the lamp follows the pointer and only lit spots can be marked. */
function UvLamp({ seed, onDone, say }: Game) {
  // One spot per third of the bench so they never overlap.
  const spots = [0, 1, 2].map((index) => ({ x: (index + 0.2 + seeded(seed, index) * 0.6) / 3, y: 0.15 + seeded(seed, index + 10) * 0.7 }));
  const [lamp, setLamp] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const [marked, setMarked] = useState<number[]>([]);
  const lit = (spot: { x: number; y: number }) => lamp !== null && Math.hypot(spot.x * lamp.width - lamp.x, spot.y * lamp.height - lamp.y) < 60;
  function mark(index: number) {
    if (marked.includes(index)) return;
    const next = [...marked, index];
    play("lamp");
    setMarked(next);
    say(`${next.length} of ${spots.length} marked`);
    if (next.length === spots.length) onDone();
  }
  return (
    <div className={`${AREA} cursor-none bg-[#05040c]`} onPointerLeave={() => setLamp(null)} onPointerMove={(event) => setLamp(local(event))}>
      {spots.map((spot, index) => (
        <button
          aria-label={`Glowing spot ${index + 1}`}
          className="absolute size-8 -translate-x-1/2 -translate-y-1/2 rounded-full transition-opacity"
          key={index}
          onClick={() => mark(index)}
          style={{ left: `${spot.x * 100}%`, top: `${spot.y * 100}%`, opacity: marked.includes(index) || lit(spot) ? 1 : 0, background: "radial-gradient(circle, #c7f7ff 0%, #7b5cff 55%, transparent 75%)", outline: marked.includes(index) ? "2px solid #e8ac51" : undefined }}
          type="button"
        />
      ))}
      {lamp ? <span aria-hidden="true" className="pointer-events-none absolute size-32 -translate-x-1/2 -translate-y-1/2 rounded-full" style={{ left: lamp.x, top: lamp.y, background: "radial-gradient(circle, rgba(150,90,255,0.35), transparent 70%)" }} /> : null}
    </div>
  );
}

/** DNA: hold the swab on a slowly drifting circle for a moment; sliding off starts over. */
function Swab({ seed, onDone, say }: Game) {
  const [time, setTime] = useState(0);
  const [held, setHeld] = useState(0);
  const pressing = useRef(false);
  const last = useRef(0);
  const centre = { x: 0.5 + Math.sin(time / 900 + seeded(seed, 1) * 6) * 0.3, y: 0.5 + Math.cos(time / 1300 + seeded(seed, 2) * 6) * 0.25 };
  useEffect(() => {
    let frame = requestAnimationFrame(function tick(now) {
      setTime(now);
      frame = requestAnimationFrame(tick);
    });
    return () => cancelAnimationFrame(frame);
  }, []);
  function track(event: ReactPointerEvent) {
    if (!pressing.current) return;
    const point = local(event);
    const now = performance.now();
    const inside = Math.hypot(point.x - centre.x * point.width, point.y - centre.y * point.height) < 34;
    if (!inside) { if (held > 0) { play("wrong"); say("Slipped off. Start again."); } setHeld(0); last.current = now; return; }
    play("swab");
    const next = held + (now - last.current);
    last.current = now;
    setHeld(next);
    if (next >= 1500) { pressing.current = false; onDone(); }
  }
  return (
    <div
      className={`${AREA} cursor-crosshair bg-[#101716]`}
      onPointerDown={(event) => { event.currentTarget.setPointerCapture(event.pointerId); pressing.current = true; last.current = performance.now(); track(event); }}
      onPointerMove={track}
      onPointerUp={() => { pressing.current = false; if (held > 0 && held < 1500) say("Too short. Keep it on longer."); setHeld(0); }}
    >
      <span aria-hidden="true" className="pointer-events-none absolute size-16 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-dashed border-[#e9e6da]/70" style={{ left: `${centre.x * 100}%`, top: `${centre.y * 100}%`, background: `conic-gradient(rgba(233,230,218,.45) ${Math.min(1, held / 1500) * 360}deg, transparent 0)` }} />
    </div>
  );
}

/** Toxicology: hold to draw liquid into the vial and let go inside the band. Too much spills. */
function Pipette({ seed, onDone, say }: Game) {
  const band = 0.45 + seeded(seed, 3) * 0.3;
  const [level, setLevel] = useState(0);
  const frame = useRef<number | null>(null);
  const levelRef = useRef(0);
  function start() {
    play("pour");
    const begin = performance.now();
    const tick = (now: number) => {
      levelRef.current = Math.min(1.05, (now - begin) / 1800);
      setLevel(levelRef.current);
      if (levelRef.current >= 1.05) { stop(); return; }
      frame.current = requestAnimationFrame(tick);
    };
    frame.current = requestAnimationFrame(tick);
  }
  function stop() {
    if (frame.current === null) return;
    cancelAnimationFrame(frame.current);
    frame.current = null;
    const value = levelRef.current;
    if (value >= band && value <= band + 0.15) { onDone(); return; }
    play("wrong");
    say(value > band + 0.15 ? "Overfilled and spilled. Try again." : "Not enough sample. Try again.");
    levelRef.current = 0;
    setLevel(0);
  }
  useEffect(() => () => { if (frame.current !== null) cancelAnimationFrame(frame.current); }, []);
  return (
    <div className={`${AREA} flex cursor-pointer items-end justify-center bg-[#0c1514] pb-4`} onPointerDown={start} onPointerLeave={stop} onPointerUp={stop}>
      <div className="relative h-44 w-16 overflow-hidden rounded-b-2xl border-2 border-[#c8d8d2]/60">
        <span aria-hidden="true" className="absolute inset-x-0 border-y-2 border-[#7ccf8a] bg-[#7ccf8a]/15" style={{ bottom: `${band * 100}%`, height: "15%" }} />
        <span aria-hidden="true" className="absolute inset-x-0 bottom-0 bg-[#9fd1c4]/70" style={{ height: `${Math.min(1, level) * 100}%` }} />
      </div>
    </div>
  );
}

/** Fibres: grab the tape's tab and pull it across in one stroke; letting go early snaps it back. */
function Tape({ onDone, say }: Game) {
  const [pull, setPull] = useState(0);
  const pulling = useRef(false);
  return (
    <div
      className={`${AREA} cursor-grab bg-[#121a1f]`}
      onPointerDown={(event) => {
        const point = local(event);
        if (point.x > point.width * 0.15) { say("Start from the tab on the left."); return; }
        event.currentTarget.setPointerCapture(event.pointerId);
        pulling.current = true;
      }}
      onPointerMove={(event) => {
        if (!pulling.current) return;
        const point = local(event);
        const next = Math.max(0, Math.min(1, point.x / point.width));
        if (next > pull) play("tape");
        setPull(next);
        if (next >= 0.95) { pulling.current = false; onDone(); }
      }}
      onPointerUp={() => { if (pulling.current && pull < 0.95) { play("wrong"); say("The tape snapped back. Pull it all the way."); } pulling.current = false; setPull(0); }}
    >
      <span aria-hidden="true" className="absolute left-0 top-1/2 h-16 w-[12%] -translate-y-1/2 border-2 border-[#bcd3ff] bg-[#bcd3ff]/30" />
      <span aria-hidden="true" className="absolute left-0 top-1/2 h-16 -translate-y-1/2 bg-[#bcd3ff]/25" style={{ width: `${Math.max(12, pull * 100)}%` }} />
      <span aria-hidden="true" className="absolute right-3 top-1/2 h-16 -translate-y-1/2 border-r-2 border-dashed border-[#bcd3ff]/50" />
    </div>
  );
}

/** Footprints: stir the plaster around the bowl three times before it can be poured. */
function Stir({ onDone, say }: Game) {
  const [turned, setTurned] = useState(0);
  const angle = useRef<number | null>(null);
  const total = useRef(0);
  const NEEDED = Math.PI * 6;
  return (
    <div
      className={`${AREA} flex cursor-grab items-center justify-center bg-[#16120c]`}
      onPointerDown={(event) => { event.currentTarget.setPointerCapture(event.pointerId); const point = local(event); angle.current = Math.atan2(point.y - point.height / 2, point.x - point.width / 2); }}
      onPointerMove={(event) => {
        if (angle.current === null) return;
        const point = local(event);
        const next = Math.atan2(point.y - point.height / 2, point.x - point.width / 2);
        let delta = next - angle.current;
        if (delta > Math.PI) delta -= Math.PI * 2;
        if (delta < -Math.PI) delta += Math.PI * 2;
        angle.current = next;
        total.current += Math.abs(delta);
        if (Math.abs(delta) > 0.05) play("stir");
        setTurned(total.current);
        if (total.current >= NEEDED) { angle.current = null; onDone(); }
      }}
      onPointerUp={() => { angle.current = null; if (total.current < NEEDED) say(`Keep stirring · ${Math.round((total.current / NEEDED) * 100)}%`); }}
    >
      <div aria-hidden="true" className="relative size-40 rounded-full border-4 border-[#c9b38f]/70 bg-[#d9cfbf]/20" style={{ background: `conic-gradient(rgba(201,179,143,.5) ${Math.min(1, turned / NEEDED) * 360}deg, rgba(217,207,191,.12) 0)` }}>
        <span className="absolute left-1/2 top-1/2 h-16 w-1 origin-top bg-[#c9b38f]" style={{ transform: `rotate(${(turned * 180) / Math.PI}deg)` }} />
      </div>
    </div>
  );
}

/** Ballistics: two bullets under the scope; slide the lower one until its uneven grooves match the upper one. */
function Scope({ seed, onDone, say }: Game) {
  // Uneven gaps and widths, so only the right position looks like a match.
  const grooves: { x: number; width: number }[] = [];
  for (let index = 0, x = 4; index < 7; index++, x += 6 + seeded(seed, index + 20) * 14) grooves.push({ x, width: 2 + Math.floor(seeded(seed, index + 40) * 12) });
  const [offset, setOffset] = useState(() => (seeded(seed, 30) > 0.5 ? 1 : -1) * (12 + seeded(seed, 31) * 18));
  const drag = useRef<{ x: number; offset: number } | null>(null);
  const strip = (shift: number, label: string) => (
    <div className="relative h-1/2 overflow-hidden border-y border-[#e8ac51]/30 bg-gradient-to-b from-[#3a2c14] via-[#6b5228] to-[#3a2c14]">
      <span className="absolute left-2 top-1 text-[10px] uppercase text-[#f1c987]/70">{label}</span>
      {grooves.map((groove) => <span className="absolute inset-y-0 bg-[#140f07]" key={groove.x} style={{ left: `${groove.x + shift}%`, width: groove.width }} />)}
    </div>
  );
  return (
    <div
      className={`${AREA} cursor-ew-resize bg-[#141007]`}
      onPointerDown={(event) => { event.currentTarget.setPointerCapture(event.pointerId); drag.current = { x: local(event).x, offset }; }}
      onPointerMove={(event) => {
        if (!drag.current) return;
        const point = local(event);
        setOffset(Math.max(-40, Math.min(40, drag.current.offset + ((point.x - drag.current.x) / point.width) * 100)));
        play("scope");
      }}
      onPointerUp={() => { drag.current = null; if (Math.abs(offset) < 2) { setOffset(0); onDone(); } else { play("wrong"); say("The grooves don't line up yet."); } }}
    >
      {strip(0, "Reference bullet")}
      {strip(offset, "This sample · drag me")}
    </div>
  );
}

/** Regions of the body on the table, seen from above: the body's left is on the viewer's right. */
const REGIONS = [
  { name: "the head", x: 50, y: 12, w: 14, h: 14 },
  { name: "the neck", x: 50, y: 22, w: 10, h: 5 },
  { name: "the chest", x: 50, y: 34, w: 26, h: 14 },
  { name: "the abdomen", x: 50, y: 52, w: 24, h: 14 },
  { name: "the body's right arm", x: 24, y: 42, w: 10, h: 30 },
  { name: "the body's left arm", x: 76, y: 42, w: 10, h: 30 },
  { name: "the body's right leg", x: 41, y: 79, w: 12, h: 22 },
  { name: "the body's left leg", x: 59, y: 79, w: 12, h: 22 },
];

/**
 * Autopsy: the pathologist dictates four regions in a seeded order and you examine each on an unlabelled body.
 * Left and right are the body's own, as a pathologist says them. A wrong region is corrected, never reset.
 * It shows no findings; the stored report is the only result.
 */
function Autopsy({ seed, onDone, say }: Game) {
  const order = [...REGIONS.keys()].sort((a, b) => seeded(seed, a) - seeded(seed, b)).slice(0, 4);
  const [next, setNext] = useState(0);
  const dictation = order.map((index, step) => <span className={step < next ? "text-[#e5a18e]/45 line-through" : step === next ? "text-[#f1c987]" : ""} key={index}>{step ? ", then " : ""}{REGIONS[index].name}</span>);
  function examine(index: number) {
    if (index !== order[next]) { play("wrong"); say(`Not there. The pathologist asked for ${REGIONS[order[next]].name}.`); return; }
    play("tap");
    say("");
    if (next === order.length - 1) { onDone(); return; }
    setNext(next + 1);
  }
  return (
    <div className={`${AREA} flex flex-col bg-[#1a1412]`}>
      <p className="px-3 pt-2 text-left text-xs normal-case leading-snug text-[#e4e6d8]">&ldquo;Examine {dictation}.&rdquo;</p>
      <div className="relative mx-auto aspect-square min-h-0 flex-1">
        <svg aria-hidden="true" className="absolute inset-0 h-full w-full" viewBox="0 0 100 100">
          <ellipse cx="50" cy="12" fill="none" rx="7" ry="8" stroke="#e5a18e" strokeOpacity=".45" />
          <path d="M36 22 Q50 19 64 22 L64 62 L62 92 L52 92 L50 66 L48 92 L38 92 L36 62 Z" fill="none" stroke="#e5a18e" strokeOpacity=".45" />
          <path d="M36 26 L20 58 M64 26 L80 58" stroke="#e5a18e" strokeOpacity=".45" strokeWidth="3" />
        </svg>
        {REGIONS.map((region, index) => {
          const done = order.slice(0, next).includes(index);
          return <button aria-label={`Examine ${region.name}`} className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-sm transition hover:bg-[#e5a18e]/15 ${done ? "bg-[#e5a18e]/25" : ""}`} key={region.name} onClick={() => examine(index)} style={{ left: `${region.x}%`, top: `${region.y}%`, width: `${region.w}%`, height: `${region.h}%` }} type="button" />;
        })}
      </div>
    </div>
  );
}
