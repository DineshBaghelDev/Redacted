"use client";

import { errorText } from "../../lib/error-text";
import { FirstTimeTip } from "./first-time-tip";
import { useMutation } from "convex/react";
import { useQuery } from "convex-helpers/react/cache";
import { useState, type DragEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { api } from "../../../convex/_generated/api";
import { formatGameMinute } from "../../lib/game-time";
import { play } from "../../lib/sound";
import { CharacterPortrait } from "./character-portrait";
import { ControlIcon } from "./control-icon";
import { startCardDrag } from "../../lib/evidence-drag";
import { PinButton } from "./pin-button";
import { UnknownPeople } from "./unknown-people";

const groups = [
  ["item", "Objects"],
  ["statement", "Statements"],
  ["message", "Messages"],
  ["call", "Calls"],
  ["device_file", "Files"],
  ["cctv", "Camera logs"],
  ["forensic", "Lab reports"],
  ["public_record", "Public records"],
] as const;

export type NotebookPick = { type: (typeof groups)[number][0]; referenceId: string; label: string };

/**
 * The shared notebook: everything found so far, in one place. Pin what matters; the board is for your theory.
 * With `onPick` it opens to choose evidence to show someone: evidence only, one "Show this" per entry.
 */
export function NotebookOverlay({ roomCode, onClose, onPick, pickTitle }: { roomCode: string; onClose: () => void; onPick?: (entry: NotebookPick) => void; pickTitle?: string }) {
  const entries = useQuery(api.notebook.get, { roomCode });
  const people = useQuery(api.npcs.list, { roomCode });
  const nodes = useQuery(api.clueBoard.getNodes, { roomCode });
  const ping = useMutation(api.coop.ping);
  const setNote = useMutation(api.notebook.setNote);
  const coop = useQuery(api.coop.get, { roomCode });
  const [filter, setFilter] = useState("");
  const [partnerText, setPartnerText] = useState("");
  const [tab, setTab] = useState<"people" | "evidence">("evidence");
  const picking = Boolean(onPick);
  const onBoard = (referenceId: string) => nodes?.some((node) => node.referenceId === referenceId) ?? false;
  const [message, setMessage] = useState("");
  // While dragging an entry out, fade the notebook so the screen behind can take the drop.
  const [dragging, setDragging] = useState(false);

  /** Only the handle starts a drag (so text stays selectable), but the whole entry is what you see moving. */
  function dragOut(event: DragEvent<HTMLElement>, card: Parameters<typeof startCardDrag>[1]) {
    startCardDrag(event, card);
    const entry = event.currentTarget.closest("li");
    if (entry) event.dataTransfer.setDragImage(entry, 16, 16);
    setDragging(true);
  }

  function share(text: string) {
    play("ping");
    void ping({ roomCode, text }).then(() => setMessage("Sent to your partner."));
  }

  // Rendered on the page body so it sits above the game's top bar wherever it is opened from.
  return createPortal(
    <div className={`fixed inset-0 z-[60] flex justify-end bg-black/60 transition-opacity animate-in fade-in ${dragging ? "pointer-events-none opacity-20" : ""}`} onClick={onClose} role="presentation">
      <aside aria-label="Case notebook" className="game-dossier flex h-full w-full max-w-xl flex-col px-5 pb-10 pt-12 animate-in slide-in-from-right sm:px-8" onClick={(event) => event.stopPropagation()} role="dialog">
        <header className="flex items-center justify-between gap-3 border-b border-[#8b7355] pb-3">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-red-800">Shared notebook</p>
            <h2 className="mt-1 text-2xl uppercase">{picking ? pickTitle ?? "Pick evidence" : "What we know"}</h2>
          </div>
          <button aria-label="Close notebook" className="game-icon-button" onClick={onClose} title="Close notebook · N" type="button"><ControlIcon name="close" /></button>
        </header>
        {picking ? null : <div className="mt-3 grid grid-cols-2 gap-2" role="tablist">
          {(["evidence", "people"] as const).map((item) => (
            <button aria-selected={tab === item} className="min-h-10 border-b-2 border-transparent text-sm uppercase aria-selected:border-red-900 aria-selected:text-red-900" key={item} onClick={() => { play("page"); setTab(item); }} role="tab" type="button">
              {item === "evidence" ? `Evidence · ${entries?.length ?? 0}` : `People · ${people?.length ?? 0}`}
            </button>
          ))}
        </div>}
        <label className="sr-only" htmlFor="notebook-filter">Find in notebook</label>
        <input autoFocus={picking} className="mt-3 h-10 w-full border border-[#8b7355] bg-[#efe3c4] px-3 text-sm text-[#211d17] outline-none placeholder:text-[#8b7355] focus:border-red-900" id="notebook-filter" onChange={(event) => setFilter(event.target.value)} onKeyDown={(event) => { if (event.key === "Escape") { event.preventDefault(); onClose(); } }} placeholder="Find a name, place, or word..." type="search" value={filter} />
        {message ? <p className="mt-2 text-sm text-red-900" role="status">{message}</p> : null}
        {picking ? null : <FirstTimeTip id="notebook" title="Shared notebook">Discoveries appear here. Grab one by its ⠿ handle or photo and drag it to the clueboard, a person, the lab bench, or your report.</FirstTimeTip>}
        <div className="mt-3 min-h-0 flex-1 overflow-y-auto pr-1">
          {tab === "people" && !picking ? (
            people === undefined ? <p className="uppercase">Opening files...</p> : (
              <>
              <UnknownPeople filter={(...texts) => matches(filter, ...texts)} onDrag={dragOut} onDragEnd={() => setDragging(false)} onMessage={setMessage} people={people ?? []} roomCode={roomCode} />
              <ul className="space-y-3">
                {(people ?? []).filter((person) => matches(filter, person.name, person.occupation ?? "", person.publicDescription)).map((person) => (
                  <li className="group flex gap-3 border-b border-[#8b7355]/60 pb-3" key={person.id}>
                    <div className="cursor-grab" draggable onDragEnd={() => setDragging(false)} onDragStart={(event) => dragOut(event, { kind: "person", referenceId: person.id, label: person.name })} title="Drag to the clueboard, a sighting, or your report">
                      <CharacterPortrait age={person.age} className="w-14" description={person.publicDescription} gender={person.gender} id={person.id} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-base uppercase">{person.name}{person.isVictim ? <span className="ml-2 text-xs text-red-800">Victim</span> : null}</p>
                      <p className="text-xs text-[#5d4d3d]">{[person.age ? `Age ${person.age}` : null, person.occupation].filter(Boolean).join(" · ")}</p>
                      <p className="mt-1 text-xs italic text-[#5d4d3d]">First seen in: {person.firstSeenIn}</p>
                      {person.spotted.length ? <p className="mt-1 text-xs text-[#5d4d3d]">You placed them on camera: {person.spotted.join("; ")}</p> : null}
                      <EntryNote note={person.note} onSave={(text) => { void setNote({ roomCode, referenceId: person.id, text }).catch((caught: unknown) => setMessage(errorText(caught, "Could not save that note."))); }} />
                      <EntryActions onShare={() => share(`Look at ${person.name}`)} pinControl={<PinButton nodes={nodes} onChange={(next) => setMessage(next ? "Pinned to the clueboard." : "Removed from the clueboard.")} onError={(caught) => setMessage(errorText(caught, "Could not update this pin."))} referenceId={person.id} roomCode={roomCode} type="npc" />} />
                    </div>
                  </li>
                ))}
              </ul>
              </>
            )
          ) : entries === undefined ? <p className="uppercase">Opening notebook...</p> : !entries?.length ? (
            <p className="text-sm leading-relaxed">Nothing written down yet. Search places, read devices, question people, and review records. Everything you uncover lands here for both of you.</p>
          ) : !entries.some((entry) => matches(filter, entry.title, entry.body, entry.note ?? "")) ? (
            <p className="text-sm leading-relaxed">Nothing in the notebook matches “{filter.trim()}”.</p>
          ) : (
            groups.map(([type, label]) => {
              const rows = entries.filter((entry) => entry.type === type && matches(filter, entry.title, entry.body, entry.note ?? ""));
              if (!rows.length) return null;
              return (
                <section className="mb-5" key={type}>
                  <h3 className="border-b border-red-900/50 pb-1 text-xs uppercase tracking-[0.18em] text-red-800">{label} · {rows.length}</h3>
                  <ul>
                    {rows.map((entry) => (
                      <li className="group border-b border-[#8b7355]/40 py-3" key={`${entry.type}:${entry.referenceId}`}>
                        <p className="flex items-start gap-2 text-sm font-semibold"><span aria-hidden="true" className="cursor-grab select-none px-1 text-[#8b7355] hover:text-red-900" draggable onDragEnd={() => setDragging(false)} onDragStart={(event) => dragOut(event, { kind: entry.type, referenceId: entry.referenceId, label: entry.title })} title="Drag to the clueboard, a person, the lab bench, or your report">⠿</span><span className="min-w-0 flex-1">{entry.title}{picking && onBoard(entry.referenceId) ? <span className="ml-2 text-xs font-normal uppercase text-red-800">On clueboard</span> : null}</span></p>
                        {entry.time !== undefined ? <p className="font-mono text-xs text-[#5d4d3d]">{formatGameMinute(entry.time)}</p> : null}
                        <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed">{entry.body}</p>
                        {picking ? (entry.note ? <p className="mt-1 text-sm italic text-red-900">✎ {entry.note}</p> : null) : <EntryNote note={entry.note} onSave={(text) => { void setNote({ roomCode, referenceId: entry.referenceId, text }).catch((caught: unknown) => setMessage(errorText(caught, "Could not save that note."))); }} />}
                        {onPick ? <button className="game-control-button mt-2 min-h-10 px-4 text-xs uppercase text-[#f1c987]" onClick={() => { play("click"); onPick({ type: entry.type, referenceId: entry.referenceId, label: entry.title }); }} type="button">Show this</button> : <EntryActions onShare={() => share(`Look at: ${entry.title}`)} pinControl={<PinButton nodes={nodes} onChange={(next) => setMessage(next ? "Pinned to the clueboard." : "Removed from the clueboard.")} onError={(caught) => setMessage(errorText(caught, "Could not update this pin."))} referenceId={entry.referenceId} roomCode={roomCode} type={entry.type} />} />}
                      </li>
                    ))}
                  </ul>
                </section>
              );
            })
          )}
        </div>
        {coop?.partners.length && !picking ? (
          <form className="mt-3 flex gap-2 border-t border-[#8b7355] pt-3" onSubmit={(event) => { event.preventDefault(); if (partnerText.trim()) { share(partnerText); setPartnerText(""); } }}>
            <label className="sr-only" htmlFor="partner-message">Message your partner</label>
            <input className="h-10 min-w-0 flex-1 border border-[#8b7355] bg-[#efe3c4] px-3 text-sm text-[#211d17] outline-none placeholder:text-[#8b7355] focus:border-red-900" id="partner-message" maxLength={140} onChange={(event) => setPartnerText(event.target.value)} placeholder={`Message ${coop.partners[0].name}...`} value={partnerText} />
            <button className="min-h-10 border border-[#573821] px-3 text-xs uppercase disabled:opacity-50" disabled={!partnerText.trim()} type="submit">Send</button>
          </form>
        ) : null}
      </aside>
    </div>,
    document.body,
  );
}

function EntryActions({ pinControl, onShare }: { pinControl: ReactNode; onShare: () => void }) {
  return (
    <div className="mt-2 flex flex-wrap items-center gap-2">
      <span className="flex items-center gap-2">
        {pinControl}
        <button className="min-h-8 border border-[#573821] px-2 text-xs uppercase" onClick={onShare} type="button">Show partner</button>
      </span>
    </div>
  );
}

/** Lower case with every kind of space (generated text uses narrow and non-breaking ones) as one plain space. */
const plain = (text: string) => text.toLowerCase().replace(/\s+/g, " ");

/** Case-insensitive match of the notebook search against any of an entry's texts. */
function matches(filter: string, ...texts: string[]) {
  const term = plain(filter.trim());
  return !term || texts.some((text) => plain(text).includes(term));
}

/** The team's own one-line note on an entry: reasoning, never evidence. */
function EntryNote({ note, onSave }: { note?: string; onSave: (text: string) => void }) {
  const [editing, setEditing] = useState(false);
  if (!editing) {
    return note
      ? <button className="mt-1 block text-left text-sm italic text-red-900" onClick={() => setEditing(true)} title="Edit your note" type="button">✎ {note}</button>
      : <button className="mt-1 text-xs uppercase text-[#8b7355] hover:text-red-900" onClick={() => setEditing(true)} type="button">+ Add a note</button>;
  }
  return (
    <form className="mt-1 flex gap-2" onSubmit={(event) => { event.preventDefault(); onSave(String(new FormData(event.currentTarget).get("note") ?? "")); setEditing(false); }}>
      <input aria-label="Your note" autoFocus className="h-8 min-w-0 flex-1 border border-[#8b7355] bg-[#efe3c4] px-2 text-sm text-[#211d17] outline-none focus:border-red-900" defaultValue={note} maxLength={200} name="note" placeholder="lying about the dentist?" />
      <button className="border border-[#573821] px-2 text-xs uppercase" type="submit">Save</button>
    </form>
  );
}
