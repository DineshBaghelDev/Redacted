"use client";

import { useAuth } from "@clerk/nextjs";
import { useMutation, useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api } from "../../../../convex/_generated/api";

const kindLabels = {
  home: "Residence",
  work: "Workplace",
  public: "Public place",
  bureau: "Bureau",
  lab: "Forensic lab",
} as const;

export function MapScreen({ roomCode, onBack }: { roomCode: string; onBack: () => void }) {
  const router = useRouter();
  const { isLoaded, isSignedIn } = useAuth();
  const city = useQuery(api.world.getMap, isLoaded && isSignedIn ? { roomCode } : "skip");
  const boardNodes = useQuery(api.clueBoard.getNodes, isLoaded && isSignedIn ? { roomCode } : "skip");
  const createReference = useMutation(api.clueBoard.createReferenceNode);
  const startTravel = useMutation(api.world.startTravel);
  const finishTravel = useMutation(api.world.finishTravel);
  const [selectedId, setSelectedId] = useState("police-bureau");
  const [pinning, setPinning] = useState("");
  const [traveling, setTraveling] = useState(false);
  const [now, setNow] = useState(0);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!city?.activeTravel || city.clock.clockStartedAt === null) return;
    let finishing = false;
    const update = () => {
      const timestamp = Date.now();
      setNow(timestamp);
      const gameTime = city.clock.gameTime + Math.max(0, Math.floor((timestamp - city.clock.clockStartedAt!) / city.clock.minuteMs));
      if (gameTime < city.activeTravel!.completeGameTime || finishing) return;
      finishing = true;
      void finishTravel({ roomCode }).catch((caught: unknown) => {
        finishing = false;
        setError(caught instanceof Error ? caught.message : "Could not finish this journey.");
      });
    };
    update();
    const interval = window.setInterval(update, 250);
    return () => window.clearInterval(interval);
  }, [city?.activeTravel, city?.clock, finishTravel, roomCode]);

  if (city === undefined) return <MapMessage message="Opening city map..." onBack={onBack} />;
  if (!city) return <MapMessage message="The city map is unavailable for this room." onBack={onBack} />;

  const selected = city.places.find((place) => place.id === selectedId) ?? city.places[0];
  const connected = city.streets
    .filter((street) => street.a === selected.id || street.b === selected.id)
    .map((street) => ({
      ...street,
      place: city.places.find((place) => place.id === (street.a === selected.id ? street.b : street.a))!,
    }));
  const activeStreetIds = new Set(connected.map((street) => street.id));
  const isPinned = boardNodes?.some((node) => node.type === "place" && node.referenceId === selected.id);
  const gameTime = city.clock.gameTime + (city.clock.clockStartedAt === null || now === 0
    ? 0
    : Math.max(0, Math.floor((now - city.clock.clockStartedAt) / city.clock.minuteMs)));
  const travelRemaining = city.activeTravel ? Math.max(0, city.activeTravel.completeGameTime - gameTime) : 0;

  function pinPlace() {
    const count = boardNodes?.length ?? 0;
    setPinning(selected.id);
    setError("");
    void createReference({
      roomCode,
      type: "place",
      referenceId: selected.id,
      x: 80 + (count % 4) * 220,
      y: 90 + Math.floor(count / 4) * 180,
    }).catch((caught: unknown) => {
      setError(caught instanceof Error ? caught.message : "Could not pin this place.");
    }).finally(() => setPinning(""));
  }

  function travelToSelected() {
    setTraveling(true);
    setError("");
    void startTravel({ roomCode, destinationId: selected.id }).catch((caught: unknown) => {
      setError(caught instanceof Error ? caught.message : "Could not start this journey.");
    }).finally(() => setTraveling(false));
  }

  return (
    <section className="absolute inset-0 z-20 flex flex-col overflow-hidden bg-[#071014] text-[#e4e6d8]">
      <header className="flex shrink-0 items-center justify-between gap-4 border-b border-[#6f9f98]/30 bg-[#0b1a1c] px-4 py-3 sm:px-6">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-[#a5c6bb]/80">Investigation routes</p>
          <h2 className="mt-1 text-xl uppercase tracking-wide sm:text-2xl">City map</h2>
        </div>
        <button className="border border-[#6f9f98]/70 px-3 py-2 text-sm uppercase hover:border-[#e8ac51] hover:text-[#e8ac51]" onClick={onBack} type="button">
          Back
        </button>
      </header>

      <div className="grid min-h-0 flex-1 grid-rows-[auto_auto] overflow-y-auto lg:grid-cols-[minmax(0,1fr)_20rem] lg:grid-rows-1 lg:overflow-hidden">
        <div className="min-h-0 overflow-visible p-3 sm:p-5 lg:overflow-auto">
          <label className="mb-3 block text-xs uppercase tracking-[0.18em] text-[#c8d8d2]/65 sm:hidden" htmlFor="mobile-place-picker">
            Find a place
            <select
              className="mt-2 min-h-11 w-full border border-[#6f9f98]/50 bg-[#0b1a1c] px-3 text-base uppercase text-[#e4e6d8]"
              id="mobile-place-picker"
              onChange={(event) => setSelectedId(event.target.value)}
              value={selected.id}
            >
              {city.places.map((place, index) => <option key={place.id} value={place.id}>{index + 1}. {place.name}</option>)}
            </select>
          </label>
          <div className="city-map relative mx-auto aspect-[5/4] h-auto min-h-[18rem] max-h-[calc(100vh-7rem)] w-full max-w-5xl overflow-hidden border border-[#6f9f98]/35 bg-[#10191a] lg:h-full">
            <span className="absolute left-3 top-2 text-xs uppercase tracking-[0.25em] text-[#c8d8d2]/55">Northside</span>
            <span className="absolute left-3 top-[36%] text-xs uppercase tracking-[0.25em] text-[#f1c987]/55">Midtown</span>
            <span className="absolute bottom-2 left-3 text-xs uppercase tracking-[0.25em] text-[#d8a498]/55">Eastside</span>

            <svg aria-hidden="true" className="absolute inset-0 h-full w-full" viewBox="0 0 100 100">
              {city.streets.map((street) => {
                const a = city.places.find((place) => place.id === street.a)!;
                const b = city.places.find((place) => place.id === street.b)!;
                const active = activeStreetIds.has(street.id);
                return (
                  <line
                    className={active ? "stroke-[#e8ac51]" : street.hasCamera ? "stroke-[#35625f]" : "stroke-slate-600"}
                    key={street.id}
                    strokeWidth={active ? 0.8 : 0.45}
                    x1={a.x}
                    x2={b.x}
                    y1={a.y}
                    y2={b.y}
                  />
                );
              })}
            </svg>

            {city.places.map((place, index) => {
              const active = place.id === selected.id;
              return (
                <button
                  aria-label={`Review ${place.name}`}
                  aria-pressed={active}
                  className={`group absolute z-10 h-8 w-8 -translate-x-1/2 -translate-y-1/2 border text-xs shadow-[0_2px_0_rgba(0,0,0,0.5)] transition sm:h-9 sm:w-9 sm:text-xs ${active ? "border-[#f1c987] bg-[#d69943] text-[#17120a]" : "border-[#6f9f98]/60 bg-[#0b1a1c] text-[#c8d8d2] hover:border-[#e8ac51]"}`}
                  key={place.id}
                  onClick={() => setSelectedId(place.id)}
                  style={{ left: `${place.x}%`, top: `${place.y}%` }}
                  type="button"
                >
                  {index + 1}
                  <span className={`absolute left-1/2 top-full mt-1 hidden -translate-x-1/2 whitespace-nowrap border bg-[#0b1a1c]/95 px-1.5 py-0.5 text-xs uppercase text-[#e4e6d8] sm:block ${active ? "border-[#e8ac51]" : "border-[#6f9f98]/30 opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100"}`}>
                    {place.name}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <aside className="min-h-0 overflow-visible border-t border-[#6f9f98]/25 bg-[#0b1a1c] p-4 lg:overflow-y-auto lg:border-l lg:border-t-0 lg:p-5">
          <div className="mb-4 border border-[#6f9f98]/25 bg-[#102224] p-3 text-xs uppercase tracking-wide">
            <p className="text-[#c8d8d2]/55">Your location</p>
            <p className="mt-1 text-base text-[#f1c987]">{city.places.find((place) => place.id === city.currentPlaceId)?.name ?? "Bureau"}</p>
            {city.activeTravel ? (
              <div className="mt-2 text-[#c8d8d2]">
                <p>Travelling to {city.activeTravel.destinationName} · {travelRemaining} game min</p>
                <progress
                  aria-label={`Journey to ${city.activeTravel.destinationName}`}
                  className="mt-2 h-2 w-full accent-[#e8ac51]"
                  max={city.activeTravel.completeGameTime - city.activeTravel.startGameTime}
                  value={Math.max(0, gameTime - city.activeTravel.startGameTime)}
                />
              </div>
            ) : null}
          </div>
          <p className="text-xs uppercase tracking-[0.2em] text-[#e8ac51]/70">{selected.area}</p>
          <h3 className="mt-1 text-2xl uppercase leading-none">{selected.name}</h3>
          <p className="mt-2 text-sm uppercase text-[#c8d8d2]/65">{kindLabels[selected.kind]}</p>
          <button
            className="mt-4 min-h-11 w-full border border-[#e8ac51]/70 bg-[#e8ac51]/10 px-3 text-sm uppercase text-[#f1c987] hover:bg-[#e8ac51]/20 disabled:cursor-default disabled:opacity-45"
            disabled={traveling || city.busy || city.currentPlaceId === selected.id || selected.travelMinutes === undefined}
            onClick={travelToSelected}
            type="button"
          >
            {traveling
              ? "Starting journey..."
              : city.activeTravel
                ? "Journey in progress"
                : city.currentPlaceId === selected.id
                  ? "You are here"
                  : selected.travelMinutes === undefined
                    ? "No route available"
                    : `Travel · ${selected.travelMinutes} min`}
          </button>
          {city.places.find((place) => place.id === city.currentPlaceId)?.hasInterior && !city.activeTravel ? (
            <button className="mt-2 min-h-11 w-full border border-[#6f9f98]/60 bg-[#6f9f98]/10 px-3 text-sm uppercase text-[#e4e6d8] hover:border-[#e8ac51] hover:text-[#e8ac51]" onClick={() => router.push(`/lobby/${roomCode}/place`)} type="button">
              Explore your location
            </button>
          ) : null}
          {city.places.find((place) => place.id === city.currentPlaceId)?.kind === "lab" && !city.activeTravel ? (
            <button className="mt-2 min-h-11 w-full border border-[#e8ac51]/70 bg-[#e8ac51]/10 px-3 text-sm uppercase text-[#f1c987] hover:bg-[#e8ac51]/20" onClick={() => router.push(`/lobby/${roomCode}/lab`)} type="button">
              Use forensic lab
            </button>
          ) : null}
          <button
            className="mt-4 min-h-11 w-full border border-[#6f9f98]/60 px-3 text-sm uppercase hover:border-[#e8ac51] hover:text-[#e8ac51] disabled:cursor-default disabled:opacity-55"
            disabled={pinning === selected.id || isPinned}
            onClick={pinPlace}
            type="button"
          >
            {pinning === selected.id ? "Pinning..." : isPinned ? "Pinned to clueboard" : "Pin place to clueboard"}
          </button>
          {error ? <p className="mt-3 border border-red-300/60 bg-red-950/70 p-2 text-sm text-red-100" role="alert">{error}</p> : null}

          <h4 className="mt-5 border-t border-[#6f9f98]/20 pt-4 text-xs uppercase tracking-[0.18em] text-[#c8d8d2]/55">Direct routes</h4>
          <ul className="mt-2 space-y-2">
            {connected.map((route) => (
              <li className="flex items-center justify-between gap-3 border border-[#6f9f98]/15 bg-[#102224] px-3 py-2" key={route.id}>
                <button className="min-h-8 text-left text-sm uppercase hover:text-[#e8ac51]" onClick={() => setSelectedId(route.place.id)} type="button">
                  {route.place.name}
                </button>
                <span className="shrink-0 font-mono text-xs text-[#e8ac51]">{route.minutes} min{route.hasCamera ? " · CCTV" : ""}</span>
              </li>
            ))}
          </ul>

          <details className="mt-5 border-t border-[#6f9f98]/20 pt-4">
            <summary className="cursor-pointer text-xs uppercase tracking-[0.18em] text-[#c8d8d2]/55">All places</summary>
            <div className="mt-3 grid grid-cols-2 gap-2 lg:grid-cols-1">
              {city.places.map((place, index) => (
                <button className="min-h-10 border border-[#6f9f98]/15 px-2 text-left text-xs uppercase hover:border-[#e8ac51] hover:text-[#e8ac51]" key={place.id} onClick={() => setSelectedId(place.id)} type="button">
                  {index + 1}. {place.name}
                </button>
              ))}
            </div>
          </details>
        </aside>
      </div>
    </section>
  );
}

function MapMessage({ message, onBack }: { message: string; onBack: () => void }) {
  return (
    <section className="absolute inset-0 z-20 flex items-center justify-center bg-[#071014] p-4 text-[#e4e6d8]">
      <div className="w-full max-w-lg border border-[#6f9f98]/30 bg-[#0b1a1c] p-6 text-center">
        <p className="text-lg uppercase">{message}</p>
        <button className="mt-5 border border-[#6f9f98]/70 px-4 py-2 uppercase hover:border-[#e8ac51] hover:text-[#e8ac51]" onClick={onBack} type="button">Back to bureau</button>
      </div>
    </section>
  );
}
