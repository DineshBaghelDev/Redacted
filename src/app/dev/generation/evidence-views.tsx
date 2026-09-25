"use client";

import { useState } from "react";
import { city } from "../../../../convex/fixtures/city";
import { findRoom } from "../../../../convex/generation/core/city";
import type { Evidence, EvidenceSet, EvidenceType } from "../../../../convex/generation/core/evidence/types";
import type { Facts } from "../../../../convex/generation/core/facts";
import { formatTime } from "../../../../convex/generation/core/schemas";

type Names = Map<string, string>;

const TABS: { type: EvidenceType | "phone"; label: string }[] = [
  { type: "cctv", label: "CCTV" },
  { type: "phone", label: "Phones" },
  { type: "forensic", label: "Lab" },
  { type: "item", label: "Items" },
  { type: "file", label: "Laptop files" },
  { type: "record", label: "Records" },
  { type: "witness", label: "Witnesses" },
];

function where(roomId: string) {
  const found = findRoom(city, roomId);
  return found ? `${found.place.name} · ${found.room.name}` : roomId;
}

/** How a player reaches this evidence, in plain words. */
export function accessText(e: Evidence, names: Names) {
  const a = e.access;
  switch (a.tool) {
    case "cctv":
      return "CCTV review";
    case "search":
      return `Search ${where(a.roomId)} (${a.slot})`;
    case "lab":
      return "Forensic lab";
    case "records":
      return "Records terminal";
    case "phone":
      return `On ${names.get(a.deviceId.replace("phone:", "")) ?? a.deviceId}'s phone`;
    case "interrogation":
      return `Ask ${names.get(a.witnessId) ?? a.witnessId}`;
    case "device":
      return `Open the device (item "${a.itemId}")`;
  }
}

function Truth({ e, names, show }: { e: Evidence; names: Names; show: boolean }) {
  if (!show || e.aboutIds.length === 0) return null;
  return <span className="text-xs text-red-300"> [truth: {e.aboutIds.map((id) => names.get(id) ?? id).join(", ")}]</span>;
}

/** Evidence browser: CCTV like a player would use it (camera + time), plus phones, lab, items, records, witnesses. */
export function EvidenceView({ set, names }: { set: EvidenceSet; names: Names }) {
  const [tab, setTab] = useState<(typeof TABS)[number]["type"]>("cctv");
  const [showTruth, setShowTruth] = useState(true);
  const count = (t: (typeof TABS)[number]["type"]) =>
    set.evidence.filter((e) => (t === "phone" ? ["call", "message", "device", "card"].includes(e.type) : e.type === t)).length;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        {TABS.map((t) => (
          <button
            key={t.type}
            className={`border px-2 py-0.5 ${tab === t.type ? "border-yellow-200 text-yellow-200" : "border-cyan-300/40"}`}
            onClick={() => setTab(t.type)}
          >
            {t.label} ({count(t.type)})
          </button>
        ))}
        <label className="ml-auto flex items-center gap-1 text-xs">
          <input type="checkbox" checked={showTruth} onChange={(e) => setShowTruth(e.target.checked)} />
          show hidden truth
        </label>
      </div>
      {tab === "cctv" ? (
        <CctvView set={set} names={names} showTruth={showTruth} />
      ) : tab === "phone" ? (
        <PhoneView set={set} names={names} showTruth={showTruth} />
      ) : (
        <ul className="flex flex-col gap-2">
          {set.evidence
            .filter((e) => e.type === tab)
            .map((e) => (
              <li
                key={e.id}
                className={`border-l pl-2 ${e.type === "item" && e.data.clutter ? "border-slate-600 opacity-60" : "border-cyan-300/40"}`}
              >
                <span className="text-yellow-200">{e.title}</span>
                {e.type === "item" && e.data.clutter && <span className="text-xs"> · background item</span>}
                {e.time !== undefined && <span className="text-xs opacity-60"> · {formatTime(e.time)}</span>}
                <Truth e={e} names={names} show={showTruth} />
                <div>{e.summary}</div>
                <div className="text-xs opacity-60">{accessText(e, names)}</div>
              </li>
            ))}
        </ul>
      )}
    </div>
  );
}

function CctvView({ set, names, showTruth }: { set: EvidenceSet; names: Names; showTruth: boolean }) {
  const [cameraId, setCameraId] = useState("all");
  const [fromHour, setFromHour] = useState(0);
  const [toHour, setToHour] = useState(72);
  const rows = set.evidence.filter(
    (e) =>
      e.type === "cctv" &&
      e.access.tool === "cctv" &&
      (cameraId === "all" || e.access.cameraId === cameraId) &&
      (e.end ?? e.time!) >= fromHour * 60 &&
      e.time! <= toHour * 60,
  );
  const hourOptions = Array.from({ length: 73 }, (_, h) => h);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <select className="max-w-xs bg-[#020817]" value={cameraId} onChange={(e) => setCameraId(e.target.value)}>
          <option value="all">all cameras ({set.cameras.length})</option>
          {set.cameras.map((c) => (
            <option key={c.id} value={c.id}>
              {c.faulty ? "⚠ " : ""}
              {c.name}
            </option>
          ))}
        </select>
        from
        <select className="bg-[#020817]" value={fromHour} onChange={(e) => setFromHour(Number(e.target.value))}>
          {hourOptions.map((h) => (
            <option key={h} value={h}>
              {formatTime(h * 60)}
            </option>
          ))}
        </select>
        to
        <select className="bg-[#020817]" value={toHour} onChange={(e) => setToHour(Number(e.target.value))}>
          {hourOptions.map((h) => (
            <option key={h} value={h}>
              {formatTime(h * 60)}
            </option>
          ))}
        </select>
        <span className="opacity-60">
          {rows.length} records · faulty: {set.cameras.filter((c) => c.faulty).map((c) => c.name).join(", ") || "none"}
        </span>
      </div>
      <div className="max-h-[60vh] overflow-auto">
        <table className="w-full text-xs">
          <thead className="sticky top-0 bg-[#06142d] text-left">
            <tr>
              <th className="p-1">Time</th>
              <th className="p-1">Camera</th>
              <th className="p-1">Seen</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((e) => (
              <tr key={e.id} className={e.sourceIds[0]?.startsWith("routine/") ? "opacity-70" : "text-yellow-200"}>
                <td className="whitespace-nowrap p-1">
                  {formatTime(e.time!)}
                  {e.end !== e.time && ` – ${formatTime(e.end!).slice(6)}`}
                </td>
                <td className="p-1">{set.cameras.find((c) => e.access.tool === "cctv" && c.id === e.access.cameraId)?.name}</td>
                <td className="p-1">
                  {e.summary}
                  <Truth e={e} names={names} show={showTruth} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs opacity-60">Yellow = linked to a story event. Grey = everyday routine.</p>
    </div>
  );
}

function PhoneView({ set, names, showTruth }: { set: EvidenceSet; names: Names; showTruth: boolean }) {
  const devices = set.evidence.filter((e) => e.type === "device");
  const cards = set.evidence.filter((e) => e.type === "card");
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {devices.map((d) => {
        const deviceId = d.type === "device" ? d.data.deviceId : "";
        const log = set.evidence.filter((e) => e.access.tool === "phone" && e.access.deviceId === deviceId);
        return (
          <div key={d.id} className="border border-cyan-300/40 p-2">
            <div className="text-yellow-200">{d.title}</div>
            <div className="text-xs opacity-60">Get it: {accessText(d, names)}</div>
            {log.length === 0 && <div className="text-xs opacity-50">No calls or messages in the story window.</div>}
            <ul>
              {log.map((e) => (
                <li key={e.id} className="text-xs">
                  <span className="opacity-60">{formatTime(e.time!)}</span> {e.title}: {e.summary}
                  <Truth e={e} names={names} show={showTruth} />
                </li>
              ))}
            </ul>
          </div>
        );
      })}
      <div className="border border-cyan-300/40 p-2">
        <div className="text-yellow-200">Card payments</div>
        <ul>
          {cards.map((e) => (
            <li key={e.id} className="text-xs">
              <span className="opacity-60">{formatTime(e.time!)}</span> {e.summary}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/** Each fact with the evidence behind it; decisive evidence highlighted, unsupported facts in red. */
export function FactsView({ facts, set, names }: { facts: Facts; set?: EvidenceSet; names: Names }) {
  const byId = new Map(set?.evidence.map((e) => [e.id, e]) ?? []);
  return (
    <div className="flex flex-col gap-3">
      <div className="border border-green-400/60 p-2">
        <span className="text-xs uppercase opacity-60">Decisive evidence (earns the evidence star)</span>
        <ul>
          {facts.decisiveIds.map((id) => (
            <li key={id} className="text-green-300">
              {byId.get(id)?.title ?? id} <span className="text-xs opacity-70">— {byId.get(id)?.summary}</span>
            </li>
          ))}
        </ul>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {facts.facts.map((f) => (
          <div key={f.id} className={`border p-2 ${f.evidenceIds.length ? "border-cyan-300/40" : "border-red-400"}`}>
            <div className="text-xs uppercase opacity-60">
              {f.kind} · {f.evidenceIds.length} pieces
            </div>
            <div className="text-yellow-200">{f.text}</div>
            <ul className="mt-1">
              {f.evidenceIds.map((id) => {
                const e = byId.get(id);
                return (
                  <li key={id} className={`text-xs ${facts.decisiveIds.includes(id) ? "text-green-300" : ""}`}>
                    • {e ? `${e.title} — ${accessText(e, names)}` : id}
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
