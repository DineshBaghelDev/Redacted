"use client";

import { errorText } from "../../../lib/error-text";
import { useAuth } from "@clerk/nextjs";
import { useMutation } from "convex/react";
import { useQuery } from "convex-helpers/react/cache";
import { useState, type FormEvent } from "react";
import { api } from "../../../../convex/_generated/api";
import { formatDuration, formatGameMinute } from "../../../lib/game-time";
import { cardDropTarget, startCardDrag, type DragCard, type DragKind } from "../../../lib/evidence-drag";
import type { Id } from "../../../../convex/_generated/dataModel";
import { ControlIcon } from "../control-icon";

const MAX_EVIDENCE = 12;
const fields = [
  ["killer", "Killer"],
  ["motive", "Motive"],
  ["weapon", "Weapon"],
  ["evidence", "Evidence"],
  ["method", "Method"],
] as const;

export function CaseFileScreen({ roomCode, onBack }: { roomCode: string; onBack: () => void }) {
  const { isLoaded, isSignedIn } = useAuth();
  const ready = isLoaded && isSignedIn && !!roomCode;
  const brief = useQuery(api.cases.getBrief, ready ? { roomCode } : "skip");
  const people = useQuery(api.npcs.list, ready ? { roomCode } : "skip");
  const boardNodes = useQuery(api.clueBoard.getNodes, ready ? { roomCode } : "skip");
  const inventory = useQuery(api.investigation.getInventory, ready ? { roomCode } : "skip");
  const closeState = useQuery(api.caseClose.getResult, ready ? { roomCode } : "skip");
  const epilogue = useQuery(api.caseClose.getEpilogue, ready ? { roomCode } : "skip");
  const giveUp = useMutation(api.caseClose.giveUp);
  const [confirmGiveUp, setConfirmGiveUp] = useState(false);
  const submitCase = useMutation(api.caseClose.submit);
  const createReference = useMutation(api.clueBoard.createReferenceNode);
  const retryJudge = useMutation(api.caseClose.retry);
  const [closing, setClosing] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [culpritNpcId, setCulpritNpcId] = useState("");
  const [motiveExplanation, setMotiveExplanation] = useState("");
  const [weaponDescription, setWeaponDescription] = useState("");
  const [weaponItemId, setWeaponItemId] = useState("");
  const [evidenceIds, setEvidenceIds] = useState<string[]>([]);
  const [evidenceExplanation, setEvidenceExplanation] = useState("");
  const [methodExplanation, setMethodExplanation] = useState("");

  const evidence = (boardNodes ?? []).filter(
    (node): node is typeof node & { referenceId: string } =>
      (node.type === "cctv" || node.type === "public_record" || node.type === "item" || node.type === "forensic" || node.type === "device_file" || node.type === "call" || node.type === "message" || node.type === "statement") && !!node.referenceId,
  );
  const victimName = people?.find((person) => person.isVictim)?.name ?? "the victim";
  const canReview = !!culpritNpcId
    && motiveExplanation.trim().length >= 10
    && weaponDescription.trim().length > 0
    && evidenceIds.length > 0
    && evidenceExplanation.trim().length >= 10
    && methodExplanation.trim().length >= 10;

  function toggleEvidence(id: string) {
    if (evidenceIds.includes(id)) {
      setEvidenceIds(evidenceIds.filter((item) => item !== id));
      setError("");
      return;
    }
    if (evidenceIds.length >= MAX_EVIDENCE) {
      setError(`Choose no more than ${MAX_EVIDENCE} pieces of evidence.`);
      return;
    }
    setEvidenceIds([...evidenceIds, id]);
    setError("");
  }

  /** Evidence dropped from the notebook is pinned first, since the report cites the clueboard. */
  function addProof(card: DragCard) {
    if (evidence.some((item) => item.referenceId === card.referenceId)) {
      if (!evidenceIds.includes(card.referenceId)) toggleEvidence(card.referenceId);
      return;
    }
    const count = boardNodes?.length ?? 0;
    void createReference({ roomCode, type: card.kind as "item", referenceId: card.referenceId, x: 80 + (count % 4) * 220, y: 90 + Math.floor(count / 4) * 180 })
      .then(() => setEvidenceIds((current) => current.includes(card.referenceId) || current.length >= MAX_EVIDENCE ? current : [...current, card.referenceId]))
      .catch((caught: unknown) => setError(errorText(caught, "Could not add that evidence.")));
  }

  function review(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (canReview) setReviewing(true);
  }

  function submit() {
    setSubmitting(true);
    setError("");
    void submitCase({
      roomCode,
      culpritNpcId: culpritNpcId as Id<"npcs">,
      motiveExplanation,
      ...(weaponItemId ? { weaponItemId: weaponItemId as Id<"caseItems"> } : {}),
      weaponDescription,
      evidenceIds,
      evidenceExplanation,
      methodExplanation,
    }).catch((caught: unknown) => {
      setError(errorText(caught, "Could not submit the case."));
      setReviewing(false);
    }).finally(() => setSubmitting(false));
  }

  function retry() {
    setSubmitting(true);
    setError("");
    void retryJudge({ roomCode })
      .catch((caught: unknown) => setError(errorText(caught, "Could not retry judging.")))
      .finally(() => setSubmitting(false));
  }

  return (
    <section className="game-report-scene absolute inset-0 z-20 flex flex-col overflow-hidden text-[#2b2118]">
      <header className="flex shrink-0 items-center justify-between gap-4 border-b-4 border-[#63452e] bg-[#ad9e80] px-4 py-3 sm:px-6">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-red-900/70">Final investigation file</p>
          <h2 className="mt-1 text-xl uppercase sm:text-2xl">Case file</h2>
        </div>
        <button className="game-control-button min-h-11 px-4 text-sm uppercase" onClick={onBack} type="button"><ControlIcon name="back" />Close the file</button>
      </header>

      <main className="min-h-0 flex-1 overflow-y-auto bg-[#160f0b]/60 p-4 sm:p-6 lg:p-8">
        <div className="mx-auto max-w-4xl">
          {error ? <p className="mb-4 border-2 border-red-800 bg-red-950 p-3 text-sm text-red-100" role="alert">{error}</p> : null}

          {closeState?.status === "complete" && closeState.result ? (
            <section className="game-dossier px-5 pb-20 pt-20 sm:px-8 sm:pb-16" aria-live="polite">
              <p className="text-xs uppercase tracking-[0.2em] text-red-800">Case closed</p>
              <div className="mt-3 flex flex-wrap items-end justify-between gap-3 border-b-2 border-[#6d5138] pb-5">
                <h3 className="text-3xl uppercase sm:text-4xl">Your final report</h3>
                <p className="font-mono text-2xl text-red-900" aria-label={`${closeState.result.totalStars} out of 5 stars`}>
                  {"★".repeat(closeState.result.totalStars)}{"☆".repeat(5 - closeState.result.totalStars)}
                </p>
              </div>
              {closeState.tookMinutes !== undefined ? (
                <p className="mt-3 font-mono text-sm text-[#5b4635]">
                  Case time {formatDuration(closeState.tookMinutes)}
                  {closeState.deadlineDelta !== undefined ? ` · ${formatDuration(Math.abs(closeState.deadlineDelta))} ${closeState.deadlineDelta <= 0 ? "before" : "after"} the deadline` : ""}
                </p>
              ) : null}
              <ul className="mt-5 grid gap-3 sm:grid-cols-2">
                {fields.map(([key, label]) => {
                  const category = closeState.result![key];
                  return (
                    <li className={`border-b-2 p-4 ${category.star ? "border-emerald-800 bg-[#bac5aa]/55" : "border-red-900/60 bg-[#cdb09b]/55"}`} key={key}>
                      <p className="flex items-center justify-between gap-3 uppercase"><span>{label}</span><span aria-hidden="true">{category.star ? "★" : "☆"}</span></p>
                      {"feedback" in category && category.feedback ? <p className="mt-2 text-sm leading-relaxed text-[#5b4635]">{category.feedback}</p> : null}
                    </li>
                  );
                })}
              </ul>
              {epilogue ? <Epilogue epilogue={epilogue} /> : null}
            </section>
          ) : closeState?.status === "judging" || (closeState?.status === "pending" && !closeState.error) ? (
            <section className="game-dossier px-5 pb-20 pt-20 text-center sm:px-8 sm:pb-16" aria-live="polite">
              <p className="text-xs uppercase tracking-[0.2em] text-red-800">Report submitted</p>
              <h3 className="mt-3 text-3xl uppercase">Reviewing your theory...</h3>
              <p className="mt-4 text-sm leading-relaxed text-[#5b4635]">Both detectives will see the result here when the review is complete.</p>
            </section>
          ) : closeState?.error ? (
            <section className="game-dossier px-5 pb-20 pt-20 text-center sm:px-8 sm:pb-16">
              <h3 className="text-2xl uppercase">Review interrupted</h3>
              <p className="mt-3 text-sm">{closeState.error}</p>
              <button className="mt-5 min-h-11 border-2 border-red-900 px-5 uppercase hover:bg-red-900 hover:text-white disabled:opacity-50" disabled={submitting} onClick={retry} type="button">
                {submitting ? "Retrying..." : "Retry review"}
              </button>
            </section>
          ) : epilogue ? (
            <section className="game-dossier px-5 pb-20 pt-24 sm:px-8 sm:pb-16" aria-live="polite">
              <p className="text-xs uppercase tracking-[0.2em] text-red-800">Case given up</p>
              <h3 className="mt-2 text-3xl uppercase">No report was filed</h3>
              <Epilogue epilogue={epilogue} />
            </section>
          ) : !closing ? (
            <section className="game-dossier px-5 pb-20 pt-20 sm:px-8 sm:pb-16">
              {brief === undefined ? <p className="uppercase">Loading case file...</p> : !brief ? <p className="uppercase text-red-800">No completed case is available.</p> : (
                <>
                  <p className="text-xs uppercase tracking-[0.18em] text-red-800">Public brief</p>
                  <h3 className="mt-2 text-2xl uppercase sm:text-3xl">{brief.title}</h3>
                  <p className="mt-4 leading-relaxed">{brief.summary}</p>
                  <ul className="mt-5 list-disc space-y-2 border-t border-[#6d5138]/40 pt-4 pl-5 text-sm leading-relaxed">
                    {brief.initialFacts.map((fact) => <li key={fact}>{fact}</li>)}
                  </ul>
                  <button className="game-control-button mt-7 min-h-12 w-full px-5 uppercase text-[#f1c987] disabled:opacity-50 sm:w-auto" disabled={!people?.length || evidence.length === 0} onClick={() => setClosing(true)} type="button">
                    <ControlIcon name="play" />
                    Close this case
                  </button>
                  {!evidence.length ? <p className="mt-3 text-sm text-red-900">Pin at least one piece of evidence to the clueboard before closing the case.</p> : null}
                  <div className="mt-8 border-t border-[#6d5138]/40 pt-4">
                    {confirmGiveUp ? (
                      <div>
                        <p className="text-sm">Give up and see what really happened? The case ends for both detectives and no report can be filed.</p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <button className="min-h-11 border-2 border-[#573821] px-4 text-sm uppercase" onClick={() => setConfirmGiveUp(false)} type="button">Keep investigating</button>
                          <button className="min-h-11 border-2 border-red-900 px-4 text-sm uppercase text-red-900 hover:bg-red-900 hover:text-red-50" onClick={() => { setError(""); void giveUp({ roomCode }).catch((caught: unknown) => setError(errorText(caught, "Could not give up."))); }} type="button">Give up</button>
                        </div>
                      </div>
                    ) : <button className="min-h-10 text-sm uppercase text-[#5b4635] underline-offset-4 hover:text-red-900 hover:underline" onClick={() => setConfirmGiveUp(true)} type="button">Give up and see the solution</button>}
                  </div>
                </>
              )}
            </section>
          ) : reviewing ? (
            <section className="game-dossier px-5 pb-20 pt-20 sm:px-8 sm:pb-16">
              <p className="text-xs uppercase tracking-[0.2em] text-red-800">Final check</p>
              <h3 className="mt-2 text-3xl uppercase">Submit this theory?</h3>
              <p className="mt-4 text-sm leading-relaxed text-[#5b4635]">This closes the case for both detectives. Your report cannot be replaced after submission.</p>
              <dl className="mt-5 grid gap-3 border-y border-[#6d5138]/40 py-5 text-sm sm:grid-cols-2">
                <div><dt className="uppercase text-red-800">Accused</dt><dd className="mt-1">{people?.find((person) => person.id === culpritNpcId)?.name}</dd></div>
                <div><dt className="uppercase text-red-800">Evidence</dt><dd className="mt-1">{evidenceIds.length} pinned {evidenceIds.length === 1 ? "piece" : "pieces"}</dd></div>
                <div><dt className="uppercase text-red-800">Weapon</dt><dd className="mt-1">{weaponDescription}</dd></div>
                <div><dt className="uppercase text-red-800">Report</dt><dd className="mt-1">Motive, evidence, and method included</dd></div>
              </dl>
              <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button className="min-h-11 border-2 border-[#573821] px-5 uppercase" disabled={submitting} onClick={() => setReviewing(false)} type="button">Keep editing</button>
                <button className="game-control-button min-h-11 px-5 uppercase text-[#f1c987] disabled:opacity-50" disabled={submitting} onClick={submit} type="button"><ControlIcon name="play" />{submitting ? "Submitting..." : "Submit final report"}</button>
              </div>
            </section>
          ) : (
            <form className="game-dossier space-y-5 px-5 pb-20 pt-20 sm:px-8 sm:pb-16" onSubmit={review}>
              <div className="border-b-2 border-[#6d5138] pb-4"><p className="text-xs uppercase tracking-[0.2em] text-red-800">Five findings · five stars</p><h3 className="mt-2 text-3xl uppercase">Tell it like it happened</h3><p className="mt-2 text-sm text-[#5b4635]">Drag cards from below (or from the notebook) into the blanks, or tap a card to place it.</p></div>
              <div className="space-y-4 text-lg leading-[2.6rem]">
                <p>
                  <Slot accepts={(kind) => kind === "person"} label="who" onCard={(card) => setCulpritNpcId(card.referenceId)} onClear={() => setCulpritNpcId("")} value={people?.find((person) => person.id === culpritNpcId)?.name} />
                  {" "}killed {victimName} with{" "}
                  <Slot accepts={(kind) => kind === "item"} label="the weapon" onCard={(card) => { setWeaponItemId(inventory?.some((item) => item.id === card.referenceId) ? card.referenceId : ""); setWeaponDescription(card.label); }} onClear={() => { setWeaponItemId(""); setWeaponDescription(""); }} value={weaponItemId ? weaponDescription : undefined}>
                    <input aria-label="Describe the weapon" className="case-close-blank w-44" maxLength={200} onChange={(event) => { setWeaponDescription(event.target.value); setWeaponItemId(""); }} placeholder="or describe it" value={weaponDescription} />
                  </Slot>.
                </p>
                <p>They did it because <textarea aria-label="Why did they do it?" className="case-close-blank block min-h-16 w-full" maxLength={2000} onChange={(event) => setMotiveExplanation(event.target.value)} placeholder="the reason, in your words" value={motiveExplanation} /></p>
                <p>This is how it was done: <textarea aria-label="How was it done?" className="case-close-blank block min-h-16 w-full" maxLength={2000} onChange={(event) => setMethodExplanation(event.target.value)} placeholder="step by step, in your words" value={methodExplanation} /></p>
                <div>
                  <p>And here is the proof:</p>
                  <div className="min-h-16 border-2 border-dashed border-[#6d5138]/60 p-2 leading-normal" {...cardDropTarget(addProof, (kind) => kind !== "person" && kind !== "place")}>
                    {evidenceIds.length ? (
                      <ul className="flex flex-wrap gap-2">
                        {evidenceIds.map((id) => <li className="flex items-center gap-2 border border-red-900/60 bg-[#efe3c4] px-2 py-1 text-sm" key={id}>{evidence.find((item) => item.referenceId === id)?.text.split("\n")[0] ?? "Evidence"}<button aria-label="Remove" className="text-red-900" onClick={() => toggleEvidence(id)} type="button">✕</button></li>)}
                      </ul>
                    ) : <p className="text-sm text-[#6d5138]">Drop up to {MAX_EVIDENCE} pieces of evidence here.</p>}
                  </div>
                  <textarea aria-label="Explain how the evidence proves it" className="case-close-blank mt-2 block min-h-16 w-full" maxLength={2000} onChange={(event) => setEvidenceExplanation(event.target.value)} placeholder="because this evidence shows..." value={evidenceExplanation} />
                </div>
              </div>
              <section className="border-t border-[#6d5138]/40 pt-4">
                <p className="text-xs uppercase tracking-[0.2em] text-red-800">Your cards</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {people?.filter((person) => !person.isVictim).map((person) => <Card card={{ kind: "person", referenceId: person.id, label: person.name }} key={person.id} onTap={() => setCulpritNpcId(person.id)} tone="person" />)}
                  {inventory?.map((item) => <Card card={{ kind: "item", referenceId: item.id, label: item.name }} key={item.id} onTap={() => { setWeaponItemId(item.id); setWeaponDescription(item.name); }} tone="object" />)}
                  {evidence.map((item) => <Card card={{ kind: item.type as DragKind, referenceId: item.referenceId, label: item.text.split("\n")[0] }} key={`${item.type}:${item.referenceId}`} onTap={() => toggleEvidence(item.referenceId)} tone="evidence" />)}
                </div>
              </section>
              <div className="flex flex-col-reverse gap-3 border-t border-[#6d5138]/40 pt-5 sm:flex-row sm:justify-end"><button className="min-h-11 border-2 border-[#573821] px-5 uppercase" onClick={() => setClosing(false)} type="button">Cancel</button><button className="game-control-button min-h-11 px-5 uppercase text-[#f1c987] disabled:opacity-50" disabled={!canReview} type="submit"><ControlIcon name="play" />Review final theory</button></div>
            </form>
          )}
        </div>
      </main>
    </section>
  );
}

type EpilogueData = { culprit: string; motive: string; method: string; explanation: string; events: { time: number; place: string; text: string }[] };

function Epilogue({ epilogue }: { epilogue: EpilogueData }) {
  return (
    <div className="mt-10 border-t-2 border-[#6d5138] pt-6">
      <p className="text-xs uppercase tracking-[0.2em] text-red-800">What really happened</p>
      <h3 className="mt-2 text-2xl uppercase">{epilogue.culprit}</h3>
      <p className="mt-3 text-sm leading-relaxed"><span className="uppercase text-red-900">Why · </span>{epilogue.motive}</p>
      <p className="mt-2 text-sm leading-relaxed"><span className="uppercase text-red-900">How · </span>{epilogue.method}</p>
      <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed">{epilogue.explanation}</p>
      <ol className="mt-6 border-l-2 border-red-900/60 pl-4">
        {epilogue.events.map((event, index) => (
          <li className="reveal-card relative mb-4" key={`${event.time}-${index}`} style={{ animationDelay: `${Math.min(index, 20) * 120}ms` }}>
            <span aria-hidden="true" className="absolute -left-[1.4rem] top-1 size-2 bg-red-900" />
            <p className="font-mono text-xs text-[#5b4635]">{formatGameMinute(event.time)} · {event.place}</p>
            <p className="text-sm leading-relaxed">{event.text}</p>
          </li>
        ))}
      </ol>
    </div>
  );
}

/** A blank in the report sentence that takes a dropped card. */
function Slot({ label, value, accepts, onCard, onClear, children }: { label: string; value?: string; accepts: (kind: DragKind) => boolean; onCard: (card: DragCard) => void; onClear: () => void; children?: React.ReactNode }) {
  return (
    <span className="inline-flex flex-wrap items-center gap-2 align-middle" {...cardDropTarget(onCard, accepts)}>
      {value ? (
        <span className="inline-flex items-center gap-2 border-b-2 border-red-900 bg-[#efe3c4] px-2 leading-8">{value}<button aria-label={`Clear ${label}`} className="text-sm text-red-900" onClick={onClear} type="button">✕</button></span>
      ) : <span className="inline-block min-w-32 border-b-2 border-dashed border-[#6d5138] px-2 text-center text-sm leading-8 text-[#8b7355]">{label}</span>}
      {!value ? children : null}
    </span>
  );
}

/** A draggable, tappable card in the report's card tray. */
function Card({ card, tone, onTap }: { card: DragCard; tone: "person" | "object" | "evidence"; onTap: () => void }) {
  return (
    <button
      className={`max-w-56 cursor-grab truncate border px-2 py-1 text-left text-xs ${tone === "person" ? "border-red-900/60 bg-[#e9d9c0]" : tone === "object" ? "border-[#573821] bg-[#e6dcc2]" : "border-[#6d5138]/60 bg-[#efe6cf]"}`}
      draggable
      onClick={onTap}
      onDragStart={(event) => startCardDrag(event, card)}
      title={card.label}
      type="button"
    >
      {card.label}
    </button>
  );
}
