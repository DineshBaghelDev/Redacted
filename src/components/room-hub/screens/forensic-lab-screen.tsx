"use client";

import { useAuth } from "@clerk/nextjs";
import { useMutation, useQuery } from "convex/react";
import { useEffect, useState } from "react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { formatGameMinute } from "../../../lib/game-time";

export function ForensicLabScreen({ roomCode, onBack }: { roomCode: string; onBack: () => void }) {
  const { isLoaded, isSignedIn } = useAuth();
  const lab = useQuery(api.forensics.getLab, isLoaded && isSignedIn ? { roomCode } : "skip");
  const boardNodes = useQuery(api.clueBoard.getNodes, isLoaded && isSignedIn ? { roomCode } : "skip");
  const requestTest = useMutation(api.forensics.request);
  const markViewed = useMutation(api.forensics.markViewed);
  const createReference = useMutation(api.clueBoard.createReferenceNode);
  const finishAction = useMutation(api.investigation.finishAction);
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
    const interval = window.setInterval(update, 250);
    return () => window.clearInterval(interval);
  }, [lab, finishAction, roomCode]);

  if (lab === undefined) return <LabMessage message="Opening the forensic lab..." onBack={onBack} />;
  if (!lab) return <LabMessage message="The forensic lab is not available here." onBack={onBack} />;

  const gameTime = lab.clock.gameTime + (lab.clock.clockStartedAt === null || now === 0
    ? 0 : Math.max(0, Math.floor((now - lab.clock.clockStartedAt) / lab.clock.minuteMs)));
  const actionRemaining = lab.action ? Math.max(0, lab.action.completeGameTime - gameTime) : 0;

  function run(id: Id<"forensicOutputs">, action: Promise<unknown>) {
    setWorking(id);
    setError("");
    void action.catch((caught: unknown) => {
      setError(caught instanceof Error ? caught.message : "That lab action could not be completed.");
    }).finally(() => setWorking(""));
  }

  return (
    <section className="absolute inset-0 z-20 flex flex-col overflow-hidden bg-[#080b12] text-cyan-50">
      <header className="flex shrink-0 items-center justify-between gap-4 border-b border-cyan-300/30 bg-[#07111b] px-4 py-3 sm:px-6">
        <div>
          <p className="text-[10px] uppercase tracking-[0.25em] text-cyan-200/55">Evidence analysis</p>
          <h2 className="mt-1 text-xl uppercase tracking-wide sm:text-2xl">Forensic lab</h2>
          <p className="mt-1 text-xs text-cyan-100/50">{lab.placeName}</p>
        </div>
        <button className="min-h-11 border border-cyan-300/70 px-4 py-2 text-sm uppercase hover:border-yellow-200 hover:text-yellow-200" onClick={onBack} type="button">Back</button>
      </header>

      <main className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
        <div className="mx-auto max-w-5xl">
          <div className="flex flex-wrap items-end justify-between gap-3 border-b border-cyan-300/20 pb-4">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-cyan-100/45">Available examinations</p>
              <h3 className="mt-1 text-2xl uppercase sm:text-3xl">Case evidence</h3>
            </div>
            <p className="font-mono text-sm text-yellow-200">{formatGameMinute(gameTime)}</p>
          </div>

          {lab.action ? (
            <div className="mt-5 border border-yellow-200/45 bg-[#211d15] p-4" role="status">
              <p className="text-sm uppercase text-yellow-100">Processing lab request</p>
              <p className="mt-1 text-xs text-yellow-100/70">{actionRemaining} game min remaining</p>
              <progress aria-label="Lab request progress" className="mt-3 h-2 w-full accent-yellow-200" max={Math.max(1, lab.action.completeGameTime - lab.action.startGameTime)} value={Math.max(0, gameTime - lab.action.startGameTime)} />
            </div>
          ) : null}

          {error ? <p className="mt-4 border border-red-300/60 bg-red-950/70 p-3 text-sm text-red-100" role="alert">{error}</p> : null}

          {lab.tests.length ? (
            <ul className="mt-5 grid gap-3 md:grid-cols-2">
              {lab.tests.map((test) => {
                const remaining = test.readyAtGameTime === undefined ? 0 : Math.max(0, test.readyAtGameTime - gameTime);
                const pinned = boardNodes?.some((node) => node.type === "forensic" && node.referenceId === test.id) ?? false;
                return (
                  <li className="border border-cyan-300/25 bg-[#0b1822] p-4 sm:p-5" key={test.id}>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-[10px] uppercase tracking-[0.2em] text-cyan-100/45">{test.testType.replaceAll("_", " ")}</p>
                        <h4 className="mt-1 text-lg uppercase">{test.sourceName}</h4>
                      </div>
                      <span className={`border px-2 py-1 text-[10px] uppercase tracking-wider ${test.status === "viewed" ? "border-emerald-300/50 text-emerald-200" : test.status === "ready" ? "border-yellow-200/60 text-yellow-100" : "border-cyan-300/30 text-cyan-100/55"}`}>
                        {test.status === "available" ? "Not requested" : test.status}
                      </span>
                    </div>

                    {test.status === "pending" ? (
                      <div className="mt-4">
                        <div className="flex justify-between text-xs text-cyan-100/55"><span>In progress</span><span>{remaining} game min left</span></div>
                        <progress aria-label={`${test.testType} processing`} className="mt-2 h-2 w-full accent-cyan-300" />
                      </div>
                    ) : null}

                    {test.status === "viewed" ? <p className="mt-4 border-l-2 border-yellow-200/70 bg-[#17170f] p-3 text-sm leading-relaxed text-yellow-50">{test.result}</p> : null}

                    {test.status === "available" ? (
                      <button
                        className="mt-4 min-h-11 border border-yellow-200/70 bg-yellow-200/10 px-4 text-xs uppercase text-yellow-100 hover:bg-yellow-200/20 disabled:cursor-wait disabled:opacity-45"
                        disabled={Boolean(lab.action) || Boolean(working)}
                        onClick={() => run(test.id, requestTest({ roomCode, forensicOutputId: test.id }))}
                        type="button"
                      >{working === test.id ? "Submitting..." : "Request examination"}</button>
                    ) : null}
                    {test.status === "ready" ? (
                      <button
                        className="mt-4 min-h-11 border border-yellow-200/70 bg-yellow-200/10 px-4 text-xs uppercase text-yellow-100 hover:bg-yellow-200/20 disabled:opacity-45"
                        disabled={Boolean(working)}
                        onClick={() => run(test.id, markViewed({ roomCode, forensicOutputId: test.id }))}
                        type="button"
                      >{working === test.id ? "Opening result..." : "View result"}</button>
                    ) : null}
                    {test.status === "viewed" ? (
                      <button
                        className="mt-4 min-h-11 border border-cyan-300/60 px-4 text-xs uppercase hover:border-yellow-200 hover:text-yellow-200 disabled:opacity-45"
                        disabled={Boolean(working) || pinned}
                        onClick={() => {
                          const count = boardNodes?.length ?? 0;
                          run(test.id, createReference({ roomCode, type: "forensic", referenceId: test.id, x: 80 + (count % 4) * 220, y: 90 + (Math.floor(count / 4) % 4) * 180 }));
                        }}
                        type="button"
                      >{pinned ? "Pinned to clueboard" : "Pin to clueboard"}</button>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="mt-6 border border-dashed border-cyan-300/25 p-6 text-center text-sm text-cyan-100/55">No evidence is ready for examination yet. Bring collected evidence or search rooms to uncover available tests.</p>
          )}
        </div>
      </main>
    </section>
  );
}

function LabMessage({ message, onBack }: { message: string; onBack: () => void }) {
  return (
    <section className="absolute inset-0 z-20 flex items-center justify-center bg-[#080b12] p-4 text-cyan-50">
      <div className="w-full max-w-lg border border-cyan-300/30 bg-[#07111b] p-6 text-center">
        <p className="text-lg uppercase">{message}</p>
        <button className="mt-5 min-h-11 border border-cyan-300/70 px-4 py-2 uppercase hover:border-yellow-200 hover:text-yellow-200" onClick={onBack} type="button">Back</button>
      </div>
    </section>
  );
}
