"use client";

import { getVolume, play, setVolume } from "../../lib/sound";

/** Music (score and rain) and effects (clicks, actions) each have their own level. Letting go plays a sample. */
export function VolumeSliders({ className = "" }: { className?: string }) {
  return (
    <div className={`grid gap-2 text-xs uppercase ${className}`}>
      <label className="flex items-center gap-3">
        <span className="w-16 shrink-0">Music</span>
        <input aria-label="Music volume" className="min-w-0 flex-1 accent-[#e8ac51]" defaultValue={Math.round(getVolume("music") * 100)} max={100} min={0} onChange={(event) => setVolume("music", Number(event.target.value) / 100)} type="range" />
      </label>
      <label className="flex items-center gap-3">
        <span className="w-16 shrink-0">Effects</span>
        <input aria-label="Effects volume" className="min-w-0 flex-1 accent-[#e8ac51]" defaultValue={Math.round(getVolume("effects") * 100)} max={100} min={0} onChange={(event) => setVolume("effects", Number(event.target.value) / 100)} onPointerUp={() => play("ping")} type="range" />
      </label>
    </div>
  );
}
