"use client";

import { useAuth } from "@clerk/nextjs";
import { useUIMessages } from "@convex-dev/agent/react";
import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";

const roleLabels = {
  victim: "Victim",
  suspect: "Person of interest",
  witness: "Witness",
} as const;

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
    void createReference({
      roomCode,
      type: "npc",
      referenceId,
      x: 80 + (count % 4) * 220,
      y: 90 + (Math.floor(count / 4) % 4) * 180,
    }).catch((caught: unknown) => {
      setError(caught instanceof Error ? caught.message : "Could not pin this person.");
    }).finally(() => setPinning(""));
  }

  if (people === undefined) return <Message message="Opening interview files..." onBack={onBack} />;
  if (!people) return <Message message="Interview files are unavailable for this room." onBack={onBack} />;
  const selected = people.find((person) => person.id === selectedId);

  return (
    <section className="absolute inset-0 z-20 flex flex-col overflow-hidden bg-[#090807] text-[#211d17]">
      <header className="flex shrink-0 items-center justify-between gap-4 border-b-4 border-[#573821] bg-[#d8c8a7] px-4 py-3 sm:px-6">
        <div>
          <p className="text-[10px] uppercase tracking-[0.25em] text-red-900/70">Bureau interview desk</p>
          <h2 className="mt-1 text-xl uppercase tracking-wide sm:text-2xl">{selected ? selected.name : "People in this case"}</h2>
        </div>
        <button className="min-h-11 border-2 border-[#573821] px-3 py-2 text-sm uppercase hover:bg-[#573821] hover:text-[#f4ead2]" onClick={onBack} type="button">
          Back
        </button>
      </header>

      <main className="min-h-0 flex-1 overflow-y-auto bg-[linear-gradient(rgba(35,27,20,0.06)_1px,transparent_1px)] bg-[size:100%_2rem] p-4 sm:p-6 lg:p-8">
        <div className="mx-auto max-w-6xl">
          {error ? <p className="mb-4 border-2 border-red-800 bg-red-950/90 p-3 text-sm text-red-100" role="alert">{error}</p> : null}
          {selected ? <InterviewPanel key={selected.id} roomCode={roomCode} person={selected} onBack={() => setSelectedId(null)} /> : <div className="flex flex-wrap items-end justify-between gap-3 border-b-2 border-[#573821] pb-4">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-red-900">Case roster</p>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#3e342a]">
                Review the known people before arranging an interview. A person must be present before questions can begin.
              </p>
            </div>
            <span className="border border-[#8b5b38] bg-[#e9dfc5] px-3 py-1 font-mono text-xs uppercase">{people.length} files</span>
          </div>}

          {!selected && people.length ? (
            <ul className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {people.map((person, index) => (
                <li className="relative min-h-48 rotate-[0.15deg] border-2 border-[#8b7355] bg-[#e9dfc5] p-5 shadow-[5px_5px_0_rgba(38,26,17,0.22)]" key={person.id}>
                  <span className="absolute right-3 top-3 font-mono text-xs text-[#725f42]">#{String(index + 1).padStart(2, "0")}</span>
                  <p className="text-[10px] uppercase tracking-[0.2em] text-red-800">{roleLabels[person.role]}</p>
                  <h3 className="mt-2 pr-10 text-2xl uppercase leading-none">{person.name}</h3>
                  <p className="mt-3 text-sm uppercase text-[#5d4d3d]">
                    {[person.age ? `Age ${person.age}` : null, person.occupation].filter(Boolean).join(" · ") || "No public occupation"}
                  </p>
                  <p className="mt-5 border-t border-[#8b7355]/50 pt-4 text-sm leading-relaxed text-[#3e342a]">{person.publicDescription}</p>
                  <button
                    className="mt-4 min-h-11 border-2 border-[#573821] px-3 text-xs uppercase hover:bg-[#573821] hover:text-[#f4ead2] disabled:cursor-default disabled:opacity-55"
                    disabled={pinning === person.id || boardNodes?.some((node) => node.type === "npc" && node.referenceId === person.id)}
                    onClick={() => pinPerson(person.id)}
                    type="button"
                  >
                    {pinning === person.id ? "Pinning..." : boardNodes?.some((node) => node.type === "npc" && node.referenceId === person.id) ? "Pinned to clueboard" : "Pin to clueboard"}
                  </button>
                  {person.role !== "victim" ? <button className="ml-2 mt-4 min-h-11 border-2 border-red-900 bg-red-950 px-3 text-xs uppercase text-red-50 hover:bg-red-900" onClick={() => setSelectedId(person.id)} type="button">Interview</button> : null}
                </li>
              ))}
            </ul>
          ) : !selected ? (
            <div className="mt-5 border-2 border-dashed border-[#8b7355] bg-[#e9dfc5]/70 p-8 text-center uppercase text-[#5d4d3d]">
              No interview files are available yet.
            </div>
          ) : null}
        </div>
      </main>
    </section>
  );
}

function InterviewPanel({ roomCode, person, onBack }: { roomCode: string; person: { id: Id<"npcs">; name: string; publicDescription: string }; onBack: () => void }) {
  const interview = useQuery(api.npcConversations.getInterview, { roomCode, npcId: person.id });
  const boardNodes = useQuery(api.clueBoard.getNodes, { roomCode });
  const proofCards = boardNodes?.filter((node) => node.type === "item" || node.type === "forensic" || node.type === "cctv" || node.type === "public_record" || node.type === "device_file" || node.type === "call" || node.type === "message") ?? [];
  const callToBureau = useMutation(api.npcConversations.callToBureau);
  const sendQuestion = useMutation(api.npcConversations.sendQuestion);
  const retryFailed = useMutation(api.npcConversations.retryFailed);
  const [question, setQuestion] = useState("");
  const [proofNodeId, setProofNodeId] = useState<Id<"clueBoardNodes"> | "">("");
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");

  function run(action: Promise<unknown>, after?: () => void) {
    setWorking(true);
    setError("");
    void action.then(after).catch((caught: unknown) => setError(caught instanceof Error ? caught.message : "Could not complete that interview action.")).finally(() => setWorking(false));
  }

  return <div className="mx-auto max-w-3xl">
    <button className="min-h-11 border-2 border-[#573821] px-4 text-xs uppercase hover:bg-[#573821] hover:text-[#f4ead2]" onClick={onBack} type="button">← All people</button>
    <div className="mt-4 border-2 border-[#8b7355] bg-[#e9dfc5] p-4 sm:p-6">
      <p className="text-xs uppercase tracking-[0.2em] text-red-800">Interview record</p>
      <h3 className="mt-2 text-2xl uppercase">{person.name}</h3>
      <p className="mt-2 text-sm leading-relaxed text-[#4b3b2d]">{person.publicDescription}</p>
      {!interview?.bureauPresent ? <div className="mt-5 border-t border-[#8b7355] pt-4"><p className="text-sm">Bring this person to the bureau before asking questions.</p><button className="mt-3 min-h-11 border-2 border-red-900 bg-red-950 px-4 text-xs uppercase text-red-50 hover:bg-red-900 disabled:opacity-50" disabled={working || !interview?.canTalkHere} onClick={() => run(callToBureau({ roomCode, npcId: person.id }))} type="button">Call to bureau</button>{interview && !interview.canTalkHere ? <p className="mt-2 text-sm text-red-800">Return to the bureau to make the call.</p> : null}</div> : null}
      {interview?.threadId ? <ConversationMessages roomCode={roomCode} threadId={interview.threadId} /> : null}
      {interview?.bureauPresent ? <form className="mt-5 border-t border-[#8b7355] pt-4" onSubmit={(event) => { event.preventDefault(); const body = question.trim(); if (!body) return; run(sendQuestion({ roomCode, npcId: person.id, question: body, proofNodeId: proofNodeId || undefined }), () => { setQuestion(""); setProofNodeId(""); }); }}>
        <label className="block text-xs uppercase tracking-widest text-red-800" htmlFor="interview-question">Ask a question · 3 game min</label>
        <textarea className="mt-2 min-h-24 w-full resize-y border-2 border-[#8b7355] bg-[#f7efdc] p-3 text-base outline-none focus:border-red-900" id="interview-question" maxLength={500} onChange={(event) => setQuestion(event.target.value)} placeholder="What were you doing that night?" value={question} />
        <label className="mt-3 block text-xs uppercase tracking-widest text-red-800" htmlFor="interview-proof">Show proof (optional)</label>
        <select className="mt-2 min-h-11 w-full border-2 border-[#8b7355] bg-[#f7efdc] px-3 text-sm" id="interview-proof" onChange={(event) => setProofNodeId(event.target.value as Id<"clueBoardNodes"> | "")} value={proofNodeId}>
          <option value="">No proof</option>
          {proofCards.map((node) => <option key={node._id} value={node._id}>{node.text.split("\n")[0]}</option>)}
        </select>
        {!proofCards.length ? <p className="mt-2 text-xs text-[#725f42]">Pin found evidence to the clueboard to show it here.</p> : null}
        <button className="mt-2 min-h-11 border-2 border-red-900 bg-red-950 px-5 text-xs uppercase text-red-50 hover:bg-red-900 disabled:opacity-50" disabled={working || interview.busy || !interview.canTalkHere || !question.trim()} type="submit">{interview.busy ? "Finish current action" : "Ask question"}</button>
        {!interview.canTalkHere ? <p className="mt-2 text-sm text-red-800">Return to the bureau to continue this interview.</p> : null}
      </form> : null}
      {interview?.turns.some((turn) => turn.status === "waiting" || turn.status === "queued" || turn.status === "processing") ? <p className="mt-3 text-sm text-[#6d4a26]" role="status">The next answer is on its way.</p> : null}
      {interview?.turns.at(-1)?.status === "failed" ? <div className="mt-3 text-sm text-red-800" role="alert"><p>That answer could not be delivered. Retrying costs no game time.</p><button className="mt-2 min-h-10 border border-red-900 px-3 text-xs uppercase disabled:opacity-50" disabled={working} onClick={() => run(retryFailed({ roomCode, npcId: person.id }))} type="button">Retry answer</button></div> : null}
      {error ? <p className="mt-3 border border-red-900 bg-red-950 p-3 text-sm text-red-50" role="alert">{error}</p> : null}
    </div>
  </div>;
}

function ConversationMessages({ roomCode, threadId }: { roomCode: string; threadId: string }) {
  const { results, status, loadMore } = useUIMessages(api.npcConversations.listMessages, { roomCode, threadId }, { initialNumItems: 30, stream: true });
  return <div aria-label="Shared interview conversation" className="mt-5 max-h-80 space-y-3 overflow-y-auto border-y border-[#8b7355] py-4">
    {status === "CanLoadMore" ? <button className="min-h-10 border border-[#8b7355] px-3 text-xs uppercase" onClick={() => loadMore(30)} type="button">Earlier conversation</button> : null}
    {results.length ? results.map((message) => <div className={`max-w-[92%] border-l-4 p-3 text-sm leading-relaxed ${message.role === "user" ? "ml-auto border-red-800 bg-[#f5eddb]" : "border-[#8b7355] bg-[#e0d3b7]"}`} key={message.key}><p className="mb-1 text-[10px] uppercase tracking-widest text-[#725f42]">{message.role === "user" ? "Detective" : "Reply"}{message.status === "streaming" ? " · speaking" : ""}</p><p className="whitespace-pre-wrap">{message.text}</p></div>) : <p className="text-sm text-[#725f42]">No questions asked yet.</p>}
  </div>;
}

function Message({ message, onBack }: { message: string; onBack: () => void }) {
  return (
    <section className="absolute inset-0 z-20 flex items-center justify-center bg-[#090807] p-4 text-[#211d17]">
      <div className="w-full max-w-lg border-4 border-[#8b5b38] bg-[#e9dfc5] p-6 text-center shadow-[8px_8px_0_rgba(0,0,0,0.45)]">
        <p className="text-lg uppercase">{message}</p>
        <button className="mt-5 border-2 border-[#573821] px-4 py-2 uppercase hover:bg-[#573821] hover:text-[#f4ead2]" onClick={onBack} type="button">Back to bureau</button>
      </div>
    </section>
  );
}
