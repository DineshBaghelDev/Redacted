"use client";

import { useAuth } from "@clerk/nextjs";
import { useMutation, useQuery } from "convex/react";
import { useEffect, useState } from "react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";

export function PlaceScreen({ roomCode, onBack }: { roomCode: string; onBack: () => void }) {
  const { isLoaded, isSignedIn } = useAuth();
  const place = useQuery(api.investigation.getPlace, isLoaded && isSignedIn ? { roomCode } : "skip");
  const boardNodes = useQuery(api.clueBoard.getNodes, isLoaded && isSignedIn ? { roomCode } : "skip");
  const moveToRoom = useMutation(api.investigation.moveToRoom);
  const searchRoom = useMutation(api.investigation.searchRoom);
  const inspectItem = useMutation(api.investigation.inspectItem);
  const collectItem = useMutation(api.investigation.collectItem);
  const finishAction = useMutation(api.investigation.finishAction);
  const createReference = useMutation(api.clueBoard.createReferenceNode);
  const [working, setWorking] = useState(false);
  const [now, setNow] = useState(0);
  const [error, setError] = useState("");

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
        setError(caught instanceof Error ? caught.message : "Could not finish that action.");
      });
    };
    update();
    const interval = window.setInterval(update, 250);
    return () => window.clearInterval(interval);
  }, [place?.action, place?.clock, finishAction, roomCode]);

  function run(action: Promise<unknown>) {
    setWorking(true);
    setError("");
    void action.catch((caught: unknown) => {
      setError(caught instanceof Error ? caught.message : "That action could not be completed.");
    }).finally(() => setWorking(false));
  }

  function pinItem(itemId: Id<"caseItems">) {
    const count = boardNodes?.length ?? 0;
    run(createReference({ roomCode, type: "item", referenceId: itemId, x: 80 + (count % 4) * 220, y: 90 + (Math.floor(count / 4) % 4) * 180 }));
  }

  if (place === undefined) return <PlaceMessage message="Opening this place..." onBack={onBack} />;
  if (!place) return <PlaceMessage message="There are no rooms to explore here right now." onBack={onBack} />;

  const currentRoom = place.rooms.find((room) => room.id === place.currentRoomId);
  const here = place.items.filter((item) => item.roomId === place.currentRoomId && !item.collected);
  const inventory = place.items.filter((item) => item.collected);
  const gameTime = place.clock.gameTime + (place.clock.clockStartedAt === null || now === 0
    ? 0 : Math.max(0, Math.floor((now - place.clock.clockStartedAt) / place.clock.minuteMs)));
  const remaining = place.action ? Math.max(0, place.action.completeGameTime - gameTime) : 0;
  const actionRoom = place.rooms.find((room) => room.id === place.action?.roomId);
  const actionLabel = place.action?.kind === "move" ? `Moving to ${actionRoom?.name ?? "room"}`
    : place.action?.kind === "search" ? `Searching ${actionRoom?.name ?? "room"}`
      : place.action?.kind === "forensic" ? "Submitting lab test" : "Inspecting item";

  return (
    <section className="absolute inset-0 z-20 flex flex-col overflow-hidden bg-[#080b12] text-cyan-50">
      <header className="flex shrink-0 items-center justify-between gap-4 border-b border-cyan-300/30 bg-[#07111b] px-4 py-3 sm:px-6">
        <div>
          <p className="text-[10px] uppercase tracking-[0.25em] text-cyan-200/55">Explore this place</p>
          <h2 className="mt-1 text-xl uppercase tracking-wide sm:text-2xl">{place.placeName}</h2>
        </div>
        <button className="min-h-11 border border-cyan-300/70 px-3 py-2 text-sm uppercase hover:border-yellow-200 hover:text-yellow-200" onClick={onBack} type="button">Map</button>
      </header>

      <div className="grid min-h-0 flex-1 overflow-y-auto lg:grid-cols-[minmax(16rem,21rem)_minmax(0,1fr)] lg:overflow-hidden">
        <nav aria-label="Rooms" className="border-b border-cyan-300/25 bg-[#0b1520] p-4 lg:overflow-y-auto lg:border-b-0 lg:border-r">
          <p className="text-xs uppercase tracking-[0.2em] text-cyan-100/55">Rooms · {place.rooms.length}</p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
            {place.rooms.map((room) => {
              const current = room.id === place.currentRoomId;
              return (
                <button
                  className={`min-h-14 border px-3 py-2 text-left transition ${current ? "border-yellow-200 bg-yellow-200/10 text-yellow-100" : room.adjacent ? "border-cyan-300/40 bg-[#10202a] hover:border-yellow-200" : "border-cyan-300/15 text-cyan-100/45"}`}
                  disabled={working || Boolean(place.action) || current || !room.adjacent}
                  key={room.id}
                  onClick={() => run(moveToRoom({ roomCode, roomId: room.id }))}
                  type="button"
                >
                  <span className="block text-sm uppercase">{room.name}</span>
                  <span className="mt-1 block text-xs text-cyan-100/55">Floor {room.floor} · {current ? "You are here" : room.adjacent ? "Enter room" : "Move closer first"}{room.searched ? " · Searched" : ""}</span>
                </button>
              );
            })}
          </div>
        </nav>

        <div className="min-h-0 p-4 sm:p-6 lg:overflow-y-auto">
          <div className="mx-auto max-w-3xl">
            <p className="text-xs uppercase tracking-[0.2em] text-yellow-200/70">Current room</p>
            <h3 className="mt-1 text-2xl uppercase">{currentRoom?.name ?? "Entrance"}</h3>
            {place.action ? (
              <div className="mt-5 border border-yellow-200/45 bg-[#211d15] p-4" role="status">
                <p className="text-sm uppercase text-yellow-100">{actionLabel}</p>
                <p className="mt-1 text-xs text-yellow-100/70">{remaining} game min remaining</p>
                <progress aria-label={actionLabel} className="mt-3 h-2 w-full accent-yellow-200" max={place.action.completeGameTime - place.action.startGameTime} value={Math.max(0, gameTime - place.action.startGameTime)} />
              </div>
            ) : null}
            {currentRoom?.searchable ? (
              <button
                className="mt-5 min-h-11 border border-yellow-200/70 bg-yellow-200/10 px-5 text-sm uppercase text-yellow-100 hover:bg-yellow-200/20 disabled:cursor-default disabled:opacity-45"
                disabled={working || Boolean(place.action) || currentRoom.searched}
                onClick={() => run(searchRoom({ roomCode }))}
                type="button"
              >{currentRoom.searched ? "Room searched" : "Search room · 15 min"}</button>
            ) : <p className="mt-5 text-sm text-cyan-100/55">There is nothing to search in this room.</p>}

            <h4 className="mt-8 border-t border-cyan-300/25 pt-5 text-xs uppercase tracking-[0.2em] text-cyan-100/55">Found here</h4>
            {here.length ? <div className="mt-3 grid gap-3 sm:grid-cols-2">{here.map((item) => (
              <ItemCard key={item.id} item={item} busy={working || Boolean(place.action)} pinned={boardNodes?.some((node) => node.type === "item" && node.referenceId === item.id) ?? false} onInspect={() => run(inspectItem({ roomCode, itemId: item.id }))} onCollect={() => run(collectItem({ roomCode, itemId: item.id }))} onPin={() => pinItem(item.id)} />
            ))}</div> : <p className="mt-3 text-sm text-cyan-100/55">{currentRoom?.searched ? "Nothing found here." : "Search this room to see what is here."}</p>}

            <h4 className="mt-8 border-t border-cyan-300/25 pt-5 text-xs uppercase tracking-[0.2em] text-cyan-100/55">Shared inventory · {inventory.length}</h4>
            {inventory.length ? <div className="mt-3 grid gap-3 sm:grid-cols-2">{inventory.map((item) => (
              <ItemCard key={item.id} item={item} busy={working || Boolean(place.action)} pinned={boardNodes?.some((node) => node.type === "item" && node.referenceId === item.id) ?? false} onInspect={() => run(inspectItem({ roomCode, itemId: item.id }))} onPin={() => pinItem(item.id)} />
            ))}</div> : <p className="mt-3 text-sm text-cyan-100/55">Items you collect will appear here for both investigators.</p>}
            {error ? <p className="mt-5 border border-red-300/60 bg-red-950/70 p-3 text-sm text-red-100" role="alert">{error}</p> : null}
          </div>
        </div>
      </div>
    </section>
  );
}

function ItemCard({ item, busy, pinned, onInspect, onCollect, onPin }: {
  item: { id: Id<"caseItems">; name: string; description?: string; collectible: boolean; collected: boolean; inspected: boolean };
  busy: boolean;
  pinned: boolean;
  onInspect: () => void;
  onCollect?: () => void;
  onPin: () => void;
}) {
  return (
    <article className="border border-cyan-300/25 bg-[#0b1822] p-4">
      <h5 className="text-base uppercase text-cyan-50">{item.name}</h5>
      <p className="mt-2 text-sm leading-relaxed text-cyan-100/65">{item.description ?? "Inspect to learn more."}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        {!item.inspected ? <button className="min-h-10 border border-cyan-300/60 px-3 text-xs uppercase hover:border-yellow-200 hover:text-yellow-200 disabled:opacity-45" disabled={busy} onClick={onInspect} type="button">Inspect · 2 min</button> : null}
        {onCollect && item.collectible && !item.collected ? <button className="min-h-10 border border-yellow-200/70 bg-yellow-200/10 px-3 text-xs uppercase text-yellow-100 hover:bg-yellow-200/20 disabled:opacity-45" disabled={busy} onClick={onCollect} type="button">Collect</button> : null}
        <button className="min-h-10 border border-cyan-300/60 px-3 text-xs uppercase hover:border-yellow-200 hover:text-yellow-200 disabled:opacity-45" disabled={busy || pinned} onClick={onPin} type="button">{pinned ? "Pinned to clueboard" : "Pin to clueboard"}</button>
        {item.collected ? <span className="self-center text-xs uppercase text-yellow-200/75">In shared inventory</span> : null}
      </div>
    </article>
  );
}

function PlaceMessage({ message, onBack }: { message: string; onBack: () => void }) {
  return <section className="absolute inset-0 z-20 flex items-center justify-center bg-[#080b12] p-4 text-cyan-50"><div className="w-full max-w-lg border border-cyan-300/30 bg-[#07111b] p-6 text-center"><p className="text-lg uppercase">{message}</p><button className="mt-5 min-h-11 border border-cyan-300/70 px-4 py-2 uppercase hover:border-yellow-200 hover:text-yellow-200" onClick={onBack} type="button">Back to map</button></div></section>;
}
