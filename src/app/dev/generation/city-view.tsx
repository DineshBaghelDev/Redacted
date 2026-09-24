"use client";

import { useState } from "react";
import type { City, Place } from "../../../../convex/generation/core/city";

const AREA_COLOR: Record<Place["area"], string> = {
  northside: "#67e8f9",
  midtown: "#fde047",
  eastside: "#f0abfc",
};

/** City map (streets, minutes, cameras) plus the selected building's floors and rooms. */
export function CityView({ city }: { city: City }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const byId = new Map(city.places.map((p) => [p.id, p]));
  const selected = selectedId ? byId.get(selectedId) : null;

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
      <div>
        <svg viewBox="-4 -4 108 104" className="h-[520px] w-full bg-[#020817]">
          {city.streets.map((s) => {
            const a = byId.get(s.a)!.map;
            const b = byId.get(s.b)!.map;
            return (
              <g key={s.id}>
                <line
                  x1={a.x}
                  y1={a.y}
                  x2={b.x}
                  y2={b.y}
                  stroke={s.hasCamera ? "#f87171" : "#475569"}
                  strokeWidth={s.hasCamera ? 0.6 : 0.4}
                  strokeDasharray={s.hasCamera ? "1.2 0.8" : undefined}
                />
                <text x={(a.x + b.x) / 2} y={(a.y + b.y) / 2 - 0.8} fontSize={2} fill="#94a3b8" textAnchor="middle">
                  {s.minutes}m
                </text>
              </g>
            );
          })}
          {city.places.map((p) => (
            <g key={p.id} className="cursor-pointer" onClick={() => setSelectedId(p.id)}>
              <circle
                cx={p.map.x}
                cy={p.map.y}
                r={p.id === selectedId ? 2.4 : 1.8}
                fill={AREA_COLOR[p.area]}
                stroke={p.crimeSceneAllowed ? "none" : "#ffffff"}
                strokeWidth={0.4}
              />
              <text x={p.map.x} y={p.map.y + 4.2} fontSize={2.2} fill="#e2e8f0" textAnchor="middle">
                {p.name}
              </text>
            </g>
          ))}
        </svg>
        <p className="mt-1 text-xs opacity-70">
          Red dashed street = camera. Colours: cyan Northside, yellow Midtown, pink Eastside. White ring = never a
          crime scene. Click a place.
        </p>
      </div>
      <div>{selected ? <BuildingView place={selected} /> : <p className="opacity-70">Click a place on the map.</p>}</div>
    </div>
  );
}

function BuildingView({ place }: { place: Place }) {
  const { rooms, doors, homeUnits, cameraRoomIds } = place.building;
  const floors = [...new Set(rooms.map((r) => r.floor))].sort((a, b) => b - a);
  const nameOf = new Map(rooms.map((r) => [r.id, r.name]));

  return (
    <div className="flex flex-col gap-3">
      <div>
        <h2 className="text-lg text-yellow-200">{place.name}</h2>
        <p className="opacity-70">
          {place.kind} · {place.area} · {rooms.length} rooms · {cameraRoomIds.length} cameras
          {homeUnits.length > 0 && ` · ${homeUnits.length} homes`}
        </p>
        {place.jobSlots.length > 0 && <p>Jobs: {place.jobSlots.join(", ")}</p>}
      </div>
      {floors.map((floor) => (
        <div key={floor}>
          <p className="opacity-70">{floor === 0 ? "Ground floor" : `Floor ${floor}`}</p>
          <ul className="pl-3">
            {rooms
              .filter((r) => r.floor === floor)
              .map((r) => {
                const linked = doors
                  .filter(([a, b]) => a === r.id || b === r.id)
                  .map(([a, b]) => nameOf.get(a === r.id ? b : a));
                return (
                  <li key={r.id}>
                    <span className={r.isEntrance ? "text-green-300" : ""}>{r.name}</span>
                    {r.isEntrance && <span className="text-green-300"> (entrance)</span>}
                    {cameraRoomIds.includes(r.id) && <span className="text-red-400"> ● camera</span>}
                    <span className="text-xs opacity-60"> → {linked.join(", ")}</span>
                    {r.itemSlots.length > 0 && (
                      <span className="block pl-3 text-xs opacity-50">slots: {r.itemSlots.join(", ")}</span>
                    )}
                  </li>
                );
              })}
          </ul>
        </div>
      ))}
    </div>
  );
}
