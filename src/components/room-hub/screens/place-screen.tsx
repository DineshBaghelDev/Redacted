"use client";

import { errorText } from "../../../lib/error-text";
import { FirstTimeTip } from "../first-time-tip";
import { useAuth } from "@clerk/nextjs";
import { useMutation } from "convex/react";
import { useQuery } from "convex-helpers/react/cache";
import type { FunctionReturnType } from "convex/server";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { partOfDay } from "../../../lib/game-time";
import { play, type Cue } from "../../../lib/sound";
import { ControlIcon } from "../control-icon";
import { CctvScreen } from "./cctv-screen";
import { PinButton } from "../pin-button";
import { BuildingMap, RoomView } from "../building-view";
import { InvestigationIcon } from "../investigation-icon";
import { ObjectIcon } from "../object-icon";
import { startCardDrag } from "../../../lib/evidence-drag";
import { DeviceViewer } from "./device-viewer";

type Place = NonNullable<FunctionReturnType<typeof api.investigation.getPlace>>;
type Item = Place["items"][number];

const atmosphere = {
  Morning: "Grey morning light falls through the windows.",
  Afternoon: "The afternoon is quiet; somewhere a radio is playing.",
  Evening: "The lights are coming on. Rain ticks against the glass.",
  Night: "It is dark and still. Your torch picks out the doorway.",
} as const;

/** Manage room navigation, timed searches, evidence collection, and device or camera inspection at a place. */
export function PlaceScreen({ roomCode, onBack }: { roomCode: string; onBack: () => void }) {
  const { isLoaded, isSignedIn } = useAuth();
  const place = useQuery(api.investigation.getPlace, isLoaded && isSignedIn ? { roomCode } : "skip");
  const boardNodes = useQuery(api.clueBoard.getNodes, isLoaded && isSignedIn ? { roomCode } : "skip");
  const moveToRoom = useMutation(api.investigation.moveToRoom);
  const searchSpot = useMutation(api.investigation.searchSpot);
  const readDevice = useMutation(api.investigation.readDevice);
  const collectItem = useMutation(api.investigation.collectItem);
  const finishAction = useMutation(api.investigation.finishAction);
  const [working, setWorking] = useState(false);
  const [now, setNow] = useState(0);
  const [error, setError] = useState("");
  const [cameraOpen, setCameraOpen] = useState(false);
  const [floor, setFloor] = useState<number | null>(null);
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
      if (fresh.length) { setFreshItems(new Set(fresh)); play("reveal"); }
    }
    seenItems.current = ids;
  }, [place]);

  // Arriving shows the place and its mood in the game's one notification stack.
  const placeName = place?.placeName;
  const arrivalMood = place ? atmosphere[partOfDay(place.clock.gameTime)] : "";
  useEffect(() => {
    if (placeName) window.dispatchEvent(new CustomEvent("game-toast", { detail: `${placeName} · ${arrivalMood}` }));
    // Only on arriving somewhere new, not as the clock moves.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [placeName]);

  const currentRoomId = place?.currentRoomId;
  useEffect(() => {
    if (currentRoomId) play("door");
  }, [currentRoomId]);

  function run(action: Promise<unknown>, cue: Cue = "click", success?: Cue) {
    setWorking(true);
    setError("");
    play(cue);
    void action.then(() => { if (success) play(success); }).catch((caught: unknown) => {
      play("wrong");
      setError(errorText(caught, "That action could not be completed."));
    }).finally(() => setWorking(false));
  }

  if (place === undefined) return <PlaceMessage message="Opening this place..." onBack={onBack} />;
  if (!place) return <PlaceMessage message="There are no rooms to explore here right now." onBack={onBack} />;
  if (cameraOpen) return <CctvScreen roomCode={roomCode} onBack={() => setCameraOpen(false)} backLabel="Back to room" />;
  const activeDevice = place.items.find((item) => item.id === activeDeviceId && item.device?.read);
  if (activeDevice?.device) return <DeviceViewer roomCode={roomCode} title={activeDevice.name} data={activeDevice.device} nodes={boardNodes} onBack={() => setActiveDeviceId(null)} onPinError={(caught) => setError(errorText(caught, "Could not update this pin."))} busy={working || Boolean(place.action)} error={error} />;

  const currentRoom = place.rooms.find((room) => room.id === place.currentRoomId);
  // Bagged objects stay on their spot's card (marked "Bagged"); the lab and notebook are where carried evidence is used.
  const here = place.items.filter((item) => item.roomId === place.currentRoomId);
  const busy = working || Boolean(place.action);
  const gameTime = place.clock.gameTime + (place.clock.clockStartedAt === null || now === 0
    ? 0 : Math.max(0, Math.floor((now - place.clock.clockStartedAt) / place.clock.minuteMs)));
  const floors = [...new Set(place.rooms.map((room) => room.floor))].sort((a, b) => a - b);
  const shownFloor = floor ?? currentRoom?.floor ?? floors[0] ?? 0;
  const foundBySpot = new Map((currentRoom?.spots ?? []).map((spot) => [spot.key, here.filter((item) => item.spot === spot.key).length]));
  const searchedSpots = currentRoom?.spots.filter((spot) => spot.searched && foundBySpot.get(spot.key)) ?? [];
  const actionRoom = place.rooms.find((room) => room.id === place.action?.roomId);
  const actionLabel = place.action?.kind === "move" ? `Walking to ${actionRoom?.name ?? "the room"}`
    : place.action?.kind === "search" ? `Searching ${currentRoom?.spots.find((spot) => spot.key === place.action?.slot)?.name ?? "the room"}`
      : place.action?.kind === "device" ? "Reading device"
        : place.action?.kind === "inspect" ? "Inspecting" : "Working";

  return (
    <section className="game-place-scene absolute inset-0 z-20 flex flex-col overflow-hidden bg-[#071014] text-[#e4e6d8]">
      <header className="game-station-header flex shrink-0 items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-[0.25em] text-[#a5c6bb]/80">{currentRoom?.name ?? "Inside"}</p>
          <h2 className="mt-1 break-words text-xl uppercase tracking-wide sm:text-2xl">{place.placeName}</h2>
        </div>
        <button aria-label="Leave building" className="game-control-button game-icon-mobile flex min-h-11 shrink-0 items-center gap-2 px-3 text-sm uppercase" onClick={onBack} title="Leave building" type="button"><ControlIcon name="back" /><span className="hidden sm:inline">Leave building</span></button>
      </header>


      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="game-station-main mx-auto min-h-0 max-w-6xl p-4 sm:p-6">
          <FirstTimeTip id="place" title="Exploring a building">Hold furniture to search. Use doors or the room map to move.</FirstTimeTip>
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_23rem]">
            <div>
              <h3 className="mb-2 flex items-center gap-3 text-xl uppercase"><InvestigationIcon className="size-9" name="room" /><span className="min-w-0 break-words">{currentRoom?.name ?? "Entrance"}</span></h3>
              {currentRoom ? (
                <RoomView
                  busy={busy}
                  foundBySpot={foundBySpot}
                  onCamera={() => setCameraOpen(true)}
                  onSearch={(spot) => run(searchSpot({ roomCode, spot }), "search")}
                  onWalk={(roomId) => run(moveToRoom({ roomCode, roomId: roomId as Id<"rooms"> }), "step")}
                  place={place}
                  room={currentRoom}
                  searchingKey={place.action?.kind === "search" ? place.action.slot ?? null : null}
                  walkingTo={place.action?.kind === "move" ? actionRoom ?? null : null}
                />
              ) : null}
              {place.action && place.action.kind !== "search" && place.action.kind !== "move" ? (
                <div className="mt-3 border border-[#e8ac51]/45 bg-[#211d15] p-3" role="status">
                  <p className="text-sm uppercase text-[#f1c987]">{actionLabel}</p>
                  <progress aria-label={actionLabel} className="mt-2 h-2 w-full accent-[#e8ac51]" max={place.action.completeGameTime - place.action.startGameTime} value={Math.max(0, gameTime - place.action.startGameTime)} />
                </div>
              ) : null}
              {error ? <p className="mt-3 border border-red-300/60 bg-red-950/70 p-3 text-sm text-red-100" role="alert">{error}</p> : null}
            </div>
            <aside aria-label="Building map" className="lg:pt-11">
              <BuildingMap busy={busy} floor={shownFloor} floors={floors} onFloor={setFloor} onWalk={(roomId) => run(moveToRoom({ roomCode, roomId: roomId as Id<"rooms"> }), "step")} place={place} />
            </aside>
          </div>

          {searchedSpots.length ? (
            <section className="mt-6">
              <p className="text-xs uppercase tracking-[0.2em] text-[#c8d8d2]/55">Found in this room</p>
              <ul className="mt-2 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {searchedSpots.map((spot) => {
                  const found = here.filter((item) => item.spot === spot.key);
                  return (
                    <li className="border border-[#6f9f98]/30 bg-[#071619]/80 p-3" id={`spot-${spot.key}`} key={spot.key}>
                      <p className="flex items-center gap-2 text-sm uppercase"><InvestigationIcon className="size-7" name="search" />{spot.name}</p>
                      <div className="mt-2 grid gap-2">{found.map((item) => <ItemCard busy={busy} fresh={freshItems.has(item.id)} item={item} key={item.id} onCollect={() => run(collectItem({ roomCode, itemId: item.id }), "bag")} onOpenDevice={() => { play("open"); setActiveDeviceId(item.id); }} onRead={(code, crack) => run(readDevice({ roomCode, itemId: item.id, code, crack }), "click", "unlock")} pinControl={<PinButton disabled={busy} nodes={boardNodes} onError={(caught) => setError(errorText(caught, "Could not update this pin."))} referenceId={item.id} roomCode={roomCode} type="item" />} />)}</div>
                    </li>
                  );
                })}
              </ul>
            </section>
          ) : null}

        </div>
      </div>
    </section>
  );
}

function ItemCard({ item, busy, pinControl, fresh, onRead, onOpenDevice, onCollect }: {
  item: Item;
  busy: boolean;
  pinControl: ReactNode;
  fresh: boolean;
  onRead: (code?: string, crack?: boolean) => void;
  onOpenDevice: () => void;
  onCollect?: () => void;
}) {
  const [code, setCode] = useState("");
  const locked = item.device && !item.device.read;
  return (
    <article className={`border-l-2 border-[#e8ac51] bg-[#0b1a1c]/90 p-3 ${fresh ? "reveal-card" : ""}`} draggable onDragStart={(event) => startCardDrag(event, { kind: "item", referenceId: item.id, label: item.name })}>
      <div className="flex items-start gap-2">
        <h5 className="flex min-w-0 flex-1 items-center gap-2 text-sm uppercase text-[#f1c987]"><ObjectIcon className="size-9" name={item.name} /><span className="min-w-0 break-words">{item.name}</span></h5>
        {onCollect && item.collectible && !item.collected ? <button aria-label="Bag it for the lab" className="game-icon-button disabled:opacity-45" disabled={busy} onClick={onCollect} title="Bag it for the lab" type="button"><InvestigationIcon className="size-8" name="lab" /></button> : null}
        {item.collected ? <span className="shrink-0 text-[0.65rem] uppercase text-[#9fd1c4]" title="In the evidence bag">Bagged</span> : null}
        {pinControl}
      </div>
      <p className="mt-2 text-sm leading-relaxed text-[#c8d8d2]/75">{item.description}</p>
      {locked ? (
        <details className="mt-3">
          <summary className="cursor-pointer text-xs uppercase text-[#f1c987]">Unlock {item.device?.type} · enter code</summary>
          <form className="mt-3 flex flex-col items-start gap-3" onSubmit={(event) => { event.preventDefault(); if (code.length === 4) onRead(code); }}>
            <label className="sr-only" htmlFor={`code-${item.id}`}>Unlock code</label>
            <input autoComplete="off" className="h-10 w-32 border-b border-[#e8ac51] bg-[#071014] text-center font-mono text-lg tracking-[0.4em] text-[#f1c987] outline-none focus:border-[#f1c987]" id={`code-${item.id}`} inputMode="numeric" maxLength={4} onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))} placeholder="····" value={code} />
            <div className="device-keypad relative w-40" role="group" aria-label="Code keypad">
              <div className="absolute inset-[17%_15%_13%] grid grid-cols-3 grid-rows-4 gap-[4%]">
                {["1", "2", "3", "4", "5", "6", "7", "8", "9", "C", "0", "⌫"].map((digit) => <button aria-label={digit === "C" ? "Clear code" : digit === "⌫" ? "Delete last digit" : `Digit ${digit}`} className="font-mono text-sm text-[#f1c987] hover:text-white focus-visible:outline-2 focus-visible:outline-[#f1c987]" key={digit} onClick={() => setCode((current) => digit === "C" ? "" : digit === "⌫" ? current.slice(0, -1) : `${current}${digit}`.slice(0, 4))} type="button">{digit}</button>)}
              </div>
            </div>
            <button className="game-control-button min-h-11 px-3 text-xs uppercase text-[#f1c987] disabled:opacity-45" disabled={busy || code.length !== 4} type="submit">Unlock · 5 min</button>
            <button className="text-left text-[0.7rem] normal-case text-[#c8d8d2]/55 underline-offset-4 hover:text-[#e8ac51] hover:underline disabled:opacity-45" disabled={busy} onClick={() => onRead(undefined, true)} type="button">No code? Have the lab crack it (60 min)</button>
          </form>
        </details>
      ) : null}
      {item.device?.read ? <button className="game-control-button mt-3 min-h-11 px-3 text-xs uppercase text-[#f1c987]" onClick={onOpenDevice} type="button"><ControlIcon name="play" />Open {item.device.type}</button> : null}
    </article>
  );
}

function PlaceMessage({ message, onBack }: { message: string; onBack: () => void }) {
  return (
    <section className="game-place-scene absolute inset-0 z-20 flex items-center justify-center p-4 text-[#e4e6d8]">
      <div className="game-panel w-full max-w-lg px-7 py-9 text-center sm:px-12">
        <InvestigationIcon className="mx-auto size-12" name="room" />
        <p className="mt-4 text-lg uppercase leading-snug">{message}</p>
        <button className="game-control-button mt-6 min-h-11 w-full px-4 uppercase sm:w-auto" onClick={onBack} type="button"><ControlIcon name="back" />Open the city map</button>
      </div>
    </section>
  );
}
