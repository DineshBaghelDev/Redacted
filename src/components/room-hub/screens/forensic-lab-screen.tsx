"use client";

import { FirstTimeTip } from "../first-time-tip";
import { useAuth } from "@clerk/nextjs";
import { useMutation } from "convex/react";
import { useQuery } from "convex-helpers/react/cache";
import { useEffect, useState } from "react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { formatDuration, formatGameMinute } from "../../../lib/game-time";
import { play } from "../../../lib/sound";
import { InvestigationIcon } from "../investigation-icon";

const testNames: Record<string, string> = {
  fingerprint: "Fingerprints",
  footprint: "Footprints",
  dna: "DNA",
  blood: "Blood",
  toxicology: "Toxicology",
  fiber: "Fibres",
  ballistics: "Ballistics",
  autopsy: "Autopsy",
};

export function ForensicLabScreen({ roomCode, onBack }: { roomCode: string; onBack: () => void }) {
  const { isLoaded, isSignedIn } = useAuth();
  const lab = useQuery(api.forensics.getLab, isLoaded && isSignedIn ? { roomCode } : "skip");
  const boardNodes = useQuery(api.clueBoard.getNodes, isLoaded && isSignedIn ? { roomCode } : "skip");
  const requestTest = useMutation(api.forensics.request);
  const markViewed = useMutation(api.forensics.markViewed);
  const createReference = useMutation(api.clueBoard.createReferenceNode);
  const finishAction = useMutation(api.investigation.finishAction);
  const [sourceKey, setSourceKey] = useState("victim");
  const [working, setWorking] = useState("");
  const [now, setNow] = useState(0);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!lab || lab.clock.clockStartedAt === null) return;
    let finishing = false;
    const update = () => {
      const timestamp = Date.now();
      setNow(timestamp);
      const gameTime = lab.clock.gameTime + Math.max(0, Math.floor((timestamp - lab.clock.clockStartedAt!) / lab.clock.minuteMs));
      if (!lab.action || gameTime < lab.action.completeGameTime || finishing) return;
      finishing = true;
      void finishAction({ roomCode }).catch((caught: unknown) => {
        finishing = false;
        setError(caught instanceof Error ? caught.message : "Could not finish the lab work.");
      });
    };
    update();
    const interval = window.setInterval(update, 100);
    return () => window.clearInterval(interval);
  }, [lab, finishAction, roomCode]);

  if (lab === undefined) return <LabMessage message="Opening the forensic lab..." onBack={onBack} />;
  if (!lab) return <LabMessage message="The forensic lab is not available here." onBack={onBack} />;
  const gameTime = lab.clock.gameTime + (lab.clock.clockStartedAt === null || now === 0
    ? 0 : Math.max(0, Math.floor((now - lab.clock.clockStartedAt) / lab.clock.minuteMs)));
  const source = lab.sources.find((item) => item.key === sourceKey) ?? lab.sources[0];

  function run(id: string, action: Promise<unknown>, cue: "click" | "stamp" = "click") {
    setWorking(id);
    setError("");
    play(cue);
    void action.catch((caught: unknown) => {
      setError(caught instanceof Error ? caught.message : "That lab action could not be completed.");
    }).finally(() => setWorking(""));
  }

  function pin(outputId: Id<"forensicOutputs">) {
    const count = boardNodes?.length ?? 0;
    run(outputId, createReference({ roomCode, type: "forensic", referenceId: outputId, x: 80 + (count % 4) * 220, y: 90 + Math.floor(count / 4) * 180 }));
  }

  return (
    <section className="game-lab-scene absolute inset-0 z-20 flex flex-col overflow-hidden text-[#e4e6d8]">
      <header className="game-station-header flex shrink-0 items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-[0.25em] text-[#a5c6bb]/80">{lab.placeName}</p>
          <h2 className="mt-1 text-xl uppercase tracking-wide sm:text-2xl">Forensic lab</h2>
        </div>
        <button className="min-h-11 shrink-0 border border-[#6f9f98]/70 px-4 py-2 text-sm uppercase hover:border-[#e8ac51] hover:text-[#e8ac51]" onClick={onBack} type="button">Leave the lab</button>
      </header>
      <main className="game-station-main min-h-0 flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
        <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-[16rem_minmax(0,1fr)]">
          <aside>
            <p className="text-xs uppercase tracking-[0.2em] text-[#c8d8d2]/65">Send for testing</p>
            <ul className="mt-2">
              {lab.sources.map((item) => (
                <li key={item.key}>
                  <button aria-pressed={item.key === source?.key} className="flex min-h-12 w-full items-center gap-2 border-b border-[#6f9f98]/30 py-2 text-left text-sm uppercase hover:text-[#f1c987] aria-pressed:text-[#f1c987]" onClick={() => setSourceKey(item.key)} type="button">
                    <InvestigationIcon className="size-8" name={item.key === "victim" ? "file" : item.key.startsWith("room:") ? "room" : "evidence"} />
                    <span className="min-w-0 break-words">{item.name}</span>
                  </button>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-xs leading-relaxed text-[#c8d8d2]/60">Collected objects and searched rooms appear here. Bag evidence at a scene to bring it in.</p>
          </aside>
          <div>
            <FirstTimeTip className="mb-3" id="lab" title="Forensic lab">Pick something you bagged, a searched room, or the victim, then request any test. Results take time, and not every test finds something.</FirstTimeTip>
            <p className="font-mono text-sm text-[#e8ac51]">{formatGameMinute(gameTime)}</p>
            <h3 className="mt-1 text-2xl uppercase">{source?.name}</h3>
            <p className="mt-1 text-sm text-[#c8d8d2]/70">Choose an examination. Submitting takes 5 minutes; results come back later. Not every test finds something.</p>
            {lab.action ? <p className="mt-3 text-sm uppercase text-[#f1c987]" role="status">Filling in the request form...</p> : null}
            {error ? <p className="mt-3 border border-red-300/60 bg-red-950/70 p-3 text-sm text-red-100" role="alert">{error}</p> : null}
            <ul className="mt-4 grid gap-3 sm:grid-cols-2">
              {lab.testTypes.map((type) => {
                const request = lab.requests.find((row) => row.sourceKey === source?.key && row.testType === type);
                const remaining = request ? Math.max(0, request.readyAtGameTime - gameTime) : 0;
                const pinned = request?.outputId ? boardNodes?.some((node) => node.type === "forensic" && node.referenceId === request.outputId) : false;
                return (
                  <li className={request?.status === "viewed" ? "game-dossier p-3 text-[#211d17] sm:col-span-2" : "border border-[#6f9f98]/30 bg-[#071619]/75 p-3"} key={type}>
                    <p className="flex items-center justify-between gap-2 text-sm uppercase"><span>{testNames[type] ?? type}</span>
                      <span className="text-xs">{!request ? "" : request.status === "pending" ? `${formatDuration(remaining)} left` : request.status === "ready" ? "Ready" : "Report"}</span></p>
                    {!request ? <button className="mt-2 min-h-10 w-full border border-[#e8ac51]/70 text-xs uppercase text-[#f1c987] hover:bg-[#e8ac51]/15 disabled:opacity-45" disabled={Boolean(lab.action) || Boolean(working) || !source} onClick={() => run(type, requestTest({ roomCode, sourceKey: source!.key, testType: type as Parameters<typeof requestTest>[0]["testType"] }))} type="button">Request</button> : null}
                    {request?.status === "pending" ? <progress aria-label={`${type} processing`} className="mt-2 h-2 w-full accent-[#6f9f98]" /> : null}
                    {request?.status === "ready" ? <button className="mt-2 min-h-10 w-full border border-[#e8ac51] bg-[#e8ac51]/15 text-xs uppercase text-[#f1c987]" disabled={Boolean(working)} onClick={() => run(request.id, markViewed({ roomCode, requestId: request.id }), "stamp")} type="button">Open the report</button> : null}
                    {request?.status === "viewed" ? (
                      <>
                        <p className="mt-2 whitespace-pre-wrap border-t border-[#8b7355] pt-2 text-sm leading-relaxed">{request.result}</p>
                        {request.outputId ? <button className="mt-2 min-h-9 border border-[#573821] px-3 text-xs uppercase disabled:opacity-50" disabled={pinned || Boolean(working)} onClick={() => pin(request.outputId!)} type="button">{pinned ? "Pinned" : "Pin to clueboard"}</button> : null}
                      </>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </main>
    </section>
  );
}

function LabMessage({ message, onBack }: { message: string; onBack: () => void }) {
  return (
    <section className="game-lab-scene absolute inset-0 z-20 flex items-center justify-center p-4 text-[#e4e6d8]">
      <div className="game-panel w-full max-w-lg px-7 py-9 text-center sm:px-12">
        <InvestigationIcon className="mx-auto size-12" name="lab" />
        <p className="mt-4 text-lg uppercase leading-snug">{message}</p>
        <button className="mt-6 min-h-11 w-full border border-[#6f9f98]/70 px-4 py-2 uppercase hover:border-[#e8ac51] hover:text-[#e8ac51] sm:w-auto" onClick={onBack} type="button">Open the city map</button>
      </div>
    </section>
  );
}
