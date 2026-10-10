"use client";

import { useMutation } from "convex/react";
import { useQuery } from "convex-helpers/react/cache";
import { useState } from "react";
import { api } from "../../../convex/_generated/api";
import { formatGameMinute } from "../../lib/game-time";
import { play } from "../../lib/sound";
import { CharacterPortrait } from "./character-portrait";

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

/** The shared notebook: everything found so far, in one place. Pin what matters; the board is for your theory. */
export function NotebookOverlay({ roomCode, onClose }: { roomCode: string; onClose: () => void }) {
  const entries = useQuery(api.notebook.get, { roomCode });
  const people = useQuery(api.npcs.list, { roomCode });
  const nodes = useQuery(api.clueBoard.getNodes, { roomCode });
  const pin = useMutation(api.clueBoard.createReferenceNode);
  const ping = useMutation(api.coop.ping);
  const [tab, setTab] = useState<"people" | "evidence">("evidence");
  const [message, setMessage] = useState("");

  function pinned(type: string, id: string) {
    return nodes?.some((node) => node.type === type && node.referenceId === id) ?? false;
  }

  function pinEntry(type: Parameters<typeof pin>[0]["type"], referenceId: string) {
    const count = nodes?.length ?? 0;
    setMessage("");
    play("click");
    void pin({ roomCode, type, referenceId, x: 80 + (count % 4) * 220, y: 90 + Math.floor(count / 4) * 180 })
      .then(() => setMessage("Pinned to the clueboard."))
      .catch((caught: unknown) => setMessage(caught instanceof Error ? caught.message : "Could not pin that."));
  }

  function share(text: string) {
    play("ping");
    void ping({ roomCode, text }).then(() => setMessage("Your partner has been pointed to it."));
  }

  return (
    <div className="fixed inset-0 z-[60] flex justify-end bg-black/60 animate-in fade-in" onClick={onClose} role="presentation">
      <aside aria-label="Case notebook" className="game-dossier flex h-full w-full max-w-xl flex-col px-5 pb-10 pt-12 animate-in slide-in-from-right sm:px-8" onClick={(event) => event.stopPropagation()} role="dialog">
        <header className="flex items-center justify-between gap-3 border-b border-[#8b7355] pb-3">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-red-800">Shared notebook</p>
            <h2 className="mt-1 text-2xl uppercase">What we know</h2>
          </div>
          <button className="min-h-10 border-2 border-[#573821] px-3 text-xs uppercase hover:bg-[#573821] hover:text-[#f4ead2]" onClick={onClose} type="button">Close · N</button>
        </header>
        <div className="mt-3 grid grid-cols-2 gap-2" role="tablist">
          {(["evidence", "people"] as const).map((item) => (
            <button aria-selected={tab === item} className="min-h-10 border-b-2 border-transparent text-sm uppercase aria-selected:border-red-900 aria-selected:text-red-900" key={item} onClick={() => setTab(item)} role="tab" type="button">
              {item === "evidence" ? `Evidence · ${entries?.length ?? 0}` : `People · ${people?.length ?? 0}`}
            </button>
          ))}
        </div>
        {message ? <p className="mt-2 text-sm text-red-900" role="status">{message}</p> : null}
        <div className="mt-3 min-h-0 flex-1 overflow-y-auto pr-1">
          {tab === "people" ? (
            people === undefined ? <p className="uppercase">Opening files...</p> : (
              <ul className="space-y-3">
                {(people ?? []).map((person) => (
                  <li className="flex gap-3 border-b border-[#8b7355]/60 pb-3" key={person.id}>
                    <CharacterPortrait age={person.age} className="w-14" description={person.publicDescription} gender={person.gender} id={person.id} />
                    <div className="min-w-0 flex-1">
                      <p className="text-base uppercase">{person.name}{person.isVictim ? <span className="ml-2 text-xs text-red-800">Victim</span> : null}</p>
                      <p className="text-xs text-[#5d4d3d]">{[person.age ? `Age ${person.age}` : null, person.occupation].filter(Boolean).join(" · ")}</p>
                      <p className="mt-1 text-xs italic text-[#5d4d3d]">First seen in: {person.firstSeenIn}</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <button className="min-h-9 border border-[#573821] px-2 text-xs uppercase disabled:opacity-50" disabled={pinned("npc", person.id)} onClick={() => pinEntry("npc", person.id)} type="button">{pinned("npc", person.id) ? "Pinned" : "Pin"}</button>
                        <button className="min-h-9 border border-[#573821] px-2 text-xs uppercase" onClick={() => share(`Look at ${person.name}`)} type="button">Show partner</button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )
          ) : entries === undefined ? <p className="uppercase">Opening notebook...</p> : !entries?.length ? (
            <p className="text-sm leading-relaxed">Nothing written down yet. Search places, read devices, question people, and review records. Everything you uncover lands here for both of you.</p>
          ) : (
            groups.map(([type, label]) => {
              const rows = entries.filter((entry) => entry.type === type);
              if (!rows.length) return null;
              return (
                <section className="mb-5" key={type}>
                  <h3 className="border-b border-red-900/50 pb-1 text-xs uppercase tracking-[0.18em] text-red-800">{label} · {rows.length}</h3>
                  <ul>
                    {rows.map((entry) => (
                      <li className="border-b border-[#8b7355]/40 py-3" key={`${entry.type}:${entry.referenceId}`}>
                        <p className="text-sm font-semibold">{entry.title}</p>
                        {entry.time !== undefined ? <p className="font-mono text-xs text-[#5d4d3d]">{formatGameMinute(entry.time)}</p> : null}
                        <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed">{entry.body}</p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          <button className="min-h-9 border border-[#573821] px-2 text-xs uppercase disabled:opacity-50" disabled={pinned(entry.type, entry.referenceId)} onClick={() => pinEntry(entry.type, entry.referenceId)} type="button">{pinned(entry.type, entry.referenceId) ? "Pinned" : "Pin"}</button>
                          <button className="min-h-9 border border-[#573821] px-2 text-xs uppercase" onClick={() => share(`Look at: ${entry.title}`)} type="button">Show partner</button>
                        </div>
                      </li>
                    ))}
                  </ul>
                </section>
              );
            })
          )}
        </div>
      </aside>
    </div>
  );
}
