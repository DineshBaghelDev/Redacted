"use client";

import { useAction, useQuery } from "convex/react";
import { useState } from "react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import type { City } from "../../../../convex/generation/core/city";
import type { EvidenceSet } from "../../../../convex/generation/core/evidence/types";
import type { Facts } from "../../../../convex/generation/core/facts";
import type { Cast, CrimeCore, Story } from "../../../../convex/generation/core/schemas";
import type { Timeline } from "../../../../convex/generation/core/timeline";
import { CityView } from "./city-view";
import { EvidenceView, FactsView } from "./evidence-views";
import { CastView, CrimeView, namesFrom, StoryView } from "./story-views";
import { TimelineView } from "./timeline-view";

const button = "border border-cyan-300 px-3 py-1 hover:text-yellow-200 disabled:opacity-50";

/** Stage buttons plus each stage's saved output and check errors for one job. */
export function JobView({ jobId }: { jobId: Id<"generationJobs"> }) {
  const stages = useQuery(api.dev.tester.listStages);
  const drafts = useQuery(api.dev.tester.listDrafts, { jobId });
  const runStage = useAction(api.dev.tester.runStage);
  const [running, setRunning] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function run(stage: string, handWritten = false) {
    setRunning(stage);
    setError("");
    try {
      await runStage({ jobId, stage, handWritten });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setRunning(null);
    }
  }

  const outputOf = (name: string) => drafts?.find((d) => d.stage === name)?.output;
  const crime = outputOf("crime") as CrimeCore | undefined;
  const names = namesFrom(outputOf("cast") as Cast | undefined);

  function view(stage: string, output: unknown) {
    switch (stage) {
      case "city":
        return <CityView city={output as City} />;
      case "crime":
        return <CrimeView crime={output as CrimeCore} names={names} />;
      case "cast":
        return <CastView cast={output as Cast} crime={crime} />;
      case "story":
        return <StoryView story={output as Story} names={names} />;
      case "timeline":
        return <TimelineView timeline={output as Timeline} names={names} />;
      case "evidence":
        return <EvidenceView set={output as EvidenceSet} names={names} />;
      case "facts":
        return <FactsView facts={output as Facts} set={outputOf("evidence") as EvidenceSet | undefined} names={names} />;
      default:
        return null;
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {error && <p className="text-red-400">{error}</p>}
      {stages?.map((stage) => {
        const draft = drafts?.find((d) => d.stage === stage.name);
        return (
          <div key={stage.name} className="border-b border-cyan-300/30 pb-3">
            <div className="flex items-center gap-3">
              <button className={button} disabled={running !== null} onClick={() => run(stage.name)}>
                {running === stage.name ? "Running…" : "Run"}
              </button>
              {stage.hasHandWritten && (
                <button className={button} disabled={running !== null} onClick={() => run(stage.name, true)}>
                  Use hand-written
                </button>
              )}
              <span className="text-yellow-200">{stage.label}</span>
              <span className="opacity-60">
                {stage.kind}
                {stage.inputs.length > 0 && ` · needs ${stage.inputs.join(", ")}`}
              </span>
              {draft && (
                <span className={draft.checkErrors.length ? "text-red-400" : "text-green-400"}>
                  {draft.checkErrors.length ? `${draft.checkErrors.length} problems` : "ok"} · {draft.source}
                </span>
              )}
            </div>
            {draft && draft.checkErrors.length > 0 && (
              <ul className="mt-2 list-disc pl-5 text-red-400">
                {draft.checkErrors.map((err) => (
                  <li key={err}>{err}</li>
                ))}
              </ul>
            )}
            {draft && <div className="mt-3">{view(draft.stage, draft.output)}</div>}
            {draft && (
              <details className="mt-2">
                <summary className="cursor-pointer opacity-80">Raw data</summary>
                <pre className="max-h-[60vh] overflow-auto bg-[#020817] p-2 text-xs">
                  {JSON.stringify(draft.output, null, 2)}
                </pre>
              </details>
            )}
          </div>
        );
      })}
    </div>
  );
}
