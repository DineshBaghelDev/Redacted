"use client";

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
import { DeviceViewer } from "./device-viewer";

type Person = NonNullable<FunctionReturnType<typeof api.npcs.list>>[number];
type Proof = FunctionReturnType<typeof api.npcConversations.listAvailableProof>[number];

export function InterrogationScreen({ roomCode, onBack }: { roomCode: string; onBack: () => void }) {
  const { isLoaded, isSignedIn } = useAuth();
  const people = useQuery(api.npcs.list, isLoaded && isSignedIn ? { roomCode } : "skip");
  const boardNodes = useQuery(api.clueBoard.getNodes, isLoaded && isSignedIn ? { roomCode } : "skip");
  const createReference = useMutation(api.clueBoard.createReferenceNode);
  const [pinning, setPinning] = useState("");
  const [error, setError] = useState("");
  const [selectedId, setSelectedId] = useState<Id<"npcs"> | null>(null);

  function pinPerson(referenceId: string) {
    const count = boardNodes?.length ?? 0;
    setPinning(referenceId);
    setError("");
    void createReference({ roomCode, type: "npc", referenceId, x: 80 + (count % 4) * 220, y: 90 + Math.floor(count / 4) * 180 })
      .catch((caught: unknown) => setError(caught instanceof Error ? caught.message : "Could not pin this person."))
      .finally(() => setPinning(""));
  }

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
        <button className="min-h-11 shrink-0 border border-[#6f9f98] px-3 py-2 text-sm uppercase hover:border-[#e8ac51] hover:text-[#e8ac51]" onClick={selected ? () => setSelectedId(null) : onBack} type="button">
          {selected ? "End interview" : "Leave the room"}
        </button>
      </header>
      <main className={`game-station-main min-h-0 flex-1 p-3 sm:p-6 lg:p-8 ${selected ? "overflow-hidden" : "overflow-y-auto"}`}>
        <div className={`mx-auto max-w-6xl ${selected ? "h-full" : ""}`}>
          {error ? <p className="mb-4 border-2 border-red-800 bg-red-950/90 p-3 text-sm text-red-100" role="alert">{error}</p> : null}
          {selected ? <InterviewPanel key={selected.id} people={people} person={selected} roomCode={roomCode} /> : (
            <>
              <p className="max-w-2xl text-sm leading-relaxed text-[#c8d8d2]">
                Only people your investigation has come across are on file. Find names in messages, records, and statements to add more.
              </p>
              <ul className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {people.map((person) => {
                  const pinned = boardNodes?.some((node) => node.type === "npc" && node.referenceId === person.id);
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
                        <button className="min-h-11 border-2 border-[#573821] px-3 text-xs uppercase hover:bg-[#573821] hover:text-[#f4ead2] disabled:opacity-55" disabled={pinning === person.id || pinned} onClick={() => pinPerson(person.id)} type="button">{pinned ? "Pinned" : "Pin to clueboard"}</button>
                        {!person.isVictim ? <button className="min-h-11 border-2 border-red-900 bg-red-950 px-3 text-xs uppercase text-red-50 hover:bg-red-900" onClick={() => { play("door"); setSelectedId(person.id); }} type="button">Interview</button> : null}
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
  const createReference = useMutation(api.clueBoard.createReferenceNode);
  const retryFailed = useMutation(api.npcConversations.retryFailed);
  const [question, setQuestion] = useState("");
  const [shown, setShown] = useState<Proof | null>(null);
  const [trayOpen, setTrayOpen] = useState(false);
  const [phoneOpen, setPhoneOpen] = useState(false);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  const [stamp, setStamp] = useState(false);
  const lastExposed = useRef<number | null>(null);

  // A lie broken by proof gets its moment: stamp and sting.
  useEffect(() => {
    if (!interview) return;
    if (lastExposed.current !== null && interview.exposedLies > lastExposed.current) {
      play("sting");
      window.setTimeout(() => play("stamp"), 150);
      setStamp(true);
      window.setTimeout(() => setStamp(false), 2600);
    }
    lastExposed.current = interview.exposedLies;
  }, [interview]);

  function run(action: Promise<unknown>, after?: () => void) {
    setWorking(true);
    setError("");
    play("click");
    void action.then(after).catch((caught: unknown) => setError(caught instanceof Error ? caught.message : "Could not complete that interview action.")).finally(() => setWorking(false));
  }

  function pinRecord(type: "device_file" | "call" | "message" | "statement", referenceId: string) {
    const count = boardNodes?.length ?? 0;
    run(createReference({ roomCode, type, referenceId, x: 80 + (count % 4) * 220, y: 90 + Math.floor(count / 4) * 180 }));
  }

  if (phoneOpen && interview?.phone?.read) return <DeviceViewer title={`${person.name}'s phone`} data={{ type: "phone", files: [], calls: interview.phone.calls, messages: interview.phone.messages }} onBack={() => setPhoneOpen(false)} onPin={pinRecord} isPinned={(type, id) => boardNodes?.some((node) => node.type === type && node.referenceId === id) ?? false} busy={working} error={error} />;

  const present = interview?.bureauPresent ?? false;
  const canAsk = Boolean(present && interview && !interview.busy && interview.canTalkHere && !working);
  // Topics come only from your own discoveries: people you know of and objects you have found.
  const topics = [
    ...people.filter((other) => other.id !== person.id).map((other) => other.name),
    ...(proof ?? []).filter((entry) => entry.type === "item").map((entry) => entry.label),
  ].slice(0, 14);
  const waiting = interview?.turns.some((turn) => turn.status === "waiting" || turn.status === "queued" || turn.status === "processing");

  return (
    <div className="relative grid h-full min-h-0 grid-rows-[max-content_minmax(0,1fr)] gap-3 lg:grid-cols-[minmax(16rem,20rem)_minmax(0,1fr)] lg:grid-rows-1 lg:gap-5">
      {stamp ? <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center"><p className="contradiction-stamp px-6 py-3 text-3xl sm:text-5xl">Contradiction</p></div> : null}
      <aside className="game-dossier min-h-0 overflow-y-auto p-3 text-[#211d17] lg:p-5">
        <div className="flex items-center gap-3 lg:flex-col lg:items-start">
          <CharacterPortrait age={person.age} className={`w-20 transition lg:w-full lg:max-w-[14rem] ${interview && interview.exposedLies > 0 ? "saturate-150 sepia-[.2]" : ""}`} description={person.publicDescription} gender={person.gender} id={person.id} />
          <div className="min-w-0">
            <h3 className="break-words text-lg uppercase leading-tight">{person.name}</h3>
            <p className="mt-1 text-xs italic text-[#5d4d3d]">
              {!present ? "Not here yet." : interview && interview.exposedLies > 0 ? `Shifting in the chair. Caught out ${interview.exposedLies === 1 ? "once" : `${interview.exposedLies} times`}.` : "Sitting across the table."}
            </p>
          </div>
        </div>
        <p className="mt-3 border-t border-[#8b7355] pt-3 text-sm leading-relaxed text-[#4b3b2d]">{person.publicDescription}</p>
        {!present ? (
          <div className="mt-4">
            <button className="min-h-11 w-full border-2 border-red-900 bg-red-950 px-3 text-xs uppercase text-red-50 disabled:opacity-50" disabled={working || !interview?.canTalkHere} onClick={() => run(callToBureau({ roomCode, npcId: person.id }), () => play("door"))} type="button">Have them brought in</button>
            {interview && !interview.canTalkHere ? <p className="mt-2 text-xs">Interviews happen at the bureau. Travel back first.</p> : null}
          </div>
        ) : null}
        {present && interview?.statements.length ? (
          <details className="mt-4 border-t border-[#8b7355] pt-3" open>
            <summary className="cursor-pointer text-xs uppercase tracking-widest text-red-800">Their statement</summary>
            {interview.statements.map((statement) => (
              <div className="mt-3 border-l-2 border-[#8b7355] pl-3" key={statement.id}>
                <p className="text-sm font-semibold">{statement.title}</p>
                <p className="mt-1 whitespace-pre-wrap text-sm">{statement.text}</p>
                <button className="mt-2 min-h-9 border border-[#573821] px-2 text-xs uppercase disabled:opacity-50" disabled={boardNodes?.some((node) => node.type === "statement" && node.referenceId === statement.id)} onClick={() => pinRecord("statement", statement.id)} type="button">Pin</button>
              </div>
            ))}
          </details>
        ) : null}
      </aside>

      <section aria-label={`Interview with ${person.name}`} className="flex min-h-0 flex-col border border-[#6f9f98]/30 bg-[#09191c]/95 text-[#e4e6d8]">
        {interview?.threadId ? <ConversationMessages name={person.name} roomCode={roomCode} threadId={interview.threadId} /> : <div className="flex min-h-0 flex-1 items-center justify-center p-4 text-center text-sm text-[#c8d8d2]/60">{present ? `${person.name} is shown in and sits down.` : "The chair across the table is empty."}</div>}
        {waiting ? <p className="px-4 py-2 text-sm italic text-[#e8ac51]" role="status">{person.name} is thinking<span className="animate-pulse">...</span></p> : null}
        {interview?.turns.at(-1)?.status === "failed" ? <div className="px-4 py-2 text-sm text-red-200" role="alert"><p>That answer was lost. Asking again costs no time.</p><button className="mt-2 min-h-10 border border-red-400 px-3 text-xs uppercase disabled:opacity-50" disabled={working} onClick={() => run(retryFailed({ roomCode, npcId: person.id }))} type="button">Ask again</button></div> : null}
        {present && interview ? (
          <form className="border-t border-[#6f9f98]/45 p-3 sm:p-4" onSubmit={(event) => {
            event.preventDefault();
            const body = question.trim() || (shown ? "How do you explain this?" : "");
            if (!body) return;
            run(sendQuestion({ roomCode, npcId: person.id, question: body, ...(shown ? { proofReference: { type: shown.type, referenceId: shown.referenceId } } : {}) }), () => { setQuestion(""); setShown(null); setTrayOpen(false); });
          }}>
            <div className="mb-2 flex flex-wrap gap-2">
              {interview.statementStatus === null ? <button className="min-h-9 border border-[#6f9f98]/60 px-2 text-xs uppercase disabled:opacity-45" disabled={!canAsk} onClick={() => run(sendQuestion({ roomCode, npcId: person.id, question: "What did you see that day?", requestStatements: true }))} type="button">&quot;What did you see?&quot;</button> : null}
              {interview.phone && !interview.phone.acquired && !interview.phone.requesting ? <button className="min-h-9 border border-[#6f9f98]/60 px-2 text-xs uppercase disabled:opacity-45" disabled={!canAsk} onClick={() => run(sendQuestion({ roomCode, npcId: person.id, question: "I need to look at your phone.", requestPhone: true }))} type="button">&quot;Hand me your phone.&quot;</button> : null}
              {interview.phone?.acquired && !interview.phone.read ? <button className="min-h-9 border border-[#e8ac51]/70 px-2 text-xs uppercase text-[#f1c987] disabled:opacity-45" disabled={!canAsk} onClick={() => run(readPhone({ roomCode, npcId: person.id }))} type="button">Go through their phone · 5 min</button> : null}
              {interview.phone?.read ? <button className="min-h-9 border border-[#e8ac51]/70 px-2 text-xs uppercase text-[#f1c987]" onClick={() => setPhoneOpen(true)} type="button">Open their phone</button> : null}
            </div>
            {topics.length ? (
              <div className="mb-2 flex gap-1 overflow-x-auto pb-1" aria-label="Ask about">
                {topics.map((topic) => <button className="shrink-0 border border-[#45635d] px-2 py-1 text-xs text-[#a5c6bb] hover:border-[#e8ac51] hover:text-[#e8ac51]" key={topic} onClick={() => setQuestion(`What can you tell me about ${topic}?`)} type="button">{topic}</button>)}
              </div>
            ) : null}
            {shown ? <div className="mb-2 flex items-start justify-between gap-2 border-l-2 border-[#e8ac51] bg-[#1c2d2d] px-3 py-2 text-xs"><span className="min-w-0 break-words">On the table: {shown.label}</span><button className="shrink-0 text-[#e8ac51]" onClick={() => setShown(null)} type="button">Take back</button></div> : null}
            <label className="sr-only" htmlFor="interview-question">Ask a question</label>
            <textarea className="min-h-16 w-full resize-y border border-[#45635d] bg-[#102326] p-3 text-base text-[#e4e6d8] outline-none focus:border-[#e8ac51]" id="interview-question" maxLength={500} onChange={(event) => setQuestion(event.target.value)} placeholder={`Ask ${person.name.split(" ")[0]} anything...`} value={question} />
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <button aria-expanded={trayOpen} className="min-h-11 border border-[#e8ac51]/70 px-3 text-xs uppercase text-[#f1c987]" onClick={() => setTrayOpen(!trayOpen)} type="button">Show evidence</button>
              <button className="min-h-11 bg-[#e8ac51] px-4 text-xs uppercase text-[#071014] hover:bg-[#f1c987] disabled:opacity-50" disabled={!canAsk || (!question.trim() && !shown)} type="submit">{shown ? "Confront · 3 min" : "Ask · 3 min"}</button>
              {!interview.canTalkHere ? <p className="text-xs text-red-200">Return to the bureau to continue.</p> : null}
            </div>
            {trayOpen ? (
              <div aria-label="Your evidence" className="mt-2 max-h-48 overflow-y-auto border-t border-[#6f9f98]/45 pt-2">
                {proof?.length ? <div className="grid gap-1 sm:grid-cols-2">{proof.map((entry) => <button aria-pressed={shown?.referenceId === entry.referenceId} className="min-h-10 border border-[#45635d] px-2 py-1 text-left text-xs aria-pressed:border-[#e8ac51] aria-pressed:text-[#f1c987]" key={`${entry.type}:${entry.referenceId}`} onClick={() => { setShown(entry); setTrayOpen(false); }} type="button">{entry.label}</button>)}</div> : <p className="text-sm text-[#c8d8d2]/70">You have nothing to show yet.</p>}
              </div>
            ) : null}
          </form>
        ) : null}
        {error ? <p className="mx-3 mb-3 border border-red-400 bg-red-950 p-3 text-sm text-red-50" role="alert">{error}</p> : null}
      </section>
    </div>
  );
}

function ConversationMessages({ roomCode, threadId, name }: { roomCode: string; threadId: string; name: string }) {
  const { results, status, loadMore } = useUIMessages(api.npcConversations.listMessages, { roomCode, threadId }, { initialNumItems: 30, stream: true });
  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; }, [results.length]);
  return (
    <div aria-label="Shared interview conversation" className="min-h-0 flex-1 space-y-3 overflow-y-auto px-3 py-4 sm:px-5" ref={scrollRef}>
      {status === "CanLoadMore" ? <button className="min-h-10 border border-[#8b7355] px-3 text-xs uppercase" onClick={() => loadMore(30)} type="button">Earlier conversation</button> : null}
      {results.length ? results.map((message) => (
        <div className={`max-w-[88%] border-l-4 p-3 text-sm leading-relaxed ${message.role === "user" ? "ml-auto border-[#e8ac51] bg-[#273735]" : "border-[#6f9f98] bg-[#13292b]"}`} key={message.key}>
          <p className="mb-1 text-xs uppercase tracking-widest text-[#e8ac51]">{message.role === "user" ? "Detective" : name}{message.status === "streaming" ? " · speaking" : ""}</p>
          <p className="whitespace-pre-wrap">{message.text}</p>
        </div>
      )) : <p className="text-sm italic text-[#c8d8d2]/60">{name} is shown in and sits down, waiting.</p>}
    </div>
  );
}

function Message({ message, onBack }: { message: string; onBack: () => void }) {
  return (
    <section className="game-interview-scene absolute inset-0 z-20 flex items-center justify-center p-4 text-[#211d17]">
      <div className="game-dossier w-full max-w-lg px-6 pb-20 pt-20 text-center sm:px-10">
        <GameIcon className="mx-auto size-12" name="interview" />
        <p className="mt-4 text-lg uppercase leading-snug">{message}</p>
        <button className="mt-6 min-h-11 w-full border-2 border-[#573821] px-4 py-2 uppercase hover:bg-[#573821] hover:text-[#f4ead2] sm:w-auto" onClick={onBack} type="button">Leave the room</button>
      </div>
    </section>
  );
}
