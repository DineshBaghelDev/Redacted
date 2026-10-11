"use client";

import { errorText } from "../../../lib/error-text";
import { useAuth } from "@clerk/nextjs";
import { useMutation } from "convex/react";
import { useQuery } from "convex-helpers/react/cache";
import { useEffect, useState } from "react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { cardDropTarget, startCardDrag } from "../../../lib/evidence-drag";
import { formatDuration, formatGameMinute } from "../../../lib/game-time";
import { play } from "../../../lib/sound";
import { FirstTimeTip } from "../first-time-tip";
import { ScrubPad } from "../gestures";
import { InvestigationIcon } from "../investigation-icon";

type TestType = "fingerprint" | "footprint" | "dna" | "blood" | "toxicology" | "fiber" | "ballistics" | "autopsy";

/** The bench tools. Each is a physical action on the evidence, not a menu choice. */
const tools: { test: TestType; name: string; verb: string; gesture: "brush" | "lamp" | "swab" | "tape" | "lens"; colour: string }[] = [
  { test: "fingerprint", name: "Powder brush", verb: "Dust it for prints", gesture: "brush", colour: "#d8cdb4" },
  { test: "blood", name: "UV lamp", verb: "Sweep the lamp over it", gesture: "lamp", colour: "#a782ff" },
  { test: "dna", name: "DNA swab", verb: "Swab the surface", gesture: "swab", colour: "#e9e6da" },
  { test: "toxicology", name: "Tox kit", verb: "Take a sample for the tox screen", gesture: "swab", colour: "#9fd1c4" },
  { test: "fiber", name: "Lifting tape", verb: "Press tape across it for fibres", gesture: "tape", colour: "#bcd3ff" },
  { test: "footprint", name: "Casting kit", verb: "Work the cast over the marks", gesture: "brush", colour: "#c9b38f" },
  { test: "ballistics", name: "Comparison scope", verb: "Scan it under the scope", gesture: "lens", colour: "#e8ac51" },
  { test: "autopsy", name: "Autopsy", verb: "Go over the body with the pathologist", gesture: "lens", colour: "#e5a18e" },
];

function sourceIcon(key: string) {
  return key === "victim" ? "file" : key.startsWith("room:") ? "room" : "evidence";
}

export function ForensicLabScreen({ roomCode, onBack }: { roomCode: string; onBack: () => void }) {
  const { isLoaded, isSignedIn } = useAuth();
  const lab = useQuery(api.forensics.getLab, isLoaded && isSignedIn ? { roomCode } : "skip");
  const boardNodes = useQuery(api.clueBoard.getNodes, isLoaded && isSignedIn ? { roomCode } : "skip");
  const requestTest = useMutation(api.forensics.request);
  const markViewed = useMutation(api.forensics.markViewed);
  const createReference = useMutation(api.clueBoard.createReferenceNode);
  const finishAction = useMutation(api.investigation.finishAction);
  const [sourceKey, setSourceKey] = useState<string | null>(null);
  const [tool, setTool] = useState<TestType | null>(null);
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
        setError(errorText(caught, "Could not finish the lab work."));
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
  const source = lab.sources.find((item) => item.key === sourceKey) ?? null;
  const chosen = tools.find((item) => item.test === tool) ?? null;
  const requests = lab.requests.filter((row) => row.sourceKey === source?.key);
  const alreadyDone = Boolean(chosen && requests.some((row) => row.testType === chosen.test));

  function placeOnBench(key: string) {
    play("click");
    setSourceKey(key);
    setTool(null);
    setError("");
  }

  function run(id: string, action: Promise<unknown>, cue: "click" | "stamp" = "click") {
    setWorking(id);
    setError("");
    play(cue);
    void action.catch((caught: unknown) => {
      setError(errorText(caught, "That lab action could not be completed."));
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
          <p className="text-xs uppercase tracking-[0.25em] text-[#a5c6bb]/80">{lab.placeName} · {formatGameMinute(gameTime)}</p>
          <h2 className="mt-1 text-xl uppercase tracking-wide sm:text-2xl">Forensic lab</h2>
        </div>
        <button className="min-h-11 shrink-0 border border-[#6f9f98]/70 px-4 py-2 text-sm uppercase hover:border-[#e8ac51] hover:text-[#e8ac51]" onClick={onBack} type="button">Leave the lab</button>
      </header>
      <FirstTimeTip id="lab" title="Forensic lab">Drag evidence onto the bench (or tap it), pick a tool, then rub over the evidence to run the test. Results come back later, and not every test finds something.</FirstTimeTip>
      <main className="game-station-main min-h-0 flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
        <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[15rem_minmax(0,1fr)]">
          <aside>
            <p className="text-xs uppercase tracking-[0.2em] text-[#c8d8d2]/65">Evidence bags</p>
            <ul className="mt-2 grid grid-cols-2 gap-2 lg:grid-cols-1">
              {lab.sources.map((item) => (
                <li key={item.key}>
                  <button
                    aria-pressed={item.key === source?.key}
                    className="flex min-h-12 w-full cursor-grab items-center gap-2 border border-[#6f9f98]/30 bg-[#0b1a1c]/80 px-2 py-2 text-left text-xs uppercase hover:border-[#e8ac51] aria-pressed:border-[#e8ac51] aria-pressed:text-[#f1c987] active:cursor-grabbing"
                    draggable
                    onClick={() => placeOnBench(item.key)}
                    onDragStart={(event) => startCardDrag(event, { kind: item.key.startsWith("item:") ? "item" : "place", referenceId: item.key, label: item.name })}
                    type="button"
                  >
                    <InvestigationIcon className="size-8" name={sourceIcon(item.key)} />
                    <span className="min-w-0 break-words">{item.name}</span>
                  </button>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-xs leading-relaxed text-[#c8d8d2]/60">Bag objects at a scene to bring them here. Searched rooms can be sampled too.</p>
          </aside>

          <div>
            <div
              className="relative flex min-h-56 flex-col items-center justify-center border-2 border-dashed border-[#6f9f98]/40 bg-[#081315]/80 p-4 text-center"
              {...cardDropTarget((card) => {
                const key = card.kind === "item" && !card.referenceId.includes(":") ? `item:${card.referenceId}` : card.referenceId;
                if (lab.sources.some((item) => item.key === key)) placeOnBench(key);
                else setError("Bag that at the scene first, then bring it here.");
              })}
            >
              {!source ? <p className="text-sm uppercase tracking-widest text-[#c8d8d2]/50">Drag evidence onto the bench</p> : chosen && !alreadyDone ? (
                <ScrubPad className="flex min-h-48 w-full flex-col items-center justify-center" disabled={Boolean(lab.action) || Boolean(working)} key={`${source.key}:${chosen.test}`} needed={chosen.test === "autopsy" ? 1100 : 800} onDone={() => run(chosen.test, requestTest({ roomCode, sourceKey: source.key, testType: chosen.test }))} tool={chosen.gesture}>
                  <InvestigationIcon className="size-20" name={sourceIcon(source.key)} />
                  <p className="mt-2 text-lg uppercase">{source.name}</p>
                  <p className="mt-1 text-xs uppercase tracking-widest" style={{ color: chosen.colour }}>{chosen.verb} · 5 min</p>
                </ScrubPad>
              ) : (
                <>
                  <InvestigationIcon className="size-20" name={sourceIcon(source.key)} />
                  <p className="mt-2 text-lg uppercase">{source.name}</p>
                  <p className="mt-1 text-xs uppercase tracking-widest text-[#c8d8d2]/60">{chosen ? "That test is already done on this" : "Pick a tool"}</p>
                </>
              )}
            </div>
            {lab.action ? <p className="mt-2 text-sm uppercase text-[#f1c987]" role="status">Sealing the sample and filling in the form...</p> : null}
            {error ? <p className="mt-2 border border-red-300/60 bg-red-950/70 p-3 text-sm text-red-100" role="alert">{error}</p> : null}

            {source ? (
              <div className="mt-4 flex flex-wrap gap-2" role="radiogroup" aria-label="Tools">
                {tools.map((item) => {
                  const done = requests.some((row) => row.testType === item.test);
                  return (
                    <button aria-checked={tool === item.test} className="flex min-h-11 items-center gap-2 border border-[#6f9f98]/40 px-3 text-xs uppercase aria-checked:border-[#e8ac51] aria-checked:bg-[#e8ac51]/10 aria-checked:text-[#f1c987]" key={item.test} onClick={() => { play("click"); setTool(item.test); }} role="radio" type="button">
                      <span aria-hidden="true" className="size-3 rounded-full" style={{ background: item.colour }} />
                      {item.name}{done ? " ✓" : ""}
                    </button>
                  );
                })}
              </div>
            ) : null}

            {requests.length ? (
              <ul className="mt-6 grid gap-3 sm:grid-cols-2">
                {requests.map((request) => {
                  const remaining = Math.max(0, request.readyAtGameTime - gameTime);
                  const pinned = request.outputId ? boardNodes?.some((node) => node.type === "forensic" && node.referenceId === request.outputId) : false;
                  const name = tools.find((item) => item.test === request.testType)?.name ?? request.testType;
                  return (
                    <li className={request.status === "viewed" ? "game-dossier p-3 text-[#211d17] sm:col-span-2" : "border border-[#6f9f98]/30 bg-[#071619]/75 p-3"} key={request.id}>
                      <p className="flex items-center justify-between gap-2 text-sm uppercase"><span>{name}</span>
                        <span className="text-xs">{request.status === "pending" ? `${formatDuration(remaining)} left` : request.status === "ready" ? "Ready" : "Report"}</span></p>
                      {request.status === "pending" ? <progress aria-label={`${name} processing`} className="mt-2 h-2 w-full accent-[#6f9f98]" /> : null}
                      {request.status === "ready" ? <button className="mt-2 min-h-10 w-full border border-[#e8ac51] bg-[#e8ac51]/15 text-xs uppercase text-[#f1c987]" disabled={Boolean(working)} onClick={() => run(request.id, markViewed({ roomCode, requestId: request.id }), "stamp")} type="button">Tear open the report</button> : null}
                      {request.status === "viewed" ? (
                        <>
                          <p className="mt-2 whitespace-pre-wrap border-t border-[#8b7355] pt-2 text-sm leading-relaxed">{request.result}</p>
                          {request.outputId ? <button className="mt-2 min-h-9 border border-[#573821] px-3 text-xs uppercase disabled:opacity-50" disabled={pinned || Boolean(working)} onClick={() => pin(request.outputId!)} type="button">{pinned ? "Pinned" : "Pin to clueboard"}</button> : null}
                        </>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            ) : null}
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
