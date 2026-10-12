"use client";

import { useMutation } from "convex/react";
import { useQuery } from "convex-helpers/react/cache";
import { useState, type DragEvent } from "react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { errorText } from "../../lib/error-text";
import type { DragCard } from "../../lib/evidence-drag";
import { play } from "../../lib/sound";

type Known = { id: Id<"npcs">; name: string; isVictim: boolean };

const inputClass = "h-9 w-full border border-[#8b7355] bg-[#efe3c4] px-2 text-sm text-[#211d17] outline-none placeholder:text-[#8b7355] focus:border-red-900";

/**
 * People the team keeps seeing but cannot name yet. They tag camera sightings with them,
 * and when they work out who it was, "This is…" moves those sightings and the note to that person.
 */
export function UnknownPeople({ roomCode, people, filter, onDrag, onDragEnd, onMessage }: {
  roomCode: string;
  people: Known[];
  filter: (...texts: string[]) => boolean;
  onDrag: (event: DragEvent<HTMLElement>, card: DragCard) => void;
  onDragEnd: () => void;
  onMessage: (text: string) => void;
}) {
  const unknown = useQuery(api.unknownPeople.list, { roomCode });
  const add = useMutation(api.unknownPeople.add);
  const [adding, setAdding] = useState(false);
  const fail = (fallback: string) => (caught: unknown) => onMessage(errorText(caught, fallback));

  return (
    <section className="mb-4">
      {adding ? (
        <PersonForm onCancel={() => setAdding(false)} onSave={(name, note) => { play("page"); void add({ roomCode, name, note }).then(() => setAdding(false), fail("Could not add them.")); }} />
      ) : (
        <button className="min-h-9 w-full border border-dashed border-[#8b7355] text-xs uppercase text-[#5d4d3d] hover:border-red-900 hover:text-red-900" onClick={() => setAdding(true)} type="button">+ Someone you can&apos;t name yet</button>
      )}
      <ul className="mt-3 space-y-3">
        {(unknown ?? []).filter((person) => filter(person.name, person.note)).map((person) => (
          <UnknownCard key={person.id} onDrag={onDrag} onDragEnd={onDragEnd} onMessage={onMessage} people={people} person={person} roomCode={roomCode} />
        ))}
      </ul>
    </section>
  );
}

function UnknownCard({ roomCode, person, people, onDrag, onDragEnd, onMessage }: {
  roomCode: string;
  person: { id: Id<"unknownPeople">; name: string; note: string; spotted: string[] };
  people: Known[];
  onDrag: (event: DragEvent<HTMLElement>, card: DragCard) => void;
  onDragEnd: () => void;
  onMessage: (text: string) => void;
}) {
  const update = useMutation(api.unknownPeople.update);
  const identify = useMutation(api.unknownPeople.identify);
  const remove = useMutation(api.unknownPeople.remove);
  const [editing, setEditing] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const fail = (fallback: string) => (caught: unknown) => onMessage(errorText(caught, fallback));

  return (
    <li className="flex gap-3 border-b border-[#8b7355]/60 pb-3">
      <div
        aria-hidden="true"
        className="flex h-16 w-14 shrink-0 cursor-grab items-center justify-center border border-dashed border-[#8b7355] bg-[#e4d5b0] text-2xl text-[#8b7355]"
        draggable
        onDragEnd={onDragEnd}
        onDragStart={(event) => onDrag(event, { kind: "unknown", referenceId: person.id, label: person.name })}
        title="Drag onto a camera sighting"
      >?</div>
      <div className="min-w-0 flex-1">
        {editing ? (
          <PersonForm initial={person} onCancel={() => setEditing(false)} onSave={(name, note) => { void update({ roomCode, id: person.id, name, note }).then(() => setEditing(false), fail("Could not save that.")); }} />
        ) : (
          <>
            <p className="text-base uppercase">{person.name}<span className="ml-2 text-xs text-[#8b7355]">Not named yet</span></p>
            {person.note ? <p className="mt-1 text-sm italic text-red-900">✎ {person.note}</p> : null}
            {person.spotted.length ? <p className="mt-1 text-xs text-[#5d4d3d]">You placed them on camera: {person.spotted.join("; ")}</p> : <p className="mt-1 text-xs text-[#8b7355]">Drag the ? onto camera sightings you think are them.</p>}
          </>
        )}
        {editing ? null : (
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <label className="sr-only" htmlFor={`identify-${person.id}`}>Who this is</label>
            <select
              className="min-h-8 border border-[#573821] bg-transparent px-1 text-xs uppercase"
              id={`identify-${person.id}`}
              onChange={(event) => {
                const npcId = event.target.value as Id<"npcs">;
                const name = people.find((item) => item.id === npcId)?.name;
                if (npcId) void identify({ roomCode, id: person.id, npcId }).then(() => { play("reveal"); onMessage(`${person.name} is now ${name}.`); }, fail("Could not move them over."));
              }}
              value=""
            >
              <option value="">This is…</option>
              {people.filter((item) => !item.isVictim).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
            <button className="min-h-8 border border-[#573821] px-2 text-xs uppercase" onClick={() => setEditing(true)} type="button">Edit</button>
            {confirmRemove ? (
              <>
                <button className="min-h-8 border border-red-900 px-2 text-xs uppercase text-red-900" onClick={() => { void remove({ roomCode, id: person.id }).catch(fail("Could not remove them.")); }} type="button">Yes, remove</button>
                <button className="min-h-8 px-2 text-xs uppercase" onClick={() => setConfirmRemove(false)} type="button">Keep</button>
              </>
            ) : <button className="min-h-8 px-2 text-xs uppercase text-[#8b7355] hover:text-red-900" onClick={() => setConfirmRemove(true)} type="button">Remove</button>}
          </div>
        )}
      </div>
    </li>
  );
}

function PersonForm({ initial, onSave, onCancel }: { initial?: { name: string; note: string }; onSave: (name: string, note: string) => void; onCancel: () => void }) {
  return (
    <form
      className="space-y-2 border border-[#8b7355] p-2"
      onSubmit={(event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        onSave(String(data.get("name") ?? ""), String(data.get("note") ?? ""));
      }}
    >
      <input aria-label="What you call them" autoFocus className={inputClass} defaultValue={initial?.name} maxLength={60} name="name" placeholder="Man in red jacket" required />
      <input aria-label="What you know" className={inputClass} defaultValue={initial?.note} maxLength={200} name="note" placeholder="Seen near the pier both nights" />
      <div className="flex gap-2">
        <button className="min-h-8 border border-[#573821] px-3 text-xs uppercase" type="submit">{initial ? "Save" : "Add"}</button>
        <button className="min-h-8 px-2 text-xs uppercase" onClick={onCancel} type="button">Cancel</button>
      </div>
    </form>
  );
}
