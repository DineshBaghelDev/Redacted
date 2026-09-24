"use client";

import { city } from "../../../../convex/fixtures/city";
import { findRoom } from "../../../../convex/generation/core/city";
import { formatTime, type Cast, type CrimeCore, type Story } from "../../../../convex/generation/core/schemas";

// Visual views for the crime, cast and story stages.

type Names = Map<string, string>;

export function namesFrom(cast: Cast | undefined): Names {
  return new Map(cast?.characters.map((c) => [c.id, c.name]) ?? []);
}

function where(roomId: string) {
  const found = findRoom(city, roomId);
  return found ? `${found.place.name} · ${found.room.name}` : roomId;
}

function placeName(placeId: string) {
  return city.places.find((p) => p.id === placeId)?.name ?? placeId;
}

function homeName(unitId: string) {
  for (const p of city.places) {
    const unit = p.building.homeUnits.find((u) => u.id === unitId);
    if (unit) return unit.label === p.name ? p.name : `${p.name}, ${unit.label}`;
  }
  return unitId;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <span className="text-xs uppercase opacity-50">{label}</span>
      <div>{children}</div>
    </div>
  );
}

export function CrimeView({ crime, names }: { crime: CrimeCore; names: Names }) {
  const who = (id: string) => names.get(id) ?? id;
  return (
    <div className="grid gap-3 border border-red-400/40 p-3 sm:grid-cols-2">
      <Field label="Victim">{who(crime.victimId)}</Field>
      <Field label="Killer">
        <span className="text-red-400">{who(crime.killerId)}</span>
        {crime.accomplice && ` + accomplice ${who(crime.accomplice.id)} (${crime.accomplice.role})`}
      </Field>
      <Field label={`Motive · ${crime.motive.type}`}>{crime.motive.details}</Field>
      <Field label={`Weapon · ${crime.weapon.category}`}>
        {crime.weapon.name} <span className="opacity-60">(from {where(crime.weapon.originRoomId)})</span>
      </Field>
      <Field label="Method">{crime.method}</Field>
      <Field label="Scene">{where(crime.sceneRoomId)}</Field>
      <Field label="Time of death">{formatTime(crime.timeOfDeath)}</Field>
      <Field label="Body found">
        {formatTime(crime.discovery.time)} by {who(crime.discovery.byId)}
      </Field>
      <Field label="Story window">
        {formatTime(crime.windowStart)} → {formatTime(crime.discovery.time)}
      </Field>
      <Field label="Cover-up">
        <div className="flex flex-wrap gap-1">
          {crime.coverUp.map((c) => (
            <span key={c} className="border border-cyan-300/50 px-1 text-xs">
              {c}
            </span>
          ))}
        </div>
      </Field>
    </div>
  );
}

const ROLE_STYLE = { victim: "border-slate-400", suspect: "border-yellow-300/70", witness: "border-cyan-300/40" } as const;

export function CastView({ cast, crime }: { cast: Cast; crime?: CrimeCore }) {
  return (
    <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
      {cast.characters.map((c) => (
        <div key={c.id} className={`flex flex-col gap-1 border p-3 ${ROLE_STYLE[c.role]}`}>
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-base text-yellow-200">{c.name}</span>
            <span className="text-xs opacity-60">
              {c.age} · {c.role}
              {crime?.killerId === c.id && <span className="text-red-400"> · KILLER</span>}
              {crime?.accomplice?.id === c.id && <span className="text-red-400"> · ACCOMPLICE</span>}
            </span>
          </div>
          <p className="opacity-80">{c.relationshipToVictim}</p>
          <p className="text-xs">
            {c.job ? `${c.job.title} at ${placeName(c.job.placeId)}` : "no job"} · lives at {homeName(c.homeUnitId)} ·{" "}
            {c.routine} routine
            {c.hangoutPlaceId && ` · hangs out at ${placeName(c.hangoutPlaceId)}`}
          </p>
          <p className="text-xs opacity-70">
            Looks: {c.appearance.height}, {c.appearance.build}, {c.appearance.clothing}
          </p>
          <p className="text-xs opacity-70">Traits: {c.traits.join(", ")}</p>
          <p className="text-xs">
            <span className="text-red-300">Secret:</span> {c.secret} <span className="opacity-60">(protects {c.protects})</span>
          </p>
          {c.fakeMotive && (
            <p className="text-xs">
              <span className="text-yellow-300">Looks guilty because:</span> {c.fakeMotive}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}

type Row = { time: number; kind: string; text: string; detail: string; private?: boolean };

export function StoryView({ story, names }: { story: Story; names: Names }) {
  const who = (id: string) => names.get(id) ?? id;
  const rows: Row[] = [
    ...story.events.map((e) => ({
      time: e.start,
      kind: "event",
      text: e.action,
      detail: `${e.actors.map(who).join(", ")} · ${where(e.roomId)} · until ${formatTime(e.end)}${
        e.enteredVia ? ` · in via ${where(e.enteredVia)}` : ""
      }${e.leftVia ? ` · out via ${where(e.leftVia)}` : ""}${e.itemsUsed.length ? ` · items: ${e.itemsUsed.join(", ")}` : ""}`,
      private: e.visibility === "private",
    })),
    ...story.comms.map((c) => ({
      time: c.time,
      kind: c.type,
      text: c.gist,
      detail: `${who(c.from)} → ${who(c.to)}${c.durationMinutes ? ` · ${c.durationMinutes} min` : ""}`,
    })),
    ...story.purchases.map((p) => ({
      time: p.time,
      kind: "purchase",
      text: `${who(p.who)} buys ${p.item}`,
      detail: `${placeName(p.placeId)} · ${p.payment}`,
    })),
  ].sort((a, b) => a.time - b.time);

  return (
    <div className="flex flex-col gap-4">
      <ol className="flex flex-col gap-2 border-l border-cyan-300/40 pl-4">
        {rows.map((r, i) => (
          <li key={i}>
            <span className="whitespace-nowrap text-xs opacity-60">{formatTime(r.time)}</span>{" "}
            <span className="border border-cyan-300/50 px-1 text-xs">{r.kind}</span>{" "}
            <span className={r.private ? "text-red-300" : "text-yellow-100"}>{r.text}</span>
            {r.private && <span className="text-xs text-red-400"> (private)</span>}
            <div className="text-xs opacity-60">{r.detail}</div>
          </li>
        ))}
      </ol>
      <div>
        <p className="mb-1 text-xs uppercase opacity-50">Story items</p>
        <ul className="flex flex-col gap-1">
          {story.items.map((item) => (
            <li key={item.id}>
              <span className="text-yellow-200">{item.name}</span>{" "}
              <span className="text-xs opacity-70">
                {where(item.startRoomId)} → {where(item.finalRoomId)} ({item.finalSlot})
                {item.ownerId && ` · owner ${who(item.ownerId)}`}
              </span>
              <div className="text-xs opacity-60">{item.description}</div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
