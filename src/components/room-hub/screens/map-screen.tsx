"use client";

import { useAuth } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { useState } from "react";
import { api } from "../../../../convex/_generated/api";

const kindLabels = {
  home: "Residence",
  work: "Workplace",
  public: "Public place",
  bureau: "Bureau",
  lab: "Forensic lab",
} as const;

export function MapScreen({ roomCode, onBack }: { roomCode: string; onBack: () => void }) {
  const { isLoaded, isSignedIn } = useAuth();
  const city = useQuery(api.world.getMap, isLoaded && isSignedIn ? { roomCode } : "skip");
  const [selectedId, setSelectedId] = useState("police-bureau");

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

  return (
    <section className="absolute inset-0 z-20 flex flex-col overflow-hidden bg-[#080b12] text-cyan-50">
      <header className="flex shrink-0 items-center justify-between gap-4 border-b border-cyan-300/30 bg-[#07111b] px-4 py-3 sm:px-6">
        <div>
          <p className="text-[10px] uppercase tracking-[0.25em] text-cyan-200/55">Investigation routes</p>
          <h2 className="mt-1 text-xl uppercase tracking-wide sm:text-2xl">City map</h2>
        </div>
        <button className="border border-cyan-300/70 px-3 py-2 text-sm uppercase hover:border-yellow-200 hover:text-yellow-200" onClick={onBack} type="button">
          Back
        </button>
      </header>

      <div className="grid min-h-0 flex-1 grid-rows-[minmax(19rem,3fr)_minmax(12rem,2fr)] lg:grid-cols-[minmax(0,1fr)_20rem] lg:grid-rows-1">
        <div className="min-h-0 overflow-auto p-3 sm:p-5">
          <div className="relative mx-auto aspect-[5/4] h-full min-h-[18rem] max-h-[calc(100vh-7rem)] w-full max-w-5xl overflow-hidden border border-[#c6a96d]/35 bg-[#11151b] shadow-[inset_0_0_40px_rgba(0,0,0,0.7)]">
            <div className="absolute inset-x-0 top-0 h-[34%] bg-[#18303a]/25" />
            <div className="absolute inset-x-0 top-[34%] h-[38%] bg-[#3a3020]/20" />
            <div className="absolute inset-x-0 bottom-0 h-[28%] bg-[#38202a]/20" />
            <span className="absolute left-3 top-2 text-[10px] uppercase tracking-[0.25em] text-cyan-100/25">Northside</span>
            <span className="absolute left-3 top-[36%] text-[10px] uppercase tracking-[0.25em] text-yellow-100/25">Midtown</span>
            <span className="absolute bottom-2 left-3 text-[10px] uppercase tracking-[0.25em] text-pink-100/25">Eastside</span>

            <svg aria-hidden="true" className="absolute inset-0 h-full w-full" viewBox="0 0 100 100">
              {city.streets.map((street) => {
                const a = city.places.find((place) => place.id === street.a)!;
                const b = city.places.find((place) => place.id === street.b)!;
                const active = activeStreetIds.has(street.id);
                return (
                  <line
                    className={active ? "stroke-yellow-200" : street.hasCamera ? "stroke-cyan-700" : "stroke-slate-600"}
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
                  className={`group absolute z-10 h-7 w-7 -translate-x-1/2 -translate-y-1/2 border text-[10px] shadow-[0_2px_0_rgba(0,0,0,0.5)] transition sm:h-9 sm:w-9 sm:text-xs ${active ? "border-yellow-100 bg-yellow-300 text-[#17120a]" : "border-cyan-300/60 bg-[#07111b] text-cyan-100 hover:border-yellow-200"}`}
                  key={place.id}
                  onClick={() => setSelectedId(place.id)}
                  style={{ left: `${place.x}%`, top: `${place.y}%` }}
                  type="button"
                >
                  {index + 1}
                  <span className={`absolute left-1/2 top-full mt-1 hidden -translate-x-1/2 whitespace-nowrap border bg-[#07111b]/95 px-1.5 py-0.5 text-[9px] uppercase text-cyan-50 sm:block ${active ? "border-yellow-200" : "border-cyan-300/30 opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100"}`}>
                    {place.name}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <aside className="min-h-0 overflow-y-auto border-t border-cyan-300/25 bg-[#07111b] p-4 lg:border-l lg:border-t-0 lg:p-5">
          <p className="text-[10px] uppercase tracking-[0.2em] text-yellow-200/70">{selected.area}</p>
          <h3 className="mt-1 text-2xl uppercase leading-none">{selected.name}</h3>
          <p className="mt-2 text-sm uppercase text-cyan-100/45">{kindLabels[selected.kind]}</p>

          <h4 className="mt-5 border-t border-cyan-300/20 pt-4 text-xs uppercase tracking-[0.18em] text-cyan-100/55">Direct routes</h4>
          <ul className="mt-2 space-y-2">
            {connected.map((route) => (
              <li className="flex items-center justify-between gap-3 border border-cyan-300/15 bg-[#0a1722] px-3 py-2" key={route.id}>
                <button className="min-h-8 text-left text-sm uppercase hover:text-yellow-200" onClick={() => setSelectedId(route.place.id)} type="button">
                  {route.place.name}
                </button>
                <span className="shrink-0 font-mono text-xs text-yellow-200">{route.minutes} min{route.hasCamera ? " · CCTV" : ""}</span>
              </li>
            ))}
          </ul>

          <details className="mt-5 border-t border-cyan-300/20 pt-4">
            <summary className="cursor-pointer text-xs uppercase tracking-[0.18em] text-cyan-100/55">All places</summary>
            <div className="mt-3 grid grid-cols-2 gap-2 lg:grid-cols-1">
              {city.places.map((place, index) => (
                <button className="min-h-10 border border-cyan-300/15 px-2 text-left text-xs uppercase hover:border-yellow-200 hover:text-yellow-200" key={place.id} onClick={() => setSelectedId(place.id)} type="button">
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
    <section className="absolute inset-0 z-20 flex items-center justify-center bg-[#080b12] p-4 text-cyan-50">
      <div className="w-full max-w-lg border border-cyan-300/30 bg-[#07111b] p-6 text-center">
        <p className="text-lg uppercase">{message}</p>
        <button className="mt-5 border border-cyan-300/70 px-4 py-2 uppercase hover:border-yellow-200 hover:text-yellow-200" onClick={onBack} type="button">Back to bureau</button>
      </div>
    </section>
  );
}
