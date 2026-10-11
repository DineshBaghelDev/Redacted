"use client";

import { errorText } from "../../../lib/error-text";
import { FirstTimeTip } from "../first-time-tip";
import { useAuth } from "@clerk/nextjs";
import { useMutation } from "convex/react";
import { useQuery } from "convex-helpers/react/cache";
import { useEffect, useRef, useState } from "react";
import { api } from "../../../../convex/_generated/api";
import { go } from "../../../lib/game-nav";
import { play } from "../../../lib/sound";
import { GameIcon } from "../game-icon";

const kindLabels = {
  home: "Residence",
  work: "Workplace",
  public: "Public place",
  bureau: "Bureau",
  lab: "Forensic lab",
} as const;

const placeArtwork: Record<string, string> = {
  "linden-court": "apartment",
  "carver-towers": "apartment",
  "calder-park": "park",
  "quik-stop": "cafe",
  "ember-cafe": "cafe",
  "union-station": "station",
  "meridian-tower": "apartment",
  "regent-hotel": "hotel",
  "blue-lantern": "cafe",
  "route-9-diner": "cafe",
  "rusk-garage": "garage",
};

function artworkForPlace(place: { id: string; kind: keyof typeof kindLabels }) {
  return placeArtwork[place.id] ?? place.kind;
}

export function MapScreen({ roomCode, onBack }: { roomCode: string; onBack: () => void }) {
  const { isLoaded, isSignedIn } = useAuth();
  const city = useQuery(api.world.getMap, isLoaded && isSignedIn ? { roomCode } : "skip");
  const boardNodes = useQuery(api.clueBoard.getNodes, isLoaded && isSignedIn ? { roomCode } : "skip");
  const createReference = useMutation(api.clueBoard.createReferenceNode);
  const startTravel = useMutation(api.world.startTravel);
  const coop = useQuery(api.coop.get, isLoaded && isSignedIn ? { roomCode } : "skip");
  const wasTravelling = useRef<string | null>(null);
  const finishTravel = useMutation(api.world.finishTravel);
  const [selectedId, setSelectedId] = useState("");
  const [findOpen, setFindOpen] = useState(false);
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
        setError(errorText(caught, "Could not finish this journey."));
      });
    };
    update();
    const interval = window.setInterval(update, 100);
    return () => window.clearInterval(interval);
  }, [city?.activeTravel, city?.clock, finishTravel, roomCode]);

  // On arrival, walk straight in: buildings open their floor plan, the lab opens its bench.
  useEffect(() => {
    if (!city) return;
    if (city.activeTravel) { wasTravelling.current = city.activeTravel.destinationId; return; }
    if (!wasTravelling.current || wasTravelling.current !== city.currentPlaceId) return;
    wasTravelling.current = null;
    const arrived = city.places.find((place) => place.id === city.currentPlaceId);
    play("door");
    if (arrived?.kind === "bureau") go(`/lobby/${roomCode}/bureau`);
    else if (arrived?.kind === "lab") go(`/lobby/${roomCode}/lab`);
    else if (arrived?.hasInterior) go(`/lobby/${roomCode}/place`);
  }, [city, roomCode]);

  if (city === undefined) return <MapMessage message="Opening city map..." onBack={onBack} />;
  if (!city) return <MapMessage message="The city map is unavailable for this room." onBack={onBack} />;

  const here = city.places.find((place) => place.id === city.currentPlaceId);
  const open = city.places.find((place) => place.id === selectedId) ?? null;
  const selected = open ?? here ?? city.places[0];
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
      setError(errorText(caught, "Could not pin this place."));
    }).finally(() => setPinning(""));
  }

  function travelToSelected() {
    setTraveling(true);
    setError("");
    void startTravel({ roomCode, destinationId: selected.id }).catch((caught: unknown) => {
      setError(errorText(caught, "Could not start this journey."));
    }).finally(() => setTraveling(false));
  }

  /** Open a place from the list and scroll the map so its card is in view (phones scroll the map sideways). */
  function findPlace(id: string) {
    setFindOpen(false);
    setSelectedId(id);
    const place = city?.places.find((item) => item.id === id);
    const viewport = mapViewport.current;
    if (place && viewport) viewport.scrollTo({ left: viewport.scrollWidth * place.x / 100 - viewport.clientWidth / 2, top: viewport.scrollHeight * place.y / 100 - viewport.clientHeight / 2, behavior: "smooth" });
  }

  function selectPlace(id: string) {
    play("click");
    setError("");
    setSelectedId((current) => current === id ? "" : id);
  }

  return (
    <section className="game-map-scene absolute inset-0 z-20 flex flex-col overflow-hidden bg-[#071014] text-[#e4e6d8]">
      <header className="game-station-header flex shrink-0 items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-[#a5c6bb]/80">Investigation routes</p>
          <h2 className="mt-1 text-xl uppercase tracking-wide sm:text-2xl">City map</h2>
        </div>
        <button className="border border-[#6f9f98]/70 px-3 py-2 text-sm uppercase hover:border-[#e8ac51] hover:text-[#e8ac51]" onClick={onBack} type="button">
          Put the map away
        </button>
      </header>

      <div className="relative min-h-0 flex-1 overflow-auto p-3 sm:p-5" ref={mapViewport}>
        <FirstTimeTip id="map" title="City map">Tap a place to travel there or go inside. Your partner shows as ◆. Dashed red streets have cameras; their tapes are at the bureau security desk.</FirstTimeTip>
        <div className="city-map relative mx-auto aspect-[16/10] min-w-[44rem] max-w-6xl md:min-w-[50rem]" onClick={(event) => { if (event.target === event.currentTarget) setSelectedId(""); }}>
            <span className="pointer-events-none absolute left-3 top-2 text-xs uppercase tracking-[0.25em] text-[#92c1c7]/70">Northside</span>
            <span className="pointer-events-none absolute left-3 top-[36%] text-xs uppercase tracking-[0.25em] text-[#e4bc75]/70">Midtown</span>
            <span className="pointer-events-none absolute bottom-2 left-3 text-xs uppercase tracking-[0.25em] text-[#d5a18e]/70">Eastside</span>
            <span className="pointer-events-none absolute bottom-2 right-3 text-xs uppercase text-[#c8d8d2]/60"><i aria-hidden="true" className="mr-1 inline-block w-5 border-t-2 border-dashed border-[#d88977] align-middle" />Street with a camera</span>

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

            {city.activeTravel ? (() => {
              const from = city.places.find((place) => place.id === city.currentPlaceId);
              const to = city.places.find((place) => place.id === city.activeTravel!.destinationId);
              if (!from || !to) return null;
              const span = Math.max(1, city.activeTravel.completeGameTime - city.activeTravel.startGameTime);
              const progress = Math.min(1, Math.max(0, (gameTime - city.activeTravel.startGameTime) / span));
              return <span aria-hidden="true" className="map-traveller absolute z-40 size-4 -translate-x-1/2 -translate-y-1/2 border-2 border-[#071014] bg-[#ffd287] shadow-[0_0_10px_#ffd287]" style={{ left: `${from.x + (to.x - from.x) * progress}%`, top: `${from.y + (to.y - from.y) * progress}%` }} />;
            })() : null}
            {coop?.partners.map((partner) => {
              const at = city.places.find((place) => place.id === partner.placeId);
              return at ? <span className="pointer-events-none absolute z-40 -translate-x-1/2 translate-y-3 whitespace-nowrap border border-[#9fd1c4] bg-[#071014]/90 px-1 text-[0.65rem] uppercase text-[#9fd1c4]" key={partner.name} style={{ left: `${at.x}%`, top: `${at.y}%` }}>◆ {partner.name}</span> : null;
            })}
            {city.places.map((place) => {
              const active = place.id === selected.id;
              const current = place.id === city.currentPlaceId;
              const crowded = city.places.some((other) => other.id !== place.id && Math.abs(other.x - place.x) < 10 && Math.abs(other.y - place.y) < 13);
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
                  <span aria-hidden="true" className={`map-place-icon map-place-icon--${artworkForPlace(place)}`} />
                  {current ? <span aria-hidden="true" className="map-marker-current absolute -right-0.5 -top-0.5 block size-3 bg-[#ffd287]" /> : null}
                  <span className={`map-marker-label ${crowded ? "map-marker-label--crowded" : ""} ${place.y > 77 ? "map-marker-label--above" : ""} ${place.x > 82 ? "map-marker-label--right" : ""}`}>{place.name}</span>
                </button>
              );
            })}
            {open ? <PlaceCard
              busy={traveling || city.busy}
              error={error}
              here={open.id === city.currentPlaceId && !city.activeTravel}
              onClose={() => setSelectedId("")}
              onEnter={() => go(`/lobby/${roomCode}/${open.kind === "bureau" ? "bureau" : open.kind === "lab" ? "lab" : "place"}`)}
              onPin={pinPlace}
              onTravel={travelToSelected}
              pinned={Boolean(isPinned)}
              pinning={pinning === open.id}
              place={open}
              travelling={Boolean(city.activeTravel)}
            /> : null}
        </div>
        <div className="pointer-events-none sticky bottom-0 left-0 mt-2 flex justify-center">
          <p className="pointer-events-auto border border-[#45635d] bg-[#071014]/95 px-3 py-2 text-xs uppercase tracking-wide text-[#c8d8d2]" role="status">
            {city.activeTravel
              ? <>On the way to <span className="text-[#f1c987]">{city.activeTravel.destinationName}</span> · {travelRemaining} min</>
              : <>You are at <span className="text-[#f1c987]">{here?.name ?? "the bureau"}</span> · tap a place</>}
          </p>
          <button className="pointer-events-auto ml-2 border border-[#e8ac51]/70 bg-[#071014]/95 px-3 py-2 text-xs uppercase text-[#f1c987]" onClick={() => setFindOpen(!findOpen)} type="button">Find a place</button>
        </div>
        {findOpen ? (
          <div className="fixed inset-x-3 bottom-16 z-50 max-h-[50vh] overflow-y-auto border-2 border-[#e8ac51]/60 bg-[#071014]/97 p-2 sm:left-auto sm:right-6 sm:w-72" role="dialog" aria-label="Find a place">
            {[...city.places].sort((a, b) => a.name.localeCompare(b.name)).map((place) => (
              <button className="flex min-h-10 w-full items-center gap-2 border-b border-[#45635d]/60 px-2 text-left text-sm uppercase hover:text-[#e8ac51]" key={place.id} onClick={() => findPlace(place.id)} type="button">
                <span aria-hidden="true" className={`map-place-icon map-place-icon--${artworkForPlace(place)} size-6 shrink-0`} />
                <span className="min-w-0 flex-1 break-words">{place.name}</span>
                {place.id === city.currentPlaceId ? <span className="text-xs text-[#f1c987]">here</span> : place.travelMinutes !== undefined ? <span className="font-mono text-xs text-[#c8d8d2]/60">{place.travelMinutes} min</span> : null}
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}

/** The actions for one place, floating above its marker. */
function PlaceCard({ place, here, travelling, busy, pinned, pinning, error, onTravel, onEnter, onPin, onClose }: {
  place: { id: string; name: string; kind: keyof typeof kindLabels; area: string; x: number; y: number; hasInterior: boolean; travelMinutes?: number };
  here: boolean;
  travelling: boolean;
  busy: boolean;
  pinned: boolean;
  pinning: boolean;
  error: string;
  onTravel: () => void;
  onEnter: () => void;
  onPin: () => void;
  onClose: () => void;
}) {
  const below = place.y < 30;
  const canEnter = place.hasInterior || place.kind === "lab" || place.kind === "bureau";
  return (
    <div
      className={`absolute z-50 w-60 -translate-x-1/2 border-2 border-[#e8ac51]/70 bg-[#071014]/97 p-3 text-left shadow-[4px_4px_0_rgb(0_0_0/50%)] animate-in fade-in zoom-in-95 ${below ? "mt-9" : "-translate-y-full -mt-9"}`}
      onClick={(event) => event.stopPropagation()}
      role="dialog"
      aria-label={place.name}
      style={{ left: `${Math.min(84, Math.max(16, place.x))}%`, top: `${place.y}%` }}
    >
      <div className="flex items-start gap-2">
        <span aria-hidden="true" className={`map-place-icon map-place-icon--${artworkForPlace(place)} shrink-0`} />
        <div className="min-w-0 flex-1">
          <p className="break-words text-sm uppercase leading-tight text-[#f1c987]">{place.name}</p>
          <p className="mt-0.5 text-[0.65rem] uppercase text-[#c8d8d2]/60">{kindLabels[place.kind]} · {place.area}</p>
        </div>
        <button aria-label="Close" className="-mr-1 -mt-1 size-7 text-[#c8d8d2]/70 hover:text-[#e8ac51]" onClick={onClose} type="button">✕</button>
      </div>
      <div className="mt-3 grid gap-2">
        {here ? (
          canEnter ? <button className="min-h-10 border border-[#e8ac51] bg-[#e8ac51]/15 text-xs uppercase text-[#f1c987] hover:bg-[#e8ac51]/25" onClick={onEnter} type="button">{place.kind === "lab" ? "Use the lab" : place.kind === "bureau" ? "Go inside the bureau" : "Go inside"}</button>
            : <p className="text-xs uppercase text-[#c8d8d2]/60">You are here</p>
        ) : (
          <button className="min-h-10 border border-[#e8ac51] bg-[#e8ac51]/15 text-xs uppercase text-[#f1c987] hover:bg-[#e8ac51]/25 disabled:opacity-45" disabled={busy || travelling || place.travelMinutes === undefined} onClick={onTravel} type="button">
            {travelling ? "Already on the road" : place.travelMinutes === undefined ? "No route" : `Travel · ${place.travelMinutes} min`}
          </button>
        )}
        <button className="min-h-9 border border-[#6f9f98]/50 text-xs uppercase text-[#c8d8d2] hover:border-[#e8ac51] disabled:opacity-50" disabled={pinned || pinning} onClick={onPin} type="button">{pinned ? "Pinned" : pinning ? "Pinning..." : "Pin to clueboard"}</button>
      </div>
      {error ? <p className="mt-2 text-xs text-red-200" role="alert">{error}</p> : null}
    </div>
  );
}

function MapMessage({ message, onBack }: { message: string; onBack: () => void }) {
  return (
    <section className="game-map-scene absolute inset-0 z-20 flex items-center justify-center bg-[#071014] p-4 text-[#e4e6d8]">
      <div className="game-panel w-full max-w-lg px-7 py-9 text-center sm:px-12">
        <GameIcon className="mx-auto size-12" name="map" />
        <p className="mt-4 text-lg uppercase leading-snug">{message}</p>
        <button className="mt-6 min-h-11 w-full border border-[#6f9f98]/70 px-4 py-2 uppercase hover:border-[#e8ac51] hover:text-[#e8ac51] sm:w-auto" onClick={onBack} type="button">Back to bureau</button>
      </div>
    </section>
  );
}
