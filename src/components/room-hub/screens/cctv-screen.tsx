"use client";

import { useState } from "react";

type Camera = {
  id: string;
  name: string;
  location: string;
  status: "online" | "offline";
};

export type CctvRecord = {
  id: string;
  cameraId: string;
  start: number;
  end: number;
  description: string;
  movement: string;
};

const START_TIME = 6 * 60;
const END_TIME = 24 * 60 + 2 * 60;
const WINDOW_MINUTES = 20;

const cameras: Camera[] = [
  { id: "concourse", name: "Concourse", location: "Union Station · Main hall", status: "online" },
  { id: "north-entrance", name: "North entrance", location: "Union Station · Street doors", status: "online" },
  { id: "platform-1", name: "Platform 1", location: "Union Station · West platform", status: "online" },
  { id: "platform-3", name: "Platform 3", location: "Union Station · East platform", status: "online" },
  { id: "car-park", name: "Car park", location: "Union Station · Rear exit", status: "offline" },
];

const records: CctvRecord[] = [
  { id: "c1", cameraId: "concourse", start: 8 * 60 + 10, end: 8 * 60 + 14, description: "Tall woman, slim build, long tan coat and dark scarf.", movement: "Waits beside the ticket machines, then leaves toward Platform 3." },
  { id: "c2", cameraId: "concourse", start: 12 * 60 + 35, end: 12 * 60 + 43, description: "Medium-height man, stocky build, navy work jacket and grey cap.", movement: "Crosses the hall twice and stops at the coffee kiosk." },
  { id: "c3", cameraId: "concourse", start: 20 * 60 + 58, end: 21 * 60 + 6, description: "Short woman, average build, red raincoat and white trainers.", movement: "Enters from the north doors and studies the departure board." },
  { id: "c4", cameraId: "concourse", start: 21 * 60 + 12, end: 21 * 60 + 18, description: "Tall man, lean build, charcoal overcoat and black shoes.", movement: "Walks from Platform 1 toward the north doors carrying a small case." },
  { id: "c5", cameraId: "north-entrance", start: 7 * 60 + 42, end: 7 * 60 + 43, description: "Medium-height person, broad build, green hooded jacket and dark trousers.", movement: "Comes in from Station Road." },
  { id: "c6", cameraId: "north-entrance", start: 21 * 60 + 17, end: 21 * 60 + 19, description: "Tall man, lean build, charcoal overcoat and black shoes.", movement: "Leaves the station and turns east." },
  { id: "c7", cameraId: "platform-1", start: 18 * 60 + 5, end: 18 * 60 + 21, description: "Older man, average height, heavy build, brown suit and leather gloves.", movement: "Sits on the rear bench until the 18:20 train arrives." },
  { id: "c8", cameraId: "platform-1", start: 21 * 60 + 8, end: 21 * 60 + 12, description: "Tall man, lean build, charcoal overcoat and black shoes.", movement: "Steps off the platform and heads into the concourse." },
  { id: "c9", cameraId: "platform-3", start: 8 * 60 + 15, end: 8 * 60 + 28, description: "Tall woman, slim build, long tan coat and dark scarf.", movement: "Boards the 08:27 service alone." },
  { id: "c10", cameraId: "platform-3", start: 19 * 60 + 48, end: 20 * 60 + 2, description: "Short woman, average build, red raincoat and white trainers.", movement: "Leaves an arriving train and waits near the stairwell." },
  { id: "c11", cameraId: "platform-3", start: 24 * 60 + 55, end: 25 * 60 + 3, description: "Medium-height man, stocky build, navy work jacket and grey cap.", movement: "Walks along the empty platform, then returns toward the concourse." },
];

export function recordsNearTime(allRecords: CctvRecord[], cameraId: string, minute: number) {
  return allRecords.filter(
    (record) => record.cameraId === cameraId && record.start <= minute + WINDOW_MINUTES && record.end >= minute - WINDOW_MINUTES,
  );
}

function formatTime(minutes: number) {
  const day = Math.floor(minutes / 1440) + 1;
  const withinDay = minutes % 1440;
  return `Day ${day} · ${String(Math.floor(withinDay / 60)).padStart(2, "0")}:${String(withinDay % 60).padStart(2, "0")}`;
}

export function CctvScreen({ onBack }: { onBack: () => void }) {
  const [cameraId, setCameraId] = useState(cameras[0].id);
  const [minute, setMinute] = useState(21 * 60 + 10);
  const camera = cameras.find((item) => item.id === cameraId)!;
  const cameraRecords = records.filter((record) => record.cameraId === cameraId);
  const visibleRecords = camera.status === "online" ? recordsNearTime(records, cameraId, minute) : [];

  return (
    <section className="absolute inset-0 z-20 flex flex-col overflow-hidden bg-[#02050a] text-cyan-50">
      <header className="flex items-center justify-between gap-4 border-b border-cyan-300/30 bg-[#07111b] px-4 py-3 sm:px-6">
        <div>
          <p className="text-[10px] uppercase tracking-[0.25em] text-cyan-200/55">Union Station security network</p>
          <h2 className="mt-1 text-xl uppercase tracking-wide sm:text-2xl">Camera records</h2>
        </div>
        <button
          aria-label="Return to bureau"
          className="border border-cyan-300/70 px-3 py-2 text-sm uppercase text-cyan-100 hover:border-yellow-200 hover:text-yellow-200 focus-visible:outline-2 focus-visible:outline-yellow-200"
          onClick={onBack}
          type="button"
        >
          Back
        </button>
      </header>

      <div className="grid min-h-0 flex-1 grid-rows-[auto_minmax(0,1fr)] md:grid-cols-[17rem_1fr] md:grid-rows-1">
        <aside className="border-b border-cyan-300/25 bg-[#050b12] p-3 md:overflow-y-auto md:border-b-0 md:border-r">
          <p className="mb-3 text-xs uppercase tracking-[0.2em] text-cyan-100/50">Choose camera</p>
          <div className="grid grid-cols-2 gap-2 md:grid-cols-1">
            {cameras.map((item, index) => (
              <button
                aria-pressed={item.id === cameraId}
                className={`min-w-0 border p-3 text-left transition focus-visible:outline-2 focus-visible:outline-yellow-200 ${
                  item.id === cameraId
                    ? "border-cyan-200 bg-cyan-300/10 shadow-[inset_3px_0_0_#67e8f9]"
                    : "border-cyan-300/15 bg-[#07111b] hover:border-cyan-300/50"
                }`}
                key={item.id}
                onClick={() => setCameraId(item.id)}
                type="button"
              >
                <span className="flex items-center justify-between gap-2 text-sm uppercase">
                  <span className="truncate">{String(index + 1).padStart(2, "0")} · {item.name}</span>
                  <span className={`h-2 w-2 shrink-0 ${item.status === "online" ? "bg-emerald-400 shadow-[0_0_8px_#34d399]" : "bg-red-500"}`} />
                </span>
                <span className="mt-1 block truncate text-[11px] text-cyan-100/45">{item.location}</span>
              </button>
            ))}
          </div>
        </aside>

        <main className="flex min-h-0 flex-col overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="flex flex-wrap items-end justify-between gap-3 border-b border-cyan-300/20 pb-4">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-cyan-100/45">Camera {String(cameras.indexOf(camera) + 1).padStart(2, "0")}</p>
              <h3 className="mt-1 text-2xl uppercase text-cyan-50 sm:text-3xl">{camera.name}</h3>
              <p className="mt-1 text-sm text-cyan-100/55">{camera.location}</p>
            </div>
            <p className={`border px-3 py-1 text-xs uppercase tracking-[0.18em] ${camera.status === "online" ? "border-emerald-400/50 text-emerald-300" : "border-red-400/50 text-red-300"}`}>
              {camera.status}
            </p>
          </div>

          <div className="mt-6 border border-cyan-300/20 bg-[#050b12] p-4 sm:p-6">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <label className="text-xs uppercase tracking-[0.2em] text-cyan-100/55" htmlFor="cctv-time">
                Drag to scan the timeline
              </label>
              <output className="font-mono text-lg text-yellow-200" htmlFor="cctv-time" aria-live="polite">
                {formatTime(minute)}
              </output>
            </div>

            <div className="relative mt-7 pb-6">
              <input
                aria-valuetext={formatTime(minute)}
                className="relative z-10 h-2 w-full cursor-ew-resize appearance-none bg-cyan-950 accent-yellow-300"
                id="cctv-time"
                max={END_TIME}
                min={START_TIME}
                onChange={(event) => setMinute(Number(event.target.value))}
                step={5}
                type="range"
                value={minute}
              />
              {cameraRecords.map((record) => (
                <span
                  aria-hidden="true"
                  className="absolute top-0 h-2 w-1 -translate-x-1/2 bg-cyan-200/75"
                  key={record.id}
                  style={{ left: `${((record.start - START_TIME) / (END_TIME - START_TIME)) * 100}%` }}
                />
              ))}
              <span className="absolute bottom-0 left-0 font-mono text-[10px] text-cyan-100/40">{formatTime(START_TIME)}</span>
              <span className="absolute bottom-0 right-0 font-mono text-[10px] text-cyan-100/40">{formatTime(END_TIME)}</span>
            </div>
            <p className="mt-3 text-xs text-cyan-100/45">Showing records within 20 minutes of the selected time. Marks on the line show recorded activity.</p>
          </div>

          <div className="mt-5">
            <div className="flex items-center justify-between gap-3">
              <h4 className="text-sm uppercase tracking-[0.18em] text-cyan-100/65">People seen</h4>
              <span className="font-mono text-xs text-cyan-100/40">{visibleRecords.length} {visibleRecords.length === 1 ? "record" : "records"}</span>
            </div>

            {camera.status === "offline" ? (
              <div className="mt-3 border border-red-400/30 bg-red-950/20 p-5 text-red-100">
                <p className="uppercase">No signal</p>
                <p className="mt-2 text-sm text-red-100/60">This camera was not recording during the case window.</p>
              </div>
            ) : visibleRecords.length ? (
              <ul className="mt-3 grid gap-3 lg:grid-cols-2">
                {visibleRecords.map((record) => (
                  <li className="border border-cyan-300/25 bg-[#07111b] p-4 shadow-[inset_3px_0_0_rgba(103,232,249,0.65)]" key={record.id}>
                    <p className="font-mono text-xs text-yellow-200">{formatTime(record.start)}–{formatTime(record.end).split(" · ")[1]}</p>
                    <p className="mt-3 text-base leading-relaxed text-cyan-50">{record.description}</p>
                    <p className="mt-2 text-sm leading-relaxed text-cyan-100/55">{record.movement}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="mt-3 border border-dashed border-cyan-300/20 p-6 text-center text-sm text-cyan-100/45">
                No one was recorded near this time.
              </div>
            )}
          </div>

          <p className="pb-4 pt-6 text-[11px] uppercase tracking-[0.14em] text-cyan-100/35">Recorded descriptions only · identities are not provided</p>
        </main>
      </div>
    </section>
  );
}
