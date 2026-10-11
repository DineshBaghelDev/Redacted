"use client";

import { errorText } from "../../../lib/error-text";
import { FirstTimeTip } from "../first-time-tip";
import { useAuth } from "@clerk/nextjs";
import { useMutation } from "convex/react";
import { useQuery } from "convex-helpers/react/cache";
import type { FunctionReturnType } from "convex/server";
import { useEffect, useRef, useState } from "react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { formatGameMinute, partOfDay } from "../../../lib/game-time";
import { play } from "../../../lib/sound";
import { CctvScreen } from "./cctv-screen";
import { GameIcon } from "../game-icon";
import { HoldButton } from "../gestures";
import { InvestigationIcon } from "../investigation-icon";
import { startCardDrag } from "../../../lib/evidence-drag";
import { DeviceViewer } from "./device-viewer";

type Place = NonNullable<FunctionReturnType<typeof api.investigation.getPlace>>;
type Room = Place["rooms"][number];
type Item = Place["items"][number];

const atmosphere = {
  Morning: "Grey morning light falls through the windows.",
  Afternoon: "The afternoon is quiet; somewhere a radio is playing.",
  Evening: "The lights are coming on. Rain ticks against the glass.",
  Night: "It is dark and still. Your torch picks out the doorway.",
} as const;

/** Orders one floor's rooms by how many doors they are from its first room, so the strip reads like walking in. */
function walkOrder(rooms: Room[], connections: Place["connections"]) {
  const ids = new Set(rooms.map((room) => room.id));
  const edges = connections.filter((edge) => ids.has(edge.a) && ids.has(edge.b));
  const start = rooms.find((room) => room.isEntrance) ?? rooms[0];
  const depth = new Map<string, number>(start ? [[start.id, 0]] : []);
  const queue = start ? [start.id] : [];
  while (queue.length) {
    const current = queue.shift()!;
    for (const edge of edges) {
      const next = edge.a === current ? edge.b : edge.b === current ? edge.a : null;
      if (next && !depth.has(next)) { depth.set(next, depth.get(current)! + 1); queue.push(next); }
    }
  }
  return [...rooms].sort((a, b) => (depth.get(a.id) ?? 99) - (depth.get(b.id) ?? 99));
}

export function PlaceScreen({ roomCode, onBack }: { roomCode: string; onBack: () => void }) {
  const { isLoaded, isSignedIn } = useAuth();
  const place = useQuery(api.investigation.getPlace, isLoaded && isSignedIn ? { roomCode } : "skip");
  const boardNodes = useQuery(api.clueBoard.getNodes, isLoaded && isSignedIn ? { roomCode } : "skip");
  const moveToRoom = useMutation(api.investigation.moveToRoom);
  const searchSpot = useMutation(api.investigation.searchSpot);
  const readDevice = useMutation(api.investigation.readDevice);
  const collectItem = useMutation(api.investigation.collectItem);
  const finishAction = useMutation(api.investigation.finishAction);
  const createReference = useMutation(api.clueBoard.createReferenceNode);
  const [working, setWorking] = useState(false);
  const [now, setNow] = useState(0);
  const [error, setError] = useState("");
  const [cameraOpen, setCameraOpen] = useState(false);
  const [floor, setFloor] = useState<number | null>(null);
  const [arrivedAt, setArrivedAt] = useState<string | null>(() => {
    try {
      return window.sessionStorage.getItem(`redacted.arrived.${roomCode}`);
    } catch {
      return null;
    }
  });
  const [activeDeviceId, setActiveDeviceId] = useState<Id<"caseItems"> | null>(null);
  const seenItems = useRef<Set<string> | null>(null);
  const [freshItems, setFreshItems] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!place?.action || place.clock.clockStartedAt === null) return;
    let finishing = false;
    const update = () => {
      const timestamp = Date.now();
      setNow(timestamp);
      const gameTime = place.clock.gameTime + Math.max(0, Math.floor((timestamp - place.clock.clockStartedAt!) / place.clock.minuteMs));
      if (gameTime < place.action!.completeGameTime || finishing) return;
      finishing = true;
      void finishAction({ roomCode }).catch((caught: unknown) => {
        finishing = false;
        setError(errorText(caught, "Could not finish that action."));
      });
    };
    update();
    const interval = window.setInterval(update, 100);
    return () => window.clearInterval(interval);
  }, [place?.action, place?.clock, finishAction, roomCode]);

  // Newly found objects flip into view once.
  useEffect(() => {
    if (!place) return;
    const ids = new Set(place.items.map((item) => item.id as string));
    if (seenItems.current) {
      const fresh = [...ids].filter((id) => !seenItems.current!.has(id));
      if (fresh.length) setFreshItems(new Set(fresh));
    }
    seenItems.current = ids;
  }, [place]);

  const currentRoomId = place?.currentRoomId;
  useEffect(() => {
    if (currentRoomId) play("door");
  }, [currentRoomId]);

  function run(action: Promise<unknown>) {
    setWorking(true);
    setError("");
    play("click");
    void action.catch((caught: unknown) => {
      setError(errorText(caught, "That action could not be completed."));
    }).finally(() => setWorking(false));
  }

  function pin(type: "item" | "device_file" | "call" | "message", referenceId: string) {
    const count = boardNodes?.length ?? 0;
    run(createReference({ roomCode, type, referenceId, x: 80 + (count % 4) * 220, y: 90 + Math.floor(count / 4) * 180 }));
  }

  if (place === undefined) return <PlaceMessage message="Opening this place..." onBack={onBack} />;
  if (!place) return <PlaceMessage message="There are no rooms to explore here right now." onBack={onBack} />;
  if (cameraOpen) return <CctvScreen roomCode={roomCode} onBack={() => setCameraOpen(false)} backLabel="Back to room" />;
  const activeDevice = place.items.find((item) => item.id === activeDeviceId && item.device?.read);
  if (activeDevice?.device) return <DeviceViewer title={activeDevice.name} data={activeDevice.device} onBack={() => setActiveDeviceId(null)} onPin={pin} isPinned={(type, id) => boardNodes?.some((node) => node.type === type && node.referenceId === id) ?? false} busy={working || Boolean(place.action)} error={error} />;

  const currentRoom = place.rooms.find((room) => room.id === place.currentRoomId);
  // Bagged objects stay on their spot's card (marked "Bagged"); the lab and notebook are where carried evidence is used.
  const here = place.items.filter((item) => item.roomId === place.currentRoomId);
  const busy = working || Boolean(place.action);
  const gameTime = place.clock.gameTime + (place.clock.clockStartedAt === null || now === 0
    ? 0 : Math.max(0, Math.floor((now - place.clock.clockStartedAt) / place.clock.minuteMs)));
  const floors = [...new Set(place.rooms.map((room) => room.floor))].sort((a, b) => a - b);
  const shownFloor = floor ?? currentRoom?.floor ?? floors[0] ?? 0;
  const floorRooms = walkOrder(place.rooms.filter((room) => room.floor === shownFloor), place.connections);
  const stairs = new Set(place.connections.flatMap((edge) => {
    const a = place.rooms.find((room) => room.id === edge.a);
    const b = place.rooms.find((room) => room.id === edge.b);
    return a && b && a.floor !== b.floor ? [a.id, b.id] : [];
  }));
  const actionRoom = place.rooms.find((room) => room.id === place.action?.roomId);
  const actionLabel = place.action?.kind === "move" ? `Walking to ${actionRoom?.name ?? "the room"}`
    : place.action?.kind === "search" ? `Searching ${currentRoom?.spots.find((spot) => spot.key === place.action?.slot)?.name ?? "the room"}`
      : place.action?.kind === "device" ? "Reading device"
        : place.action?.kind === "inspect" ? "Inspecting" : "Working";
  const showArrival = arrivedAt !== place.placeName;

  return (
    <section className="game-place-scene absolute inset-0 z-20 flex flex-col overflow-hidden bg-[#071014] text-[#e4e6d8]">
      <header className="game-station-header flex shrink-0 items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-[0.25em] text-[#a5c6bb]/80">{currentRoom?.name ?? "Inside"}</p>
          <h2 className="mt-1 break-words text-xl uppercase tracking-wide sm:text-2xl">{place.placeName}</h2>
        </div>
        <button className="min-h-11 shrink-0 border border-[#6f9f98]/70 px-3 py-2 text-sm uppercase hover:border-[#e8ac51] hover:text-[#e8ac51]" onClick={onBack} type="button">Leave building</button>
      </header>

      {showArrival ? (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/80 p-4 animate-in fade-in duration-500">
          <div className="game-dossier w-full max-w-lg px-6 py-8 text-center">
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-red-800">{formatGameMinute(gameTime)}</p>
            <h3 className="mt-2 text-3xl uppercase">{place.placeName}</h3>
            <p className="mt-4 text-sm leading-relaxed">{place.placeDescription}</p>
            <p className="mt-3 text-sm italic leading-relaxed text-[#5d4d3d]">{atmosphere[partOfDay(gameTime)]} {place.rooms.length} rooms{floors.length > 1 ? ` over ${floors.length} floors` : ""}.</p>
            {place.partners.length ? <p className="mt-2 text-xs uppercase text-red-800">{place.partners[0].name} is already inside · {place.rooms.find((room) => room.id === place.partners[0].roomId)?.name}</p> : null}
            <button autoFocus className="mt-6 min-h-11 border-2 border-[#573821] px-5 uppercase hover:bg-[#573821] hover:text-[#f4ead2]" onClick={() => {
              play("door");
              setArrivedAt(place.placeName);
              try {
                window.sessionStorage.setItem(`redacted.arrived.${roomCode}`, place.placeName);
              } catch {
                // Arrival cards are a convenience; showing one again is harmless.
              }
            }} type="button">Step inside</button>
          </div>
        </div>
      ) : null}

      <nav aria-label="Rooms" className="flex shrink-0 items-center gap-2 overflow-x-auto border-b border-[#6f9f98]/25 bg-[#071619]/85 px-4 py-2 sm:px-6">
        {floors.length > 1 ? floors.map((number) => <button aria-pressed={number === shownFloor} className="min-h-9 shrink-0 border border-[#6f9f98]/50 px-2 text-xs uppercase aria-pressed:border-[#e8ac51] aria-pressed:text-[#f1c987]" key={number} onClick={() => setFloor(number)} type="button">{number === 0 ? "Ground" : `Floor ${number}`}</button>) : null}
        {floorRooms.map((room) => {
          const current = room.id === place.currentRoomId;
          const done = room.spots.length > 0 && room.spots.every((spot) => spot.searched);
          const partner = place.partners.find((item) => item.roomId === room.id);
          return (
            <button
              className="plan-room relative shrink-0"
              data-current={current}
              data-done={done}
              disabled={busy || current || room.walkMinutes === undefined}
              key={room.id}
              onClick={() => run(moveToRoom({ roomCode, roomId: room.id }))}
              title={current ? "You are here" : room.walkMinutes !== undefined ? `Walk here · ${room.walkMinutes} min` : "No way through"}
              type="button"
            >
              <span className="whitespace-nowrap">{room.name}</span>
              <span className="flex items-center gap-1 text-[0.65rem] normal-case text-[#c8d8d2]/70">
                {current ? <span className="text-[#f1c987]">● You</span> : room.walkMinutes !== undefined ? `${room.walkMinutes} min` : null}
                {partner ? <span className="text-[#9fd1c4]">◆ {partner.name}</span> : null}
                {stairs.has(room.id) ? <span>↕</span> : null}
                {room.hasCamera ? <span title="Camera">◉</span> : null}
                {done ? <span>✓</span> : null}
              </span>
            </button>
          );
        })}
      </nav>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="game-station-main mx-auto min-h-0 max-w-5xl p-4 sm:p-6">
          <h3 className="flex items-center gap-3 text-2xl uppercase"><InvestigationIcon className="size-11" name="room" /><span className="min-w-0 break-words">{currentRoom?.name ?? "Entrance"}</span></h3>
          <FirstTimeTip id="place" title="Searching a place">Press and hold a spot to search it (4 min). Anything there flips up as a card: bag it for the lab, or pin it. Tap a room in the strip at the top to walk there. Press N any time for the notebook.</FirstTimeTip>
          {place.action && place.action.kind !== "search" ? (
            <div className="mt-4 border border-[#e8ac51]/45 bg-[#211d15] p-3" role="status">
              <p className="text-sm uppercase text-[#f1c987]">{actionLabel}</p>
              <progress aria-label={actionLabel} className="mt-2 h-2 w-full accent-[#e8ac51]" max={place.action.completeGameTime - place.action.startGameTime} value={Math.max(0, gameTime - place.action.startGameTime)} />
            </div>
          ) : null}
          {currentRoom?.hasCamera ? <button className="mt-4 flex min-h-11 items-center gap-3 text-left text-sm uppercase text-[#f1c987] hover:text-white" onClick={() => setCameraOpen(true)} type="button"><GameIcon name="cctv" className="size-9" /><span>Check this room&apos;s camera</span></button> : null}
          {error ? <p className="mt-4 border border-red-300/60 bg-red-950/70 p-3 text-sm text-red-100" role="alert">{error}</p> : null}

          {currentRoom?.spots.length ? (
            <>
              <p className="mt-6 text-xs uppercase tracking-[0.2em] text-[#c8d8d2]/55">Where to look · 4 min each</p>
              <ul className="mt-2 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {currentRoom.spots.map((spot) => {
                  const searching = place.action?.kind === "search" && place.action.slot === spot.key;
                  const found = here.filter((item) => item.spot === spot.key);
                  return (
                    <li key={spot.key}>
                      {!spot.searched ? (
                        <HoldButton className="min-h-20 border-[#e8ac51]/40 bg-[#14140e]/70 p-3 text-left normal-case" disabled={busy} label={searching ? "Searching..." : "Press and hold to search"} onDone={() => run(searchSpot({ roomCode, spot: spot.key }))}>
                          <span className="flex items-center gap-2 text-sm uppercase text-[#e4e6d8]"><InvestigationIcon className="size-7" name="search" />{spot.name}</span>
                        </HoldButton>
                      ) : <div className="border border-[#6f9f98]/30 bg-[#071619]/70 p-3"><p className="flex items-center gap-2 text-sm uppercase"><InvestigationIcon className="size-7" name="search" />{spot.name}</p>{found.length ? (
                        <div className="mt-2 grid gap-2">{found.map((item) => <ItemCard busy={busy} fresh={freshItems.has(item.id)} item={item} key={item.id} onCollect={() => run(collectItem({ roomCode, itemId: item.id }))} onOpenDevice={() => setActiveDeviceId(item.id)} onPin={() => pin("item", item.id)} onRead={(code, crack) => run(readDevice({ roomCode, itemId: item.id, code, crack }))} pinned={boardNodes?.some((node) => node.type === "item" && node.referenceId === item.id) ?? false} />)}</div>
                      ) : <p className="mt-2 text-sm text-[#c8d8d2]/55">Nothing here.</p>}</div>}
                    </li>
                  );
                })}
              </ul>
            </>
          ) : <p className="mt-6 text-sm text-[#c8d8d2]/60">Nothing to search here. Pick another room at the top.</p>}

        </div>
      </div>
    </section>
  );
}

function ItemCard({ item, busy, pinned, fresh, onRead, onOpenDevice, onCollect, onPin }: {
  item: Item;
  busy: boolean;
  pinned: boolean;
  fresh: boolean;
  onRead: (code?: string, crack?: boolean) => void;
  onOpenDevice: () => void;
  onCollect?: () => void;
  onPin: () => void;
}) {
  const [code, setCode] = useState("");
  const locked = item.device && !item.device.read;
  return (
    <article className={`border-l-2 border-[#e8ac51] bg-[#0b1a1c]/90 p-3 ${fresh ? "reveal-card" : ""}`} draggable onDragStart={(event) => startCardDrag(event, { kind: "item", referenceId: item.id, label: item.name })}>
      <div className="flex items-start gap-2">
        <h5 className="flex min-w-0 flex-1 items-center gap-2 text-sm uppercase text-[#f1c987]"><InvestigationIcon className="size-8" name={item.device ? "device" : "evidence"} /><span className="min-w-0 break-words">{item.name}</span></h5>
        {onCollect && item.collectible && !item.collected ? <button aria-label="Bag it for the lab" className="shrink-0 border border-[#e8ac51]/50 p-1 hover:border-[#e8ac51] disabled:opacity-45" disabled={busy} onClick={onCollect} title="Bag it for the lab" type="button"><InvestigationIcon className="size-6" name="lab" /></button> : null}
        {item.collected ? <span className="shrink-0 text-[0.65rem] uppercase text-[#9fd1c4]" title="In the evidence bag">Bagged</span> : null}
        <button aria-label={pinned ? "Pinned to the clueboard" : "Pin to the clueboard"} className="shrink-0 border border-[#6f9f98]/50 p-1 hover:border-[#e8ac51] disabled:opacity-35" disabled={busy || pinned} onClick={onPin} title={pinned ? "Pinned" : "Pin to the clueboard"} type="button"><GameIcon className="size-6" name="clueboard" /></button>
      </div>
      <p className="mt-2 text-sm leading-relaxed text-[#c8d8d2]/75">{item.description}</p>
      {locked ? (
        <form className="mt-3 flex flex-wrap items-center gap-2" onSubmit={(event) => { event.preventDefault(); if (code.length === 4) onRead(code); }}>
          <label className="sr-only" htmlFor={`code-${item.id}`}>Unlock code</label>
          <input autoComplete="off" className="h-9 w-24 border border-[#45635d] bg-[#071014] text-center font-mono text-lg tracking-[0.4em] text-[#f1c987] outline-none focus:border-[#e8ac51]" id={`code-${item.id}`} inputMode="numeric" maxLength={4} onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))} placeholder="····" value={code} />
          <button className="min-h-9 border border-[#e8ac51]/70 px-2 text-xs uppercase text-[#f1c987] disabled:opacity-45" disabled={busy || code.length !== 4} type="submit">Unlock · 5 min</button>
          <button className="basis-full text-left text-[0.7rem] normal-case text-[#c8d8d2]/55 underline-offset-4 hover:text-[#e8ac51] hover:underline disabled:opacity-45" disabled={busy} onClick={() => onRead(undefined, true)} type="button">No code? Have the lab crack it (60 min)</button>
        </form>
      ) : null}
      {item.device?.read ? <button className="mt-3 min-h-9 border border-[#e8ac51]/70 px-2 text-xs uppercase text-[#f1c987]" onClick={onOpenDevice} type="button">Open {item.device.type}</button> : null}
    </article>
  );
}

function PlaceMessage({ message, onBack }: { message: string; onBack: () => void }) {
  return (
    <section className="game-place-scene absolute inset-0 z-20 flex items-center justify-center p-4 text-[#e4e6d8]">
      <div className="game-panel w-full max-w-lg px-7 py-9 text-center sm:px-12">
        <InvestigationIcon className="mx-auto size-12" name="room" />
        <p className="mt-4 text-lg uppercase leading-snug">{message}</p>
        <button className="mt-6 min-h-11 w-full border border-[#6f9f98]/70 px-4 py-2 uppercase hover:border-[#e8ac51] hover:text-[#e8ac51] sm:w-auto" onClick={onBack} type="button">Open the city map</button>
      </div>
    </section>
  );
}
