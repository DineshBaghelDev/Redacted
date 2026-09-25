"use client";

import { useState } from "react";
import { city } from "../../../../convex/fixtures/city";
import { findRoom } from "../../../../convex/generation/core/city";
import { formatTime } from "../../../../convex/generation/core/schemas";
import type { Timeline } from "../../../../convex/generation/core/timeline";

function where(roomId: string) {
  const found = findRoom(city, roomId);
  return found ? `${found.place.name} · ${found.room.name}` : roomId;
}

/** Timeline as a table, filterable by person; story events highlighted. */
export function TimelineView({ timeline, names }: { timeline: Timeline; names: Map<string, string> }) {
  const people = [...new Set(timeline.entries.map((e) => e.actorId))];
  const [person, setPerson] = useState<string>("all");
  const [storyOnly, setStoryOnly] = useState(false);
  const rows = timeline.entries.filter(
    (e) => (person === "all" || e.actorId === person) && (!storyOnly || e.source === "story"),
  );

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-3">
        <select className="bg-[#020817]" value={person} onChange={(e) => setPerson(e.target.value)}>
          <option value="all">everyone</option>
          {people.map((p) => (
            <option key={p} value={p}>
              {names.get(p) ?? p}
            </option>
          ))}
        </select>
        <label className="flex items-center gap-1">
          <input type="checkbox" checked={storyOnly} onChange={(e) => setStoryOnly(e.target.checked)} />
          story events only
        </label>
        <span className="opacity-60">
          {formatTime(timeline.windowStart)} → {formatTime(timeline.windowEnd)} · {rows.length} rows
        </span>
      </div>
      <div className="max-h-[60vh] overflow-auto">
        <table className="w-full text-xs">
          <thead className="sticky top-0 bg-[#06142d] text-left">
            <tr>
              <th className="p-1">Who</th>
              <th className="p-1">From</th>
              <th className="p-1">To</th>
              <th className="p-1">Where</th>
              <th className="p-1">What</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((e) => (
              <tr key={e.id} className={e.source === "story" ? "text-yellow-200" : "opacity-70"}>
                <td className="whitespace-nowrap p-1">{names.get(e.actorId) ?? e.actorId}</td>
                <td className="whitespace-nowrap p-1">{formatTime(e.start)}</td>
                <td className="whitespace-nowrap p-1">{formatTime(e.end)}</td>
                <td className="p-1">{where(e.roomId)}</td>
                <td className="p-1">
                  {e.action}
                  {e.visibility === "private" && <span className="text-red-400"> (private)</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
