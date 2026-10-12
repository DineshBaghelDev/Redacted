"use client";

import { errorText } from "../../../lib/error-text";
import { FirstTimeTip } from "../first-time-tip";
import { useAuth } from "@clerk/nextjs";
import { useUIMessages } from "@convex-dev/agent/react";
import { useMutation } from "convex/react";
import { useQuery } from "convex-helpers/react/cache";
import type { FunctionReturnType } from "convex/server";
import { useEffect, useRef, useState } from "react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { play } from "../../../lib/sound";
import { CharacterPortrait } from "../character-portrait";
import { GameIcon } from "../game-icon";
import { ControlIcon } from "../control-icon";
import { PinButton } from "../pin-button";
import { DeviceViewer } from "./device-viewer";
import { TypeAhead } from "../type-ahead";
import { NotebookOverlay } from "../notebook-overlay";

type Person = NonNullable<FunctionReturnType<typeof api.npcs.list>>[number];
type Proof = FunctionReturnType<typeof api.npcConversations.listAvailableProof>[number];

export function InterrogationScreen({ roomCode, onBack }: { roomCode: string; onBack: () => void }) {
  const { isLoaded, isSignedIn } = useAuth();
  const people = useQuery(api.npcs.list, isLoaded && isSignedIn ? { roomCode } : "skip");
  const boardNodes = useQuery(api.clueBoard.getNodes, isLoaded && isSignedIn ? { roomCode } : "skip");
  const [error, setError] = useState("");
  const [selectedId, setSelectedId] = useState<Id<"npcs"> | null>(null);

  if (people === undefined) return <Message message="Opening interview files..." onBack={onBack} />;
  if (!people) return <Message message="Interview files are unavailable for this room." onBack={onBack} />;
  const selected = people.find((person) => person.id === selectedId);

  return (
    <section className="game-interview-scene absolute inset-0 z-20 flex flex-col overflow-hidden text-[#e4e6d8]">
      <header className="game-station-header flex shrink-0 items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-[0.25em] text-[#e8ac51]">Interview room</p>
          <h2 className="mt-1 break-words text-xl uppercase tracking-wide sm:text-2xl">{selected ? selected.name : "People we know of"}</h2>
        </div>
        <button aria-label={selected ? "End interview" : "Leave the room"} className="game-control-button game-icon-mobile flex min-h-11 shrink-0 items-center gap-2 px-3 text-sm uppercase" onClick={selected ? () => setSelectedId(null) : onBack} title={selected ? "End interview" : "Leave the room"} type="button">
          <ControlIcon name="back" /><span className="hidden sm:inline">{selected ? "End interview" : "Leave the room"}</span>
        </button>
      </header>
      <main className={`game-station-main min-h-0 flex-1 p-3 sm:p-6 lg:p-8 ${selected ? "overflow-hidden" : "overflow-y-auto"}`}>
        <div className={`mx-auto max-w-6xl ${selected ? "h-full" : ""}`}>
          {error ? <p className="mb-4 border-2 border-red-800 bg-red-950/90 p-3 text-sm text-red-100" role="alert">{error}</p> : null}
          {selected ? <InterviewPanel key={selected.id} people={people} person={selected} roomCode={roomCode} /> : (
            <>
              <p className="max-w-2xl text-sm leading-relaxed text-[#c8d8d2]">
                People found in messages, records, and statements appear here. Interviews happen at the bureau.
              </p>
              <ul className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {people.map((person) => {
                  return (
                    <li className="game-dossier min-w-0 p-4 text-[#211d17]" key={person.id}>
                      <div className="flex min-w-0 gap-4">
                        <CharacterPortrait age={person.age} className="w-20" description={person.publicDescription} gender={person.gender} id={person.id} />
                        <div className="min-w-0 flex-1">
                          {person.isVictim ? <p className="text-xs uppercase tracking-[0.12em] text-red-800">Victim</p> : null}
                          <h3 className="mt-1 break-words text-xl uppercase leading-tight">{person.name}</h3>
                          <p className="mt-1 break-words text-xs uppercase text-[#5d4d3d]">{[person.age ? `Age ${person.age}` : null, person.occupation].filter(Boolean).join(" · ")}</p>
                        </div>
                      </div>
                      <p className="mt-3 break-words border-t border-[#8b7355]/50 pt-3 text-sm leading-relaxed text-[#3e342a]">{person.publicDescription}</p>
                      <p className="mt-2 text-xs italic text-[#5d4d3d]">First seen in: {person.firstSeenIn}</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <PinButton nodes={boardNodes} onError={(caught) => setError(errorText(caught, "Could not update this pin."))} referenceId={person.id} roomCode={roomCode} type="npc" />
                        {!person.isVictim ? <button className="game-control-button min-h-11 px-3 text-xs uppercase text-[#f1c987]" onClick={() => { play("door"); setSelectedId(person.id); }} type="button">Interview</button> : null}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </div>
      </main>
    </section>
  );
}

function InterviewPanel({ roomCode, person, people }: { roomCode: string; person: Person; people: Person[] }) {
  const interview = useQuery(api.npcConversations.getInterview, { roomCode, npcId: person.id });
  const proof = useQuery(api.npcConversations.listAvailableProof, { roomCode });
  const boardNodes = useQuery(api.clueBoard.getNodes, { roomCode });
  const callToBureau = useMutation(api.npcConversations.callToBureau);
  const sendQuestion = useMutation(api.npcConversations.sendQuestion);
  const readPhone = useMutation(api.npcConversations.readPhone);
  const retryFailed = useMutation(api.npcConversations.retryFailed);
  const [question, setQuestion] = useState("");
  const [shown, setShown] = useState<Proof | null>(null);
  const [trayOpen, setTrayOpen] = useState(false);
  const [phoneOpen, setPhoneOpen] = useState(false);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  const [stamp, setStamp] = useState<"caught" | "missed" | null>(null);
  const lastExposed = useRef<number | null>(null);
  const lastMissed = useRef<number | null>(null);

  // A lie broken by proof gets its moment: stamp and sting.
  useEffect(() => {
    if (!interview) return;
    if (lastExposed.current !== null && interview.exposedLies > lastExposed.current) {
      play("sting");
      window.setTimeout(() => play("stamp"), 150);
      setStamp("caught");
      window.setTimeout(() => setStamp(null), 2600);
    }
    lastExposed.current = interview.exposedLies;
    // Proof that proves nothing gets its own answer once the reply is in: they don't budge.
    const missed = interview.turns.filter((turn) => turn.proofMissed && turn.status === "complete").at(-1)?.sequence ?? -1;
    if (lastMissed.current !== null && missed > lastMissed.current) {
      play("stamp");
      setStamp("missed");
      window.setTimeout(() => setStamp(null), 2200);
    }
    lastMissed.current = missed;
  }, [interview]);

  function run(action: Promise<unknown>, after?: () => void) {
    setWorking(true);
    setError("");
    play("click");
    void action.then(after).catch((caught: unknown) => setError(errorText(caught, "Could not complete that interview action."))).finally(() => setWorking(false));
  }

  if (phoneOpen && interview?.phone?.read) return <DeviceViewer roomCode={roomCode} title={`${person.name}'s phone`} data={{ type: "phone", files: [], calls: interview.phone.calls, messages: interview.phone.messages }} nodes={boardNodes} onBack={() => setPhoneOpen(false)} onPinError={(caught) => setError(errorText(caught, "Could not update this pin."))} busy={working} error={error} />;

  const present = interview?.bureauPresent ?? false;
  const canAsk = Boolean(present && interview && !interview.busy && interview.canTalkHere && !working);
  // Names the type-ahead may finish: only people and objects you already know of, and only once you start typing.
  const knownNames = [
    ...people.filter((other) => other.id !== person.id).map((other) => other.name),
    ...(proof ?? []).filter((entry) => entry.type === "item").map((entry) => entry.label),
  ];

  const waiting = interview?.turns.some((turn) => turn.status === "waiting" || turn.status === "queued" || turn.status === "processing");

  return (
    <div className="relative grid h-full min-h-0 grid-rows-[max-content_minmax(0,1fr)] gap-3 lg:grid-cols-[minmax(16rem,20rem)_minmax(0,1fr)] lg:grid-rows-1 lg:gap-5">
      {/* The one way to catch a lie: Show evidence → pick it in the notebook → Confront. */}
      {trayOpen ? <NotebookOverlay onClose={() => setTrayOpen(false)} onPick={(entry) => { setTrayOpen(false); setShown(entry); }} pickTitle={`Show ${person.name.split(" ")[0]}…`} roomCode={roomCode} /> : null}
      {stamp ? <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center"><p className={`contradiction-stamp px-6 py-3 text-3xl sm:text-5xl ${stamp === "missed" ? "contradiction-stamp--missed" : ""}`}>{stamp === "caught" ? "Contradiction" : "They don't budge"}</p></div> : null}
      <aside className="game-dossier min-h-0 overflow-y-auto p-3 text-[#211d17] lg:p-5">
        <div className="flex items-center gap-3 lg:flex-col lg:items-start">
          <div className="relative w-16 shrink-0 sm:w-20 lg:w-full lg:max-w-[14rem]">
            <CharacterPortrait age={person.age} className="w-full transition" description={person.publicDescription} expression={stamp === "caught" ? "caught" : stamp === "missed" ? "angry" : interview && interview.exposedLies > 0 ? "nervous" : "neutral"} gender={person.gender} id={person.id} />
            <span aria-hidden="true" className="interview-foreground pointer-events-none absolute inset-x-0 bottom-0 hidden h-[36%] lg:block" />
          </div>
          <div className="min-w-0">
            <h3 className="break-words text-lg uppercase leading-tight">{person.name}</h3>
            <p className="mt-1 text-xs italic text-[#5d4d3d]">
              {!present ? "Not here yet." : interview && interview.exposedLies > 0 ? `Shifting in the chair. Caught out ${interview.exposedLies === 1 ? "once" : `${interview.exposedLies} times`}.` : "Sitting across the table."}
            </p>
          </div>
        </div>
        <details className="mt-3 border-t border-[#8b7355] pt-2 text-sm leading-relaxed text-[#4b3b2d] sm:hidden"><summary className="cursor-pointer text-xs uppercase text-red-800">Appearance</summary><p className="mt-2">{person.publicDescription}</p></details>
        <p className="mt-3 hidden border-t border-[#8b7355] pt-3 text-sm leading-relaxed text-[#4b3b2d] sm:block">{person.publicDescription}</p>
        {!present ? (
          <div className="mt-4">
            <button className="game-control-button min-h-11 w-full px-3 text-xs uppercase text-[#f1c987] disabled:opacity-50" disabled={working || !interview?.canTalkHere} onClick={() => run(callToBureau({ roomCode, npcId: person.id }), () => play("door"))} type="button">Have them brought in</button>
            {interview && !interview.canTalkHere ? <p className="mt-2 text-xs">Interviews happen at the bureau. Travel back first.</p> : null}
          </div>
        ) : null}
        {present && interview?.statements.length ? (
          <details className="mt-4 border-t border-[#8b7355] pt-3" open>
            <summary className="cursor-pointer text-xs uppercase tracking-widest text-red-800">Their statement</summary>
            <span className="statement-stamp mt-2">Statement taken</span>
            {interview.statements.map((statement) => (
              <div className="mt-3 border-l-2 border-[#8b7355] pl-3" key={statement.id}>
                <p className="text-sm font-semibold">{statement.title}</p>
                <p className="mt-1 whitespace-pre-wrap text-sm">{statement.text}</p>
                <PinButton className="mt-2" disabled={Boolean(working)} nodes={boardNodes} onError={(caught) => setError(errorText(caught, "Could not update this pin."))} referenceId={statement.id} roomCode={roomCode} type="statement" />
              </div>
            ))}
          </details>
        ) : null}
      </aside>

      <section aria-label={`Interview with ${person.name}`} className="flex min-h-0 flex-col border border-[#6f9f98]/30 bg-[#09191c]/95 text-[#e4e6d8]">
        <FirstTimeTip id="interview" title="Questioning">Type a question; each takes 3 minutes. Ask where they were to take their statement. To catch a lie: Show evidence, pick what proves them wrong, then Confront.</FirstTimeTip>
        {interview?.threadId ? <ConversationMessages name={person.name} roomCode={roomCode} threadId={interview.threadId} /> : <div className="flex min-h-0 flex-1 items-center justify-center p-4 text-center text-sm text-[#c8d8d2]/60">{present ? `${person.name} is shown in and sits down.` : "The chair across the table is empty."}</div>}
        {waiting ? <p className="px-4 py-2 text-sm italic text-[#e8ac51]" role="status">{person.name} is thinking<span className="animate-pulse">...</span></p> : null}
        {interview?.turns.at(-1)?.status === "failed" ? <div className="px-4 py-2 text-sm text-red-200" role="alert"><p>That answer was lost. Asking again costs no time.</p><button className="mt-2 min-h-10 border border-red-400 px-3 text-xs uppercase disabled:opacity-50" disabled={working} onClick={() => run(retryFailed({ roomCode, npcId: person.id }))} type="button">Ask again</button></div> : null}
        {present && interview ? (
          <form className="relative border-t border-[#6f9f98]/45 p-3 sm:p-4" onSubmit={(event) => {
            event.preventDefault();
            const body = question.trim() || (shown ? "How do you explain this?" : "");
            if (!body) return;
            run(sendQuestion({ roomCode, npcId: person.id, question: body, ...(shown ? { proofReference: { type: shown.type, referenceId: shown.referenceId } } : {}) }), () => { setQuestion(""); setShown(null); setTrayOpen(false); });
          }}>
            <div className="mb-2 flex flex-wrap gap-2">
              {interview.phone?.acquired && !interview.phone.read ? <button className="min-h-9 border border-[#e8ac51]/70 px-2 text-xs uppercase text-[#f1c987] disabled:opacity-45" disabled={!canAsk} onClick={() => run(readPhone({ roomCode, npcId: person.id }))} type="button">Go through their phone · 5 min</button> : null}
              {interview.phone?.read ? <button className="min-h-9 border border-[#e8ac51]/70 px-2 text-xs uppercase text-[#f1c987]" onClick={() => setPhoneOpen(true)} type="button">Open their phone</button> : null}
            </div>
            {shown ? <div className="mb-2 flex items-start justify-between gap-2 border-l-2 border-[#e8ac51] bg-[#1c2d2d] px-3 py-2 text-xs"><span className="min-w-0 break-words"><span className="uppercase text-[#e8ac51]">Showing · </span>{shown.label}. Press Confront.</span><button className="shrink-0 text-[#e8ac51]" onClick={() => setShown(null)} type="button">Take back</button></div> : null}
            <label className="sr-only" htmlFor="interview-question">Ask a question</label>
            <textarea className="min-h-16 w-full resize-y border border-[#45635d] bg-[#102326] p-3 text-base text-[#e4e6d8] outline-none focus:border-[#e8ac51]" id="interview-question" maxLength={500} onChange={(event) => setQuestion(event.target.value)} placeholder={shown ? "Add what you want to say (optional)..." : `Ask ${person.name.split(" ")[0]} anything...`} value={question} />
            <TypeAhead names={knownNames} onPick={setQuestion} value={question} />
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <button aria-expanded={trayOpen} className="game-control-button flex min-h-11 items-center gap-2 px-4 text-xs uppercase text-[#f1c987]" onClick={() => { play("open"); setTrayOpen(!trayOpen); }} title="Show something you found" type="button"><GameIcon className="size-6" name="records" />Show evidence</button>
              <button className="game-control-button min-h-11 px-4 text-xs uppercase text-[#f1c987] disabled:opacity-50" disabled={!canAsk || (!question.trim() && !shown)} type="submit"><ControlIcon name="play" />{shown ? "Confront · 3 min" : "Ask · 3 min"}</button>
              {!interview.canTalkHere ? <p className="text-xs text-red-200">Return to the bureau to continue.</p> : null}
            </div>
          </form>
        ) : null}
        {error ? <p className="mx-3 mb-3 border border-red-400 bg-red-950 p-3 text-sm text-red-50" role="alert">{error}</p> : null}
      </section>
    </div>
  );
}

/** A saved question reads "Name asks: …" plus an optional shown-evidence block; split it for a clean transcript. */
function detectiveLine(text: string) {
  const match = text.match(/^(.+?) asks: ([\s\S]*?)(?:\nShows evidence from the shared case file: ([\s\S]*))?$/);
  return match ? { speaker: match[1], question: match[2], shown: match[3]?.split("\n")[0] } : { speaker: "Detective", question: text, shown: undefined };
}

function ConversationMessages({ roomCode, threadId, name }: { roomCode: string; threadId: string; name: string }) {
  const { results, status, loadMore } = useUIMessages(api.npcConversations.listMessages, { roomCode, threadId }, { initialNumItems: 30, stream: true });
  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; }, [results.length]);
  return (
    <div aria-label="Shared interview conversation" className="interview-transcript min-h-0 flex-1 space-y-3 overflow-y-auto px-5 py-6 text-[#31271f] sm:px-8" ref={scrollRef}>
      {status === "CanLoadMore" ? <button className="min-h-10 border border-[#8b7355] px-3 text-xs uppercase" onClick={() => loadMore(30)} type="button">Earlier conversation</button> : null}
      {results.length ? results.map((message) => {
        const asked = message.role === "user" ? detectiveLine(message.text) : null;
        return (
        <div className={`border-b border-[#8b7355]/30 py-3 text-sm leading-relaxed ${message.role === "user" ? "pl-0 text-[#6e3529]" : "pl-4"}`} key={message.key}>
          <p className="mb-1 text-xs uppercase tracking-widest text-[#8a6043]">{asked ? `${asked.speaker} asks` : name}{message.status === "streaming" ? " · speaking" : ""}</p>
          {asked ? <>
            <p className="whitespace-pre-wrap">{asked.question}</p>
            {asked.shown ? <p className="mt-2 border-l-2 border-[#9a573e] pl-2 text-xs text-[#5d4d3d]"><span className="uppercase text-[#8b1d1d]">Shows · </span>{asked.shown}</p> : null}
          </> : <p className="whitespace-pre-wrap">{message.text}</p>}
        </div>
        );
      }) : <p className="text-sm italic text-[#5d4d3d]">{name} is shown in and sits down, waiting.</p>}
    </div>
  );
}

function Message({ message, onBack }: { message: string; onBack: () => void }) {
  return (
    <section className="game-interview-scene absolute inset-0 z-20 flex items-center justify-center p-4 text-[#211d17]">
      <div className="game-dossier w-full max-w-lg px-6 pb-20 pt-20 text-center sm:px-10">
        <GameIcon className="mx-auto size-12" name="interview" />
        <p className="mt-4 text-lg uppercase leading-snug">{message}</p>
        <button className="game-control-button mt-6 min-h-11 w-full px-4 uppercase sm:w-auto" onClick={onBack} type="button"><ControlIcon name="back" />Leave the room</button>
      </div>
    </section>
  );
}
