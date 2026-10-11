"use client";

import { errorText } from "../../../lib/error-text";
import { FirstTimeTip } from "../first-time-tip";
import { useAuth } from "@clerk/nextjs";
import { useMutation } from "convex/react";
import { useQuery } from "convex-helpers/react/cache";
import type { FunctionReturnType } from "convex/server";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { api } from "../../../../convex/_generated/api";
import { play } from "../../../lib/sound";
import { CharacterPortrait } from "../character-portrait";
import { PinButton } from "../pin-button";
import { GameIcon } from "../game-icon";
import { ControlIcon } from "../control-icon";
import { cardDropTarget, startCardDrag } from "../../../lib/evidence-drag";
import type { Id } from "../../../../convex/_generated/dataModel";

type Camera = NonNullable<FunctionReturnType<typeof api.cases.getCctv>>["cameras"][number];
type Person = NonNullable<FunctionReturnType<typeof api.npcs.list>>[number];

/** Pixels of tape per game minute: an hour is a comfortable swipe. */
const PX_PER_MINUTE = 4;

function clock(minutes: number) {
  const withinDay = ((minutes % 1440) + 1440) % 1440;
  return `${String(Math.floor(withinDay / 60)).padStart(2, "0")}:${String(withinDay % 60).padStart(2, "0")}`;
}

function day(minutes: number) {
  return Math.floor(minutes / 1440) + 1;
}

/** The server reviews an hour as ±30 minutes around its middle minute; every client derives the same key. */
function hourKey(minute: number, camera: Camera) {
  return Math.min(camera.end, Math.max(camera.start, Math.floor(minute / 60) * 60 + 30));
}

export function CctvScreen({ roomCode, onBack, backLabel = "Step away from the terminal" }: { roomCode: string; onBack: () => void; backLabel?: string }) {
  const { isLoaded, isSignedIn } = useAuth();
  const presetTime = Number(useSearchParams().get("t"));
  const data = useQuery(api.cases.getCctv, isLoaded && isSignedIn ? { roomCode } : "skip");
  const people = useQuery(api.npcs.list, isLoaded && isSignedIn ? { roomCode } : "skip");
  const [chosenCameraId, setCameraId] = useState("");
  const [compareOpen, setCompareOpen] = useState(false);

  const [wallOpen, setWallOpen] = useState(true);
  const camera = data?.cameras.find((item) => item.id === chosenCameraId) ?? data?.cameras[0];
  if (data === undefined) return <CctvMessage message="Powering up the terminal..." onBack={onBack} backLabel={backLabel} />;
  if (!data || !camera) return <CctvMessage message="There are no cameras to review here." onBack={onBack} backLabel={backLabel} />;

  return (
    <section className="game-cctv-scene game-records-scene absolute inset-0 z-20 flex flex-col overflow-hidden text-[#e4e6d8]">
      <header className="game-station-header flex flex-wrap items-center justify-between gap-3 px-4 py-3 sm:flex-nowrap sm:px-6">
        <div className="min-w-0 basis-full sm:basis-auto">
          <p className="text-xs uppercase tracking-[0.25em] text-[#a5c6bb]/80">Security terminal</p>
          <h2 className="mt-1 text-lg uppercase tracking-wide sm:text-2xl">Camera tapes</h2>
        </div>
        <button className="game-control-button flex min-h-11 shrink-0 items-center gap-2 px-3 text-xs uppercase sm:text-sm" onClick={() => setCompareOpen(!compareOpen)} type="button"><GameIcon className="size-6" name="interview" />{compareOpen ? "Hide people" : <>Compare<span className="hidden sm:inline"> with people</span></>}</button>
        <button aria-label={backLabel} className="game-control-button flex min-h-11 shrink-0 items-center gap-2 px-3 text-xs uppercase sm:text-sm" onClick={onBack} title={backLabel} type="button"><ControlIcon name="back" /><span className="hidden sm:inline">{backLabel}</span></button>
      </header>
      <div className="game-station-main relative flex min-h-0 flex-1">
        <div className="min-h-0 min-w-0 flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="mx-auto max-w-5xl">
            {data.cameras.length > 1 && wallOpen ? (
              <MonitorWall cameras={data.cameras} selectedId={chosenCameraId} onPick={(id) => { play("click"); setCameraId(id); setWallOpen(false); }} />
            ) : (
              <>
                {data.cameras.length > 1 ? (
                  <button className="game-control-button mb-3 min-h-11 px-3 text-xs uppercase text-[#c8d8d2]" onClick={() => setWallOpen(true)} type="button">
                    <GameIcon className="size-6" name="cctv" />◀ Change camera
                  </button>
                ) : null}
                <TapeScrubber camera={camera} key={camera.id} presetTime={Number.isFinite(presetTime) && presetTime > 0 ? presetTime : null} roomCode={roomCode} />
              </>
            )}
          </div>
        </div>
        {compareOpen ? (
          <aside aria-label="People to compare" className="game-dossier w-full max-w-xs shrink-0 overflow-y-auto px-5 pb-8 pt-10 animate-in slide-in-from-right max-sm:absolute max-sm:inset-y-0 max-sm:right-0 max-sm:z-10">
            <p className="text-xs uppercase tracking-[0.2em] text-red-800">What they look like</p>
            <p className="mt-1 text-xs text-[#5d4d3d]">Drag a face onto a sighting if you think it&apos;s them.</p>
            <ul className="mt-3 space-y-3">
              {(people ?? []).filter((person) => !person.isVictim).map((person) => (
                <li className="flex cursor-grab gap-2 border-b border-[#8b7355]/50 pb-3" draggable key={person.id} onDragStart={(event) => startCardDrag(event, { kind: "person", referenceId: person.id, label: person.name })}>
                  <CharacterPortrait age={person.age} className="w-12" description={person.publicDescription} gender={person.gender} id={person.id} />
                  <div className="min-w-0"><p className="text-sm uppercase">{person.name}</p><p className="text-xs leading-relaxed">{person.publicDescription}</p></div>
                </li>
              ))}
            </ul>
          </aside>
        ) : null}
      </div>
    </section>
  );
}

/** "Street camera · Linden Court - Carver Towers" → group "Street camera", label "Linden Court – Carver Towers". */
function splitName(name: string) {
  const at = name.indexOf(" · ");
  return at === -1 ? { group: "Cameras", label: name } : { group: name.slice(0, at), label: name.slice(at + 3).replace(" - ", " – ") };
}

/** A security-desk wall of screens, grouped by where the cameras are. */
function MonitorWall({ cameras, selectedId, onPick }: { cameras: Camera[]; selectedId: string; onPick: (id: string) => void }) {
  const groups = new Map<string, Camera[]>();
  for (const item of cameras) groups.set(splitName(item.name).group, [...(groups.get(splitName(item.name).group) ?? []), item]);
  return (
    <div className="space-y-5">
      <p className="text-sm text-[#c8d8d2]/80">Pick a screen to watch its tape.</p>
      {[...groups].map(([group, items]) => (
        <section key={group}>
          <h3 className="text-xs uppercase tracking-[0.2em] text-[#e8ac51]">{group === "Street camera" ? "Streets" : group} · {items.length}</h3>
          <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
            {items.map((item) => (
              <button
                aria-pressed={item.id === selectedId}
                className={`cctv-monitor relative flex min-h-24 flex-col justify-between overflow-hidden border-2 bg-[#020807] p-3 text-left font-mono transition hover:border-[#e8ac51] aria-pressed:border-[#e8ac51] ${item.faulty ? "border-[#3a2a2a] opacity-60" : "border-[#2f4a47]"}`}
                key={item.id}
                onClick={() => onPick(item.id)}
                type="button"
              >
                <span className={`text-[0.65rem] uppercase tracking-[0.15em] ${item.faulty ? "text-red-300" : "text-[#7fd1ae]"}`}>{item.faulty ? "No signal" : "● Rec"}</span>
                <span className="text-sm leading-snug text-[#c9f2dd]">{splitName(item.name).label}</span>
              </button>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function TapeScrubber({ roomCode, camera, presetTime }: { roomCode: string; camera: Camera; presetTime: number | null }) {
  const tape = useQuery(api.cases.getCctvTape, { roomCode, cameraId: camera.id });
  const boardNodes = useQuery(api.clueBoard.getNodes, { roomCode });
  const startReview = useMutation(api.cases.startCctvReview);
  const labelSighting = useMutation(api.cases.labelSighting);
  const people = useQuery(api.npcs.list, { roomCode });
  const createReference = useMutation(api.clueBoard.createReferenceNode);
  const scroller = useRef<HTMLDivElement>(null);
  const requested = useRef(new Set<number>());
  const startMinute = presetTime !== null && presetTime >= camera.start && presetTime <= camera.end ? presetTime : camera.start;
  const [minute, setMinute] = useState(startMinute);
  const [error, setError] = useState("");
  const [pinning, setPinning] = useState("");
  const length = camera.end - camera.start;
  const key = hourKey(minute, camera);
  const review = tape?.reviews.find((row) => row.minute === key);
  const onScreen = (tape?.records ?? []).filter((record) => minute >= record.start - 1 && minute <= record.end + 1);
  const thisHour = (tape?.records ?? []).filter((record) => record.end >= key - 30 && record.start <= key + 30);

  // Start at the preset time (from a call or message) or the beginning of the tape.
  useEffect(() => {
    if (scroller.current) scroller.current.scrollLeft = (startMinute - camera.start) * PX_PER_MINUTE;
  }, [camera.start, startMinute]);

  // Mouse wheel and click-drag scrub the tape like a jog wheel; touch uses native sideways scrolling.
  useEffect(() => {
    const element = scroller.current;
    if (!element) return;
    const onWheel = (event: WheelEvent) => {
      if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return;
      event.preventDefault();
      element.scrollLeft += event.deltaY;
    };
    let dragX: number | null = null;
    const onDown = (event: PointerEvent) => {
      if (event.pointerType !== "mouse" || (event.target as HTMLElement).tagName === "BUTTON") return;
      dragX = event.clientX;
      element.setPointerCapture(event.pointerId);
    };
    const onMove = (event: PointerEvent) => {
      if (dragX === null) return;
      element.scrollLeft -= event.clientX - dragX;
      dragX = event.clientX;
    };
    const onUp = () => { dragX = null; };
    element.addEventListener("wheel", onWheel, { passive: false });
    element.addEventListener("pointerdown", onDown);
    element.addEventListener("pointermove", onMove);
    element.addEventListener("pointerup", onUp);
    return () => {
      element.removeEventListener("wheel", onWheel);
      element.removeEventListener("pointerdown", onDown);
      element.removeEventListener("pointermove", onMove);
      element.removeEventListener("pointerup", onUp);
    };
  }, []);

  // Hours you scrub through are logged in the background so their sightings reach the notebook. No waiting.
  useEffect(() => {
    if (camera.faulty || !tape || review || requested.current.has(key)) return;
    const timer = window.setTimeout(() => {
      requested.current.add(key);
      void startReview({ roomCode, cameraId: camera.id, minute: key }).catch(() => requested.current.delete(key));
    }, 150);
    return () => window.clearTimeout(timer);
  }, [camera, key, review, roomCode, startReview, tape]);

  useEffect(() => {
    if (onScreen.length) play("type");
  }, [onScreen.length]);

  function seek(target: number) {
    const clamped = Math.min(camera.end, Math.max(camera.start, target));
    scroller.current?.scrollTo({ left: (clamped - camera.start) * PX_PER_MINUTE, behavior: "smooth" });
  }

  function personFor(recordId: string) {
    const npcId = tape?.labels.find((label) => label.recordId === recordId)?.npcId;
    return npcId ? people?.find((person) => person.id === npcId) : undefined;
  }

  function mark(recordId: string, npcId: string | null) {
    setError("");
    void labelSighting({ roomCode, recordId, npcId: npcId as Id<"npcs"> | null }).catch((caught: unknown) => setError(errorText(caught, "Could not mark that sighting.")));
  }

  function pinRecord(referenceId: string) {
    const count = boardNodes?.length ?? 0;
    setPinning(referenceId);
    void createReference({ roomCode, type: "cctv", referenceId, x: 80 + (count % 4) * 220, y: 90 + Math.floor(count / 4) * 180 })
      .catch((caught: unknown) => setError(errorText(caught, "Could not pin this sighting.")))
      .finally(() => setPinning(""));
  }

  const hours = [];
  for (let hour = Math.ceil(camera.start / 60) * 60; hour <= camera.end; hour += 60) hours.push(hour);
  const sightings = tape?.records ?? [];
  const previous = [...sightings].reverse().find((record) => record.start < minute - 1);
  const next = sightings.find((record) => record.start > minute + 1);

  return (
    <div>
      <FirstTimeTip id="cctv" title="Camera tapes">Drag the tape to scan. Drop a face on a sighting to mark your guess.</FirstTimeTip>
      <div className="cctv-monitor relative overflow-hidden border-2 border-[#2f4a47] bg-[#020807] p-4 font-mono sm:p-6">
        <div className="flex flex-wrap items-baseline justify-between gap-2 text-xs uppercase tracking-[0.18em] text-[#7fd1ae]">
          <span>{camera.name}</span>
          <span className="text-[#7fd1ae]">{camera.faulty ? "No signal" : "▶ Play"}</span>
        </div>
        <p className="mt-3 text-3xl tabular-nums text-[#c9f2dd] sm:text-5xl">Day {day(minute)} · {clock(minute)}</p>
        <div className="mt-4 min-h-24 border-t border-[#2f4a47] pt-3 text-sm leading-relaxed sm:text-base">
          {camera.faulty ? <p className="text-red-300">This camera recorded nothing during the case.</p>
            : onScreen.length ? onScreen.map((record) => (
                <div className={`terminal-line flex items-start gap-3 ${record.kind === "offline" ? "text-red-300" : "text-[#f1c987]"}`} key={record.id} {...cardDropTarget((card) => mark(record.id, card.referenceId), (kind) => kind === "person")}>
                  <p className="min-w-0 flex-1"><span className="text-[#7fd1ae]">[{clock(record.start)}–{clock(record.end)}]</span> {record.summary}</p>
                  {record.kind !== "offline" ? <PhotoSlot onMark={(npcId) => mark(record.id, npcId)} people={people ?? []} person={personFor(record.id)} /> : null}
                  <PinButton busy={pinning === record.id} onClick={() => pinRecord(record.id)} pinned={Boolean(boardNodes?.some((node) => node.type === "cctv" && node.referenceId === record.id))} />
                </div>
              )) : <p className="text-[#7fd1ae]/50">Empty frame. Nobody in view.</p>}
        </div>
        {error ? <p className="mt-2 text-xs text-[#e5a18e]" role="status">{error}</p> : null}
      </div>

      {!camera.faulty ? (
        <>
          <div className="relative mt-3 border-2 border-[#2f4a47] bg-[#061210]">
            <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-1/2 z-10 w-0.5 -translate-x-1/2 bg-[#e8ac51] shadow-[0_0_8px_#e8ac51]" />
            <div
              aria-label="Camera tape. Scroll sideways to move through time."
              className="cctv-tape overflow-x-auto overflow-y-hidden"
              onScroll={(event) => setMinute(Math.round(camera.start + event.currentTarget.scrollLeft / PX_PER_MINUTE))}
              ref={scroller}
              tabIndex={0}
            >
              {/* Half-screen padding at both ends lets the first and last minute reach the playhead. */}
              <div className="h-24" style={{ width: length * PX_PER_MINUTE, boxSizing: "content-box", paddingInline: "50%" }}>
                <div className="relative h-full" style={{ width: length * PX_PER_MINUTE }}>
                  {(tape?.reviews ?? []).filter((row) => row.ready).map((row) => (
                    <span aria-hidden="true" className="absolute inset-y-0 bg-[#7fd1ae]/10" key={row.minute} style={{ left: (row.minute - 30 - camera.start) * PX_PER_MINUTE, width: 60 * PX_PER_MINUTE }} />
                  ))}
                  {hours.map((hour) => (
                    <span className="absolute bottom-0 top-0 border-l border-[#2f4a47] pl-1 pt-1 font-mono text-[0.65rem] text-[#7fd1ae]/70" key={hour} style={{ left: (hour - camera.start) * PX_PER_MINUTE }}>
                      {hour % 1440 === 0 ? `Day ${day(hour)}` : clock(hour)}
                    </span>
                  ))}
                  {sightings.map((record) => (
                    <button
                      aria-label={`Sighting at ${clock(record.start)}`}
                      className={`absolute bottom-3 h-8 min-w-1.5 ${record.kind === "offline" ? "bg-red-400/70" : "bg-[#e8ac51]"} hover:brightness-125`}
                      key={record.id}
                      onClick={() => seek(record.start)}
                      style={{ left: (record.start - camera.start) * PX_PER_MINUTE, width: Math.max(1, record.end - record.start) * PX_PER_MINUTE }}
                      type="button"
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2 font-mono text-xs uppercase">
            <button className="min-h-10 border border-[#2f4a47] px-3 text-[#9fe0c2] hover:border-[#7fd1ae] disabled:opacity-40" disabled={!previous} onClick={() => previous && seek(previous.start)} type="button">◀◀ Last sighting</button>
            <button className="min-h-10 border border-[#2f4a47] px-3 text-[#9fe0c2] hover:border-[#7fd1ae]" onClick={() => seek(minute - 10)} type="button">−10 min</button>
            <button className="min-h-10 border border-[#2f4a47] px-3 text-[#9fe0c2] hover:border-[#7fd1ae]" onClick={() => seek(minute + 10)} type="button">+10 min</button>
            <button className="min-h-10 border border-[#2f4a47] px-3 text-[#9fe0c2] hover:border-[#7fd1ae] disabled:opacity-40" disabled={!next} onClick={() => next && seek(next.start)} type="button">Next sighting ▶▶</button>
            <span className="ml-auto normal-case tracking-normal text-[#c8d8d2]/60">Drag or scroll the tape. Orange marks are people passing.</span>
          </div>

          {tape ? (
            <details className="mt-5">
              <summary className="cursor-pointer text-xs uppercase tracking-[0.18em] text-[#e8ac51]">This hour · {clock(key - 30)}–{clock(key + 30)} · {thisHour.length} sighting{thisHour.length === 1 ? "" : "s"}</summary>
              {thisHour.length ? (
                <ul className="mt-2 divide-y divide-[#2f4a47] border-y border-[#2f4a47] font-mono text-sm">
                  {thisHour.map((record) => {
                    const pinned = boardNodes?.some((node) => node.type === "cctv" && node.referenceId === record.id);
                    return (
                      <li className="flex flex-wrap items-center gap-2 py-2" key={record.id} {...cardDropTarget((card) => mark(record.id, card.referenceId), (kind) => kind === "person")}>
                        <button className="min-w-0 flex-1 text-left font-mono normal-case text-[#c9f2dd] hover:text-[#f1c987]" onClick={() => seek(record.start)} type="button"><span className="text-[#e8ac51]">[{clock(record.start)}]</span> {record.summary}</button>
                        {record.kind !== "offline" ? <PhotoSlot onMark={(npcId) => mark(record.id, npcId)} people={people ?? []} person={personFor(record.id)} small /> : null}
                        <PinButton busy={pinning === record.id} className="ml-auto" onClick={() => pinRecord(record.id)} pinned={Boolean(pinned)} />
                      </li>
                    );
                  })}
                </ul>
              ) : <p className="mt-2 font-mono text-sm text-[#7fd1ae]/50">Nobody passed this camera in this hour.</p>}
            </details>
          ) : null}
        </>
      ) : null}
    </div>
  );
}

/**
 * A photo clipped next to a sighting: who the team thinks it shows. Empty, it takes a dropped face or a tap to pick one.
 * The mark is shared with the partner, shows in the notebook and on the clueboard, and is never checked.
 */
function PhotoSlot({ person, people, onMark, small = false }: { person?: Person; people: Person[]; onMark: (npcId: string | null) => void; small?: boolean }) {
  // Where the picker opens, in screen coordinates. It renders on the page body so the monitor frame never clips it.
  const [picking, setPicking] = useState<{ top: number; left: number } | null>(null);
  const toggle = (event: React.MouseEvent) => {
    const rect = event.currentTarget.getBoundingClientRect();
    setPicking(picking ? null : { top: rect.bottom + 4, left: Math.max(8, Math.min(rect.right - 256, window.innerWidth - 264)) });
  };
  const suspects = people.filter((item) => !item.isVictim);
  return (
    <div className="relative shrink-0 font-mono">
      {person ? (
        <div className="flex items-center gap-2 border border-[#9fd1c4]/50 bg-[#0c1f1d] p-1 pr-2">
          <button aria-label={`Change who this is (now ${person.name})`} onClick={toggle} type="button"><CharacterPortrait age={person.age} className={small ? "w-10" : "w-14"} description={person.publicDescription} gender={person.gender} id={person.id} /></button>
          <span className="max-w-28 text-xs uppercase leading-tight text-[#9fd1c4]">{small ? null : <span className="block text-[0.6rem] text-[#7fd1ae]/70">You think</span>}{person.name}</span>
          <button aria-label="Clear" className="text-xs text-[#7fd1ae] hover:text-[#e8ac51]" onClick={() => onMark(null)} type="button">✕</button>
        </div>
      ) : (
        <button className={`flex items-center justify-center border border-dashed border-[#7fd1ae]/50 text-center text-[0.6rem] uppercase leading-tight text-[#7fd1ae]/70 hover:border-[#e8ac51] hover:text-[#e8ac51] ${small ? "h-10 px-2" : "h-16 w-14"}`} onClick={toggle} type="button">Who is it?</button>
      )}
      {picking ? createPortal(
        <div className="fixed z-50 grid w-64 grid-cols-4 gap-2 border border-[#2f4a47] bg-[#020807] p-2 shadow-xl" style={picking}>
          {suspects.map((item) => (
            <button className="text-center text-[0.6rem] uppercase leading-tight text-[#c9f2dd] hover:text-[#f1c987]" key={item.id} onClick={() => { onMark(item.id); setPicking(null); }} type="button">
              <CharacterPortrait age={item.age} className="mx-auto w-11" description={item.publicDescription} gender={item.gender} id={item.id} />
              <span className="mt-1 block truncate">{item.name.split(" ")[0]}</span>
            </button>
          ))}
          {suspects.length ? null : <p className="col-span-4 text-xs text-[#7fd1ae]/60">You haven&apos;t come across anyone yet.</p>}
        </div>,
        document.body,
      ) : null}
    </div>
  );
}

function CctvMessage({ message, onBack, backLabel }: { message: string; onBack: () => void; backLabel: string }) {
  return (
    <section className="game-cctv-scene game-records-scene absolute inset-0 z-20 flex items-center justify-center p-4 text-[#e4e6d8]">
      <div className="game-panel w-full max-w-lg px-7 py-9 text-center sm:px-12">
        <GameIcon className="mx-auto size-12" name="cctv" />
        <p className="mt-4 text-lg uppercase leading-snug text-[#c8d8d2]">{message}</p>
        <button className="mt-6 min-h-11 w-full border border-[#6f9f98]/70 px-4 py-2 uppercase hover:border-[#e8ac51] hover:text-[#e8ac51] sm:w-auto" onClick={onBack} type="button">
          {backLabel}
        </button>
      </div>
    </section>
  );
}
