"use client";

import { useAuth } from "@clerk/nextjs";
import { useMutation, useQuery } from "convex/react";
import { useState, type FormEvent } from "react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";

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
  const closeState = useQuery(api.caseClose.getResult, ready ? { roomCode } : "skip");
  const submitCase = useMutation(api.caseClose.submit);
  const retryJudge = useMutation(api.caseClose.retry);
  const [closing, setClosing] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [culpritNpcId, setCulpritNpcId] = useState("");
  const [motiveExplanation, setMotiveExplanation] = useState("");
  const [weaponDescription, setWeaponDescription] = useState("");
  const [evidenceIds, setEvidenceIds] = useState<string[]>([]);
  const [evidenceExplanation, setEvidenceExplanation] = useState("");
  const [methodExplanation, setMethodExplanation] = useState("");

  const evidence = (boardNodes ?? []).filter(
    (node): node is typeof node & { referenceId: string } =>
      (node.type === "cctv" || node.type === "public_record") && !!node.referenceId,
  );
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
      weaponDescription,
      evidenceIds,
      evidenceExplanation,
      methodExplanation,
    }).catch((caught: unknown) => {
      setError(caught instanceof Error ? caught.message : "Could not submit the case.");
      setReviewing(false);
    }).finally(() => setSubmitting(false));
  }

  function retry() {
    setSubmitting(true);
    setError("");
    void retryJudge({ roomCode })
      .catch((caught: unknown) => setError(caught instanceof Error ? caught.message : "Could not retry judging."))
      .finally(() => setSubmitting(false));
  }

  return (
    <section className="absolute inset-0 z-20 flex flex-col overflow-hidden bg-[#0d0a08] text-[#2b2118]">
      <header className="flex shrink-0 items-center justify-between gap-4 border-b-4 border-[#63452e] bg-[#d8c8a7] px-4 py-3 sm:px-6">
        <div>
          <p className="text-[10px] uppercase tracking-[0.24em] text-red-900/70">Final investigation file</p>
          <h2 className="mt-1 text-xl uppercase sm:text-2xl">Case file</h2>
        </div>
        <button className="min-h-11 border-2 border-[#573821] px-4 text-sm uppercase hover:bg-[#573821] hover:text-[#f4ead2]" onClick={onBack} type="button">Back</button>
      </header>

      <main className="min-h-0 flex-1 overflow-y-auto bg-[#cbb993] p-4 sm:p-6 lg:p-8">
        <div className="mx-auto max-w-4xl">
          {error ? <p className="mb-4 border-2 border-red-800 bg-red-950 p-3 text-sm text-red-100" role="alert">{error}</p> : null}

          {closeState?.status === "complete" && closeState.result ? (
            <section className="border-2 border-[#6d5138] bg-[#eee2bd] p-5 shadow-[7px_7px_0_rgba(55,34,20,0.3)] sm:p-8" aria-live="polite">
              <p className="text-xs uppercase tracking-[0.2em] text-red-800">Case closed</p>
              <div className="mt-3 flex flex-wrap items-end justify-between gap-3 border-b-2 border-[#6d5138] pb-5">
                <h3 className="text-3xl uppercase sm:text-4xl">Your final report</h3>
                <p className="font-mono text-2xl text-red-900" aria-label={`${closeState.result.totalStars} out of 5 stars`}>
                  {"★".repeat(closeState.result.totalStars)}{"☆".repeat(5 - closeState.result.totalStars)}
                </p>
              </div>
              <ul className="mt-5 grid gap-3 sm:grid-cols-2">
                {fields.map(([key, label]) => {
                  const category = closeState.result![key];
                  return (
                    <li className={`border-2 p-4 ${category.star ? "border-emerald-800 bg-emerald-50" : "border-red-900/60 bg-red-50"}`} key={key}>
                      <p className="flex items-center justify-between gap-3 uppercase"><span>{label}</span><span aria-hidden="true">{category.star ? "★" : "☆"}</span></p>
                      {"feedback" in category && category.feedback ? <p className="mt-2 text-sm leading-relaxed text-[#5b4635]">{category.feedback}</p> : null}
                    </li>
                  );
                })}
              </ul>
            </section>
          ) : closeState?.status === "judging" || (closeState?.status === "pending" && !closeState.error) ? (
            <section className="border-2 border-[#6d5138] bg-[#eee2bd] p-8 text-center shadow-[7px_7px_0_rgba(55,34,20,0.3)]" aria-live="polite">
              <p className="text-xs uppercase tracking-[0.2em] text-red-800">Report submitted</p>
              <h3 className="mt-3 text-3xl uppercase">Reviewing your theory...</h3>
              <p className="mt-4 text-sm leading-relaxed text-[#5b4635]">Both detectives will see the result here when the review is complete.</p>
            </section>
          ) : closeState?.error ? (
            <section className="border-2 border-red-900 bg-[#eee2bd] p-6 text-center">
              <h3 className="text-2xl uppercase">Review interrupted</h3>
              <p className="mt-3 text-sm">{closeState.error}</p>
              <button className="mt-5 min-h-11 border-2 border-red-900 px-5 uppercase hover:bg-red-900 hover:text-white disabled:opacity-50" disabled={submitting} onClick={retry} type="button">
                {submitting ? "Retrying..." : "Retry review"}
              </button>
            </section>
          ) : !closing ? (
            <section className="border-2 border-[#6d5138] bg-[#eee2bd] p-5 shadow-[7px_7px_0_rgba(55,34,20,0.3)] sm:p-8">
              {brief === undefined ? <p className="uppercase">Loading case file...</p> : !brief ? <p className="uppercase text-red-800">No completed case is available.</p> : (
                <>
                  <p className="text-xs uppercase tracking-[0.18em] text-red-800">Public brief</p>
                  <h3 className="mt-2 text-3xl uppercase">{brief.title}</h3>
                  <p className="mt-4 leading-relaxed">{brief.summary}</p>
                  <ul className="mt-5 list-disc space-y-2 border-t border-[#6d5138]/40 pt-4 pl-5 text-sm leading-relaxed">
                    {brief.initialFacts.map((fact) => <li key={fact}>{fact}</li>)}
                  </ul>
                  <button className="mt-7 min-h-12 w-full border-2 border-red-900 bg-red-950 px-5 uppercase text-red-50 hover:bg-red-900 disabled:opacity-50 sm:w-auto" disabled={!people?.length || evidence.length === 0} onClick={() => setClosing(true)} type="button">
                    Close this case
                  </button>
                  {!evidence.length ? <p className="mt-3 text-sm text-red-900">Pin at least one camera or public record to the clueboard before closing the case.</p> : null}
                </>
              )}
            </section>
          ) : reviewing ? (
            <section className="border-2 border-red-900 bg-[#eee2bd] p-5 shadow-[7px_7px_0_rgba(55,34,20,0.3)] sm:p-8">
              <p className="text-xs uppercase tracking-[0.2em] text-red-800">Final check</p>
              <h3 className="mt-2 text-3xl uppercase">Submit this theory?</h3>
              <p className="mt-4 text-sm leading-relaxed text-[#5b4635]">This closes the case for both detectives. Your report cannot be replaced after submission.</p>
              <dl className="mt-5 grid gap-3 border-y border-[#6d5138]/40 py-5 text-sm sm:grid-cols-2">
                <div><dt className="uppercase text-red-800">Accused</dt><dd className="mt-1">{people?.find((person) => person.id === culpritNpcId)?.name}</dd></div>
                <div><dt className="uppercase text-red-800">Evidence</dt><dd className="mt-1">{evidenceIds.length} pinned {evidenceIds.length === 1 ? "record" : "records"}</dd></div>
                <div><dt className="uppercase text-red-800">Weapon</dt><dd className="mt-1">{weaponDescription}</dd></div>
                <div><dt className="uppercase text-red-800">Report</dt><dd className="mt-1">Motive, evidence, and method included</dd></div>
              </dl>
              <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button className="min-h-11 border-2 border-[#573821] px-5 uppercase" disabled={submitting} onClick={() => setReviewing(false)} type="button">Keep editing</button>
                <button className="min-h-11 border-2 border-red-900 bg-red-950 px-5 uppercase text-red-50 disabled:opacity-50" disabled={submitting} onClick={submit} type="button">{submitting ? "Submitting..." : "Submit final report"}</button>
              </div>
            </section>
          ) : (
            <form className="space-y-5 border-2 border-[#6d5138] bg-[#eee2bd] p-5 shadow-[7px_7px_0_rgba(55,34,20,0.3)] sm:p-8" onSubmit={review}>
              <div className="border-b-2 border-[#6d5138] pb-4"><p className="text-xs uppercase tracking-[0.2em] text-red-800">Five findings · five stars</p><h3 className="mt-2 text-3xl uppercase">Your final theory</h3></div>
              <label className="block"><span className="case-close-label">1 · Who did it?</span><select className="case-close-input" onChange={(event) => setCulpritNpcId(event.target.value)} required value={culpritNpcId}><option value="">Choose a person</option>{people?.filter((person) => person.role !== "victim").map((person) => <option key={person.id} value={person.id}>{person.name}</option>)}</select></label>
              <label className="block"><span className="case-close-label">2 · Why did they do it?</span><textarea className="case-close-input min-h-28" maxLength={2000} minLength={10} onChange={(event) => setMotiveExplanation(event.target.value)} required value={motiveExplanation} /></label>
              <label className="block"><span className="case-close-label">3 · What was the weapon?</span><input className="case-close-input" maxLength={200} onChange={(event) => setWeaponDescription(event.target.value)} required type="text" value={weaponDescription} /></label>
              <fieldset>
                <legend className="case-close-label">4 · Which pinned evidence proves it?</legend>
                <p className="mt-1 text-xs text-[#6d5138]">Choose up to {MAX_EVIDENCE}. Selected: {evidenceIds.length}.</p>
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  {evidence.map((item) => {
                    const selected = evidenceIds.includes(item.referenceId);
                    return (
                      <label className={`flex min-h-12 items-start gap-3 border border-[#6d5138]/50 p-3 text-sm ${!selected && evidenceIds.length >= MAX_EVIDENCE ? "cursor-not-allowed opacity-50" : "cursor-pointer"}`} key={`${item.type}:${item.referenceId}`}>
                        <input checked={selected} className="mt-1 size-4 accent-red-900" disabled={!selected && evidenceIds.length >= MAX_EVIDENCE} onChange={() => toggleEvidence(item.referenceId)} type="checkbox" />
                        <span><strong className="block uppercase text-red-800">{item.type === "cctv" ? "Camera record" : "Public record"}</strong>{item.text.split("\n")[0]}</span>
                      </label>
                    );
                  })}
                </div>
              </fieldset>
              <label className="block"><span className="case-close-label">Explain how the evidence proves your theory</span><textarea className="case-close-input min-h-28" maxLength={2000} minLength={10} onChange={(event) => setEvidenceExplanation(event.target.value)} required value={evidenceExplanation} /></label>
              <label className="block"><span className="case-close-label">5 · How was it done?</span><textarea className="case-close-input min-h-28" maxLength={2000} minLength={10} onChange={(event) => setMethodExplanation(event.target.value)} required value={methodExplanation} /></label>
              <div className="flex flex-col-reverse gap-3 border-t border-[#6d5138]/40 pt-5 sm:flex-row sm:justify-end"><button className="min-h-11 border-2 border-[#573821] px-5 uppercase" onClick={() => setClosing(false)} type="button">Cancel</button><button className="min-h-11 border-2 border-red-900 bg-red-950 px-5 uppercase text-red-50 disabled:opacity-50" disabled={!canReview} type="submit">Review final theory</button></div>
            </form>
          )}
        </div>
      </main>
    </section>
  );
}
