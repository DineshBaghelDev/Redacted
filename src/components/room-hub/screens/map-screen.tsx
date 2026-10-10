"use client";

import { useAuth } from "@clerk/nextjs";
import { useMutation, useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
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
  const [selectedId, setSelectedId] = useState("");
  const [pinning, setPinning] = useState("");
  const [traveling, setTraveling] = useState(false);
  const [now, setNow] = useState(0);
  const [error, setError] = useState("");
  const mapViewport = useRef<HTMLDivElement>(null);
  const centeredMap = useRef(false);

  useEffect(() => {
    if (centeredMap.current || !city || !mapViewport.current) return;
    centeredMap.current = true;
    const current = city.places.find((place) => place.id === city.currentPlaceId);
    if (current) {
      mapViewport.current.scrollLeft = mapViewport.current.scrollWidth * current.x / 100 - mapViewport.current.clientWidth / 2;
    }
  }, [city]);

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

  const selected = city.places.find((place) => place.id === selectedId)
    ?? city.places.find((place) => place.id === city.currentPlaceId)
    ?? city.places[0];
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

  function selectPlace(id: string) {
    setSelectedId(id);
    const place = city?.places.find((item) => item.id === id);
    const viewport = mapViewport.current;
    if (place && viewport) viewport.scrollTo({ left: viewport.scrollWidth * place.x / 100 - viewport.clientWidth / 2, behavior: "smooth" });
  }

  return (
    <section className="game-map-scene absolute inset-0 z-20 flex flex-col overflow-hidden bg-[#071014] text-[#e4e6d8]">
      <header className="game-station-header flex shrink-0 items-center justify-between gap-4 px-4 py-3 sm:px-6">
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
              onChange={(event) => selectPlace(event.target.value)}
              value={selected.id}
            >
              {city.places.map((place, index) => <option key={place.id} value={place.id}>{index + 1}. {place.name}</option>)}
            </select>
          </label>
          <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs uppercase text-[#b9ccc4]">
            <span className="text-[#e8c486]">Street network</span>
            <span><i aria-hidden="true" className="mr-1 inline-block w-5 border-t-2 border-dashed border-[#d88977] align-middle" />Camera route</span>
            <span><i aria-hidden="true" className="mr-1 inline-block w-5 border-t-2 border-[#e8ac51] align-middle" />Selected routes</span>
          </div>
          <p className="mb-2 text-xs uppercase text-[#c8d8d2]/55 sm:hidden">Swipe the map to explore</p>
          <div className="overflow-x-auto" ref={mapViewport}>
          <div className="city-map relative mx-auto aspect-[16/10] h-auto min-h-[18rem] min-w-[44rem] max-h-[calc(100vh-7rem)] w-full max-w-5xl overflow-hidden sm:min-w-0 lg:h-full">
            <span className="pointer-events-none absolute left-3 top-2 text-xs uppercase tracking-[0.25em] text-[#92c1c7]/70">Northside</span>
            <span className="pointer-events-none absolute left-3 top-[36%] text-xs uppercase tracking-[0.25em] text-[#e4bc75]/70">Midtown</span>
            <span className="pointer-events-none absolute bottom-2 left-3 text-xs uppercase tracking-[0.25em] text-[#d5a18e]/70">Eastside</span>

            <svg aria-hidden="true" className="absolute inset-0 h-full w-full" preserveAspectRatio="none" viewBox="0 0 100 100">
              {city.streets.map((street) => {
                const a = city.places.find((place) => place.id === street.a)!;
                const b = city.places.find((place) => place.id === street.b)!;
                const active = activeStreetIds.has(street.id);
                return (
                  <line
                    className={active ? "stroke-[#e8ac51]" : street.hasCamera ? "stroke-[#d88977]" : "stroke-[#68848a]"}
                    key={street.id}
                    opacity={active ? 1 : 0.75}
                    strokeDasharray={street.hasCamera ? "5 5" : undefined}
                    strokeWidth={active ? 3 : 2}
                    vectorEffect="non-scaling-stroke"
                    x1={a.x}
                    x2={b.x}
                    y1={a.y}
                    y2={b.y}
                  />
                );
              })}
            </svg>

            {city.streets.filter((street) => activeStreetIds.has(street.id)).map((street) => {
              const a = city.places.find((place) => place.id === street.a)!;
              const b = city.places.find((place) => place.id === street.b)!;
              return (
                <span
                  aria-hidden="true"
                  className="map-route-time pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-1/2"
                  key={street.id}
                  style={{ left: `${(a.x + b.x) / 2}%`, top: `${(a.y + b.y) / 2}%` }}
                >
                  {street.minutes}m{street.hasCamera ? " · CAM" : ""}
                </span>
              );
            })}

            {city.places.map((place) => {
              const active = place.id === selected.id;
              const current = place.id === city.currentPlaceId;
              return (
                <button
                  aria-label={`Review ${place.name}`}
                  aria-pressed={active}
                  className={`map-marker absolute flex size-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center transition sm:size-14 ${active ? "z-30" : "z-20 hover:z-30 focus-visible:z-30"} map-marker--${place.area}`}
                  key={place.id}
                  onClick={() => selectPlace(place.id)}
                  style={{ left: `${place.x}%`, top: `${place.y}%` }}
                  type="button"
                >
                  <span aria-hidden="true" className={`map-place-icon map-place-icon--${place.kind}`} />
                  {current ? <span aria-hidden="true" className="map-marker-current absolute -right-0.5 -top-0.5 block size-3 bg-[#ffd287]" /> : null}
                  <span className={`map-marker-label ${place.y > 77 ? "map-marker-label--above" : ""} ${place.x > 82 ? "map-marker-label--right" : ""}`}>{place.name}</span>
                </button>
              );
            })}
          </div>
          </div>
        </div>

        <aside className="min-h-0 overflow-visible border-t border-[#6f9f98]/25 bg-[#0b1a1c] p-4 lg:overflow-y-auto lg:border-l lg:border-t-0 lg:p-5">
          <div className="mb-4 border-b border-[#6f9f98]/35 pb-4 text-xs uppercase tracking-wide">
            <p className="text-[#c8d8d2]/55">Your location</p>
            <p className="mt-1 break-words text-base text-[#f1c987]">{city.places.find((place) => place.id === city.currentPlaceId)?.name ?? "Bureau"}</p>
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
          <h3 className="mt-1 flex items-center gap-3 break-words text-2xl uppercase leading-tight"><span aria-hidden="true" className={`map-place-icon map-place-icon--${selected.kind} shrink-0`} /><span className="min-w-0">{selected.name}</span></h3>
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
              <li className="flex items-center justify-between gap-3 border-b border-[#6f9f98]/20 py-2" key={route.id}>
                <button className="min-h-8 min-w-0 flex-1 break-words text-left text-sm uppercase hover:text-[#e8ac51]" onClick={() => selectPlace(route.place.id)} type="button">
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
                <button className="min-h-10 border-b border-[#6f9f98]/20 px-1 text-left text-xs uppercase hover:text-[#e8ac51]" key={place.id} onClick={() => selectPlace(place.id)} type="button">
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
